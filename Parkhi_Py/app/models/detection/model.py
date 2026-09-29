from pathlib import Path
from ultralytics import YOLO


MODEL_PATH = Path(__file__).resolve().parent / "weights" / "best_sentinel_yolo_v3.pt"
FALLBACK_PATH = Path("checkpoints/best_sentinel_yolo_v3.pt")


def load_detector(model_path=MODEL_PATH):
    """
    Load the trained Sentinel-2 building detector.
    """

    model_path = Path(model_path)
    if not model_path.exists() and FALLBACK_PATH.exists():
        model_path = FALLBACK_PATH

    if not model_path.exists():
        raise FileNotFoundError(
            f"Detector checkpoint not found at {model_path} or {FALLBACK_PATH}"
        )

    model = YOLO(str(model_path))

    return model