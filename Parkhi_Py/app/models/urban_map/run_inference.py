#!/usr/bin/env python3
"""
CLI entrypoint to run Model 4 Urban Map inference on an image file.
Usage:
    python app/models/urban_map/run_inference.py --image path/to/image.png --output_dir outputs/
"""

import argparse
import os
import sys
import numpy as np
from PIL import Image

# Ensure workspace root is in sys.path
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_CURRENT_DIR, "../../.."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from app.models.urban_map.inference import UrbanMapPredictor
from app.models.urban_map.postprocess import save_pngs
from app.models.urban_map.visualization import plot_predictions


def main():
    parser = argparse.ArgumentParser(description="Model 4 Urban Map Inference")
    parser.add_argument("--image", type=str, required=True, help="Path to input RGB image")
    parser.add_argument("--weights", type=str, default=None, help="Path to model weights file (.pkl or .pth)")
    parser.add_argument("--output_dir", type=str, default="outputs_urban", help="Directory to save inference outputs")
    parser.add_argument("--threshold", type=float, default=0.5, help="Building probability threshold")
    parser.add_argument("--visualize", action="store_true", help="Generate side-by-side visualization plot")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: Input image file '{args.image}' not found.", file=sys.stderr)
        sys.exit(1)

    print(f"Running Model 4 inference on: {args.image}")
    predictor = UrbanMapPredictor(weights_path=args.weights, threshold=args.threshold)

    results = predictor.predict(args.image)

    saved_paths = save_pngs(results, args.output_dir)

    for k, v in saved_paths.items():
        print(f" Saved {k} output -> {v}")

    if args.visualize:
        raw_img = np.array(Image.open(args.image).convert("RGB").resize((256, 256)))
        vis_path = os.path.join(args.output_dir, "urban_visualization.png")
        plot_predictions(
            image=raw_img,
            building_pred=results["building_pred"],
            lulc_pred=results["lulc_pred"],
            save_path=vis_path,
        )

    print("Model 4 inference completed successfully.")


if __name__ == "__main__":
    main()
