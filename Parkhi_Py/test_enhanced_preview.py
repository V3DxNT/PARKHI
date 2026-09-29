import sys
import os
import numpy as np
import torch

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.super_resolution.postprocess import (
    generate_enhanced_preview,
    generate_enhanced_preview_png_bytes,
    generate_preview_rgb_uint8,
    generate_preview_png_bytes,
)

def test_all():
    print("Running enhanced preview tests...")

    # 1. Test standard (3, 128, 128) array [B04, B03, B02]
    arr_3ch = np.random.uniform(0.05, 0.45, (3, 128, 128)).astype(np.float32)
    out1 = generate_enhanced_preview(arr_3ch, target_size=(256, 256))
    assert out1.shape == (256, 256, 3), f"Expected (256, 256, 3), got {out1.shape}"
    assert out1.dtype == np.uint8, f"Expected uint8, got {out1.dtype}"
    assert 0 <= out1.min() and out1.max() <= 255
    print("  [OK] Test 1: (3, H, W) NumPy input passed")

    # 2. Test 4-channel Sentinel-2 (4, 128, 128) array [B02, B03, B04, B08]
    arr_4ch = np.random.uniform(0.05, 0.45, (4, 128, 128)).astype(np.float32)
    out2 = generate_enhanced_preview(arr_4ch, target_size=(256, 256))
    assert out2.shape == (256, 256, 3), f"Expected (256, 256, 3), got {out2.shape}"
    assert out2.dtype == np.uint8
    print("  [OK] Test 2: (4, H, W) 4-band input passed")

    # 3. Test PyTorch Tensor (1, 4, 64, 64)
    tensor_4ch = torch.rand((1, 4, 64, 64), dtype=torch.float32)
    out3 = generate_enhanced_preview(tensor_4ch, target_size=None, high_dpi=False)
    assert out3.shape == (64, 64, 3), f"Expected (64, 64, 3), got {out3.shape}"
    assert out3.dtype == np.uint8
    print("  [OK] Test 3: PyTorch Tensor input passed")

    # 4. Test NaN and Inf handling
    arr_nan = arr_3ch.copy()
    arr_nan[0, 10:20, 10:20] = np.nan
    arr_nan[1, 30:40, 30:40] = np.inf
    out4 = generate_enhanced_preview(arr_nan, target_size=(128, 128))
    assert not np.isnan(out4).any(), "Output should have no NaNs"
    assert out4.dtype == np.uint8
    print("  [OK] Test 4: NaN and Inf sanitization passed")

    # 5. Test Flat / Zero-variance input
    arr_flat = np.full((3, 64, 64), 0.25, dtype=np.float32)
    out5 = generate_enhanced_preview(arr_flat, target_size=(64, 64))
    assert out5.shape == (64, 64, 3)
    assert out5.dtype == np.uint8
    print("  [OK] Test 5: Flat image handling passed")

    # 6. Test PNG byte encoding
    png_bytes = generate_enhanced_preview_png_bytes(arr_3ch, target_size=(256, 256))
    assert isinstance(png_bytes, bytes)
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n", "Must produce valid PNG header"
    print("  [OK] Test 6: PNG byte stream generation passed")

    # 7. Test integration flag in generate_preview_rgb_uint8(enhanced=True)
    out7 = generate_preview_rgb_uint8(arr_4ch, enhanced=True, target_size=(256, 256))
    assert out7.shape == (256, 256, 3)
    assert out7.dtype == np.uint8
    print("  [OK] Test 7: Integration flag (enhanced=True) passed")

    print("\nALL 7 TESTS PASSED SUCCESSFULLY! [PASS]")

if __name__ == "__main__":
    test_all()
