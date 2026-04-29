import { DOT_SPACING, generateDotGrid } from "./grid";

const CELL_INSET = DOT_SPACING * 0.2;
const CELL_LOOP_WIDTH = DOT_SPACING * 0.16;
const ARC_HANDLE = 0.5522847498307936;
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

function getCellAxis(cell) {
  const isCurveA = (cell.row + cell.col) % 2 === 0;
  const startCorner = isCurveA ? cell.topLeft : cell.topRight;
  const endCorner = isCurveA ? cell.bottomRight : cell.bottomLeft;
  const center = getCellCenter(cell);
  const diagonal = normalize({
    x: endCorner.x - startCorner.x,
    y: endCorner.y - startCorner.y,
  });

  return {
    center,
    diagonal,
    normal: {
      x: -diagonal.y,
      y: diagonal.x,
    },
    length: Math.max(
      DOT_SPACING * 0.4,
      Math.hypot(endCorner.x - startCorner.x, endCorner.y - startCorner.y) / 2 - CELL_INSET,
    ),
  };
}

function buildCellLoopSegments(cell) {
  const { center, diagonal, normal, length } = getCellAxis(cell);
  const width = CELL_LOOP_WIDTH;
  const handle = width * ARC_HANDLE;
  const id = cell.id;
  const tipA = addVector(center, diagonal, -length);
  const tipB = addVector(center, diagonal, length);
  const sideA = addVector(center, normal, width);
  const sideB = addVector(center, normal, -width);

  return [
    {
      ...toCubicSegment(
        tipA,
        addVector(tipA, normal, handle),
        addVector(sideA, diagonal, -handle),
        sideA,
        `${id}-curve-0`,
      ),
      startsLoop: true,
    },
    toCubicSegment(
      sideA,
      addVector(sideA, diagonal, handle),
      addVector(tipB, normal, handle),
      tipB,
      `${id}-curve-1`,
    ),
    toCubicSegment(
      tipB,
      addVector(tipB, normal, -handle),
      addVector(sideB, diagonal, handle),
      sideB,
      `${id}-curve-2`,
    ),
    toCubicSegment(
      sideB,
      addVector(sideB, diagonal, -handle),
      addVector(tipA, normal, -handle),
      tipA,
      `${id}-curve-3`,
    ),
  ];
}

function buildCellBasedSikkuSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 1);

  return buildCells(rows).flatMap((cell) => buildCellLoopSegments(cell));
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
