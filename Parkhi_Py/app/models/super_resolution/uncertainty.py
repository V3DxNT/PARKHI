"""
Monte Carlo Dropout Epistemic Uncertainty Quantification for MCDropoutHAT.
"""

from typing import Optional
import torch
import numpy as np
from app.models.super_resolution.inference import run_mc_dropout_inference, pad_to_multiple

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def mc_dropout_uncertainty(
    model,
    lr_tensor: torch.Tensor,
    num_passes: int = 8,
    device: Optional[torch.device] = None,
) -> np.ndarray:
    """
    Computes epistemic uncertainty via T stochastic forward passes with active Dropout2d.
    Returns:
        uncertainty: (2H, 2W) float32 numpy array representing sum of variance across channels.
    """
    device = device or DEVICE
    _, uncertainty_map = run_mc_dropout_inference(
        model, lr_tensor, device=device, num_passes=num_passes
    )
    # Squeeze (1, 1, 2H, 2W) -> (2H, 2W)
    return uncertainty_map.squeeze(0).squeeze(0).cpu().numpy().astype(np.float32)


# Backward compatibility aliases
calculate_uncertainty = mc_dropout_uncertainty
input_perturbation_uncertainty = mc_dropout_uncertainty
