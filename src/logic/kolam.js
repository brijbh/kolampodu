import { DOT_SPACING, generateDotGrid } from "./grid";

const CELL_INSET = DOT_SPACING * 0.3;
const CELL_BEND = DOT_SPACING * 0.22;
const CELL_HANDLE = DOT_SPACING * 0.42;
const CONNECTOR_BEND = DOT_SPACING * 0.72;
const SUPPORTED_PATTERNS = new Set([
  "5,4,3,2,1",
  "5,5,5,5,5",
  "1,2,3,4,3,2,1",
  "3,5,5,5,3",
]);

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
    }));

    dotIndex += count;
    return row;
  });
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

function moveToward(point, target, distance) {
  return addVector(
    point,
    normalize({
      x: target.x - point.x,
      y: target.y - point.y,
    }),
    distance,
  );
}

function getCellCenter(cell) {
  return {
    x: (
      cell.topLeft.x
      + cell.topRight.x
      + cell.bottomRight.x
      + cell.bottomLeft.x
    ) / 4,
    y: (
      cell.topLeft.y
      + cell.topRight.y
      + cell.bottomRight.y
      + cell.bottomLeft.y
    ) / 4,
  };
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

function getPatternCenter(rows) {
  const bounds = getBounds(rows.flat());

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

function buildCells(rows) {
  const cells = [];

  rows.forEach((topRow, rowIndex) => {
    const bottomRow = rows[rowIndex + 1];

    if (!bottomRow) {
      return;
    }

    const cellCount = Math.min(topRow.length, bottomRow.length) - 1;

    for (let col = 0; col < cellCount; col += 1) {
      cells.push({
        id: `cell-${rowIndex}-${col}`,
        row: rowIndex,
        col,
        topLeft: topRow[col],
        topRight: topRow[col + 1],
        bottomRight: bottomRow[col + 1],
        bottomLeft: bottomRow[col],
      });
    }
  });

  return cells;
}

function getCellCurveFrame(cell) {
  const isCurveA = (cell.row + cell.col) % 2 === 0;
  const startCorner = isCurveA ? cell.topLeft : cell.topRight;
  const endCorner = isCurveA ? cell.bottomRight : cell.bottomLeft;
  const center = getCellCenter(cell);
  const diagonal = normalize({
    x: endCorner.x - startCorner.x,
    y: endCorner.y - startCorner.y,
  });

  return {
    isCurveA,
    center,
    diagonal,
    normal: {
      x: -diagonal.y,
      y: diagonal.x,
    },
    start: moveToward(startCorner, center, CELL_INSET),
    end: moveToward(endCorner, center, CELL_INSET),
  };
}

function orderCells(cells) {
  const cellsByRow = cells.reduce((groups, cell) => {
    const row = groups.get(cell.row) ?? [];
    row.push(cell);
    groups.set(cell.row, row);
    return groups;
  }, new Map());

  return [...cellsByRow.entries()].flatMap(([rowIndex, rowCells]) => {
    const orderedCells = [...rowCells].sort((a, b) => a.col - b.col);

    return rowIndex % 2 === 0 ? orderedCells : orderedCells.reverse();
  });
}

function buildCellCurveSegment(cell, start, id) {
  const { center, diagonal, normal, isCurveA, end } = getCellCurveFrame(cell);
  const bend = isCurveA ? CELL_BEND : -CELL_BEND;
  const startDirection = normalize({
    x: center.x - start.x,
    y: center.y - start.y,
  });

  return toCubicSegment(
    start,
    addVector(start, startDirection, CELL_HANDLE, normal, bend),
    addVector(end, diagonal, -CELL_HANDLE, normal, bend),
    end,
    id,
  );
}

function buildConnectorSpan(start, end, bendVector, id) {
  const direction = normalize({
    x: end.x - start.x,
    y: end.y - start.y,
  });

  return toCubicSegment(
    start,
    addVector(start, direction, CELL_HANDLE * 0.35, bendVector, CONNECTOR_BEND * 0.45),
    addVector(end, direction, CELL_HANDLE * -0.35, bendVector, CONNECTOR_BEND * 0.45),
    end,
    id,
  );
}

function getCubicPoint(segment, progress) {
  const inverse = 1 - progress;

  return {
    x: inverse * inverse * inverse * segment.start.x
      + 3 * inverse * inverse * progress * segment.control1.x
      + 3 * inverse * progress * progress * segment.control2.x
      + progress * progress * progress * segment.end.x,
    y: inverse * inverse * inverse * segment.start.y
      + 3 * inverse * inverse * progress * segment.control1.y
      + 3 * inverse * progress * progress * segment.control2.y
      + progress * progress * progress * segment.end.y,
  };
}

function getDotClearance(segments, dots) {
  return segments.reduce((minDistance, segment) => {
    let nextMinDistance = minDistance;

    for (let index = 0; index <= 12; index += 1) {
      const point = getCubicPoint(segment, index / 12);

      dots.forEach((dot) => {
        nextMinDistance = Math.min(
          nextMinDistance,
          Math.hypot(point.x - dot.x, point.y - dot.y),
        );
      });
    }

    return nextMinDistance;
  }, Infinity);
}

function buildConnectorCandidate(start, end, bendVector, id) {
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const waypoint = addVector(midpoint, bendVector, DOT_SPACING * 0.42);

  return [
    buildConnectorSpan(start, waypoint, bendVector, `${id}-0`),
    buildConnectorSpan(waypoint, end, bendVector, `${id}-1`),
  ];
}

function buildConnectorSegments(start, end, patternCenter, dots, id) {
  const direction = normalize({
    x: end.x - start.x,
    y: end.y - start.y,
  });
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const towardCenter = normalize({
    x: patternCenter.x - midpoint.x,
    y: patternCenter.y - midpoint.y,
  });
  const bendVector = towardCenter.x === 0 && towardCenter.y === 0
    ? { x: -direction.y, y: direction.x }
    : towardCenter;
  const normal = {
    x: -direction.y,
    y: direction.x,
  };
  const candidates = [
    bendVector,
    { x: -bendVector.x, y: -bendVector.y },
    normal,
    { x: -normal.x, y: -normal.y },
  ].map((candidate, index) => buildConnectorCandidate(
    start,
    end,
    candidate,
    `${id}-${index}`,
  ));

  return candidates.reduce((bestCandidate, candidate) => (
    getDotClearance(candidate, dots) > getDotClearance(bestCandidate, dots)
      ? candidate
      : bestCandidate
  ));
}

function buildCellBasedSikkuSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 1);
  const orderedCells = orderCells(buildCells(rows));
  const patternCenter = getPatternCenter(rows);
  const dots = rows.flat();

  if (!orderedCells.length) {
    return [];
  }

  const firstStart = getCellCurveFrame(orderedCells[0]).start;
  const segments = [];
  let cursor = firstStart;

  orderedCells.forEach((cell) => {
    const { start } = getCellCurveFrame(cell);

    if (Math.hypot(cursor.x - start.x, cursor.y - start.y) > 0) {
      segments.push(...buildConnectorSegments(
        cursor,
        start,
        patternCenter,
        dots,
        `${cell.id}-join`,
      ));
    }

    const segment = buildCellCurveSegment(cell, start, `${cell.id}-curve`);

    segments.push(segment);
    cursor = segment.end;
  });

  segments.push(...buildConnectorSegments(
    cursor,
    firstStart,
    patternCenter,
    dots,
    "cell-path-close",
  ));

  return segments;
}

export function buildKolamSegments(pattern) {
  if (!SUPPORTED_PATTERNS.has(getPatternKey(pattern))) {
    return [];
  }

  return buildCellBasedSikkuSegments(pattern);
}

function buildSegmentCommand(segment) {
  return `C ${segment.control1.x} ${segment.control1.y} ${segment.control2.x} ${segment.control2.y} ${segment.end.x} ${segment.end.y}`;
}

export function buildKolamPath(pattern) {
  const segments = buildKolamSegments(pattern);
  const [firstSegment, ...remainingSegments] = segments;

  if (!firstSegment) {
    return "";
  }

  return [
    `M ${firstSegment.start.x} ${firstSegment.start.y}`,
    buildSegmentCommand(firstSegment),
    ...remainingSegments.map((segment) => buildSegmentCommand(segment)),
  ].join(" ");
}

export function buildSegmentPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} ${buildSegmentCommand(segment)}`;
}
