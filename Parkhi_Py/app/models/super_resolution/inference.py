"""
Inference Engine for MCDropoutHAT Super-Resolution with Reflection Padding
and Monte Carlo Dropout Epistemic Uncertainty Quantification.
"""

from typing import Tuple, Optional
import torch
import torch.nn.functional as F
import numpy as np

from app.models.super_resolution.model import MCDropoutHAT, load_model

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def pad_to_multiple(tensor: torch.Tensor, multiple: int = 8) -> Tuple[torch.Tensor, int, int]:
    """
    Applies reflection padding so spatial dimensions (H, W) are exact multiples
    of transformer window_size (8).
    Padding tuple: (pad_left, pad_right, pad_top, pad_bottom) = (0, pad_w, 0, pad_h).
    """
    _, _, h, w = tensor.shape
    pad_h = (multiple - h % multiple) % multiple
    pad_w = (multiple - w % multiple) % multiple

    if pad_h == 0 and pad_w == 0:
        return tensor, 0, 0

    lr_padded = F.pad(tensor, (0, pad_w, 0, pad_h), mode="reflect")
    return lr_padded, pad_h, pad_w


def run_mc_dropout_inference(
    model: MCDropoutHAT,
    lr_tensor: torch.Tensor,
    device: Optional[torch.device] = None,
    num_passes: int = 8,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Decoupled Super-Resolution Engine:
    1. Deterministic Pass (model.eval()): Produces the single sharpest reconstruction
       clamped to physical BOA reflectance [0.0, 1.0].
    2. Stochastic Passes (model.train()): Gathers T=8 dropout variations purely to
       compute the epistemic uncertainty heatmap, discarding the blurred mean.

    Args:
        model: MCDropoutHAT model
        lr_tensor: (1, 4, H, W) float32 tensor in BOA reflectance [0.0, 1.0]
        device: Torch execution device
        num_passes: Number of stochastic passes (T=8)

    Returns:
        sharp_sr: (1, 4, 2H, 2W) tensor in [0.0, 1.0]
        uncertainty_map: (1, 1, 2H, 2W) epistemic variance tensor
    """
    device = device or DEVICE
    model = model.to(device)
    lr_tensor = lr_tensor.to(device)

    _, _, h, w = lr_tensor.shape

    # 1. Symmetric reflection padding (8px) ensures boundary pixels have full convolutional receptive field
    # preventing border dropoff artifacts
    pad = 8
    lr_padded = F.pad(lr_tensor, (pad, pad, pad, pad), mode="reflect")

    # --- Pass 1: Deterministic Sharp Pass ---
    model.eval()
    with torch.no_grad():
        raw_sr = model(lr_padded)
        sharp_sr = torch.clamp(
            raw_sr[:, :, pad * 2 : pad * 2 + h * 2, pad * 2 : pad * 2 + w * 2],
            0.0,
            1.0,
        )

    if num_passes <= 1:
        # Epistemic / reconstruction detail proxy when running single pass on CPU:
        # Measures high-frequency reconstruction divergence against bicubic baseline
        lr_bicubic = F.interpolate(lr_tensor, scale_factor=2.0, mode="bicubic", align_corners=False)
        uncertainty_map = torch.mean(torch.abs(sharp_sr - lr_bicubic), dim=1, keepdim=True)
        return sharp_sr, uncertainty_map

    # --- Pass 2: Stochastic Uncertainty Passes ---
    model.train()  # Keep dropout active strictly for epistemic variance estimation

    passes = []
    with torch.no_grad():
        for _ in range(num_passes):
            out = model(lr_padded)
            # Crop unpadded high-resolution outputs back and clamp
            out_cropped = torch.clamp(
                out[:, :, pad * 2 : pad * 2 + h * 2, pad * 2 : pad * 2 + w * 2],
                0.0,
                1.0,
            )
            passes.append(out_cropped)

    model.eval()

    # Stack stochastic passes: (T, 1, 4, 2H, 2W)
    outputs = torch.stack(passes, dim=0)

    # Calculate pixel epistemic variance:
    uncertainty_map = torch.var(outputs, dim=0, unbiased=False).sum(dim=1, keepdim=True)

    # Return sharp deterministic pass, discarding the blurred stochastic mean
    return sharp_sr, uncertainty_map


def run_inference(
    model: MCDropoutHAT,
    lr_tensor: torch.Tensor,
    device: Optional[torch.device] = None,
    use_mc_dropout: bool = True,
    num_passes: int = 8,
) -> np.ndarray:
    """
    Runs super-resolution inference and returns (2H, 2W, 4) float32 numpy array.
    """
    device = device or DEVICE
    if use_mc_dropout:
        sharp_sr, _ = run_mc_dropout_inference(model, lr_tensor, device, num_passes=num_passes)
        sr_np = sharp_sr.squeeze(0).permute(1, 2, 0).cpu().numpy()
    else:
        model.eval()
        lr_tensor = lr_tensor.to(device)
        _, _, h, w = lr_tensor.shape
        pad = 8
        lr_padded = F.pad(lr_tensor, (pad, pad, pad, pad), mode="reflect")
        with torch.no_grad():
            out = model(lr_padded)[:, :, pad * 2 : pad * 2 + h * 2, pad * 2 : pad * 2 + w * 2]
        sr_np = out.squeeze(0).permute(1, 2, 0).cpu().numpy()

    return np.clip(sr_np, 0.0, 1.0)

