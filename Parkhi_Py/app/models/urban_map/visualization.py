"""
Visualization utilities for Model 4 predictions.
"""

import matplotlib.pyplot as plt
import numpy as np
from typing import Optional, Dict, Any

from app.models.urban_map.postprocess import color_map_lulc


def plot_predictions(
    image: np.ndarray,
    building_pred: np.ndarray,
    lulc_pred: np.ndarray,
    building_target: Optional[np.ndarray] = None,
    lulc_target: Optional[np.ndarray] = None,
    save_path: Optional[str] = None,
):
    """
    Plots input image alongside predicted building mask and LULC land-cover map.
    Includes ground truth comparison if available.
    """
    has_gt = building_target is not None and lulc_target is not None
    cols = 5 if has_gt else 3

    plt.figure(figsize=(4 * cols, 4))

    # 1. Input RGB Image
    plt.subplot(1, cols, 1)
    plt.imshow(image)
    plt.title("Input RGB Image")
    plt.axis("off")

    if has_gt:
        # 2. GT Building
        plt.subplot(1, cols, 2)
        plt.imshow(building_target.squeeze(), cmap="gray")
        plt.title("GT Building")
        plt.axis("off")

        # 3. Pred Building
        plt.subplot(1, cols, 3)
        plt.imshow(building_pred.squeeze(), cmap="gray")
        plt.title("Predicted Building")
        plt.axis("off")

        # 4. GT LULC
        plt.subplot(1, cols, 4)
        plt.imshow(color_map_lulc(lulc_target.squeeze()))
        plt.title("GT LULC Map")
        plt.axis("off")

        # 5. Pred LULC
        plt.subplot(1, cols, 5)
        plt.imshow(color_map_lulc(lulc_pred.squeeze()))
        plt.title("Predicted LULC Map")
        plt.axis("off")
    else:
        # 2. Pred Building
        plt.subplot(1, cols, 2)
        plt.imshow(building_pred.squeeze(), cmap="gray")
        plt.title("Predicted Building")
        plt.axis("off")

        # 3. Pred LULC
        plt.subplot(1, cols, 3)
        plt.imshow(color_map_lulc(lulc_pred.squeeze()))
        plt.title("Predicted LULC Map")
        plt.axis("off")

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
        print(f"Visualization saved to {save_path}")

    plt.close()
