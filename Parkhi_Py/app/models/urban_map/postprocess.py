"""
Postprocessing, color mapping, PNG saving, and GeoTIFF export utilities.
"""

import os
import numpy as np
from PIL import Image
from typing import Dict, Any, Optional

# LULC RGB Color Palette
LULC_COLOR_MAP = {
    0: (128, 128, 128),  # Background: Grey
    1: (255, 0, 0),      # Building: Red
    2: (255, 255, 0),    # Road: Yellow
    3: (0, 0, 255),      # Water: Blue
    4: (165, 42, 42),    # Barren: Brown
    5: (0, 128, 0),      # Forest: Green
    6: (0, 255, 0),      # Agriculture: Lime
    255: (0, 0, 0),      # No-data: Black
}


def color_map_lulc(lulc_mask: np.ndarray) -> np.ndarray:
    """
    Maps integer LULC class mask array [H, W] to an RGB image array [H, W, 3].
    """
    h, w = lulc_mask.shape
    rgb_mask = np.zeros((h, w, 3), dtype=np.uint8)

    for class_id, color in LULC_COLOR_MAP.items():
        match = (lulc_mask == class_id)
        rgb_mask[match] = color

    return rgb_mask


def save_pngs(
    results: Dict[str, Any],
    output_dir: str,
    prefix: str = "",
) -> Dict[str, str]:
    """
    Saves building binary mask PNG and LULC colorized map PNG.

    Returns:
        Dict of output file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    paths = {}

    if "building_pred" in results:
        b_pred = (results["building_pred"] * 255).astype(np.uint8)
        b_path = os.path.join(output_dir, f"{prefix}building_mask.png")
        Image.fromarray(b_pred).save(b_path)
        paths["building"] = b_path

    if "lulc_pred" in results:
        lulc_rgb = color_map_lulc(results["lulc_pred"])
        l_path = os.path.join(output_dir, f"{prefix}lulc_map.png")
        Image.fromarray(lulc_rgb).save(l_path)
        paths["lulc"] = l_path

    return paths


def save_geotiff(
    results: Dict[str, Any],
    output_dir: str,
    prefix: str = "",
    transform: Optional[Any] = None,
    crs: str = "EPSG:4326",
) -> Dict[str, str]:
    """
    Exports building prediction and LULC prediction as georeferenced GeoTIFFs using rasterio.
    """
    try:
        import rasterio
    except ImportError:
        raise ImportError("rasterio is required for GeoTIFF export. Please install rasterio.")

    if transform is None:
        raise ValueError("rasterio transform must be provided for georeferencing.")

    os.makedirs(output_dir, exist_ok=True)
    paths = {}

    if "building_pred" in results:
        b_arr = results["building_pred"].astype(np.uint8)
        h, w = b_arr.shape
        b_path = os.path.join(output_dir, f"{prefix}building_geo.tif")
        with rasterio.open(
            b_path,
            "w",
            driver="GTiff",
            height=h,
            width=w,
            count=1,
            dtype=b_arr.dtype,
            crs=crs,
            transform=transform,
        ) as dst:
            dst.write(b_arr, 1)
        paths["building_geotiff"] = b_path

    if "lulc_pred" in results:
        l_arr = results["lulc_pred"].astype(np.uint8)
        h, w = l_arr.shape
        l_path = os.path.join(output_dir, f"{prefix}lulc_geo.tif")
        with rasterio.open(
            l_path,
            "w",
            driver="GTiff",
            height=h,
            width=w,
            count=1,
            dtype=l_arr.dtype,
            crs=crs,
            transform=transform,
        ) as dst:
            dst.write(l_arr, 1)
        paths["lulc_geotiff"] = l_path

    return paths
