"""
LoveDA to Model 4 label conversion mapping and utilities.
"""

import numpy as np

# LoveDA raw integer label -> Model 4 label mapping
LABEL_MAP = {
    0: 255,   # No-data -> ignore
    1: 0,     # Background
    2: 1,     # Building
    3: 2,     # Road
    4: 3,     # Water
    5: 4,     # Barren
    6: 5,     # Forest
    7: 6      # Agriculture
}

# LULC Class Names mapping
CLASS_NAMES = {
    0: "Background",
    1: "Building",
    2: "Road",
    3: "Water",
    4: "Barren",
    5: "Forest",
    6: "Agriculture",
    255: "No-data"
}


def convert_loveda_mask(raw_mask: np.ndarray) -> np.ndarray:
    """
    Converts a LoveDA raw mask array into Model 4 target class mapping.

    Args:
        raw_mask (np.ndarray): Input mask array with LoveDA raw class values (0..7).

    Returns:
        np.ndarray: Converted mask with values mapped to 0..6 for LULC classes and 255 for no-data.
    """
    converted = np.full_like(raw_mask, fill_value=255, dtype=np.int64)
    for raw_label, new_label in LABEL_MAP.items():
        converted[raw_mask == raw_label] = new_label
    return converted
