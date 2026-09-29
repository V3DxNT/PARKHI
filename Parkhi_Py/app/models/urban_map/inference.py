"""
Inference API for Model 4 Urban Map Analysis (Building Segmentation & LULC Classification).
"""

import os
import pickle
import numpy as np
import torch
from typing import Union, Dict, Any, Optional
from PIL import Image

from app.models.urban_map.config import (
    DEFAULT_WEIGHTS_PATH,
    FALLBACK_PTH_PATH,
    WEIGHTS_DIR,
    BUILDING_THRESHOLD,
    NUM_LULC_CLASSES,
)
from app.models.urban_map.model import ResidualUNetMultiTask, ResidualDecoderBlock
from app.models.urban_map.preprocessing import preprocess_image


def find_default_weights() -> Optional[str]:
    """
    Searches for available Model 4 weight files in the weights directory.
    """
    candidates = [
        DEFAULT_WEIGHTS_PATH,
        FALLBACK_PTH_PATH,
        os.path.join(WEIGHTS_DIR, "model4_corrected_best.pth"),
        os.path.join(WEIGHTS_DIR, "urban_model4_residual_unet_multitask.pth"),
    ]

    for path in candidates:
        if os.path.exists(path):
            return path

    if os.path.exists(WEIGHTS_DIR):
        for f in os.listdir(WEIGHTS_DIR):
            if f.endswith(".pkl") or f.endswith(".pth"):
                return os.path.join(WEIGHTS_DIR, f)

    return None


def load_model(
    weights_path: Optional[str] = None,
    device: Optional[Union[str, torch.device]] = None,
) -> torch.nn.Module:
    """
    Loads trained Model 4 from a .pkl or .pth checkpoint.

    Args:
        weights_path (str, optional): Path to model weights file.
        device (str or torch.device, optional): Target device.

    Returns:
        torch.nn.Module: Loaded model in eval mode.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device)

    if weights_path is None:
        weights_path = find_default_weights()

    model = ResidualUNetMultiTask(num_lulc_classes=NUM_LULC_CLASSES, pretrained=False)

    if weights_path is not None and os.path.exists(weights_path):
        print(f"Loading Model 4 weights from: {weights_path}")
        if weights_path.endswith(".pkl"):
            try:
                with open(weights_path, "rb") as f:
                    loaded = pickle.load(f)
                if isinstance(loaded, torch.nn.Module):
                    model = loaded
                elif isinstance(loaded, dict) and "model_state_dict" in loaded:
                    model.load_state_dict(loaded["model_state_dict"])
                elif isinstance(loaded, dict):
                    model.load_state_dict(loaded)
            except Exception as e:
                print(f"Pickle load failed ({e}), attempting PyTorch checkpoint load...")
                checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
                if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                    model.load_state_dict(checkpoint["model_state_dict"])
                elif isinstance(checkpoint, dict):
                    model.load_state_dict(checkpoint)
        else:
            checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                model.load_state_dict(checkpoint["model_state_dict"])
            elif isinstance(checkpoint, dict):
                model.load_state_dict(checkpoint)
            elif isinstance(checkpoint, torch.nn.Module):
                model = checkpoint
    else:
        print(f"Warning: Model 4 weight file not found at '{weights_path}'. Initializing model with default weights.")

    model = model.to(device)
    model.eval()
    return model


def run_inference(
    model: torch.nn.Module,
    input_tensor: torch.Tensor,
    threshold: float = BUILDING_THRESHOLD,
    device: Optional[Union[str, torch.device]] = None,
) -> Dict[str, Any]:
    """
    Runs multi-task forward pass inference on a preprocessed image tensor.

    Args:
        model: Trained Model 4 instance.
        input_tensor: Preprocessed tensor [B, 3, H, W] or [3, H, W].
        threshold: Threshold for building binary prediction (default 0.5).
        device: Evaluation device.

    Returns:
        Dict containing building predictions, LULC predictions, and raw probabilities/logits.
    """
    if device is None:
        device = next(model.parameters()).device
    else:
        device = torch.device(device)

    if input_tensor.ndim == 3:
        input_tensor = input_tensor.unsqueeze(0)

    input_tensor = input_tensor.to(device)

    with torch.no_grad():
        building_logits, lulc_logits = model(input_tensor)

        building_probs = torch.sigmoid(building_logits)
        building_pred = (building_probs >= threshold).long()

        lulc_probs = torch.softmax(lulc_logits, dim=1)
        lulc_pred = torch.argmax(lulc_logits, dim=1)

    return {
        "building_pred": building_pred.squeeze(0).squeeze(0).cpu().numpy(),
        "lulc_pred": lulc_pred.squeeze(0).cpu().numpy(),
        "building_prob": building_probs.squeeze(0).squeeze(0).cpu().numpy(),
        "lulc_prob": lulc_probs.squeeze(0).cpu().numpy(),
        "building_logits": building_logits.squeeze(0).cpu().numpy(),
        "lulc_logits": lulc_logits.squeeze(0).cpu().numpy(),
    }


class UrbanMapPredictor:
    """
    Reusable high-level predictor class for Model 4 backend integration.
    """

    def __init__(
        self,
        weights_path: Optional[str] = None,
        device: Optional[Union[str, torch.device]] = None,
        threshold: float = BUILDING_THRESHOLD,
    ):
        self.device = device if device else torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = load_model(weights_path, device=self.device)
        self.threshold = threshold

    def predict(self, image_input: Union[str, Image.Image, np.ndarray]) -> Dict[str, Any]:
        """
        Runs complete inference workflow on a raw image input.
        """
        input_tensor = preprocess_image(image_input)
        return run_inference(self.model, input_tensor, threshold=self.threshold, device=self.device)
