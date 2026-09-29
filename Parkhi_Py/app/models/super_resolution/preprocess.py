"""
Radiometric Preprocessing for Sentinel-2 L2A to MCDropoutHAT Super-Resolution.

MCDropoutHAT is trained natively on physical Bottom-Of-Atmosphere (BOA)
reflectances clamped strictly to [0.0, 1.0].

Incoming 16-bit raw Sentinel-2 Digital Numbers (DN) are mapped directly via:
    reflectance = torch.clamp(raw_tensor.float() / 10000.0, 0.0, 1.0)

STRICT RADIOMETRIC RULE:
Patch-level min-max stretching ((x - min) / (max - min)) and "stretch-and-revert"
logic are strictly prohibited.
"""

import os
import numpy as np
import torch

try:
    from sentinelhub import (
        SHConfig, BBox, CRS, DataCollection, SentinelHubRequest, MimeType
    )
except ImportError:
    SHConfig = None
    BBox = None
    CRS = None
    DataCollection = None
    SentinelHubRequest = None
    MimeType = None

# CDSE Sentinel-2 L2A physical conversion constants
S2_SCALE = 10000.0

# SCL values that indicate cloud / shadow / cirrus
_CLOUD_SCL_VALUES = [3, 8, 9, 10]

# CDSE endpoints
_CDSE_SH_BASE_URL = "https://sh.dataspace.copernicus.eu"
_CDSE_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/"
    "protocol/openid-connect/token"
)


def preprocess_tensor(raw_tensor: torch.Tensor) -> torch.Tensor:
    """
    Directly maps raw 16-bit Sentinel-2 Digital Numbers (DN) or unnormalized tensors
    to physical BOA surface reflectance clamped in [0.0, 1.0].

    Formula:
        reflectance = torch.clamp(raw_tensor.float() / 10000.0, 0.0, 1.0)

    Args:
        raw_tensor: (B, 4, H, W) or (4, H, W) torch tensor.
    Returns:
        reflectance: Tensor of same shape in [0.0, 1.0] float32.
    """
    if not isinstance(raw_tensor, torch.Tensor):
        raw_tensor = torch.from_numpy(raw_tensor)

    t = raw_tensor.float()

    # Copernicus CDSE Process API evalscript returns true reflectance scaled to [0, 10000]
    # Direct division by S2_SCALE (10000) restores calibrated physical surface reflectance [0.0, 1.0]
    if t.max() > 1.5:
        reflectance = torch.clamp(t / S2_SCALE, 0.0, 1.0)
    else:
        reflectance = torch.clamp(t, 0.0, 1.0)

    return reflectance


def preprocess_tile(raw_tile):
    """
    Compatibility wrapper returning (reflectance, min_val, max_val).
    min_val and max_val are fixed to [0.0, 1.0] physical bounds without dynamic stretching.
    """
    reflectance = preprocess_tensor(raw_tile)
    return reflectance, 0.0, 1.0


def to_tensor(stack: np.ndarray) -> torch.Tensor:
    """
    Converts numpy array to standard (1, 4, H, W) float32 PyTorch tensor.
    Handles (4, H, W) or (H, W, 4).
    """
    if isinstance(stack, torch.Tensor):
        t = stack.float()
        if t.ndim == 3:
            if t.shape[0] == 4:
                return t.unsqueeze(0)
            elif t.shape[2] == 4:
                return t.permute(2, 0, 1).unsqueeze(0)
        elif t.ndim == 4:
            return t
        raise ValueError(f"Unexpected tensor shape: {stack.shape}")

    arr = np.asarray(stack, dtype=np.float32)
    if arr.ndim == 3:
        if arr.shape[0] == 4:
            # (4, H, W)
            pass
        elif arr.shape[2] == 4:
            # (H, W, 4) -> (4, H, W)
            arr = np.transpose(arr, (2, 0, 1))
        else:
            raise ValueError(f"Expected 4 channels in stack, got shape {arr.shape}")
        return torch.from_numpy(arr).unsqueeze(0)
    elif arr.ndim == 4:
        if arr.shape[1] == 4:
            return torch.from_numpy(arr)
        elif arr.shape[3] == 4:
            return torch.from_numpy(np.transpose(arr, (0, 3, 1, 2)))

    raise ValueError(f"Unexpected array dimensions: {arr.shape}")


def cloud_mask_from_scl(scl: np.ndarray) -> np.ndarray:
    """Boolean mask: True where SCL indicates cloud, shadow, or cirrus."""
    return np.isin(scl, _CLOUD_SCL_VALUES)


def _sh_config():
    """Build Sentinel Hub config routed to Copernicus Data Space Ecosystem (CDSE)."""
    if SHConfig is None:
        raise RuntimeError("sentinelhub package is not installed.")
    cfg = SHConfig()
    cfg.sh_client_id = os.environ.get("SH_CLIENT_ID")
    cfg.sh_client_secret = os.environ.get("SH_CLIENT_SECRET")
    cfg.sh_base_url = _CDSE_SH_BASE_URL
    cfg.sh_token_url = _CDSE_TOKEN_URL
    return cfg


def fetch_and_load_aoi(lat_min, lon_min, lat_max, lon_max, date,
                       max_cloud=10, resolution=10):
    """
    Fetch the AOI directly from Sentinel Hub Process API at native 10m.
    Returns:
        stack: (4, H, W) float32 in [0, 1] BOA reflectance -- B02, B03, B04, B08
        scl:   (H, W) uint8 -- Scene Classification Layer
        meta:  dict with bbox, datetime, size, resolution
    """
    if SentinelHubRequest is None:
        raise RuntimeError("sentinelhub package is not installed.")

    config = _sh_config()
    bbox = BBox([lon_min, lat_min, lon_max, lat_max], crs=CRS.WGS84)

    mid_lat = (lat_min + lat_max) / 2.0
    width_m = (lon_max - lon_min) * 111320.0 * np.cos(np.radians(mid_lat))
    height_m = (lat_max - lat_min) * 110540.0
    width_px = max(16, int(round(width_m / resolution)))
    height_px = max(16, int(round(height_m / resolution)))

    evalscript = """
    //VERSION=3
    function setup() {
      return {
        input: ["B02", "B03", "B04", "B08", "SCL"],
        output: { bands: 5, sampleType: "FLOAT32" }
      };
    }
    function evaluatePixel(s) {
      return [s.B02, s.B03, s.B04, s.B08, s.SCL];
    }
    """

    time_range = (f"{date}T00:00:00Z", f"{date}T23:59:59Z")

    request = SentinelHubRequest(
        evalscript=evalscript,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=time_range,
                maxcc=max_cloud / 100.0,
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
        bbox=bbox,
        size=(width_px, height_px),
        config=config,
    )

    data = request.get_data()[0]  # (H, W, 5) float32
    raw_bands = data[:, :, :4]
    scl = np.round(data[:, :, 4]).astype(np.uint8)

    # Convert to physical BOA reflectance clamped in [0.0, 1.0]
    t = torch.from_numpy(raw_bands).permute(2, 0, 1)  # (4, H, W)
    refl_t = preprocess_tensor(t)
    stack = refl_t.numpy()

    meta = {
        "bbox": [lon_min, lat_min, lon_max, lat_max],
        "datetime": date,
        "size": (height_px, width_px),
        "resolution_m": resolution,
    }
    return stack, scl, meta
