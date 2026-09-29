"""
UrbanDataset PyTorch Dataset module and reproducible train/val dataset splitter.
"""

import os
import random
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from typing import Tuple, List, Optional

from app.models.urban_map.config import (
    IMAGENET_MEAN,
    IMAGENET_STD,
    BATCH_SIZE,
    NUM_WORKERS,
    PIN_MEMORY,
    SEED,
)


class UrbanDataset(Dataset):
    """
    PyTorch Dataset for Urban Multi-Task Learning (Building + LULC segmentation).
    Loads 256x256 RGB images and corresponding LULC segmentation masks.
    """

    def __init__(self, files: List[str], image_dir: str, mask_dir: str):
        self.files = files
        self.image_dir = image_dir
        self.mask_dir = mask_dir

        self.mean = torch.tensor(IMAGENET_MEAN).view(3, 1, 1)
        self.std = torch.tensor(IMAGENET_STD).view(3, 1, 1)

    def __len__(self) -> int:
        return len(self.files)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        name = self.files[idx]
        ext = "" if name.lower().endswith(".png") else ".png"

        # RGB Image preprocessing
        img_path = os.path.join(self.image_dir, name + ext)
        image = Image.open(img_path).convert("RGB")
        image_np = np.asarray(image, dtype=np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np).permute(2, 0, 1)
        image_tensor = (image_tensor - self.mean) / self.std

        # LULC & Building Target Mask
        mask_path = os.path.join(self.mask_dir, name + ext)
        mask_np = np.asarray(Image.open(mask_path), dtype=np.int64)

        building_np = (mask_np == 1).astype(np.float32)
        building_tensor = torch.from_numpy(building_np).unsqueeze(0)

        lulc_tensor = torch.from_numpy(mask_np).long()

        return image_tensor, building_tensor, lulc_tensor


def get_train_val_datasets(
    image_dir: str,
    mask_dir: str,
    split_ratio: float = 0.8,
    seed: int = SEED,
) -> Tuple[UrbanDataset, UrbanDataset, List[str], List[str]]:
    """
    Creates train and validation datasets with a reproducible 80/20 split.

    Args:
        image_dir (str): Directory containing image files.
        mask_dir (str): Directory containing mask files.
        split_ratio (float): Ratio of training samples (default 0.8).
        seed (int): Random seed for reproducibility (default 42).

    Returns:
        Tuple of (train_dataset, val_dataset, train_files, val_files)
    """
    if not os.path.exists(image_dir) or not os.path.exists(mask_dir):
        raise FileNotFoundError(
            f"Image dir '{image_dir}' or mask dir '{mask_dir}' does not exist."
        )

    all_files = sorted(
        [
            os.path.splitext(f)[0]
            for f in os.listdir(image_dir)
            if f.lower().endswith(".png")
        ]
    )

    all_files = [
        f
        for f in all_files
        if os.path.exists(os.path.join(mask_dir, f + ".png"))
    ]

    random.seed(seed)
    random.shuffle(all_files)

    split_point = int(split_ratio * len(all_files))
    train_files = all_files[:split_point]
    val_files = all_files[split_point:]

    train_dataset = UrbanDataset(train_files, image_dir, mask_dir)
    val_dataset = UrbanDataset(val_files, image_dir, mask_dir)

    return train_dataset, val_dataset, train_files, val_files


def create_dataloaders(
    train_dataset: UrbanDataset,
    val_dataset: UrbanDataset,
    batch_size: int = BATCH_SIZE,
    num_workers: int = NUM_WORKERS,
    pin_memory: bool = PIN_MEMORY,
) -> Tuple[DataLoader, DataLoader]:
    """
    Creates PyTorch DataLoaders for training and validation datasets.
    """
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )
    return train_loader, val_loader
