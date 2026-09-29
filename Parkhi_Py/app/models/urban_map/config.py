"""
Configuration settings for Model 4 Urban Analysis package.
"""

import os
import torch

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")
DEFAULT_WEIGHTS_PATH = os.path.join(WEIGHTS_DIR, "urban_model4_final.pkl")
FALLBACK_PTH_PATH = os.path.join(WEIGHTS_DIR, "model4_best.pth")

IMAGE_SIZE = (256, 256)
NUM_LULC_CLASSES = 7
BUILDING_THRESHOLD = 0.5

BATCH_SIZE = 8
NUM_WORKERS = 2
PIN_MEMORY = True
PERSISTENT_WORKERS = True

SEED = 42

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
