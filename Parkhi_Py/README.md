# 🧠 Parkhi_Py: Deep Learning Super-Resolution & Geospatial ML Engine

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![gRPC](https://img.shields.io/badge/gRPC-Server%20(:50051)-244f5c?logo=grpc&logoColor=white)](https://grpc.io)
[![Model](https://img.shields.io/badge/Model-MCDropout%20HAT-purple)](https://arxiv.org/abs/2205.04437)

**Parkhi_Py** is the Python deep learning microservice powering the Parkhi platform. It runs on PyTorch and provides high-performance inference via a compiled gRPC protobuf interface on port `50051`.

---

## 🔬 Deep Learning Architectures & Pipeline

```
Raw 10m Sentinel-2 Tensor (B02, B03, B04, B08)
                      │
                      ▼
        ┌───────────────────────────┐
        │  Radiometric Calibration  │
        │  & Reflectance Scaling    │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │       MCDropout HAT       │
        │  Hybrid Attention 2x SR   │
        └─────────────┬─────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│ Super-Resolved│           │   Epistemic   │
│  4m GSD Patch │           │  Uncertainty  │
└───────┬───────┘           │ Heatmap (σ²)  │
        │                   └───────────────┘
        ├──────────────────────┬──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  DeepLabV3+   │      │   NDVI Vigor  │      │ Siamese Diff  │
│  Urban Map    │      │  Canopy Yield │      │ Disaster Map  │
└───────────────┘      └───────────────┘      └───────────────┘
```

### 1. Super-Resolution: MCDropout HAT
- **Backbone:** Hybrid Attention Transformer (HAT) combining Window Self-Attention and Overlapping Cross-Attention Blocks (OCAB).
- **Bayesian Epistemic Uncertainty:** Monte Carlo Dropout ($p=0.15$) enabled during inference across $T=10$ stochastic passes.
  $$\text{Mean: } \hat{y} = \frac{1}{T} \sum_{t=1}^T f_{\hat{W}_t}(x), \quad \text{Variance: } \sigma^2 = \frac{1}{T} \sum_{t=1}^T \left(f_{\hat{W}_t}(x) - \hat{y}\right)^2$$
- **Multi-Spectral Bands:** Operates concurrently across Optical ($B02, B03, B04$) and Near-Infrared ($B08$).

### 2. Downstream Analytical Models
- **Urban Land-Use Segmentation (`app/models/urban_map`):**
  - Architecture: DeepLabV3+ with ResNet-101 backbone.
  - Detects residential zones, commercial complexes, industrial footprints, and bare land.
- **Crop Health & Canopy Vigor (`app/models/crop_ndvi`):**
  - High-precision NDVI calculation using super-resolved Red ($B04$) and NIR ($B08$) bands:
    $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$$
  - Classifies agricultural zones into High Vigor, Moderate Vigor, Stressed/Sparse, and Fallow.
- **Bi-Temporal Disaster Assessment (`app/models/disaster`):**
  - Siamese difference architecture comparing pre-event and post-event satellite acquisitions.
  - Classifies structural damage severity (Severe Damage, Moderate Damage, Intact).

---

## 📂 Model Directory Structure

```
Parkhi_Py/
├── app/
│   ├── grpc_server/server.py             # gRPC service implementation
│   ├── models/
│   │   ├── super_resolution/             # HAT architecture, pipeline, uncertainty
│   │   │   ├── hat_arch.py               # Model definition
│   │   │   ├── uncertainty.py           # MC-Dropout variance computation
│   │   │   └── weights/HAT_S_best.pth    # PyTorch model weights
│   │   ├── urban_map/                    # DeepLabV3+ semantic segmentation
│   │   │   └── weights/model4_urban_analysis_FINAL.pth
│   │   ├── crop_ndvi/                    # Multispectral NDVI pipeline
│   │   └── disaster/                     # Siamese damage assessment model
├── proto/
│   ├── satellite.proto                   # Protocol Buffer specification
│   ├── satellite_pb2.py
│   └── satellite_pb2_grpc.py
└── requirements.txt
```

---

## 🚀 Running Locally

```bash
# Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start gRPC ML Server
python -m app.main
```

The gRPC server will listen on `0.0.0.0:50051`.
