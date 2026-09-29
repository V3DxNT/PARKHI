"""
Training loop module for Model 4 Residual U-Net Multi-Task model.
"""

import os
import time
import torch
import torch.optim as optim
from torch.utils.data import DataLoader
from typing import Optional, Dict, Any
try:
    from tqdm.auto import tqdm
except ImportError:
    def tqdm(iterable, *args, **kwargs):
        return iterable

from app.models.urban_map.config import (
    NUM_LULC_CLASSES,
    BATCH_SIZE,
    SEED,
    WEIGHTS_DIR,
)
from app.models.urban_map.model import ResidualUNetMultiTask
from app.models.urban_map.losses import MultiTaskLoss
from app.models.urban_map.evaluate import evaluate_model
from app.models.urban_map.utils import set_seed


def train_one_epoch(
    model: torch.nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: MultiTaskLoss,
    device: torch.device,
    scaler: Optional[torch.amp.GradScaler] = None,
) -> Dict[str, float]:
    """
    Trains model for one epoch using optional Automatic Mixed Precision (AMP).
    """
    model.train()
    total_loss = 0.0
    total_b_loss = 0.0
    total_l_loss = 0.0

    use_amp = scaler is not None and device.type == "cuda"

    for images, building_targets, lulc_targets in tqdm(loader, desc="Training"):
        images = images.to(device, non_blocking=True)
        building_targets = building_targets.to(device, non_blocking=True)
        lulc_targets = lulc_targets.to(device, non_blocking=True)

        optimizer.zero_grad()

        if use_amp:
            with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                building_logits, lulc_logits = model(images)
                loss, b_loss, l_loss = criterion(
                    building_logits, building_targets, lulc_logits, lulc_targets
                )
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            building_logits, lulc_logits = model(images)
            loss, b_loss, l_loss = criterion(
                building_logits, building_targets, lulc_logits, lulc_targets
            )
            loss.backward()
            optimizer.step()

        total_loss += loss.item()
        total_b_loss += b_loss.item()
        total_l_loss += l_loss.item()

    num_batches = len(loader)
    return {
        "loss": total_loss / num_batches,
        "building_loss": total_b_loss / num_batches,
        "lulc_loss": total_l_loss / num_batches,
    }


def train_model(
    model: torch.nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int = 15,
    lr: float = 1e-4,
    weight_decay: float = 1e-4,
    device: Optional[torch.device] = None,
    save_dir: str = WEIGHTS_DIR,
    save_name: str = "model4_best.pth",
) -> Dict[str, Any]:
    """
    Full training run with evaluation and best checkpoint saving.
    """
    set_seed(SEED)
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = model.to(device)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = MultiTaskLoss()

    scaler = torch.amp.GradScaler("cuda") if device.type == "cuda" else None

    os.makedirs(save_dir, exist_ok=True)
    best_score = -1.0
    history = []

    print(f"Starting Model 4 training on {device} for {epochs} epochs...")

    for epoch in range(1, epochs + 1):
        start_time = time.time()

        train_metrics = train_one_epoch(
            model, train_loader, optimizer, criterion, device, scaler
        )
        val_metrics = evaluate_model(model, val_loader, device)

        elapsed = time.time() - start_time
        score = 0.5 * val_metrics["building_iou"] + 0.5 * val_metrics["mean_iou"]

        epoch_summary = {
            "epoch": epoch,
            "train_loss": train_metrics["loss"],
            "val_building_iou": val_metrics["building_iou"],
            "val_mean_iou": val_metrics["mean_iou"],
            "combined_score": score,
            "time_sec": elapsed,
        }
        history.append(epoch_summary)

        print(
            f"Epoch {epoch:02d}/{epochs:02d} [{elapsed:.1f}s] - "
            f"Train Loss: {train_metrics['loss']:.4f} | "
            f"Building IoU: {val_metrics['building_iou']:.4f} | "
            f"LULC mIoU: {val_metrics['mean_iou']:.4f} | "
            f"Score: {score:.4f}"
        )

        if score > best_score:
            best_score = score
            save_path = os.path.join(save_dir, save_name)
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "epoch": epoch,
                "score": score,
                "building_iou": val_metrics["building_iou"],
                "building_dice": val_metrics["building_dice"],
                "lulc_score": val_metrics["mean_iou"],
                "num_lulc_classes": NUM_LULC_CLASSES,
            }
            torch.save(checkpoint, save_path)
            print(f" Saved new best checkpoint -> {save_path}")

    return {"history": history, "best_score": best_score}
