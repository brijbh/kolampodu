import { DOT_SPACING, generateDotGrid } from "./grid";

const LOOP_RADIUS = DOT_SPACING * 0.18;
const ARC_HANDLE = 0.5522847498307936;
const SUPPORTED_PATTERNS = new Set([
  "5,4,3,2,1",
  "5,5,5,5,5",
  "1,2,3,4,3,2,1",
  "3,5,5,5,3",
]);

function toSegment(start, control, end, id) {
  return {
    id,
    start,
    control,
    end,
  };
}

function toLineSegment(start, end, id) {
  return {
    ...toSegment(
      start,
      {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      },
      end,
      id,
    ),
    command: "L",
  };
}

function toCubicSegment(start, control1, control2, end, id) {
  return {
    id,
    start,
    control: {
      x: (control1.x + control2.x) / 2,
      y: (control1.y + control2.y) / 2,
    },
    control1,
    control2,
    end,
    command: "C",
  };
}

function getPatternKey(pattern) {
  return pattern.join(",");
}

function getRows(pattern) {
  const dots = generateDotGrid(pattern);
  let dotIndex = 0;

  return pattern.map((count, rowIndex) => {
    const row = dots.slice(dotIndex, dotIndex + count).map((dot, col) => ({
      ...dot,
      row: rowIndex,
      col,
      key: `${rowIndex}:${col}`,
    }));

    dotIndex += count;
    return row;
  });
}

function getBounds(points) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
  }), {
    minX: points[0]?.x ?? 0,
    minY: points[0]?.y ?? 0,
    maxX: points[0]?.x ?? 0,
    maxY: points[0]?.y ?? 0,
  });
}

function getCenter(points) {
  const bounds = getBounds(points);

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

function getMidpoint(firstPoint, secondPoint) {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  };
}

function buildImplicitEdges(rows) {
  const edges = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((dot, col) => {
      const rightDot = row[col + 1];

      if (rightDot) {
        edges.push({
          id: `edge-h-${rowIndex}-${col}`,
          orientation: "horizontal",
          parityIndex: rowIndex + col,
          start: dot,
          end: rightDot,
        });
      }

      const lowerDot = rows[rowIndex + 1]?.[col];

      if (lowerDot) {
        edges.push({
          id: `edge-v-${rowIndex}-${col}`,
          orientation: "vertical",
          parityIndex: rowIndex + col + 1,
          start: dot,
          end: lowerDot,
        });
      }
    });
  });

  return edges;
}

function shouldActivateEdge(edge, center) {
  const midpoint = getMidpoint(edge.start, edge.end);
  const centeredDistance = Math.round(
    (Math.abs(midpoint.x - center.x) + Math.abs(midpoint.y - center.y)) / DOT_SPACING,
  );
  const orientationOffset = edge.orientation === "horizontal" ? 0 : 1;

  return (edge.parityIndex + centeredDistance + orientationOffset) % 2 === 0;
}

function activateEdges(edges, center) {
  const usedDots = new Set();

  return edges.filter((edge) => {
    if (!shouldActivateEdge(edge, center)) {
      return false;
    }

    if (usedDots.has(edge.start.key) || usedDots.has(edge.end.key)) {
      return false;
    }

    usedDots.add(edge.start.key);
    usedDots.add(edge.end.key);
    return true;
  });
}

