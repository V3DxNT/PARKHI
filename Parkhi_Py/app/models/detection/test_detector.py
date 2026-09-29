from pathlib import Path
from ultralytics import YOLO

# ============================================================
# PATHS
# ============================================================

MODEL_PATH = Path(
    "checkpoints/best_sentinel_yolo_v3.pt"
)

IMAGE_PATH = Path("outputs/sr_rgb_bicubic_10x.png")

OUTPUT_DIR = Path(
    "outputs/detection"
)

# ============================================================
# LOAD MODEL
# ============================================================

print("Loading detector...")

model = YOLO(MODEL_PATH)

print("Detector loaded successfully.")
print("Classes:", model.names)

# ============================================================
# RUN DETECTION
# ============================================================

print("\nRunning building detection...")

results = model.predict(
    source=str(IMAGE_PATH),
    conf=0.05,
    imgsz=512,
    max_det=2000,
    save=True,
    project=str(OUTPUT_DIR.parent),
    name="detection",
    exist_ok=True
)

# ============================================================
# RESULTS
# ============================================================

result = results[0]

num_detections = len(result.boxes)

print("\n" + "=" * 50)
print("DETECTION RESULTS")
print("=" * 50)

print("Number of detections:", num_detections)

if num_detections > 0:

    confidences = (
        result.boxes.conf
        .cpu()
        .numpy()
    )

    print(
        "Highest confidence:",
        float(confidences.max())
    )

    print(
        "Average confidence:",
        float(confidences.mean())
    )

    print("\nTop 20 confidences:")

    for confidence in sorted(
        confidences,
        reverse=True
    )[:20]:

        print(
            f"{confidence:.4f}"
        )

print("\nDetection image saved in:")
print(OUTPUT_DIR / "detection")