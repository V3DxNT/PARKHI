from detection.inference import detect_buildings


IMAGE_PATH = "outputs/tci_test.png"


detections = detect_buildings(
    IMAGE_PATH,
    conf=0.05,
    imgsz=512,
    max_det=1843,
)


print()
print("=" * 50)
print("BUILDING DETECTION")
print("=" * 50)

print(f"Image: {IMAGE_PATH}")
print(f"Buildings detected: {len(detections)}")

for i, detection in enumerate(detections[:20]):

    print(
        f"{i:03d} | "
        f"{detection['class_name']:10s} | "
        f"confidence={detection['confidence']:.4f} | "
        f"bbox={detection['bbox']}"
    )