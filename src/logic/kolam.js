import { DOT_SPACING, generateDotGrid } from "./grid";

const CELL_CURVE = DOT_SPACING * 0.24;
const OUTER_MARGIN = DOT_SPACING * 0.58;

function getRowDots(pattern, rowIndex) {
  const max = Math.max(...pattern);
  const offset = (max - pattern[rowIndex]) / 2;

  return Array.from({ length: pattern[rowIndex] }, (_, colIndex) => ({
    x: (colIndex + offset) * DOT_SPACING,
    y: rowIndex * DOT_SPACING,
  }));
}

function getCellRows(pattern) {
  return pattern.slice(0, -1).map((count, rowIndex) => {
    const nextCount = pattern[rowIndex + 1];
    const sourceRow = nextCount <= count
      ? getRowDots(pattern, rowIndex + 1)
      : getRowDots(pattern, rowIndex);

    return sourceRow.map((dot) => ({
      x: dot.x,
      y: (rowIndex + 0.5) * DOT_SPACING,
      row: rowIndex,
    }));
  }).filter((row) => row.length > 0);
}

function getControlPoint(start, end, index) {
  const horizontal = Math.abs(start.y - end.y) < 1;
  const direction = index % 2 === 0 ? 1 : -1;

  if (horizontal) {
    return {
      x: (start.x + end.x) / 2,
      y: start.y + direction * CELL_CURVE,
    };
  }

  const outward = end.x < start.x ? -1 : 1;

  return {
    x: (start.x + end.x) / 2 + outward * CELL_CURVE,
    y: (start.y + end.y) / 2,
  };
}

function toSegment(start, end, index, idPrefix = "cell") {
  return {
    id: `${idPrefix}-${index}`,
    start,
    control: getControlPoint(start, end, index),
    end,
  };
}

function getCellRoute(pattern) {
  const rows = getCellRows(pattern);

  if (rows.length === 0) {
    return [];
  }

  return rows.flatMap((row, rowIndex) => {
    const orderedRow = [...row].sort((a, b) => a.x - b.x);
    return rowIndex % 2 === 0 ? orderedRow : orderedRow.reverse();
  });
}

function getOuterLoopSegments(route, dots) {
  if (route.length < 2) {
    return [];
  }

  const minX = Math.min(...dots.map(({ x }) => x));
  const maxY = Math.max(...dots.map(({ y }) => y));
  const first = route[0];
  const last = route[route.length - 1];
  const lowerLeft = {
    x: minX - OUTER_MARGIN,
    y: maxY + OUTER_MARGIN,
  };
  const upperLeft = {
    x: minX - OUTER_MARGIN,
    y: first.y - OUTER_MARGIN * 1.2,
  };

  return [
    {
      id: "outer-lower",
      start: last,
      control: {
        x: (last.x + lowerLeft.x) / 2,
        y: lowerLeft.y,
      },
      end: lowerLeft,
    },
    {
      id: "outer-left",
      start: lowerLeft,
      control: {
        x: lowerLeft.x - CELL_CURVE,
        y: (lowerLeft.y + upperLeft.y) / 2,
      },
      end: upperLeft,
    },
    {
      id: "outer-return",
      start: upperLeft,
      control: {
        x: upperLeft.x,
        y: first.y + CELL_CURVE,
      },
      end: first,
    },
  ];
}

export function buildKolamSegments(pattern) {
  const route = getCellRoute(pattern);
  const dots = generateDotGrid(pattern);

  if (route.length < 2) {
    return [];
  }

  const cellSegments = route
    .slice(0, -1)
    .map((point, index) => toSegment(point, route[index + 1], index));

  return [
    ...cellSegments,
    ...getOuterLoopSegments(route, dots),
  ];
}

export function buildKolamPath(pattern) {
  const segments = buildKolamSegments(pattern);
  const [firstSegment, ...remainingSegments] = segments;

  if (!firstSegment) {
    return "";
  }

  return [
    `M ${firstSegment.start.x} ${firstSegment.start.y}`,
    `Q ${firstSegment.control.x} ${firstSegment.control.y} ${firstSegment.end.x} ${firstSegment.end.y}`,
    ...remainingSegments.map(
      (segment) => `Q ${segment.control.x} ${segment.control.y} ${segment.end.x} ${segment.end.y}`,
    ),
  ].join(" ");
}

export function buildSegmentPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} Q ${segment.control.x} ${segment.control.y} ${segment.end.x} ${segment.end.y}`;
}
