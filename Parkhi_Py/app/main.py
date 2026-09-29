"""
Main entry point for Yukti Machine Learning Platform.
Starts the gRPC ModelPipeline service listening for Go backend requests.
"""

import os
import sys
import logging
# from dotenv import load_dotenv

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.grpc_server.server import serve

# load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("YuktiML")


def main():
    port = int(os.environ.get("GRPC_PORT", 50051))
    logger.info("Starting Yukti ML Platform (gRPC Server)...")
    logger.info("Available models: SwinIR (SR), Crop (CNN-GRU), Disaster (ViT), Urban (UNet)")
    server = serve(port=port)
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Interrupted. Stopping gRPC server...")
        server.stop(0)


if __name__ == "__main__":
    main()
