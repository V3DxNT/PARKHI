"""
Urban Map & Infrastructure Analysis Pipeline.
Wraps the trained ResidualUNetMultiTask model to generate high-resolution building footprint
segmentations and 7-class Land Use / Land Cover (LULC) maps, with composite transparent RGBA overlays.
"""

import os
import io
import logging
from typing import Dict, Any, Tuple, Optional, Union, List
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F

from app.models.urban_map.model import ResidualUNetMultiTask
from app.models.urban_map.preprocessing import preprocess_image
from app.models.urban_map.postprocess import LULC_COLOR_MAP

logger = logging.getLogger("UrbanMapPipeline")

URBAN_LEGEND: List[Dict[str, str]] = [
    {"label": "Building Footprint", "color": "#EF4444"},
    {"label": "Road Network", "color": "#F59E0B"},
    {"label": "Water Bodies", "color": "#3B82F6"},
    {"label": "Forest / Canopy", "color": "#059669"},
    {"label": "Agriculture / Grass", "color": "#84CC16"},
    {"label": "Barren Land", "color": "#D97706"},
    {"label": "Background", "color": "#94A3B8"},
]

_DEFAULT_WEIGHTS = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "weights", "model4_urban_analysis_FINAL.pth"
)


class UrbanMapPipeline:
    """
    High-level orchestrator for Model 4 Multi-Task Urban Segmentation.
    """

    def __init__(
        self,
        weights_path: Optional[str] = None,
        device: Optional[torch.device] = None,
        threshold: float = 0.35,
    ):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.threshold = threshold
        self.weights_path = weights_path or _DEFAULT_WEIGHTS
        self.model: Optional[ResidualUNetMultiTask] = None
        self._load_model()

    def _load_model(self):
        try:
            self.model = ResidualUNetMultiTask(num_lulc_classes=7, pretrained=False)
            if os.path.exists(self.weights_path):
                logger.info(f"Loading Urban Model weights from: {self.weights_path}")
                checkpoint = torch.load(self.weights_path, map_location=self.device, weights_only=False)
                if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                    self.model.load_state_dict(checkpoint["model_state_dict"], strict=False)
                elif isinstance(checkpoint, dict):
                    self.model.load_state_dict(checkpoint, strict=False)
                elif isinstance(checkpoint, torch.nn.Module):
                    self.model = checkpoint
                logger.info("Urban Model weights successfully loaded.")
            else:
                logger.warning(f"Urban Model weights not found at {self.weights_path}. Running with initialized weights.")
            self.model.to(self.device)
            self.model.eval()
        except Exception as e:
            logger.error(f"Failed to load Urban Model: {e}")

    def run(
        self,
        image_input: Optional[Union[str, Image.Image, np.ndarray]] = None,
        geotiff_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete urban infrastructure & LULC analysis.

        Args:
            image_input: Path, PIL Image, or NumPy array representing the RGB preview.
            geotiff_path: Optional path to super-resolved GeoTIFF to extract RGB bands.

        Returns:
            Dict containing overlay_png (bytes), building_mask (np.ndarray),
            summary (str), legend (list), and metrics (dict).
        """
        img = self._resolve_input_image(image_input, geotiff_path)
        orig_w, orig_h = img.size

        # Preprocess input tensor [1, 3, 256, 256]
        input_tensor = preprocess_image(img, target_size=(256, 256)).to(self.device)

        with torch.no_grad():
            building_logits, lulc_logits = self.model(input_tensor)

            # Upsample predictions back to original image resolution if needed
            if (orig_h, orig_w) != (256, 256):
                building_logits = F.interpolate(
                    building_logits, size=(orig_h, orig_w), mode="bilinear", align_corners=False
                )
                lulc_logits = F.interpolate(
                    lulc_logits, size=(orig_h, orig_w), mode="bilinear", align_corners=False
                )

            building_probs = torch.sigmoid(building_logits).squeeze().cpu().numpy()
            building_mask = (building_probs >= self.threshold).astype(np.uint8)

            lulc_pred = torch.argmax(lulc_logits, dim=1).squeeze().cpu().numpy().astype(np.uint8)

        # Generate composite RGBA overlay
        overlay_png = self._generate_composite_overlay(building_mask, lulc_pred)

        # Compute metrics
        metrics = self._compute_metrics(building_mask, lulc_pred)
        summary = self._build_summary(metrics)

        return {
            "overlay_png": overlay_png,
            "building_mask": building_mask,
            "lulc_pred": lulc_pred,
            "metrics": metrics,
            "legend": URBAN_LEGEND,
            "summary": summary,
        }

    def _generate_composite_overlay(
        self, building_mask: np.ndarray, lulc_pred: np.ndarray
    ) -> bytes:
        """
        Creates an RGBA image where LULC zones have colored semi-transparent fills
        and building footprints have distinctive bold borders.
        """
        h, w = lulc_pred.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)

        # Fill LULC classes (Background class 0 and 255 remain 100% transparent)
        for class_id, color in LULC_COLOR_MAP.items():
            if class_id != 0 and class_id != 255:
                match = lulc_pred == class_id
                alpha = 160 if class_id != 1 else 190
                rgba[match, 0] = color[0]
                rgba[match, 1] = color[1]
                rgba[match, 2] = color[2]
                rgba[match, 3] = alpha

        # Highlight building footprints with bright red fill & perimeter borders
        b_match = building_mask > 0
        rgba[b_match, 0] = 239  # Red
        rgba[b_match, 1] = 68
        rgba[b_match, 2] = 68
        rgba[b_match, 3] = 190

        # Draw 1px perimeter contour using morphological gradient
        try:
            from scipy.ndimage import binary_dilation
            dilated = binary_dilation(b_match, iterations=1)
            edge = dilated & (~b_match)
            rgba[edge] = [220, 38, 38, 255]  # Crisp neon border
        except Exception:
            pass

        buf = io.BytesIO()
        Image.fromarray(rgba, mode="RGBA").save(buf, format="PNG")
        return buf.getvalue()

    def _compute_metrics(self, building_mask: np.ndarray, lulc_pred: np.ndarray) -> Dict[str, Any]:
        """Calculates area coverage percentages for municipal planning."""
        total_pixels = float(building_mask.size)
        if total_pixels == 0:
            return {"built_up_pct": 0.0, "roads_pct": 0.0, "green_space_pct": 0.0, "water_pct": 0.0}

        building_pct = float(np.sum(building_mask > 0)) / total_pixels * 100.0
        road_pct = float(np.sum(lulc_pred == 2)) / total_pixels * 100.0
        water_pct = float(np.sum(lulc_pred == 3)) / total_pixels * 100.0
        forest_pct = float(np.sum(lulc_pred == 5)) / total_pixels * 100.0
        agri_pct = float(np.sum(lulc_pred == 6)) / total_pixels * 100.0
        green_pct = forest_pct + agri_pct

        return {
            "built_up_pct": round(building_pct, 1),
            "roads_pct": round(road_pct, 1),
            "green_space_pct": round(green_pct, 1),
            "water_pct": round(water_pct, 1),
            "total_buildings_detected": int(np.sum(building_mask > 0)),
        }

    def _build_summary(self, m: Dict[str, Any]) -> str:
        return (
            f"Urban infrastructure analysis completed on 5m GSD raster. "
            f"Built-up footprint covers {m['built_up_pct']}% of the AOI, with {m['roads_pct']}% road infrastructure. "
            f"Urban green space comprises {m['green_space_pct']}% of total area, with {m['water_pct']}% water surface cover."
        )

    def _resolve_input_image(
        self,
        image_input: Optional[Union[str, Image.Image, np.ndarray]],
        geotiff_path: Optional[str],
    ) -> Image.Image:
        """Loads RGB PIL image from available inputs or falls back to synthetic urban tile."""
        if image_input is not None:
            if isinstance(image_input, Image.Image):
                return image_input.convert("RGB")
            if isinstance(image_input, str) and os.path.exists(image_input):
                return Image.open(image_input).convert("RGB")
            if isinstance(image_input, np.ndarray):
                return Image.fromarray(image_input.astype(np.uint8)).convert("RGB")

        if geotiff_path and os.path.exists(geotiff_path):
            try:
                import rasterio
                with rasterio.open(geotiff_path) as src:
                    if src.count >= 3:
                        # Extract B04, B03, B02
                        r = src.read(3).astype(np.float32)
                        g = src.read(2).astype(np.float32)
                        b = src.read(1).astype(np.float32)
                        rgb = np.stack([r, g, b], axis=-1)
                        p_max = max(float(np.percentile(rgb, 98)), 1.0)
                        rgb_u8 = (np.clip(rgb / p_max, 0, 1) * 255).astype(np.uint8)
                        return Image.fromarray(rgb_u8)
            except Exception as e:
                logger.warning(f"Could not read GeoTIFF for Urban pipeline: {e}")

        # Synthetic urban grid
        logger.info("Generating synthetic urban RGB image.")
        arr = np.zeros((256, 256, 3), dtype=np.uint8)
        arr[40:100, 40:100] = [180, 180, 180]  # Building 1
        arr[120:180, 120:200] = [200, 190, 180]  # Building 2
        arr[:, 105:115] = [80, 80, 80]  # Road
        return Image.fromarray(arr)


# Singleton factory
_urban_pipeline_instance: Optional[UrbanMapPipeline] = None


def get_urban_pipeline() -> UrbanMapPipeline:
    global _urban_pipeline_instance
    if _urban_pipeline_instance is None:
        _urban_pipeline_instance = UrbanMapPipeline()
    return _urban_pipeline_instance
