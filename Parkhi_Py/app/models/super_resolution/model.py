"""
MCDropoutHAT: 2x Hybrid Attention Transformer Small with Monte Carlo Dropout
for Sentinel-2 Multispectral Super-Resolution (10m -> 5m VENµS-equivalent GSD).

Channel order (SEN2VENµS standard):
    Channel 0: B02 (Blue, 490 nm)
    Channel 1: B03 (Green, 560 nm)
    Channel 2: B04 (Red, 665 nm)
    Channel 3: B08 (NIR, 842 nm)
"""

import os
import sys
import types
import importlib.util
import collections.abc
import torch
import torch.nn as nn

# ─── Self-Contained basicsr Shim ──────────────────────────────────────────────
# Shims minimal basicsr registry and utilities so HAT arch executes without
# pulling in unnecessary, broken, or heavyweight training/data dependencies.
if "basicsr" not in sys.modules:
    _basicsr = types.ModuleType("basicsr")
    _basicsr_utils = types.ModuleType("basicsr.utils")
    _basicsr_registry = types.ModuleType("basicsr.utils.registry")

    class _DummyRegistry:
        def register(self):
            return lambda cls: cls

    _basicsr_registry.ARCH_REGISTRY = _DummyRegistry()

    _basicsr_archs = types.ModuleType("basicsr.archs")
    _basicsr_arch_util = types.ModuleType("basicsr.archs.arch_util")

    def _to_2tuple(x):
        return tuple(x) if isinstance(x, collections.abc.Iterable) else (x, x)

    _basicsr_arch_util.to_2tuple = _to_2tuple
    _basicsr_arch_util.trunc_normal_ = torch.nn.init.trunc_normal_

    sys.modules["basicsr"] = _basicsr
    sys.modules["basicsr.utils"] = _basicsr_utils
    sys.modules["basicsr.utils.registry"] = _basicsr_registry
    sys.modules["basicsr.archs"] = _basicsr_archs
    sys.modules["basicsr.archs.arch_util"] = _basicsr_arch_util

# ─── Dynamic HAT Architecture Loading ─────────────────────────────────────────
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_LOCAL_HAT_FILE = os.path.join(_CURRENT_DIR, "hat_arch.py")
_HAT_REPO = os.environ.get(
    "HAT_REPO_PATH",
    os.path.abspath(os.path.join(_CURRENT_DIR, "../../../HAT")),
)
_HAT_ARCH_FILE = os.path.join(_HAT_REPO, "hat", "archs", "hat_arch.py")

if os.path.exists(_LOCAL_HAT_FILE):
    _spec = importlib.util.spec_from_file_location("hat_arch_mod", _LOCAL_HAT_FILE)
    _hat_mod = importlib.util.module_from_spec(_spec)
    sys.modules["hat_arch_mod"] = _hat_mod
    _spec.loader.exec_module(_hat_mod)
    HAT = _hat_mod.HAT
elif os.path.exists(_HAT_ARCH_FILE):
    _spec = importlib.util.spec_from_file_location("hat_arch_mod", _HAT_ARCH_FILE)
    _hat_mod = importlib.util.module_from_spec(_spec)
    sys.modules["hat_arch_mod"] = _hat_mod
    _spec.loader.exec_module(_hat_mod)
    HAT = _hat_mod.HAT
else:
    try:
        from basicsr.models.archs.hat_arch import HAT
    except ImportError as e:
        raise ImportError(
            f"Cannot locate hat_arch.py at {_LOCAL_HAT_FILE} or {_HAT_ARCH_FILE} or import HAT from basicsr."
        ) from e


class MCDropoutHAT(nn.Module):
    """
    2x Hybrid Attention Transformer (HAT-S) with Monte Carlo Dropout.

    Structural Parameters:
        upscale = 2
        in_chans = 4 (B02, B03, B04, B08)
        img_size = 64
        window_size = 8
        embed_dim = 128
        depths = [6, 6, 6, 6, 6, 6]
        num_heads = [4, 4, 4, 4, 4, 4]
        compress_ratio = 24
        squeeze_factor = 24
        upsampler = 'pixelshuffle'

    Active Dropout:
        nn.Dropout2d(p=0.1) attached to `conv_after_body` via forward hook.

    Learnable parameters: ~7.34M.
    """

    def __init__(self, p_dropout: float = 0.1):
        super().__init__()
        self.model = HAT(
            upscale=2,
            in_chans=4,
            img_size=64,
            window_size=8,
            compress_ratio=24,
            squeeze_factor=24,
            conv_scale=0.01,
            overlap_ratio=0.25,
            embed_dim=128,
            depths=[6, 6, 6, 6, 6, 6],
            num_heads=[4, 4, 4, 4, 4, 4],
            mlp_ratio=2.0,
            img_range=1.0,
            res_scale=1.0,
            upsampler="pixelshuffle",
        )
        self.dropout = nn.Dropout2d(p=p_dropout)
        self._hook_handle = self.model.conv_after_body.register_forward_hook(
            self._dropout_hook
        )

    def _dropout_hook(self, module, inputs, output):
        # Applies spatial 2D dropout to feature maps in training mode
        return self.dropout(output)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# Backward compatibility alias
HAT_S_4Channel = MCDropoutHAT


def load_model(weights_path: str, device: torch.device = None) -> MCDropoutHAT:
    """
    Instantiates MCDropoutHAT and loads checkpoint weights.
    Weights are loaded strictly with map_location=device.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = MCDropoutHAT().to(device)

    if not os.path.exists(weights_path):
        raise FileNotFoundError(f"Super-resolution weights not found at: {weights_path}")

    ckpt = torch.load(weights_path, map_location=device, weights_only=False)
    if isinstance(ckpt, dict) and "params" in ckpt:
        state_dict = ckpt["params"]
    elif isinstance(ckpt, dict) and "state_dict" in ckpt:
        state_dict = ckpt["state_dict"]
    else:
        state_dict = ckpt

    model.load_state_dict(state_dict, strict=True)
    return model
