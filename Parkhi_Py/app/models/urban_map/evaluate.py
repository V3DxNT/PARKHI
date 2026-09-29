"""
Evaluation metrics for Model 4 (Building IoU/Dice/Precision/Recall/F1 and LULC per-class IoU/mIoU).
"""

import torch
import numpy as np
from typing import Dict, Tuple, Any
try:
    from tqdm.auto import tqdm
except ImportError:
    def tqdm(iterable, *args, **kwargs):
        return iterable

from app.models.urban_map.config import NUM_LULC_CLASSES, BUILDING_THRESHOLD
from app.models.urban_map.label_conversion import CLASS_NAMES


def calculate_metrics(
    predictions: torch.Tensor,
    targets: torch.Tensor,
    threshold: float = BUILDING_THRESHOLD,
    smooth: float = 1e-6,
) -> Tuple[float, float, float, float]:
    """
    Computes building segmentation metrics for a single batch.

    Returns:
        Tuple of (iou, dice, intersection, union)
    """
    probs = torch.sigmoid(predictions)
    pred = (probs >= threshold).float().view(predictions.size(0), -1)
    target = (targets > 0.5).float().view(targets.size(0), -1)

    intersection = (pred * target).sum(dim=1)
    union = pred.sum(dim=1) + target.sum(dim=1) - intersection

    iou = (intersection + smooth) / (union + smooth)
    dice = (2.0 * intersection + smooth) / (
        pred.sum(dim=1) + target.sum(dim=1) + smooth
    )

    return iou.mean().item(), dice.mean().item(), intersection.mean().item(), union.mean().item()


@torch.no_grad()
def evaluate_model(
    model: torch.nn.Module,
    val_loader: torch.utils.data.DataLoader,
    device: torch.device,
    threshold: float = BUILDING_THRESHOLD,
    num_classes: int = NUM_LULC_CLASSES,
) -> Dict[str, Any]:
    """
    Runs full evaluation over validation dataset loader.

    Returns:
        Dict containing building metrics (IoU, Dice, Precision, Recall, F1)
        and LULC metrics (Per-class IoU, Mean IoU, Pixel Accuracy, Confusion Matrix).
    """
    model.eval()
    confusion = torch.zeros(num_classes, num_classes, dtype=torch.long, device=device)

    building_tp = 0
    building_fp = 0
    building_fn = 0

    for images, building_target, lulc_target in tqdm(val_loader, desc="Evaluating"):
        images = images.to(device, non_blocking=True)
        building_target = building_target.to(device, non_blocking=True)
        lulc_target = lulc_target.to(device, non_blocking=True)

        building_logits, lulc_logits = model(images)

        # Building statistics
        pred = (torch.sigmoid(building_logits) >= threshold).long().flatten()
        gt = (building_target >= 0.5).long().flatten()

        building_tp += ((pred == 1) & (gt == 1)).sum().item()
        building_fp += ((pred == 1) & (gt == 0)).sum().item()
        building_fn += ((pred == 0) & (gt == 1)).sum().item()

        # LULC confusion matrix
        lulc_pred = torch.argmax(lulc_logits, dim=1)
        valid = lulc_target != 255

        p = lulc_pred[valid].flatten()
        t = lulc_target[valid].flatten()

        idx = t * num_classes + p
        binc = torch.bincount(idx, minlength=num_classes * num_classes)
        confusion += binc.view(num_classes, num_classes)

    # Building metrics calculation
    building_iou = building_tp / max(building_tp + building_fp + building_fn, 1)
    building_precision = building_tp / max(building_tp + building_fp, 1)
    building_recall = building_tp / max(building_tp + building_fn, 1)
    building_f1 = (
        2
        * building_precision
        * building_recall
        / max(building_precision + building_recall, 1e-9)
    )
    building_dice = building_f1

    # Per-class LULC IoU
    per_class_iou = {}
    for c in range(num_classes):
        tp = confusion[c, c].item()
        fp = confusion[:, c].sum().item() - tp
        fn = confusion[c, :].sum().item() - tp
        iou = tp / max(tp + fp + fn, 1)
        per_class_iou[CLASS_NAMES.get(c, str(c))] = iou

    mean_iou = float(np.mean(list(per_class_iou.values())))
    pixel_acc = float(confusion.diag().sum().item() / max(confusion.sum().item(), 1))

    return {
        "building_iou": float(building_iou),
        "building_dice": float(building_dice),
        "building_precision": float(building_precision),
        "building_recall": float(building_recall),
        "building_f1": float(building_f1),
        "per_class_iou": per_class_iou,
        "mean_iou": mean_iou,
        "pixel_accuracy": pixel_acc,
        "confusion_matrix": confusion.cpu().numpy(),
    }
