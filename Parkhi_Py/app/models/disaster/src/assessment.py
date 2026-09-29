import torch

from .preprocessing import crop_building


CLASS_NAMES = [
    "No Damage",
    "Minor Damage",
    "Major Damage",
    "Destroyed"
]


def assess_scene(
    model,
    pre_image,
    post_image,
    building_boxes,
    device=None,
    batch_size=32
):
    """
    Run V3 damage assessment on multiple buildings
    using batched inference.

    Parameters
    ----------
    model:
        Loaded Siamese damage classification model.

    pre_image:
        PIL image before the disaster.

    post_image:
        PIL image after the disaster.

    building_boxes:
        List of bounding boxes:
        [(x1, y1, x2, y2), ...]

    device:
        torch.device. Automatically selects CUDA/CPU
        if not supplied.

    batch_size:
        Number of buildings processed in one model
        forward pass.

    Returns
    -------
    results:
        List of building-level predictions.

    summary:
        Count of predictions for each damage class.
    """

    # ========================================================
    # DEVICE
    # ========================================================

    if device is None:
        device = torch.device(
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

    model.to(device)
    model.eval()

    # ========================================================
    # EMPTY INPUT
    # ========================================================

    if not building_boxes:
        return [], {
            "No Damage": 0,
            "Minor Damage": 0,
            "Major Damage": 0,
            "Destroyed": 0
        }

    # ========================================================
    # PREPARE ALL CROPS
    # ========================================================

    pre_crops = []
    post_crops = []

    for bbox in building_boxes:

        pre_crop = crop_building(
            pre_image,
            bbox
        )

        post_crop = crop_building(
            post_image,
            bbox
        )

        pre_crops.append(pre_crop)
        post_crops.append(post_crop)

    # ========================================================
    # SUMMARY
    # ========================================================

    summary = {
        "No Damage": 0,
        "Minor Damage": 0,
        "Major Damage": 0,
        "Destroyed": 0
    }

    results = []

    total_buildings = len(
        building_boxes
    )

    # ========================================================
    # BATCHED INFERENCE
    # ========================================================

    with torch.no_grad():

        for start in range(
            0,
            total_buildings,
            batch_size
        ):

            end = min(
                start + batch_size,
                total_buildings
            )

            # ------------------------------------------------
            # Create batches
            # ------------------------------------------------

            pre_batch = torch.stack(
                pre_crops[start:end]
            ).to(device)

            post_batch = torch.stack(
                post_crops[start:end]
            ).to(device)

            # ------------------------------------------------
            # Model
            # ------------------------------------------------

            outputs = model(
                pre_batch,
                post_batch
            )

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            # ------------------------------------------------
            # Predictions
            # ------------------------------------------------

            predicted_ids = probabilities.argmax(
                dim=1
            )

            confidences = probabilities.max(
                dim=1
            ).values

            # ------------------------------------------------
            # Store individual results
            # ------------------------------------------------

            for local_index in range(
                end - start
            ):

                global_index = (
                    start + local_index
                )

                prediction_id = (
                    predicted_ids[
                        local_index
                    ].item()
                )

                prediction = CLASS_NAMES[
                    prediction_id
                ]

                confidence = (
                    confidences[
                        local_index
                    ].item()
                )

                probability_dict = {
                    CLASS_NAMES[class_index]:
                    float(
                        probabilities[
                            local_index,
                            class_index
                        ].item()
                    )

                    for class_index in range(4)
                }

                result = {
                    "building_id":
                        global_index,

                    "bbox":
                        list(
                            building_boxes[
                                global_index
                            ]
                        ),

                    "prediction_id":
                        prediction_id,

                    "prediction":
                        prediction,

                    "confidence":
                        confidence,

                    "probabilities":
                        probability_dict
                }

                results.append(
                    result
                )

                summary[
                    prediction
                ] += 1

    # ========================================================
    # RETURN
    # ========================================================

    return results, summary