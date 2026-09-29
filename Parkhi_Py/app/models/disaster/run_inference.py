import sys
import os
import subprocess


if len(sys.argv) != 2:
    print("Usage:")
    print("  python disaster/run_inference.py <scene_name>")
    print()
    print("Example:")
    print("  python disaster/run_inference.py hurricane-harvey_00000128")
    sys.exit(1)


scene_name = sys.argv[1]

print("=" * 60)
print("DISASTER ASSESSMENT")
print("=" * 60)

print("Scene:", scene_name)


# ============================================================
# CHECK REQUIRED FILES
# ============================================================

base_dir = os.path.dirname(os.path.abspath(__file__))
raw_dir = os.path.join(base_dir, "data", "raw")

pre_image = os.path.join(
    raw_dir,
    f"{scene_name}_pre_disaster.png"
)

post_image = os.path.join(
    raw_dir,
    f"{scene_name}_post_disaster.png"
)

json_file = os.path.join(
    raw_dir,
    f"{scene_name}_post_disaster.json"
)


print("\nChecking scene files...")

required_files = [
    pre_image,
    post_image,
    json_file
]

for file_path in required_files:

    if not os.path.exists(file_path):
        print("❌ Missing:", file_path)
        sys.exit(1)

    print("✓ Found:", os.path.basename(file_path))


# ============================================================
# RUN FULL SCENE INFERENCE
# ============================================================

print("\nStarting model inference...\n")

env = os.environ.copy()

env["DISASTER_SCENE"] = scene_name

script_path = os.path.join(
    base_dir,
    "full_scene_inference.py"
)

result = subprocess.run(
    [sys.executable, script_path],
    env=env
)


# ============================================================
# RESULT
# ============================================================

if result.returncode != 0:

    print("\n❌ Inference failed.")
    sys.exit(result.returncode)


print("\n" + "=" * 60)
print("DISASTER ASSESSMENT FINISHED")
print("=" * 60)

print("\nOutputs are available in:")

print(
    os.path.join(
        base_dir,
        "outputs"
    )
)