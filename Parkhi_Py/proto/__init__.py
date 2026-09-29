"""
Yukti Protobuf and gRPC stubs package.
"""
try:
    from . import satellite_pb2
except Exception:
    satellite_pb2 = None

try:
    from . import satellite_pb2_grpc
except Exception:
    satellite_pb2_grpc = None

__all__ = ["satellite_pb2", "satellite_pb2_grpc"]
