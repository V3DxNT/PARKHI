"""
Scientific Postprocessing and GIS Export Module for Parkhi 2x Super-Resolution.
Converts physical BOA reflectance into scientific GeoTIFFs (16-bit uint16 L2A DN),
true-color visual previews (uint8 [0, 255]), and RGBA epistemic uncertainty maps.
"""

import os
import io
from typing import Optional, Union, Tuple
import cv2
import numpy as np
import torch
from PIL import Image
import matplotlib.cm as cm
import rasterio
from rasterio.transform import from_bounds, Affine


def percentile_stretch_channel(
    band: np.ndarray, low: float = 2.0, high: float = 98.0
) -> np.ndarray:
    """
    Per-channel 2nd to 98th percentile dynamic range stretching to [0.0, 1.0].
    NaN-aware.
    """
    valid = np.isfinite(band)
    if not valid.any():
        return np.zeros_like(band, dtype=np.float32)

    lo, hi = np.nanpercentile(band[valid], [low, high])
    if hi - lo < 1e-6:
        stretched = np.clip(band, 0.0, 1.0)
    else:
        stretched = np.clip((band - lo) / (hi - lo), 0.0, 1.0)

    return np.where(valid, stretched, 0.0).astype(np.float32)


def generate_enhanced_preview(
    rgb_tensor: Union[np.ndarray, torch.Tensor],
    high_dpi: bool = True,
    target_size: Optional[Tuple[int, int]] = (512, 512),
    sharpen: bool = True,
) -> np.ndarray:
    """
    Generates an enhanced 8-bit true-color visual RGB preview using global percentile
    stretching, LAB-space CLAHE, and photographic unsharp masking.

    Args:
        rgb_tensor: (3, H, W) normalized in [0, 1] (B04, B03, B02), (4, H, W) [B02, B03, B04, B08],
                    or (H, W, 3) HWC array.
        high_dpi: If True, resizes preview to target_size for crisp web presentation.
        target_size: Output presentation resolution (default: (512, 512)).
        sharpen: If True, applies an unsharp mask to crispen parcel and building boundaries.

    Returns:
        uint8 (H, W, 3) RGB image in [0, 255].
    """
    if isinstance(rgb_tensor, torch.Tensor):
        rgb_tensor = rgb_tensor.detach().cpu().numpy()
    if rgb_tensor.ndim == 4:
        rgb_tensor = rgb_tensor.squeeze(0)

    # Convert to HWC RGB [B04, B03, B02] -> [Red, Green, Blue]
    if rgb_tensor.ndim == 3:
        if rgb_tensor.shape[-1] == 4:
            # (H, W, 4) in [B02, B03, B04, B08] -> RGB [B04, B03, B02]
            img = rgb_tensor[:, :, [2, 1, 0]].astype(np.float32)
        elif rgb_tensor.shape[0] == 4:
            # (4, H, W) in [B02, B03, B04, B08] -> HWC RGB [B04, B03, B02]
            img = rgb_tensor[[2, 1, 0]].transpose(1, 2, 0).astype(np.float32)
        elif rgb_tensor.shape[0] == 3:
            # (3, H, W) in [B04, B03, B02] -> HWC RGB
            img = np.transpose(rgb_tensor, (1, 2, 0)).astype(np.float32)
        elif rgb_tensor.shape[-1] == 3:
            # (H, W, 3) already HWC RGB
            img = rgb_tensor.astype(np.float32)
        else:
            img = rgb_tensor[:, :, :3].astype(np.float32)
    else:
        img = rgb_tensor.astype(np.float32)

    # 1. Sanitize NaN / Inf values
    img = np.nan_to_num(img, nan=0.0, posinf=1.0, neginf=0.0)

    # 2. Consistent 2nd - 98th Percentile Dynamic Stretch (preserves true-color chromatic balance)
    p2, p98 = np.nanpercentile(img, (2.0, 98.0))
    if p98 - p2 < 1e-5:
        img_stretched = np.clip(img, 0.0, 1.0)
    else:
        img_stretched = np.clip((img - p2) / (p98 - p2), 0.0, 1.0)

    # Convert to 8-bit uint8
    img_8u = (img_stretched * 255.0).astype(np.uint8)

    # 3. High-DPI resizing if requested
    if high_dpi and target_size is not None:
        try:
            interp = cv2.INTER_CUBIC if sharpen else cv2.INTER_NEAREST
            img_8u = cv2.resize(img_8u, target_size, interpolation=interp)
        except Exception:
            pass

    # 4. LAB Space CLAHE (Sharpens contrast without altering color ratios)
    try:
        lab = cv2.cvtColor(img_8u, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        tile_h = max(2, min(8, img_8u.shape[0] // 16))
        tile_w = max(2, min(8, img_8u.shape[1] // 16))
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(tile_w, tile_h))
        l_clahe = clahe.apply(l)
        lab_enhanced = cv2.merge((l_clahe, a, b))
        enhanced_rgb = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)
    except Exception:
        enhanced_rgb = img_8u

    # 5. Unsharp Masking (USM) for crisp parcel and building boundaries
    if sharpen:
        try:
            gaussian = cv2.GaussianBlur(enhanced_rgb, (0, 0), sigmaX=1.5)
            sharpened = cv2.addWeighted(enhanced_rgb, 1.4, gaussian, -0.4, 0)
            return np.clip(sharpened, 0, 255).astype(np.uint8)
        except Exception:
            pass

    return enhanced_rgb


def generate_enhanced_preview_png_bytes(
    rgb_tensor: Union[np.ndarray, torch.Tensor],
    high_dpi: bool = True,
    target_size: Optional[Tuple[int, int]] = (512, 512),
    sharpen: bool = True,
) -> bytes:
    """Encodes enhanced true-color visual RGB preview into PNG bytes."""
    rgb_uint8 = generate_enhanced_preview(
        rgb_tensor,
        high_dpi=high_dpi,
        target_size=target_size,
        sharpen=sharpen,
    )
    buf = io.BytesIO()
    Image.fromarray(rgb_uint8, mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


def generate_preview_rgb_uint8(
    sr_np: Union[np.ndarray, torch.Tensor],
    ref_percentiles: Optional[Tuple[float, float]] = None,
    sharpen: bool = False,
    high_dpi: bool = True,
    target_size: Optional[Tuple[int, int]] = (512, 512),
    enhanced: bool = False,
) -> np.ndarray:
    """
    Generates 8-bit true-color visual RGB preview from 4-band array [B02, B03, B04, B08].
    Channel mapping:
        Red:   Channel 2 (B04 - 665nm)
        Green: Channel 1 (B03 - 560nm)
        Blue:  Channel 0 (B02 - 490nm)
    Applies standard per-channel 2nd to 98th percentile contrast stretching,
    normalizing each spectral channel cleanly to produce authentic, balanced true-color imagery.
    If enhanced=True:
        Delegates to generate_enhanced_preview() with LAB CLAHE and unsharp masking.
    If high_dpi=True:
        - Upscales presentation asset to target_size (512x512) using INTER_CUBIC (for SR) or INTER_NEAREST (for LR).
        - If sharpen=True, applies a mild photographic unsharp mask post-upscale to crispen features
          while preserving exact 1:1 exposure sync.
    Returns: (H, W, 3) uint8 in [0, 255].
    """
    if enhanced:
        return generate_enhanced_preview(
            sr_np,
            high_dpi=high_dpi,
            target_size=target_size,
            sharpen=sharpen,
        )

    if isinstance(sr_np, torch.Tensor):
        sr_np = sr_np.detach().cpu().numpy()
    if sr_np.ndim == 4:
        sr_np = sr_np.squeeze(0)

    # Convert to HWC RGB array [B04, B03, B02] -> [2, 1, 0]
    if sr_np.shape[0] == 4 and sr_np.ndim == 3:
        arr = sr_np[[2, 1, 0]].transpose(1, 2, 0)
    else:
        arr = sr_np[:, :, [2, 1, 0]]

    # Per-channel percentile stretch (preserves identical exposure curves across both LR and SR)
    h, w, c = arr.shape
    arr_stretched = np.zeros_like(arr, dtype=np.float32)
    for i in range(c):
        arr_stretched[:, :, i] = percentile_stretch_channel(arr[:, :, i], low=2.0, high=98.0)

    # Convert to uint8 for PNG saving
    rgb_uint8 = (arr_stretched * 255.0).astype(np.uint8)

    # High-DPI upscaling to presentation dimensions (512x512)
    if high_dpi and target_size is not None:
        try:
            interp = cv2.INTER_CUBIC if sharpen else cv2.INTER_NEAREST
            rgb_uint8 = cv2.resize(rgb_uint8, target_size, interpolation=interp)
        except Exception:
            pass

    # Post-upscale photographic unsharp mask (removes cubic sinc-blur and crisps micro-features)
    if sharpen:
        try:
            blurred = cv2.GaussianBlur(rgb_uint8, (0, 0), sigmaX=1.0)
            rgb_uint8 = cv2.addWeighted(rgb_uint8, 1.4, blurred, -0.4, 0)
        except Exception:
            pass

    return rgb_uint8


def get_rgb_percentiles(
    sr_np: Union[np.ndarray, torch.Tensor], low: float = 2.0, high: float = 98.0
) -> Tuple[float, float]:
    """Computes global (p2, p98) percentiles across RGB channels [B04, B03, B02]."""
    if isinstance(sr_np, torch.Tensor):
        sr_np = sr_np.detach().cpu().numpy()
    if sr_np.ndim == 4:
        sr_np = sr_np.squeeze(0)
    if sr_np.shape[0] == 4 and sr_np.ndim == 3:
        arr = sr_np[[2, 1, 0]].transpose(1, 2, 0)
    else:
        arr = sr_np[:, :, [2, 1, 0]]
    p2, p98 = np.percentile(arr, (low, high))
    return float(p2), float(p98)


def generate_preview_png_bytes(
    sr_np: Union[np.ndarray, torch.Tensor],
    ref_percentiles: Optional[Tuple[float, float]] = None,
    sharpen: bool = False,
    high_dpi: bool = True,
    target_size: Optional[Tuple[int, int]] = (512, 512),
    enhanced: bool = False,
) -> bytes:
    """Encodes true-color RGB preview array into PNG bytes."""
    rgb_uint8 = generate_preview_rgb_uint8(
        sr_np,
        ref_percentiles=ref_percentiles,
        sharpen=sharpen,
        high_dpi=high_dpi,
        target_size=target_size,
        enhanced=enhanced,
    )
    buf = io.BytesIO()
    Image.fromarray(rgb_uint8, mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


# Symmetrical aliases for LR (Original) and SR (Super-Resolved) previews
def generate_original_preview_rgb_uint8(
    sr_np, ref_percentiles=None, high_dpi=True, target_size: Optional[Tuple[int, int]] = (512, 512)
) -> np.ndarray:
    return generate_preview_rgb_uint8(
        sr_np, ref_percentiles=ref_percentiles, sharpen=False, high_dpi=high_dpi, target_size=target_size
    )


def generate_sr_preview_rgb_uint8(
    sr_np, ref_percentiles=None, high_dpi=True, target_size: Optional[Tuple[int, int]] = (512, 512)
) -> np.ndarray:
    return generate_preview_rgb_uint8(
        sr_np, ref_percentiles=ref_percentiles, sharpen=True, high_dpi=high_dpi, target_size=target_size
    )


def generate_original_preview_png_bytes(
    sr_np, ref_percentiles=None, high_dpi=True, target_size: Optional[Tuple[int, int]] = (512, 512)
) -> bytes:
    return generate_preview_png_bytes(
        sr_np, ref_percentiles=ref_percentiles, sharpen=False, high_dpi=high_dpi, target_size=target_size
    )


def generate_sr_preview_png_bytes(
    sr_np, ref_percentiles=None, high_dpi=True, target_size: Optional[Tuple[int, int]] = (512, 512)
) -> bytes:
    return generate_preview_png_bytes(
        sr_np, ref_percentiles=ref_percentiles, sharpen=True, high_dpi=high_dpi, target_size=target_size
    )


def generate_uncertainty_png_bytes(
    uncertainty: Union[np.ndarray, torch.Tensor],
    colormap: str = "turbo",
) -> bytes:
    """
    Colormaps pixel epistemic variance using Matplotlib (turbo or inferno)
    and encodes as RGBA PNG bytes.
    """
    if isinstance(uncertainty, torch.Tensor):
        uncertainty = uncertainty.detach().cpu().numpy()
    if uncertainty.ndim == 4:
        uncertainty = uncertainty.squeeze(0).squeeze(0)
    elif uncertainty.ndim == 3:
        uncertainty = uncertainty.squeeze(0)

    finite = np.isfinite(uncertainty)
    if not finite.any():
        norm = np.zeros_like(uncertainty, dtype=np.float32)
    else:
        lo, hi = np.nanpercentile(uncertainty[finite], [2.0, 98.0])
        if hi - lo < 1e-8:
            norm = np.zeros_like(uncertainty, dtype=np.float32)
        else:
            norm = np.clip((uncertainty - lo) / (hi - lo), 0.0, 1.0)
        norm = np.where(finite, norm, 0.0)

    cmap = cm.turbo if colormap == "turbo" else cm.inferno
    rgba_float = cmap(norm)  # (H, W, 4) in [0, 1]
    rgba_uint8 = (rgba_float * 255.0).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(rgba_uint8, mode="RGBA").save(buf, format="PNG")
    return buf.getvalue()


def convert_reflectance_to_l2a_dn(sr_np: np.ndarray) -> np.ndarray:
    """
    Converts physical BOA reflectance in [0.0, 1.0] back to Sentinel-2 L2A Digital Numbers:
        DN_out = np.clip(SR_mean * 10000.0, 0, 10000).astype(np.uint16)
    """
    if isinstance(sr_np, torch.Tensor):
        sr_np = sr_np.detach().cpu().numpy()
    if sr_np.ndim == 4:
        sr_np = sr_np.squeeze(0)
    if sr_np.shape[0] == 4 and sr_np.ndim == 3:
        sr_np = np.transpose(sr_np, (1, 2, 0))

    dn = np.clip(sr_np * 10000.0, 0, 10000).astype(np.uint16)
    return dn


def scale_transform_for_2x(transform: Affine) -> Affine:
    """
    Scales affine geotransform resolution by 0.5 (10m -> 5m GSD).
    """
    # Halving the pixel dimensions dx and dy:
    # [a, b, c, d, e, f] -> a/2, e/2
    return transform * Affine.scale(0.5, 0.5)


def scale_transform_for_4x(transform: Affine) -> Affine:
    """
    Scales affine geotransform resolution by 0.25 (10m -> 2.5m GSD).
    """
    return transform * Affine.scale(0.25, 0.25)


def generate_geotiff_bytes(
    sr_np: np.ndarray,
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    transform: Optional[Affine] = None,
    crs: str = "EPSG:4326",
    dtype: str = "uint16",
    cloud_mask: Optional[np.ndarray] = None,
) -> bytes:
    """
    Generates georeferenced 4-band GeoTIFF in memory with 5m GSD resolution.
    Bands: B02, B03, B04, B08.
    """
    if isinstance(sr_np, torch.Tensor):
        sr_np = sr_np.detach().cpu().numpy()
    if sr_np.ndim == 4:
        sr_np = sr_np.squeeze(0)
    if sr_np.shape[0] == 4 and sr_np.ndim == 3:
        sr_np = np.transpose(sr_np, (1, 2, 0))

    h, w, c = sr_np.shape

    if transform is None:
        transform = from_bounds(min_lon, min_lat, max_lon, max_lat, w, h)

    if dtype == "uint16":
        arr_out = convert_reflectance_to_l2a_dn(sr_np)
        out_dtype = "uint16"
        nodata = 0
    else:
        arr_out = np.clip(sr_np, 0.0, 1.0).astype(np.float32)
        out_dtype = "float32"
        nodata = np.nan

    with rasterio.MemoryFile() as memfile:
        with memfile.open(
            driver="GTiff",
            height=h,
            width=w,
            count=4,
            dtype=out_dtype,
            crs=crs,
            transform=transform,
            compress="deflate",
            nodata=nodata,
            photometric="MINISBLACK",
        ) as dst:
            for i, name in enumerate(["B02", "B03", "B04", "B08"]):
                dst.write(arr_out[:, :, i], i + 1)
                dst.set_band_description(i + 1, name)
        return memfile.read()


def save_geotiff(
    sr_np: np.ndarray,
    uncertainty: Optional[np.ndarray],
    output_dir: str,
    prefix: str = "sr_geo",
    transform: Optional[Affine] = None,
    crs: str = "EPSG:4326",
    cloud_mask: Optional[np.ndarray] = None,
    bounds: Optional[Tuple[float, float, float, float]] = None,
) -> str:
    """
    Saves scientific GeoTIFF to disk.
    If 5 bands, band 5 contains uncertainty variance scaled to uint16.
    """
    os.makedirs(output_dir, exist_ok=True)
    if isinstance(sr_np, torch.Tensor):
        sr_np = sr_np.detach().cpu().numpy()
    if sr_np.ndim == 4:
        sr_np = sr_np.squeeze(0)
    if sr_np.shape[0] == 4 and sr_np.ndim == 3:
        sr_np = np.transpose(sr_np, (1, 2, 0))

    h, w, _ = sr_np.shape

    if transform is None:
        if bounds is not None:
            min_lon, min_lat, max_lon, max_lat = bounds
            transform = from_bounds(min_lon, min_lat, max_lon, max_lat, w, h)
        else:
            raise ValueError("Either transform or bounds must be provided.")

    dn_out = convert_reflectance_to_l2a_dn(sr_np)
    path = os.path.join(output_dir, f"{prefix}.tif")

    has_unc = uncertainty is not None
    count = 5 if has_unc else 4

    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=h,
        width=w,
        count=count,
        dtype="uint16",
        crs=crs,
        transform=transform,
        compress="deflate",
        nodata=0,
    ) as dst:
        for i, name in enumerate(["B02", "B03", "B04", "B08"]):
            dst.write(dn_out[:, :, i], i + 1)
            dst.set_band_description(i + 1, name)
        if has_unc:
            unc_dn = np.clip(uncertainty * 10000.0, 0, 65535).astype(np.uint16)
            dst.write(unc_dn, 5)
            dst.set_band_description(5, "uncertainty")

    return path


def save_rgb_png(sr_np: np.ndarray, output_dir: str, prefix: str = "sr_rgb", sharpen: bool = False) -> str:
    """Saves visual RGB preview PNG."""
    os.makedirs(output_dir, exist_ok=True)
    rgb_uint8 = generate_preview_rgb_uint8(sr_np, sharpen=sharpen)
    path = os.path.join(output_dir, f"{prefix}.png")
    Image.fromarray(rgb_uint8).save(path)
    return path


def save_cir_png(sr_np: np.ndarray, output_dir: str, prefix: str = "sr_cir") -> str:
    """Color-Infrared false-color: NIR (B08), Red (B04), Green (B03) -> [3, 2, 1]."""
    os.makedirs(output_dir, exist_ok=True)
    if isinstance(sr_np, torch.Tensor):
        sr_np = sr_np.detach().cpu().numpy()
    if sr_np.shape[0] == 4 and sr_np.ndim == 3:
        sr_np = np.transpose(sr_np, (1, 2, 0))

    cir = sr_np[:, :, [3, 2, 1]]
    p2, p98 = np.percentile(cir, (2, 98))
    stretched_cir = np.clip((cir - p2) / (p98 - p2 + 1e-6), 0.0, 1.0)
    cir_uint8 = (stretched_cir * 255.0).astype(np.uint8)
    path = os.path.join(output_dir, f"{prefix}.png")
    Image.fromarray(cir_uint8).save(path)
    return path


def save_uncertainty_png(
    uncertainty: np.ndarray, output_dir: str, prefix: str = "sr_uncertainty"
) -> str:
    """Saves uncertainty heatmap PNG."""
    os.makedirs(output_dir, exist_ok=True)
    png_bytes = generate_uncertainty_png_bytes(uncertainty, colormap="turbo")
    path = os.path.join(output_dir, f"{prefix}.png")
    with open(path, "wb") as f:
        f.write(png_bytes)
    return path


# Backward compatibility no-op denormalizer (since reflectances are already physical BOA)
def denormalize_to_physical(tensor, min_val=0.0, max_val=1.0):
    """Reflectance values are already physical BOA reflectances [0.0, 1.0]."""
    if isinstance(tensor, torch.Tensor):
        return torch.clamp(tensor, 0.0, 1.0)
    return np.clip(tensor, 0.0, 1.0)


def align_spectral_distribution(sr_np, ref_lr):
    """Preserved for backward compatibility."""
    return sr_np


def save_pngs(sr_np, uncertainty, output_dir, prefix="sr"):
    """Saves preview PNG and uncertainty PNG."""
    rgb = save_rgb_png(sr_np, output_dir, f"preview_{prefix}")
    unc = save_uncertainty_png(uncertainty, output_dir, f"uncert_{prefix}")
    return rgb, unc


def save_super_resolved_results(
    sr_tensor: Union[np.ndarray, torch.Tensor],
    job_id: str,
    output_dir: str,
    bounds: Optional[Tuple[float, float, float, float]] = None,
    transform: Optional[Affine] = None,
    crs: str = "EPSG:4326",
    uncertainty: Optional[np.ndarray] = None,
) -> Tuple[str, str]:
    """
    Saves scientific GeoTIFF and true-color visual preview PNG for super-resolved results.

    Step A: Writes scientific sr_<JOB_ID>.tif directly from float32 reflectance tensor
            (B02, B03, B04, B08) converted to 16-bit uint16 L2A DN via rasterio.
            Mathematical integrity is strictly preserved for downstream models.
    Step B: Extracts RGB bands (B04, B03, B02), applies percentile stretching + CLAHE,
            and saves locally as preview_<JOB_ID>.png.

    Returns:
        Tuple[str, str]: (geotiff_path, preview_path)
    """
    os.makedirs(output_dir, exist_ok=True)
    geotiff_dir = (
        os.path.join(output_dir, "geotiffs")
        if os.path.isdir(os.path.join(output_dir, "geotiffs"))
        else output_dir
    )
    preview_dir = (
        os.path.join(output_dir, "previews")
        if os.path.isdir(os.path.join(output_dir, "previews"))
        else output_dir
    )
    os.makedirs(geotiff_dir, exist_ok=True)
    os.makedirs(preview_dir, exist_ok=True)

    # ─── Step A: Scientific GeoTIFF Export (Strictly Pure & Untouched) ─────────
    geotiff_path = save_geotiff(
        sr_np=sr_tensor,
        uncertainty=uncertainty,
        output_dir=geotiff_dir,
        prefix=f"sr_{job_id}",
        transform=transform,
        crs=crs,
        bounds=bounds,
    )

    # ─── Step B: True-Color RGB Visual Preview Generation ──────────────────────
    preview_path = os.path.join(preview_dir, f"preview_{job_id}.png")
    rgb_uint8 = generate_preview_rgb_uint8(
        sr_tensor,
        sharpen=True,
        high_dpi=True,
        enhanced=True,
    )
    Image.fromarray(rgb_uint8, mode="RGB").save(preview_path, format="PNG")

    return geotiff_path, preview_path


