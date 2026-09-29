"""
Utility functions for reproducibility, device handling, and workspace paths.
"""

import random
import os
import numpy as np
import torch
from typing import Optional

from app.models.urban_map.config import SEED


def set_seed(seed: int = SEED):
    """
    Sets random seed across Python random, NumPy, and PyTorch for reproducible runs.
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def get_device(device_str: Optional[str] = None) -> torch.device:
    """
    Resolves requested device string or selects available CUDA / CPU device.
    """
    if device_str:
        return torch.device(device_str)
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")
