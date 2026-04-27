import { DOT_SPACING, generateDotGrid } from "./grid";

const SUPPORTED_PATTERN = "5,4,3,2,1";
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

function isSupportedPattern(pattern) {
  return pattern.join(",") === SUPPORTED_PATTERN;
}

function getRows(pattern) {
  const dots = generateDotGrid(pattern);
  let dotIndex = 0;

  return pattern.map((count) => {
    const row = dots.slice(dotIndex, dotIndex + count);
    dotIndex += count;
    return row;
  });
}

function compass(dot) {
  return {
    north: { x: dot.x, y: dot.y - LOOP_RADIUS },
    east: { x: dot.x + LOOP_RADIUS, y: dot.y },
    south: { x: dot.x, y: dot.y + LOOP_RADIUS },
    west: { x: dot.x - LOOP_RADIUS, y: dot.y },
    northEast: { x: dot.x + LOOP_RADIUS, y: dot.y - LOOP_RADIUS },
    southEast: { x: dot.x + LOOP_RADIUS, y: dot.y + LOOP_RADIUS },
    southWest: { x: dot.x - LOOP_RADIUS, y: dot.y + LOOP_RADIUS },
    northWest: { x: dot.x - LOOP_RADIUS, y: dot.y - LOOP_RADIUS },
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

function buildHandcraftedSikkuSegments(pattern) {
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
        `row-${rowIndex}-drop`,
        direction === 1 ? "left" : "right",
      );
    }

    orderedDots.forEach((dot, dotIndex) => {
      const entry = getEntry(dot, direction);

      if (cursor && (cursor.x !== entry.x || cursor.y !== entry.y)) {
        addConnector(segments, cursor, entry, `row-${rowIndex}-dot-${dotIndex}-join`);
      }

      addLoop(
        segments,
        dot,
        direction,
        (rowIndex + dotIndex) % 2 === 0 ? "upper" : "lower",
        `row-${rowIndex}-dot-${dotIndex}`,
      );

      cursor = getExit(dot, direction);
    });
  });

  if (segments.length > 0) {
    const start = segments[0].start;

    segments.push(
      toSegment(
        cursor,
        {
          x: cursor.x,
          y: cursor.y + ROW_DROP_HANDLE,
        },
        {
          x: start.x,
          y: cursor.y + ROW_DROP_HANDLE,
        },
        "outer-return-bottom",
      ),
      toSegment(
        {
          x: start.x,
          y: cursor.y + ROW_DROP_HANDLE,
        },
        {
          x: start.x - ROW_DROP_HANDLE,
          y: (cursor.y + start.y) / 2,
        },
        start,
        "outer-return-left",
      ),
    );
  }

  return segments;
}

function buildNoopSegments(pattern) {
  const [dot] = generateDotGrid(pattern);
  const point = dot ?? { x: 0, y: 0 };

  return [
    toSegment(point, point, point, "paused-generic-generation"),
  ];
}

export function buildKolamSegments(pattern) {
  if (!isSupportedPattern(pattern)) {
    return buildNoopSegments(pattern);
  }

  return buildHandcraftedSikkuSegments(pattern);
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
