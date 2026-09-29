import torch
import torch.nn as nn
from torchvision import models


class SiameseDamageModel(nn.Module):
    """
    Siamese ResNet18 model for building-level
    disaster damage classification.

    Input:
        pre  -> pre-disaster building crop
        post -> post-disaster building crop

    Output:
        4 damage classes
    """

    def __init__(self, num_classes=4):
        super().__init__()

        # ResNet18 backbone
        self.backbone = models.resnet18(weights=None)

        # Remove original ImageNet classification layer
        # ResNet18 now outputs a 512-dimensional feature vector.
        self.backbone.fc = nn.Identity()

        # Combine PRE and POST features:
        # 512 + 512 = 1024
        self.classifier = nn.Sequential(

            nn.Linear(512 * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(128, num_classes)
        )

    def forward(self, pre, post):

        # Extract features from PRE image
        pre_features = self.backbone(pre)

        # Extract features from POST image
        post_features = self.backbone(post)

        # Combine both feature vectors
        combined = torch.cat(
            [pre_features, post_features],
            dim=1
        )

        # Damage classification
        output = self.classifier(combined)

        return output


def load_model(checkpoint_path, device=None):
    """
    Load trained V3 checkpoint.

    Parameters
    ----------
    checkpoint_path : str
        Path to best_model_v3.pt

    device : torch.device, optional
        CPU or CUDA device

    Returns
    -------
    model : SiameseDamageModel
        Loaded model in evaluation mode.
    """

    if device is None:
        device = torch.device(
            "cuda" if torch.cuda.is_available()
            else "cpu"
        )

    # Create model architecture
    model = SiameseDamageModel(
        num_classes=4
    )

    # Load checkpoint
    checkpoint = torch.load(
        checkpoint_path,
        map_location=device,
        weights_only=False
    )

    # Your Kaggle checkpoint contains:
    #
    # epoch
    # model_state_dict
    # optimizer_state_dict
    # scheduler_state_dict
    # val_f1
    # val_loss
    # history

    if (
        isinstance(checkpoint, dict)
        and "model_state_dict" in checkpoint
    ):

        model.load_state_dict(
            checkpoint["model_state_dict"]
        )

    else:

        # Allows loading a raw state_dict as well
        model.load_state_dict(
            checkpoint
        )

    # Move model to CPU/GPU
    model.to(device)

    # Inference mode
    model.eval()

    return model