#!/usr/bin/env python3
"""
Local unit test for urban_map module functionality and tensor shape verification.
"""

import sys
import os

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import numpy as np

# Ensure workspace root is on sys.path
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_CURRENT_DIR, "../../.."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from app.models.urban_map.model import ResidualUNetMultiTask
from app.models.urban_map.preprocessing import preprocess_image
from app.models.urban_map.inference import run_inference, load_model
from app.models.urban_map.label_conversion import convert_loveda_mask, CLASS_NAMES


def test_model_architecture():
    print("Testing Model 4 Architecture (ResidualUNetMultiTask)...")
    model = ResidualUNetMultiTask(num_lulc_classes=7, pretrained=False)
    model.eval()

    dummy_input = torch.randn(1, 3, 256, 256)
    with torch.no_grad():
        b_logits, l_logits = model(dummy_input)

    assert b_logits.shape == (1, 1, 256, 256), f"Expected building logits (1, 1, 256, 256), got {b_logits.shape}"
    assert l_logits.shape == (1, 7, 256, 256), f"Expected LULC logits (1, 7, 256, 256), got {l_logits.shape}"
    print(" Architecture test passed! Building logits shape:", b_logits.shape, "LULC logits shape:", l_logits.shape)


def test_preprocessing():
    print("\nTesting Image Preprocessing...")
    dummy_img = np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8)
    tensor = preprocess_image(dummy_img)

    assert tensor.shape == (1, 3, 256, 256), f"Expected tensor shape (1, 3, 256, 256), got {tensor.shape}"
    assert tensor.dtype == torch.float32, f"Expected float32 dtype, got {tensor.dtype}"
    print(" Preprocessing test passed! Tensor shape:", tensor.shape)


def test_inference_pipeline():
    print("\nTesting Inference Pipeline...")
    model = load_model(weights_path=None, device="cpu")
    dummy_input = torch.randn(1, 3, 256, 256)

    results = run_inference(model, dummy_input, device="cpu")

    assert "building_pred" in results, "Missing 'building_pred' key"
    assert "lulc_pred" in results, "Missing 'lulc_pred' key"
    assert results["building_pred"].shape == (256, 256), f"Expected building_pred (256, 256), got {results['building_pred'].shape}"
    assert results["lulc_pred"].shape == (256, 256), f"Expected lulc_pred (256, 256), got {results['lulc_pred'].shape}"
    print(" Inference pipeline test passed! Building pred shape:", results["building_pred"].shape, "LULC pred shape:", results["lulc_pred"].shape)


def test_label_conversion():
    print("\nTesting LoveDA Label Conversion...")
    raw_mask = np.array([[0, 1, 2], [3, 4, 5], [6, 7, 0]], dtype=np.uint8)
    converted = convert_loveda_mask(raw_mask)
    expected = np.array([[255, 0, 1], [2, 3, 4], [5, 6, 255]], dtype=np.int64)

    assert np.array_equal(converted, expected), f"Label conversion mismatch! Got:\n{converted}\nExpected:\n{expected}"
    print(" LoveDA label conversion test passed!")


if __name__ == "__main__":
    print("==================================================")
    print("RUNNING URBAN_MAP LOCAL VERIFICATION TESTS")
    print("==================================================")
    test_model_architecture()
    test_preprocessing()
    test_inference_pipeline()
    test_label_conversion()
    print("\n ALL URBAN_MAP LOCAL TESTS PASSED SUCCESSFULLY!")
