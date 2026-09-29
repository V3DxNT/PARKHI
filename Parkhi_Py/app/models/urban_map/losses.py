"""
Loss functions for Model 4 Multi-Task Training.
Combines BCEWithLogits + DiceLoss for building segmentation and CrossEntropyLoss for LULC.
"""

import torch
import torch.nn as nn
from typing import Tuple


class DiceLoss(nn.Module):
    """
    Binary Dice Loss calculated over logit outputs.
    """

    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        probs = probs.view(probs.size(0), -1)
        target = target.view(target.size(0), -1)

        intersection = (probs * target).sum(dim=1)
        dice = (2.0 * intersection + self.smooth) / (
            probs.sum(dim=1) + target.sum(dim=1) + self.smooth
        )
        return 1.0 - dice.mean()


class MultiTaskLoss(nn.Module):
    """
    Multi-Task Loss combining building segmentation loss (0.5 * BCE + 0.5 * Dice)
    and LULC classification loss (CrossEntropy, ignoring index 255).
    Weighted as: 0.6 * building_loss + 0.4 * lulc_loss.
    """

    def __init__(
        self,
        building_bce_weight: float = 0.5,
        building_dice_weight: float = 0.5,
        multi_task_building_weight: float = 0.6,
        multi_task_lulc_weight: float = 0.4,
        ignore_index: int = 255,
    ):
        super().__init__()
        self.bce_loss = nn.BCEWithLogitsLoss()
        self.dice_loss = DiceLoss()
        self.lulc_loss = nn.CrossEntropyLoss(ignore_index=ignore_index)

        self.building_bce_weight = building_bce_weight
        self.building_dice_weight = building_dice_weight
        self.w_building = multi_task_building_weight
        self.w_lulc = multi_task_lulc_weight

    def forward(
        self,
        building_logits: torch.Tensor,
        building_target: torch.Tensor,
        lulc_logits: torch.Tensor,
        lulc_target: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        bce = self.bce_loss(building_logits, building_target)
        dice = self.dice_loss(building_logits, building_target)
        building_total = (
            self.building_bce_weight * bce + self.building_dice_weight * dice
        )

        lulc_ce = self.lulc_loss(lulc_logits, lulc_target)

        total_loss = self.w_building * building_total + self.w_lulc * lulc_ce
        return total_loss, building_total, lulc_ce


# Helper function interface directly matching notebook
def multitask_loss(
    building_logits: torch.Tensor,
    building_target: torch.Tensor,
    lulc_logits: torch.Tensor,
    lulc_target: torch.Tensor,
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    criterion = MultiTaskLoss()
    return criterion(building_logits, building_target, lulc_logits, lulc_target)