function traceLoops(activeEdges) {
  const edgeByDot = new Map();

  activeEdges.forEach((edge) => {
    [edge.start.key, edge.end.key].forEach((dotKey) => {
      const dotEdges = edgeByDot.get(dotKey) ?? [];
      dotEdges.push(edge);
      edgeByDot.set(dotKey, dotEdges);
    });
  });

  const visited = new Set();
  const loops = [];

  activeEdges.forEach((edge) => {
    if (visited.has(edge.id)) {
      return;
    }

    const loop = [];
    const stack = [edge];

    while (stack.length) {
      const nextEdge = stack.pop();

      if (!nextEdge || visited.has(nextEdge.id)) {
        continue;
      }

      visited.add(nextEdge.id);
      loop.push(nextEdge);

      [nextEdge.start.key, nextEdge.end.key].forEach((dotKey) => {
        edgeByDot.get(dotKey)?.forEach((adjacentEdge) => {
          if (!visited.has(adjacentEdge.id)) {
            stack.push(adjacentEdge);
          }
        });
      });
    }

    loops.push(loop);
  });

  return loops;
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function addVector(point, firstVector, firstScale, secondVector = null, secondScale = 0) {
  return {
    x: point.x + firstVector.x * firstScale + (secondVector?.x ?? 0) * secondScale,
    y: point.y + firstVector.y * firstScale + (secondVector?.y ?? 0) * secondScale,
  };
}

function getEdgeFrame(edge) {
  const tangent = normalize({
    x: edge.end.x - edge.start.x,
    y: edge.end.y - edge.start.y,
  });

  return {
    tangent,
    normal: {
      x: -tangent.y,
      y: tangent.x,
    },
  };
}

function buildEdgeLoopSegments(edge, loopIndex) {
  const { tangent, normal } = getEdgeFrame(edge);
  const radius = LOOP_RADIUS;
  const handle = radius * ARC_HANDLE;
  const startUpper = addVector(edge.start, normal, radius);
  const endUpper = addVector(edge.end, normal, radius);
  const endOuter = addVector(edge.end, tangent, radius);
  const endLower = addVector(edge.end, normal, -radius);
  const startLower = addVector(edge.start, normal, -radius);
  const startOuter = addVector(edge.start, tangent, -radius);
  const id = `loop-${loopIndex}-${edge.id}`;

  return [
    {
      ...toLineSegment(startUpper, endUpper, `${id}-side-0`),
      startsLoop: true,
    },
    toCubicSegment(
      endUpper,
      addVector(endUpper, tangent, handle),
      addVector(endOuter, normal, handle),
      endOuter,
      `${id}-cap-end-0`,
    ),
    toCubicSegment(
      endOuter,
      addVector(endOuter, normal, -handle),
      addVector(endLower, tangent, handle),
      endLower,
      `${id}-cap-end-1`,
    ),
    toLineSegment(endLower, startLower, `${id}-side-1`),
    toCubicSegment(
      startLower,
      addVector(startLower, tangent, -handle),
      addVector(startOuter, normal, -handle),
      startOuter,
      `${id}-cap-start-0`,
    ),
    toCubicSegment(
      startOuter,
      addVector(startOuter, normal, handle),
      addVector(startUpper, tangent, -handle),
      startUpper,
      `${id}-cap-start-1`,
    ),
  ];
}

function buildEdgeBasedSikkuSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 0);
  const dots = rows.flat();

  if (!dots.length) {
    return [];
  }

  const center = getCenter(dots);
  const edges = buildImplicitEdges(rows);
  const activeEdges = activateEdges(edges, center);

  return traceLoops(activeEdges).flatMap((loop, loopIndex) => (
    loop.flatMap((edge) => buildEdgeLoopSegments(edge, loopIndex))
  ));
}

export function buildKolamSegments(pattern) {
  if (!SUPPORTED_PATTERNS.has(getPatternKey(pattern))) {
    return [];
  }

  return buildEdgeBasedSikkuSegments(pattern);
}

function buildSegmentCommand(segment) {
  if (segment.command === "L") {
    return `L ${segment.end.x} ${segment.end.y}`;
  }

  if (segment.control1 && segment.control2) {
    return `C ${segment.control1.x} ${segment.control1.y} ${segment.control2.x} ${segment.control2.y} ${segment.end.x} ${segment.end.y}`;
  }

  return `Q ${segment.control.x} ${segment.control.y} ${segment.end.x} ${segment.end.y}`;
}

export function buildKolamPath(pattern) {
  const segments = buildKolamSegments(pattern);

  return segments.map((segment, index) => {
    const move = index === 0 || segment.startsLoop
      ? `M ${segment.start.x} ${segment.start.y} `
      : "";

    return `${move}${buildSegmentCommand(segment)}`;
  }).join(" ");
}

export function buildSegmentPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} ${buildSegmentCommand(segment)}`;
}
