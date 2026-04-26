export function getPointBounds(points) {
  if (!points.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
  }), {
    minX: points[0].x,
    minY: points[0].y,
    maxX: points[0].x,
    maxY: points[0].y,
  });
}

export function getSegmentBounds(segments) {
  return getPointBounds(
    segments.flatMap((segment) => [
      segment.start,
      segment.control,
      segment.end,
    ]),
  );
}

export function getDotBounds(dots) {
  return getPointBounds(dots);
}

export function getPathBounds(segments) {
  return getSegmentBounds(segments);
}

export function mergeBounds(...boundsList) {
  const validBounds = boundsList.filter(Boolean);

  if (!validBounds.length) {
    return getPointBounds([]);
  }

  return validBounds.reduce((bounds, nextBounds) => ({
    minX: Math.min(bounds.minX, nextBounds.minX),
    minY: Math.min(bounds.minY, nextBounds.minY),
    maxX: Math.max(bounds.maxX, nextBounds.maxX),
    maxY: Math.max(bounds.maxY, nextBounds.maxY),
  }));
}

export function expandBounds(bounds, padding) {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

export function getViewBoxBounds({ dots, segments, padding }) {
  return expandBounds(
    mergeBounds(
      getDotBounds(dots),
      getPathBounds(segments),
    ),
    padding,
  );
}
