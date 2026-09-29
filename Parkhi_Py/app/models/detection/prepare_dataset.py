from pathlib import Path
import json
import random
import shutil

# ============================================================
# CONFIGURATION
# ============================================================

XBD_ROOT = Path(
    r"C:\Users\ASUS\OneDrive\Desktop\disaster_datasets\train"
)

S2_ROOT = Path(
    r"C:\Users\ASUS\OneDrive\Desktop\disaster_datasets\xbd_s12\xbd_s12"
)

OUTPUT_ROOT = Path("data/sentinel_yolo")

TRAIN_JSON = XBD_ROOT / "damage_train.json"

TRAIN_RATIO = 0.80
SEED = 42

IMAGE_SIZE = 128


# ============================================================
# FUNCTIONS
# ============================================================

def get_scene_name(record):
    """
    Extract the scene ID from the original xBD image path.

    Example:
    guatemala-volcano_00000000_pre_disaster.png

    becomes:
    guatemala-volcano_00000000
    """

    filename = Path(record["before"]).name

    return filename.replace(
        "_pre_disaster.png",
        ""
    )


def create_directories():

    for split in ["train", "val"]:
        (OUTPUT_ROOT / "images" / split).mkdir(
            parents=True,
            exist_ok=True
        )

        (OUTPUT_ROOT / "labels" / split).mkdir(
            parents=True,
            exist_ok=True
        )


