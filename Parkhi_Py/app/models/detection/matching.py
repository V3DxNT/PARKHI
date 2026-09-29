import math


def box_center(bbox):
    """
    Return the center (x, y) of a bounding box.
    bbox = [x1, y1, x2, y2]
    """
    x1, y1, x2, y2 = bbox

    return (
        (x1 + x2) / 2.0,
        (y1 + y2) / 2.0,
    )


def box_area(bbox):
    """
    Calculate bounding-box area.
    """
    x1, y1, x2, y2 = bbox

    width = max(0.0, x2 - x1)
    height = max(0.0, y2 - y1)

    return width * height


def calculate_iou(box_a, box_b):
    """
    Calculate Intersection over Union (IoU)
    between two bounding boxes.
    """

    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    intersection_width = max(0.0, ix2 - ix1)
    intersection_height = max(0.0, iy2 - iy1)

    intersection_area = (
        intersection_width * intersection_height
    )

    union_area = (
        box_area(box_a)
        + box_area(box_b)
        - intersection_area
    )

    if union_area <= 0:
        return 0.0

    return intersection_area / union_area


def center_distance(box_a, box_b):
    """
    Calculate Euclidean distance between box centers.
    """

    ax, ay = box_center(box_a)
    bx, by = box_center(box_b)

    return math.sqrt(
        (ax - bx) ** 2 +
        (ay - by) ** 2
    )


def match_buildings(
    pre_detections,
    post_detections,
    iou_threshold=0.2,
    distance_threshold=10.0,
):
    """
    Match PRE and POST building detections.

    A pair is accepted only when BOTH conditions are satisfied:

        IoU >= 0.2
        AND
        center distance <= 10 pixels
    """

    matches = []

    used_post = set()

    for pre_index, pre_detection in enumerate(pre_detections):

        best_post_index = None
        best_score = -1.0

        pre_box = pre_detection["bbox"]

        for post_index, post_detection in enumerate(post_detections):

            if post_index in used_post:
                continue

            post_box = post_detection["bbox"]

            iou = calculate_iou(
                pre_box,
                post_box
            )

            distance = center_distance(
                pre_box,
                post_box
            )

            # BOTH conditions must be satisfied.
            if (
                iou >= iou_threshold
                and distance <= distance_threshold
            ):
                if iou > best_score:
                    best_score = iou
                    best_post_index = post_index

        if best_post_index is not None:

            post_detection = post_detections[
                best_post_index
            ]

            matches.append({
                "pre_index": pre_index,
                "post_index": best_post_index,

                "pre_bbox": pre_detection["bbox"],
                "post_bbox": post_detection["bbox"],

                "iou": calculate_iou(
                    pre_detection["bbox"],
                    post_detection["bbox"]
                ),

                "center_distance": center_distance(
                    pre_detection["bbox"],
                    post_detection["bbox"]
                ),

                "pre_confidence": pre_detection["confidence"],
                "post_confidence": post_detection["confidence"],
            })

            used_post.add(best_post_index)

    return matches