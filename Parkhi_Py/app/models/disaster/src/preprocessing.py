from PIL import Image
import numpy as np
import torch


# ImageNet normalization
MEAN = np.array(
    [0.485, 0.456, 0.406],
    dtype=np.float32
)

STD = np.array(
    [0.229, 0.224, 0.225],
    dtype=np.float32
)


def crop_building(
    image,
    bbox,
    size=128
):
    """
    Crop a building from an image and prepare
    it for the Siamese ResNet18 model.

    Parameters
    ----------
    image : PIL.Image
        Input satellite image.

    bbox : tuple
        (x1, y1, x2, y2)

    size : int
        Model input size.

    Returns
    -------
    torch.Tensor
        Tensor with shape [3, 128, 128].
    """

    x1, y1, x2, y2 = bbox

    # Keep coordinates inside image
    x1 = max(0, int(x1))
    y1 = max(0, int(y1))
    x2 = min(image.width, int(x2))
    y2 = min(image.height, int(y2))

    # Prevent invalid crop
    if x2 <= x1:
        x2 = min(image.width, x1 + 2)

    if y2 <= y1:
        y2 = min(image.height, y1 + 2)

    # Crop
    crop = image.crop(
        (x1, y1, x2, y2)
    )

    # Resize exactly as Kaggle
    crop = crop.resize(
        (size, size),
        Image.Resampling.BILINEAR
    )

    # PIL → NumPy
    image_array = np.asarray(
        crop,
        dtype=np.float32
    )

    # [0,255] → [0,1]
    image_array /= 255.0

    # ImageNet normalization
    image_array = (
        image_array - MEAN
    ) / STD

    # HWC → CHW
    image_array = np.transpose(
        image_array,
        (2, 0, 1)
    )

    return torch.from_numpy(
        image_array
    ).float()


def load_image(image_path):
    """
    Load satellite image as RGB PIL image.
    """

    return Image.open(
        image_path
    ).convert("RGB")