def convert_bbox(bbox):
    """
    Convert original xBD 1024x1024 coordinates
    to xBD-S12 128x128 coordinates.

    xBD-S12 represents the same scene at 1/8 scale.
    """

    x1, y1, x2, y2 = bbox

    x1 /= 8.0
    y1 /= 8.0
    x2 /= 8.0
    y2 /= 8.0

    # Clip to image boundaries
    x1 = max(0.0, min(IMAGE_SIZE, x1))
    y1 = max(0.0, min(IMAGE_SIZE, y1))
    x2 = max(0.0, min(IMAGE_SIZE, x2))
    y2 = max(0.0, min(IMAGE_SIZE, y2))

    # Ignore zero/negative-area boxes
    if x2 <= x1 or y2 <= y1:
        return None

    # YOLO format
    center_x = (x1 + x2) / 2.0
    center_y = (y1 + y2) / 2.0

    width = x2 - x1
    height = y2 - y1

    return (
        center_x / IMAGE_SIZE,
        center_y / IMAGE_SIZE,
        width / IMAGE_SIZE,
        height / IMAGE_SIZE
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("SENTINEL-2 YOLO DATASET PREPARATION")
    print("=" * 60)

    # --------------------------------------------------------
    # Load annotations
    # --------------------------------------------------------

    print("\nLoading xBD annotations...")

    with open(TRAIN_JSON, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Total annotations: {len(records)}")

    # --------------------------------------------------------
    # Group annotations by scene
    # --------------------------------------------------------

    scenes = {}

    for record in records:

        scene = get_scene_name(record)

        if scene not in scenes:
            scenes[scene] = []

        scenes[scene].append(record)

    print(f"Unique scenes: {len(scenes)}")

    # --------------------------------------------------------
    # Scene-level train/validation split
    # --------------------------------------------------------

    scene_names = list(scenes.keys())

    random.seed(SEED)
    random.shuffle(scene_names)

    split_index = int(
        len(scene_names) * TRAIN_RATIO
    )

    train_scenes = set(
        scene_names[:split_index]
    )

    val_scenes = set(
        scene_names[split_index:]
    )

    print(f"Training scenes:   {len(train_scenes)}")
    print(f"Validation scenes: {len(val_scenes)}")

    # --------------------------------------------------------
    # Create directories
    # --------------------------------------------------------

    create_directories()

    # --------------------------------------------------------
    # Metadata
    # --------------------------------------------------------

    metadata = {
        "train": {},
        "val": {}
    }

    total_boxes = 0
    valid_boxes = 0
    discarded_boxes = 0

    # --------------------------------------------------------
    # Process scenes
    # --------------------------------------------------------

    for scene_index, scene in enumerate(scene_names):

        if scene in train_scenes:
            split = "train"
        else:
            split = "val"

        records_for_scene = scenes[scene]

        # ----------------------------------------------------
        # Sentinel-2 files
        # ----------------------------------------------------

        pre_name = (
            scene +
            "_pre_disaster_s2_tci.tif"
        )

        post_name = (
            scene +
            "_post_disaster_s2_tci.tif"
        )

        pre_files = list(
            S2_ROOT.rglob(pre_name)
        )

        post_files = list(
            S2_ROOT.rglob(post_name)
        )

        if not pre_files or not post_files:
            print(
                f"WARNING: Missing S2 files for {scene}"
            )
            continue

        pre_file = pre_files[0]
        post_file = post_files[0]

        # ----------------------------------------------------
        # Copy PRE image
        #
        # We initially train building detection on the
        # pre-disaster image.
        # ----------------------------------------------------

        output_name = (
            scene +
            "_pre_disaster_s2_tci.tif"
        )

        output_image = (
            OUTPUT_ROOT /
            "images" /
            split /
            output_name
        )

        if not output_image.exists():
            shutil.copy2(
                pre_file,
                output_image
            )

        # ----------------------------------------------------
        # Create YOLO label
        # ----------------------------------------------------

        label_name = (
            scene +
            "_pre_disaster_s2_tci.txt"
        )

        label_file = (
            OUTPUT_ROOT /
            "labels" /
            split /
            label_name
        )

        scene_metadata = []

        with open(
            label_file,
            "w",
            encoding="utf-8"
        ) as f:

            for record in records_for_scene:

                total_boxes += 1

                converted = convert_bbox(
                    record["bbox"]
                )

                if converted is None:

                    discarded_boxes += 1
                    continue

                valid_boxes += 1

                cx, cy, w, h = converted

                # Class 0 = building
                f.write(
                    f"0 {cx:.6f} {cy:.6f} "
                    f"{w:.6f} {h:.6f}\n"
                )

                # Preserve damage label for
                # the next stage.
                scene_metadata.append({
                    "bbox_original": record["bbox"],
                    "bbox_s2": converted,
                    "damage_label": record["label"]
                })

        metadata[split][scene] = {
            "pre_image": str(pre_file),
            "post_image": str(post_file),
            "objects": scene_metadata
        }

        # Progress
        if (scene_index + 1) % 100 == 0:
            print(
                f"Processed {scene_index + 1}/"
                f"{len(scene_names)} scenes"
            )

    # --------------------------------------------------------
    # Save metadata
    # --------------------------------------------------------

    metadata_file = (
        OUTPUT_ROOT /
        "damage_metadata.json"
    )

    with open(
        metadata_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            metadata,
            f,
            indent=2
        )

    # --------------------------------------------------------
    # Create YOLO data.yaml
    # --------------------------------------------------------

    yaml_file = (
        OUTPUT_ROOT /
        "data.yaml"
    )

    yaml_content = f"""path: {OUTPUT_ROOT.resolve().as_posix()}
train: images/train
val: images/val

names:
  0: building
"""

    with open(
        yaml_file,
        "w",
        encoding="utf-8"
    ) as f:

        f.write(yaml_content)

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("DATASET PREPARATION COMPLETE")
    print("=" * 60)

    print(f"Total boxes:       {total_boxes}")
    print(f"Valid boxes:       {valid_boxes}")
    print(f"Discarded boxes:   {discarded_boxes}")

    print("\nOutput:")
    print(OUTPUT_ROOT.resolve())

    print("\nTrain:")
    print(
        (OUTPUT_ROOT / "images" / "train").resolve()
    )

    print("\nValidation:")
    print(
        (OUTPUT_ROOT / "images" / "val").resolve()
    )


if __name__ == "__main__":
    main()