"""
Model 4 Architecture: Residual U-Net Multi-Task model with ResNet34 backbone.
Produces multi-task outputs:
1. Building segmentation logits [B, 1, H, W]
2. LULC land-use classification logits [B, num_classes, H, W]
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet34, ResNet34_Weights


class ResidualDecoderBlock(nn.Module):
    """
    Residual Decoder Block with bilinear upsampling, skip connection concatenation,
    double 3x3 convolutions with BatchNorm + ReLU, and a 1x1 residual projection path.
    """

    def __init__(self, in_channels: int, skip_channels: int, out_channels: int):
        super().__init__()
        self.conv1 = nn.Conv2d(
            in_channels + skip_channels, out_channels, kernel_size=3, padding=1, bias=False
        )
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(
            out_channels, out_channels, kernel_size=3, padding=1, bias=False
        )
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

        self.residual = nn.Conv2d(
            in_channels + skip_channels, out_channels, kernel_size=1, bias=False
        )
        self.res_bn = nn.BatchNorm2d(out_channels)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = F.interpolate(x, size=skip.shape[-2:], mode="bilinear", align_corners=False)
        combined = torch.cat([x, skip], dim=1)

        residual = self.res_bn(self.residual(combined))
        out = self.relu(self.bn1(self.conv1(combined)))
        out = self.bn2(self.conv2(out))

        return self.relu(out + residual)


class ResidualUNetMultiTask(nn.Module):
    """
    Residual U-Net Multi-Task Neural Network with ResNet34 Backbone.
    Produces dual predictions: Building mask and Land Use / Land Cover (LULC) map.
    """

    def __init__(self, num_lulc_classes: int = 7, pretrained: bool = True):
        super().__init__()

        weights = ResNet34_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = resnet34(weights=weights)

        # Encoder stages
        self.input_block = nn.Sequential(
            backbone.conv1,
            backbone.bn1,
            backbone.relu
        )
        self.maxpool = backbone.maxpool

        self.encoder1 = backbone.layer1  # 64 channels
        self.encoder2 = backbone.layer2  # 128 channels
        self.encoder3 = backbone.layer3  # 256 channels
        self.encoder4 = backbone.layer4  # 512 channels

        # Decoder stages
        self.decoder4 = ResidualDecoderBlock(512, 256, 256)
        self.decoder3 = ResidualDecoderBlock(256, 128, 128)
        self.decoder2 = ResidualDecoderBlock(128, 64, 64)
        self.decoder1 = ResidualDecoderBlock(64, 64, 32)

        self.final_upsample = nn.Sequential(
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.ReLU(inplace=True)
        )

        # Output Heads
        self.building_head = nn.Conv2d(32, 1, kernel_size=1)
        self.lulc_head = nn.Conv2d(32, num_lulc_classes, kernel_size=1)

    def forward(self, x: torch.Tensor):
        x0 = self.input_block(x)
        x0p = self.maxpool(x0)

        e1 = self.encoder1(x0p)
        e2 = self.encoder2(e1)
        e3 = self.encoder3(e2)
        e4 = self.encoder4(e3)

        d4 = self.decoder4(e4, e3)
        d3 = self.decoder3(d4, e2)
        d2 = self.decoder2(d3, e1)
        d1 = self.decoder1(d2, x0)

        out = self.final_upsample(d1)

        building_logits = self.building_head(out)
        lulc_logits = self.lulc_head(out)

        return building_logits, lulc_logits


# Alias for compatibility with alternate cell naming
UrbanMultiTaskModel = ResidualUNetMultiTask
