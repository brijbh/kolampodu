import { DOT_SPACING, generateDotGrid } from "./grid";

const HANDCRAFTED_PATTERN = "5,4,3,2,1";
const PLACEHOLDER_PATTERNS = new Set([
  "5,5,5,5,5",
  "1,2,3,4,3,2,1",
  "3,5,5,5,3",
]);
const TRACE_CLEARANCE = 24;
const TRACE_CONTROL_OFFSET = TRACE_CLEARANCE * 2;
const CELL_HALF_WIDTH = DOT_SPACING * 0.5;
const LOOP_RADIUS = DOT_SPACING * 0.36;
const ROW_DROP_HANDLE = DOT_SPACING * 0.6;

function toSegment(start, control, end, id) {
  return {
    id,
    start,
    control,
    end,
  };
}

function getPatternKey(pattern) {
  return pattern.join(",");
}

function isHandcraftedPattern(pattern) {
  return getPatternKey(pattern) === HANDCRAFTED_PATTERN;
}

function isPlaceholderPattern(pattern) {
  return PLACEHOLDER_PATTERNS.has(getPatternKey(pattern));
}

function getRows(pattern) {
  const dots = generateDotGrid(pattern);
  let dotIndex = 0;

  return pattern.map((count) => {
    const row = dots.slice(dotIndex, dotIndex + count).map((dot, col) => ({
      ...dot,
      col,
    }));

    dotIndex += count;
    return row;
  });
}

function compass(dot, radius = LOOP_RADIUS) {
  return {
    north: { x: dot.x, y: dot.y - radius },
    east: { x: dot.x + radius, y: dot.y },
    south: { x: dot.x, y: dot.y + radius },
    west: { x: dot.x - radius, y: dot.y },
    northEast: { x: dot.x + radius, y: dot.y - radius },
    southEast: { x: dot.x + radius, y: dot.y + radius },
    southWest: { x: dot.x - radius, y: dot.y + radius },
    northWest: { x: dot.x - radius, y: dot.y - radius },
  };
}

function addLoop(segments, dot, direction, turn, id) {
  const points = compass(dot);
  const route = direction === 1
    ? turn === "upper"
      ? [
        ["west", "northWest", "north"],
        ["north", "northEast", "east"],
        ["east", "southEast", "south"],
        ["south", "southEast", "east"],
      ]
      : [
        ["west", "southWest", "south"],
        ["south", "southEast", "east"],
        ["east", "northEast", "north"],
        ["north", "northEast", "east"],
      ]
    : turn === "upper"
      ? [
        ["east", "northEast", "north"],
        ["north", "northWest", "west"],
        ["west", "southWest", "south"],
        ["south", "southWest", "west"],
      ]
      : [
        ["east", "southEast", "south"],
        ["south", "southWest", "west"],
        ["west", "northWest", "north"],
        ["north", "northWest", "west"],
      ];

  route.forEach(([start, control, end], index) => {
    segments.push(toSegment(
      points[start],
      points[control],
      points[end],
      `${id}-loop-${index}`,
    ));
  });
}

function addConnector(segments, start, end, id) {
  if (start.x === end.x && start.y === end.y) {
    return;
  }

  segments.push(toSegment(
    start,
    {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
    end,
    id,
  ));
}

function getEntry(dot, direction) {
  return direction === 1 ? compass(dot).west : compass(dot).east;
}

function getExit(dot, direction) {
  return direction === 1 ? compass(dot).east : compass(dot).west;
}

function addRowDrop(segments, start, end, id, side) {
  segments.push(toSegment(
    start,
    {
      x: side === "right"
        ? Math.max(start.x, end.x) + ROW_DROP_HANDLE
        : Math.min(start.x, end.x) - ROW_DROP_HANDLE,
      y: (start.y + end.y) / 2,
    },
    end,
    id,
  ));
}

function addTraceSegment(segments, start, control, end, id) {
  if (start.x === end.x && start.y === end.y) {
    return;
  }

  segments.push(toSegment(start, control, end, id));
}

function getRowTraceGaps(row, direction) {
  const gaps = [
    {
      x: row[0].x - CELL_HALF_WIDTH,
      y: row[0].y,
    },
    ...row.slice(0, -1).map((dot, index) => ({
      x: (dot.x + row[index + 1].x) / 2,
      y: dot.y,
    })),
    {
      x: row[row.length - 1].x + CELL_HALF_WIDTH,
      y: row[0].y,
    },
  ];

  return direction === 1 ? gaps : [...gaps].reverse();
}

function getRowTraceDots(row, direction) {
  return direction === 1 ? row : [...row].reverse();
}

function getRowTraceSide(rowIndex) {
  return rowIndex % 2 === 0 ? -1 : 1;
}

function addTraceRow(segments, row, rowIndex, direction) {
  const gaps = getRowTraceGaps(row, direction);
  const dots = getRowTraceDots(row, direction);
  const side = getRowTraceSide(rowIndex);

  dots.forEach((dot, index) => {
    addTraceSegment(
      segments,
      gaps[index],
      {
        x: (gaps[index].x + gaps[index + 1].x) / 2,
        y: dot.y + side * TRACE_CONTROL_OFFSET,
      },
      gaps[index + 1],
      `trace-row-${rowIndex}-cell-${index}`,
    );
  });

  return {
    start: gaps[0],
    end: gaps[gaps.length - 1],
  };
}

function addTraceRowConnector(segments, start, end, rowIndex) {
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const side = start.x > end.x ? 1 : -1;

  addTraceSegment(
    segments,
    start,
    {
      x: midpoint.x + side * TRACE_CONTROL_OFFSET,
      y: midpoint.y,
    },
    end,
    `trace-row-${rowIndex}-connector`,
  );
}

function buildHandcraftedSikkuSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 0);
  const segments = [];
  let previousRowEnd = null;

  rows.forEach((row, rowIndex) => {
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const [start] = getRowTraceGaps(row, direction);

    if (previousRowEnd) {
      addTraceRowConnector(segments, previousRowEnd, start, rowIndex);
    }

    const { end } = addTraceRow(segments, row, rowIndex, direction);

    previousRowEnd = end;
  });

  return segments;
}

function buildTemporaryLoopPlaceholderSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 0);
  const segments = [];
  let cursor = null;

  rows.forEach((row, rowIndex) => {
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const orderedDots = direction === 1 ? row : [...row].reverse();
    const rowEntry = getEntry(orderedDots[0], direction);

    if (cursor) {
      addRowDrop(
        segments,
        cursor,
        rowEntry,
        `placeholder-row-${rowIndex}-drop`,
        direction === 1 ? "left" : "right",
      );
    }

    orderedDots.forEach((dot, dotIndex) => {
      const entry = getEntry(dot, direction);

      if (cursor) {
        addConnector(segments, cursor, entry, `placeholder-row-${rowIndex}-dot-${dotIndex}-join`);
      }

      addLoop(
        segments,
        dot,
        direction,
        "upper",
        `placeholder-row-${rowIndex}-dot-${dotIndex}`,
      );

      cursor = getExit(dot, direction);
    });
  });

  return segments;
}

export function buildKolamSegments(pattern) {
  if (isHandcraftedPattern(pattern)) {
    return buildHandcraftedSikkuSegments(pattern);
  }

  if (isPlaceholderPattern(pattern)) {
    return buildTemporaryLoopPlaceholderSegments(pattern);
  }

  return [];
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
