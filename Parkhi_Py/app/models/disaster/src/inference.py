import torch

from .model import load_model
from .preprocessing import (
    load_image,
    crop_building
)


CLASS_NAMES = [
    "No Damage",
    "Minor Damage",
    "Major Damage",
    "Destroyed"
]


def predict_building_damage(
    model,
    pre_image,
    post_image,
    bbox,
    device=None
):
    """
    Predict damage for one building.

    Parameters
    ----------
    model : torch.nn.Module
        Loaded Siamese damage model.

    pre_image : PIL.Image
        Pre-disaster image.

    post_image : PIL.Image
        Post-disaster image.

    bbox : tuple
        Building bounding box.

    device : torch.device, optional

    Returns
    -------
    dict
        Prediction information.
    """

    if device is None:

        device = torch.device(
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

    # Prepare PRE crop
    pre_tensor = crop_building(
        pre_image,
        bbox
    ).unsqueeze(0).to(device)

    # Prepare POST crop
    post_tensor = crop_building(
        post_image,
        bbox
    ).unsqueeze(0).to(device)

    # Model inference
    with torch.no_grad():

        output = model(
            pre_tensor,
            post_tensor
        )

        probabilities = torch.softmax(
            output,
            dim=1
        )

    predicted_id = probabilities.argmax(
        dim=1
    ).item()

    confidence = probabilities[
        0,
        predicted_id
    ].item()

    return {
        "prediction_id": predicted_id,
        "prediction": CLASS_NAMES[predicted_id],
        "confidence": confidence,
        "probabilities": {
            CLASS_NAMES[i]: float(
                probabilities[0, i]
            )
            for i in range(4)
        }
    }