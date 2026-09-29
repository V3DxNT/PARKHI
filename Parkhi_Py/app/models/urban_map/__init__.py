"""
Model 4 Urban Map Python Module.
Provides Residual U-Net Multi-Task architecture for building segmentation and land-use / land-cover classification.
"""

from app.models.urban_map.config import (
    IMAGE_SIZE,
    NUM_LULC_CLASSES,
    BUILDING_THRESHOLD,
    BATCH_SIZE,
    SEED,
)
from app.models.urban_map.label_conversion import (
    LABEL_MAP,
    CLASS_NAMES,
    convert_loveda_mask,
)
from app.models.urban_map.model import (
    ResidualUNetMultiTask,
    ResidualDecoderBlock,
    UrbanMultiTaskModel,
)
from app.models.urban_map.dataset import (
    UrbanDataset,
    get_train_val_datasets,
    create_dataloaders,
)
from app.models.urban_map.preprocessing import (
    preprocess_image,
    denormalize_image,
)
from app.models.urban_map.losses import (
    MultiTaskLoss,
    DiceLoss,
    multitask_loss,
)
from app.models.urban_map.evaluate import (
    calculate_metrics,
    evaluate_model,
)
from app.models.urban_map.inference import (
    load_model,
    run_inference,
    UrbanMapPredictor,
)
from app.models.urban_map.postprocess import (
    color_map_lulc,
    save_pngs,
    save_geotiff,
)

__all__ = [
    "IMAGE_SIZE",
    "NUM_LULC_CLASSES",
    "BUILDING_THRESHOLD",
    "BATCH_SIZE",
    "SEED",
    "LABEL_MAP",
    "CLASS_NAMES",
    "convert_loveda_mask",
    "ResidualUNetMultiTask",
    "ResidualDecoderBlock",
    "UrbanMultiTaskModel",
    "UrbanDataset",
    "get_train_val_datasets",
    "create_dataloaders",
    "preprocess_image",
    "denormalize_image",
    "MultiTaskLoss",
    "DiceLoss",
    "multitask_loss",
    "calculate_metrics",
    "evaluate_model",
    "load_model",
    "run_inference",
    "UrbanMapPredictor",
    "color_map_lulc",
    "save_pngs",
    "save_geotiff",
]
