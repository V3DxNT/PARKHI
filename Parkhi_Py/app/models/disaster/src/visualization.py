import os
from PIL import Image, ImageDraw, ImageFont


# ============================================================
# DAMAGE COLORS
# ============================================================

COLORS = {
    "No Damage": (0, 220, 0),
    "Minor Damage": (255, 255, 0),
    "Major Damage": (255, 165, 0),
    "Destroyed": (255, 0, 0),
}


# ============================================================
# DRAW DAMAGE MAP
# ============================================================

def draw_damage_map(image, predictions, output_path):

    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    damage_map = image.copy().convert("RGB")

    draw = ImageDraw.Draw(damage_map)

    for prediction in predictions:

        bbox = prediction["bbox"]
        damage_type = prediction["prediction"]

        color = COLORS.get(
            damage_type,
            (255, 255, 255)
        )

        x1, y1, x2, y2 = bbox

        draw.rectangle(
            [x1, y1, x2, y2],
            outline=color,
            width=3
        )

    damage_map.save(output_path)

    return damage_map


# ============================================================
# CREATE SUMMARY IMAGE
# ============================================================

def create_summary_image(
    image,
    predictions,
    scene_name,
    output_path
):

    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    width, height = image.size

    header_height = 210

    output = Image.new(
        "RGB",
        (width, height + header_height),
        "white"
    )

    output.paste(
        image.convert("RGB"),
        (0, header_height)
    )

    draw = ImageDraw.Draw(output)

    try:
        title_font = ImageFont.truetype(
            "arial.ttf",
            32
        )

        text_font = ImageFont.truetype(
            "arial.ttf",
            22
        )

    except:

        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()

    draw.text(
        (20, 15),
        "AI DISASTER DAMAGE ASSESSMENT",
        fill="black",
        font=title_font
    )

    draw.text(
        (20, 60),
        f"Scene: {scene_name}",
        fill="black",
        font=text_font
    )

    counts = {
        "No Damage": 0,
        "Minor Damage": 0,
        "Major Damage": 0,
        "Destroyed": 0
    }

    for prediction in predictions:

        damage_type = prediction["prediction"]

        if damage_type in counts:
            counts[damage_type] += 1

    total = len(predictions)

    draw.text(
        (20, 100),
        f"Total Buildings: {total}",
        fill="black",
        font=text_font
    )

    # Put counts on separate positions to avoid overlap
    positions = [
        (300, 100),
        (500, 100),
        (700, 100),
        (900, 100)
    ]

    for (damage_type, count), position in zip(
        counts.items(),
        positions
    ):

        draw.text(
            position,
            f"{damage_type}: {count}",
            fill="black",
            font=text_font
        )

    # Legend
    legend_y = 145

    for damage_type, color in COLORS.items():

        draw.rectangle(
            [20, legend_y, 40, legend_y + 20],
            fill=color
        )

        draw.text(
            (50, legend_y - 3),
            damage_type,
            fill="black",
            font=text_font
        )

        legend_y += 30

    output.save(output_path)

    return output


# ============================================================
# BEFORE / AFTER / DAMAGE MAP
# ============================================================

def create_before_after_comparison(
    pre_image,
    post_image,
    damage_map,
    scene_name,
    output_path
):

    # --------------------------------------------------------
    # Make output path safe
    # --------------------------------------------------------

    output_path = os.path.abspath(
        os.fspath(output_path)
    )

    output_directory = os.path.dirname(
        output_path
    )

    if output_directory:
        os.makedirs(
            output_directory,
            exist_ok=True
        )

    print(f"\nSaving comparison image to:")
    print(output_path)

    # --------------------------------------------------------
    # Accept either PIL Image or image path
    # --------------------------------------------------------

    if isinstance(damage_map, (str, os.PathLike)):

        damage_map = Image.open(
            damage_map
        ).convert("RGB")

    else:

        damage_map = damage_map.convert("RGB")

    pre_image = pre_image.convert("RGB")
    post_image = post_image.convert("RGB")

    # --------------------------------------------------------
    # Resize panels
    # --------------------------------------------------------

    panel_width = 1024
    panel_height = 1024

    pre_image = pre_image.resize(
        (panel_width, panel_height),
        Image.Resampling.LANCZOS
    )

    post_image = post_image.resize(
        (panel_width, panel_height),
        Image.Resampling.LANCZOS
    )

    damage_map = damage_map.resize(
        (panel_width, panel_height),
        Image.Resampling.LANCZOS
    )

    # --------------------------------------------------------
    # Canvas
    # --------------------------------------------------------

    header_height = 90

    total_width = panel_width * 3
    total_height = panel_height + header_height

    output = Image.new(
        "RGB",
        (total_width, total_height),
        "white"
    )

    draw = ImageDraw.Draw(output)

    # --------------------------------------------------------
    # Fonts
    # --------------------------------------------------------

    try:

        title_font = ImageFont.truetype(
            "arial.ttf",
            28
        )

        scene_font = ImageFont.truetype(
            "arial.ttf",
            20
        )

    except:

        title_font = ImageFont.load_default()
        scene_font = ImageFont.load_default()

    # --------------------------------------------------------
    # Titles
    # --------------------------------------------------------

    draw.text(
        (20, 15),
        "BEFORE DISASTER",
        fill="black",
        font=title_font
    )

    draw.text(
        (panel_width + 20, 15),
        "AFTER DISASTER",
        fill="black",
        font=title_font
    )

    draw.text(
        (panel_width * 2 + 20, 15),
        "AI DAMAGE MAP",
        fill="black",
        font=title_font
    )

    draw.text(
        (20, 55),
        scene_name,
        fill="black",
        font=scene_font
    )

    # --------------------------------------------------------
    # Paste images
    # --------------------------------------------------------

    output.paste(
        pre_image,
        (0, header_height)
    )

    output.paste(
        post_image,
        (panel_width, header_height)
    )

    output.paste(
        damage_map,
        (panel_width * 2, header_height)
    )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    output.save(
        output_path,
        format="PNG"
    )

    print("Comparison image saved successfully.")

    return output