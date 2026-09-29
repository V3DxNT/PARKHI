# Model 4: Urban Map Analysis Module

This module provides a modular Python implementation of **Model 4: Residual U-Net Multi-Task Model** for building segmentation and Land Use / Land Cover (LULC) classification.

---

## 🏗️ Architecture

- **Backbone**: `ResNet34`
- **Decoder**: `ResidualDecoderBlock` with bilinear upsampling, skip connections, and residual projection shortcuts.
- **Input**: `256 × 256` RGB satellite / aerial imagery (`[B, 3, 256, 256]`).
- **Multi-Task Outputs**:
  1. **Building Segmentation Head**: Single-channel logits (`[B, 1, 256, 256]`). Prediction thresholded at `> 0.5`.
  2. **LULC Classification Head**: 7-channel logits (`[B, 7, 256, 256]`). Prediction computed via `argmax(logits, dim=1)`.

---

## 🏷️ LoveDA Class Mapping

| Raw LoveDA ID | Model 4 Class ID | Label Name | Palette Color (RGB) |
| :---: | :---: | :--- | :--- |
| `0` | `255` | No-data (Ignored) | `(0, 0, 0)` |
| `1` | `0` | Background | `(128, 128, 128)` |
| `2` | `1` | Building | `(255, 0, 0)` |
| `3` | `2` | Road | `(255, 255, 0)` |
| `4` | `3` | Water | `(0, 0, 255)` |
| `5` | `4` | Barren | `(165, 42, 42)` |
| `6` | `5` | Forest | `(0, 128, 0)` |
| `7` | `6` | Agriculture | `(0, 255, 0)` |

---

## 📁 Directory Structure

```
app/models/urban_map/
├── __init__.py           # Package API exports
├── config.py             # Hyperparameters, default paths, and constants
├── label_conversion.py   # LoveDA mask conversion and class dictionaries
├── model.py              # ResidualDecoderBlock & ResidualUNetMultiTask architecture
├── dataset.py            # UrbanDataset and reproducible 80/20 dataset splitter
├── preprocessing.py      # Image loading, normalization, and tensor formatting
├── losses.py             # MultiTaskLoss (BCE + Dice for building, CrossEntropy for LULC)
├── evaluate.py           # IoU, Dice, Precision, Recall, F1, and confusion matrix
├── train.py              # Training loop with AMP (Automatic Mixed Precision) & logging
├── inference.py          # load_model, run_inference, and UrbanMapPredictor
├── postprocess.py        # Mask colorization, PNG export, and GeoTIFF saving
├── visualization.py      # Matplotlib side-by-side comparative plots
├── utils.py              # Reproducibility seed setter and device selection
├── run_inference.py      # CLI runner script
├── test_local.py         # Unit testing and shape verification script
├── weights/              # Model weights directory (.pkl or .pth)
│   └── urban_model4_final.pkl
└── README.md
```

---

## 🚀 Quick Start & Usage

### 1. Python API

```python
from app.models.urban_map import UrbanMapPredictor

# Initialize predictor (loads default weights from weights/ directory)
predictor = UrbanMapPredictor()

# Run inference on an input image
results = predictor.predict("path/to/sample.png")

# Access predictions
building_mask = results["building_pred"]  # NumPy array [256, 256]
lulc_map = results["lulc_pred"]            # NumPy array [256, 256]
```

### 2. CLI Inference

```bash
python app/models/urban_map/run_inference.py --image path/to/sample.png --output_dir outputs_urban --visualize
```

### 3. Local Verification Tests

```bash
python app/models/urban_map/test_local.py
```
