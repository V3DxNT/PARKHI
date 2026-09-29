import os
import json
import torch

from src.model import load_model
from src.preprocessing import load_image
from src.assessment import assess_scene
from src.visualization import (
    draw_damage_map,
    create_summary_image,
    create_before_after_comparison,
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SCENE_NAME = os.environ.get(
    "DISASTER_SCENE",
    "hurricane-harvey_00000128"
)

RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
WEIGHTS_PATH = os.path.join(BASE_DIR, "weights", "best_model_v3.pt")

PRE_IMAGE_PATH = os.path.join(
    RAW_DIR,
    f"{SCENE_NAME}_pre_disaster.png"
)

POST_IMAGE_PATH = os.path.join(
    RAW_DIR,
    f"{SCENE_NAME}_post_disaster.png"
)

JSON_PATH = os.path.join(
    RAW_DIR,
    f"{SCENE_NAME}_post_disaster.json"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 60)
print("DISASTER ASSESSMENT")
print("=" * 60)
print(f"Scene  : {SCENE_NAME}")
print(f"Device : {device}")


# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading model...")

model = load_model(
    WEIGHTS_PATH,
    device=device
)

print("Model loaded successfully.")


# ============================================================
# LOAD IMAGES
# ============================================================

print("\nLoading images...")

pre_image = load_image(PRE_IMAGE_PATH)
post_image = load_image(POST_IMAGE_PATH)

print(f"PRE image  : {pre_image.size}")
print(f"POST image : {post_image.size}")


# ============================================================
# LOAD JSON
# ============================================================

print("\nLoading building annotations...")

with open(JSON_PATH, "r") as f:
    data = json.load(f)

features = data["features"]["xy"]

print(f"Total annotations: {len(features)}")


# ============================================================
# CONVERT POLYGONS TO BOUNDING BOXES
# ============================================================

def polygon_to_bbox(wkt):
    coordinate_text = (
        wkt
        .replace("POLYGON ((", "")
        .replace("))", "")
    )

    coordinates = []

    for point in coordinate_text.split(","):
        values = point.strip().split()

        if len(values) < 2:
            continue

        x = float(values[0])
        y = float(values[1])

        coordinates.append((x, y))

    if not coordinates:
        raise ValueError(f"Could not parse WKT: {wkt}")

    xs = [p[0] for p in coordinates]
    ys = [p[1] for p in coordinates]

    return (
        int(min(xs)),
        int(min(ys)),
        int(max(xs)),
        int(max(ys))
    )


# ============================================================
# EXTRACT BUILDINGS
# ============================================================

building_boxes = []
ground_truth = []

for feature in features:

    properties = feature["properties"]

    # Ignore unclassified buildings
    if properties.get("subtype") == "un-classified":
        continue

    wkt = feature["wkt"]

    bbox = polygon_to_bbox(wkt)

    building_boxes.append(bbox)

    ground_truth.append(
        properties.get("subtype")
    )


print(f"Buildings assessed: {len(building_boxes)}")


# ============================================================
# BATCHED DAMAGE ASSESSMENT
# ============================================================

print("\nRunning batched damage assessment...")

results, summary = assess_scene(
    model=model,
    pre_image=pre_image,
    post_image=post_image,
    building_boxes=building_boxes,
    device=device,
    batch_size=32
)


# ============================================================
# ADD GROUND TRUTH TO RESULTS
# ============================================================

for result, truth in zip(results, ground_truth):
    result["ground_truth"] = truth


# ============================================================
# PRINT SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("ASSESSMENT SUMMARY")
print("=" * 60)

for damage_type, count in summary.items():
    print(f"{damage_type:<15}: {count}")


# ============================================================
# SAVE JSON
# ============================================================

json_output = os.path.join(
    OUTPUT_DIR,
    "predictions.json"
)

output_data = {
    "scene": SCENE_NAME,
    "total_buildings": len(results),
    "summary": summary,
    "predictions": results
}

with open(json_output, "w") as f:
    json.dump(
        output_data,
        f,
        indent=4
    )

print(f"\nPredictions saved to:")
print(json_output)


# ============================================================
# DAMAGE MAP
# ============================================================

damage_map_path = os.path.join(
    OUTPUT_DIR,
    "damage_map.png"
)

draw_damage_map(
    post_image,
    results,
    damage_map_path
)

print(f"Damage map saved to:")
print(damage_map_path)


# ============================================================
# SUMMARY IMAGE
# ============================================================

summary_path = os.path.join(
    OUTPUT_DIR,
    "assessment_summary.png"
)

create_summary_image(
    post_image,
    results,
    SCENE_NAME,
    summary_path
)

print(f"Summary image saved to:")
print(summary_path)


# ============================================================
# BEFORE / AFTER / DAMAGE MAP
# ============================================================

comparison_path = os.path.join(
    OUTPUT_DIR,
    "before_after_damage_map.png"
)

create_before_after_comparison(
    pre_image,
    post_image,
    damage_map_path,
    SCENE_NAME,
    comparison_path
)

print(f"Comparison saved to:")
print(comparison_path)


# ============================================================
# DONE
# ============================================================

print("\n" + "=" * 60)
print("DISASTER ASSESSMENT COMPLETE")
print("=" * 60)