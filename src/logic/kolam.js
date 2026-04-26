import { DOT_SPACING, generateDotGrid } from "./grid";

const DOT_CLEARANCE = DOT_SPACING * 0.44;
const CHANNEL_HALF_WIDTH = DOT_SPACING * 0.5;
const OUTER_MARGIN = DOT_SPACING * 0.72;

function toSegment(start, control, end, id) {
  return {
    id,
    start,
    control,
    end,
  };
}

function getRows(pattern) {
  const max = pattern.length ? Math.max(...pattern) : 0;

  return pattern.map((count, rowIndex) => {
    const offset = (max - count) / 2;

    return Array.from({ length: count }, (_, colIndex) => ({
      x: (colIndex + offset) * DOT_SPACING,
      y: rowIndex * DOT_SPACING,
      row: rowIndex,
      col: colIndex,
    }));
  });
}

function getRowEdge(row, side) {
  const first = row[0];
  const last = row[row.length - 1];

  return {
    x: side === "left"
      ? first.x - CHANNEL_HALF_WIDTH
      : last.x + CHANNEL_HALF_WIDTH,
    y: first.y,
  };
}

function addDotWrapSegments(segments, dot, cursor, direction, dotIndex, rowIndex) {
  const side = dotIndex % 2 === 0 ? -1 : 1;
  const shoulder = {
    x: dot.x,
    y: dot.y + side * DOT_CLEARANCE,
  };
  const nextChannel = {
    x: dot.x + direction * CHANNEL_HALF_WIDTH,
    y: dot.y,
  };

  segments.push(
    toSegment(
      cursor,
      {
        x: cursor.x,
        y: shoulder.y,
      },
      shoulder,
      `row-${rowIndex}-dot-${dot.col}-in`,
    ),
    toSegment(
      shoulder,
      {
        x: nextChannel.x,
        y: shoulder.y,
      },
      nextChannel,
      `row-${rowIndex}-dot-${dot.col}-out`,
    ),
  );

  return nextChannel;
}

function addRowSegments(segments, row, rowIndex, direction) {
  const orderedDots = direction === 1 ? row : [...row].reverse();
  let cursor = getRowEdge(row, direction === 1 ? "left" : "right");

  orderedDots.forEach((dot, dotIndex) => {
    cursor = addDotWrapSegments(segments, dot, cursor, direction, dotIndex, rowIndex);
  });

  return cursor;
}

function addRowConnector(segments, start, end, rowIndex) {
  const outward = rowIndex % 2 === 1 ? 1 : -1;

  segments.push(
    toSegment(
      start,
      {
        x: outward === 1
          ? Math.max(start.x, end.x) + OUTER_MARGIN
          : Math.min(start.x, end.x) - OUTER_MARGIN,
        y: (start.y + end.y) / 2,
      },
      end,
      `row-${rowIndex}-connector`,
    ),
  );
}

function getOuterReturnSegments(start, end, dots) {
  if (!dots.length) {
    return [];
  }

  const minX = Math.min(...dots.map(({ x }) => x));
  const minY = Math.min(...dots.map(({ y }) => y));
  const maxY = Math.max(...dots.map(({ y }) => y));
  const lowerLeft = {
    x: minX - OUTER_MARGIN,
    y: maxY + OUTER_MARGIN,
  };
  const upperLeft = {
    x: minX - OUTER_MARGIN,
    y: minY - OUTER_MARGIN,
  };

  return [
    toSegment(
      end,
      {
        x: (end.x + lowerLeft.x) / 2,
        y: lowerLeft.y,
      },
      lowerLeft,
      "outer-lower",
    ),
    toSegment(
      lowerLeft,
      {
        x: lowerLeft.x - DOT_CLEARANCE,
        y: (lowerLeft.y + upperLeft.y) / 2,
      },
      upperLeft,
      "outer-left",
    ),
    toSegment(
      upperLeft,
      {
        x: upperLeft.x,
        y: (upperLeft.y + start.y) / 2,
      },
      start,
      "outer-return",
    ),
  ];
}

export function buildKolamSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 0);
  const dots = generateDotGrid(pattern);
  const segments = [];

  if (!rows.length) {
    return segments;
  }

  const start = getRowEdge(rows[0], "left");
  let cursor = start;

  rows.forEach((row, rowIndex) => {
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const rowStart = getRowEdge(row, direction === 1 ? "left" : "right");

    if (rowIndex > 0) {
      addRowConnector(segments, cursor, rowStart, rowIndex);
    }

    cursor = addRowSegments(segments, row, rowIndex, direction);
  });

  return [
    ...segments,
    ...getOuterReturnSegments(start, cursor, dots),
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
