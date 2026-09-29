from pathlib import Path

from .model import load_detector


def detect_buildings(
    image_path,
    model=None,
    conf=0.20,
    imgsz=512,
    max_det=1000,
):
    """
    Detect buildings in a Sentinel-2 image.

    Returns a list of dictionaries containing:
        bbox
        confidence
        class_id
        class_name
    """

    source = image_path
    if isinstance(image_path, (str, Path)):
        p = Path(image_path)
        if not p.exists():
            raise FileNotFoundError(
                f"Image not found: {p}"
            )
        source = str(p)

    if model is None:
        model = load_detector()

    results = model.predict(
        source=source,
        conf=conf,
        imgsz=imgsz,
        max_det=max_det,
        verbose=False,
    )

    result = results[0]

    detections = []

    if result.boxes is None:
        return detections

    for box in result.boxes:

        xyxy = box.xyxy[0].cpu().numpy().tolist()
        confidence = float(box.conf[0].cpu().item())
        class_id = int(box.cls[0].cpu().item())

        class_name = model.names.get(
            class_id,
            str(class_id)
        )

        detections.append(
            {
                "bbox": xyxy,
                "confidence": confidence,
                "class_id": class_id,
                "class_name": class_name,
            }
        )

    return detections