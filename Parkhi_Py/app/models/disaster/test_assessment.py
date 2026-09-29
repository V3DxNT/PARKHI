import os

from PIL import Image

from src.model import load_model
from src.assessment import assess_scene


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PRE_PATH = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "hurricane-michael_00000299_pre_disaster.png"
)

POST_PATH = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "hurricane-michael_00000299_post_disaster.png"
)

CHECKPOINT = os.path.join(
    BASE_DIR,
    "weights",
    "best_model_v3.pt"
)


# ============================================================
# LOAD MODEL
# ============================================================

import torch

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print("Device:", device)

model = load_model(
    CHECKPOINT,
    device=device
)

print("✓ Model loaded")


# ============================================================
# LOAD IMAGES
# ============================================================

pre_image = Image.open(
    PRE_PATH
).convert("RGB")

post_image = Image.open(
    POST_PATH
).convert("RGB")

print("✓ Images loaded")


# ============================================================
# TEST BUILDINGS
# ============================================================

building_boxes = [
    (604, 859, 620, 886),
    (672, 675, 702, 709),
    (540, 626, 552, 637)
]


# ============================================================
# ASSESS
# ============================================================

results, summary = assess_scene(
    model=model,
    pre_image=pre_image,
    post_image=post_image,
    building_boxes=building_boxes,
    device=device
)


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\n" + "=" * 60)
print("ASSESSMENT RESULTS")
print("=" * 60)

for result in results:

    print(
        f"Building {result['building_id']}: "
        f"{result['prediction']} "
        f"({result['confidence']:.4f})"
    )


print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

for label, count in summary.items():

    print(
        f"{label:15}: {count}"
    )