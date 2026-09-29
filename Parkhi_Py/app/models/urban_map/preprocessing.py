"""
Preprocessing utilities for Model 4 single-image and batch inference.
"""

import numpy as np
from PIL import Image
import torch
from typing import Union, Tuple

from app.models.urban_map.config import IMAGENET_MEAN, IMAGENET_STD, IMAGE_SIZE


def preprocess_image(
    image_input: Union[str, Image.Image, np.ndarray],
    target_size: Tuple[int, int] = IMAGE_SIZE,
) -> torch.Tensor:
    """
    Preprocesses an input image (file path, PIL Image, or NumPy array) into a
    normalized 4D PyTorch tensor suitable for Model 4 inference [1, 3, H, W].

    Args:
        image_input: File path (str), PIL.Image, or NumPy array (H, W, C).
        target_size: Desired image resolution tuple (height, width).

    Returns:
        torch.Tensor: Normalized tensor of shape [1, 3, target_size[0], target_size[1]].
    """
    if isinstance(image_input, str):
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, np.ndarray):
        if image_input.dtype == np.uint8:
            img = Image.fromarray(image_input).convert("RGB")
        else:
            img = Image.fromarray((image_input * 255).astype(np.uint8)).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")

    if img.size != (target_size[1], target_size[0]):
        img = img.resize((target_size[1], target_size[0]), Image.BILINEAR)

    img_np = np.asarray(img, dtype=np.float32) / 255.0

    img_tensor = torch.from_numpy(img_np).permute(2, 0, 1)

    mean = torch.tensor(IMAGENET_MEAN).view(3, 1, 1)
    std = torch.tensor(IMAGENET_STD).view(3, 1, 1)
    img_tensor = (img_tensor - mean) / std

    return img_tensor.unsqueeze(0)


def denormalize_image(tensor: torch.Tensor) -> np.ndarray:
    """
    Reverses ImageNet normalization and converts a [3, H, W] or [1, 3, H, W] tensor
    back to a uint8 NumPy array [H, W, 3].
    """
    if tensor.ndim == 4:
        tensor = tensor.squeeze(0)

    mean = torch.tensor(IMAGENET_MEAN).view(3, 1, 1).to(tensor.device)
    std = torch.tensor(IMAGENET_STD).view(3, 1, 1).to(tensor.device)

    denorm = tensor * std + mean
    denorm = torch.clamp(denorm, 0.0, 1.0)

    arr = denorm.permute(1, 2, 0).cpu().numpy()
    return (arr * 255.0).astype(np.uint8)
