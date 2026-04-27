import { DOT_SPACING, generateDotGrid } from "./grid";

const HANDCRAFTED_PATTERN = "5,4,3,2,1";
const PLACEHOLDER_PATTERNS = new Set([
  "5,5,5,5,5",
  "1,2,3,4,3,2,1",
  "3,5,5,5,3",
]);
const OUTER_RADIUS = 24;
const INNER_RADIUS = OUTER_RADIUS * 0.55;
const INNER_LAYER_OFFSET = OUTER_RADIUS + INNER_RADIUS;
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

function getTriangleEntry(dot, direction) {
  return direction === 1
    ? triangleCompass(dot, OUTER_RADIUS).west
    : triangleCompass(dot, OUTER_RADIUS).east;
}

function getTriangleExit(dot, direction) {
  return direction === 1
    ? triangleCompass(dot, OUTER_RADIUS).east
    : triangleCompass(dot, OUTER_RADIUS).west;
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

function getTriangleTurn(rowIndex) {
  return rowIndex % 2 === 0 ? "upper" : "lower";
}

function triangleCompass(dot, radius) {
  return compass(dot, radius);
}

function addTriangleLoop(segments, dot, direction, turn, id) {
  const points = triangleCompass(dot, OUTER_RADIUS);
  const route = direction === 1
    ? turn === "upper"
      ? [
        ["west", "northWest", "north"],
        ["north", "northEast", "east"],
      ]
      : [
        ["west", "southWest", "south"],
        ["south", "southEast", "east"],
      ]
    : turn === "upper"
      ? [
        ["east", "northEast", "north"],
        ["north", "northWest", "west"],
      ]
      : [
        ["east", "southEast", "south"],
        ["south", "southWest", "west"],
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

function addTriangleRowDrop(segments, start, end, id, side) {
  segments.push(toSegment(
    start,
    {
      x: side === "right"
        ? Math.max(start.x, end.x) + OUTER_RADIUS * 0.75
        : Math.min(start.x, end.x) - OUTER_RADIUS * 0.75,
      y: (start.y + end.y) / 2,
    },
    end,
    id,
  ));
}

function getInnerEntry(center, direction) {
  return direction === 1
    ? triangleCompass(center, INNER_RADIUS).west
    : triangleCompass(center, INNER_RADIUS).east;
}

function getInnerExit(center, direction) {
  return direction === 1
    ? triangleCompass(center, INNER_RADIUS).west
    : triangleCompass(center, INNER_RADIUS).east;
}

function addInnerLoop(segments, center, direction, id) {
  const points = triangleCompass(center, INNER_RADIUS);
  const route = direction === 1
    ? [
      ["west", "northWest", "north"],
      ["north", "northEast", "east"],
      ["east", "southEast", "south"],
      ["south", "southWest", "west"],
    ]
    : [
      ["east", "northEast", "north"],
      ["north", "northWest", "west"],
      ["west", "southWest", "south"],
      ["south", "southEast", "east"],
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

function addTriangleConnector(segments, start, end, id, offset = 0) {
  if (start.x === end.x && start.y === end.y) {
    return;
  }

  segments.push(toSegment(
    start,
    {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 + offset,
    },
    end,
    id,
  ));
}

function getInnerLayerCenter(dot, nextDot, turn) {
  return {
    x: (dot.x + nextDot.x) / 2,
    y: (dot.y + nextDot.y) / 2 + (turn === "upper" ? INNER_LAYER_OFFSET : -INNER_LAYER_OFFSET),
  };
}

function buildHandcraftedSikkuSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 0);
  const segments = [];
  let cursor = null;

  rows.forEach((row, rowIndex) => {
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const orderedDots = direction === 1 ? row : [...row].reverse();
    const rowEntry = getTriangleEntry(orderedDots[0], direction);

    if (cursor) {
      addTriangleRowDrop(
        segments,
        cursor,
        rowEntry,
        `row-${rowIndex}-drop`,
        direction === 1 ? "left" : "right",
      );
    }

    orderedDots.forEach((dot, dotIndex) => {
      const entry = getTriangleEntry(dot, direction);

      if (cursor && (cursor.x !== entry.x || cursor.y !== entry.y)) {
        addTriangleConnector(
          segments,
          cursor,
          entry,
          `row-${rowIndex}-dot-${dotIndex}-join`,
        );
      }

      addTriangleLoop(
        segments,
        dot,
        direction,
        getTriangleTurn(rowIndex),
        `row-${rowIndex}-dot-${dotIndex}`,
      );

      cursor = getTriangleExit(dot, direction);

      if (dotIndex < orderedDots.length - 1) {
        const nextDot = orderedDots[dotIndex + 1];
        const turn = getTriangleTurn(rowIndex);
        const innerCenter = getInnerLayerCenter(dot, nextDot, turn);
        const innerEntry = getInnerEntry(innerCenter, direction);

        addTriangleConnector(
          segments,
          cursor,
          innerEntry,
          `row-${rowIndex}-dot-${dotIndex}-inner-entry`,
          turn === "upper" ? INNER_RADIUS : -INNER_RADIUS,
        );
        addInnerLoop(
          segments,
          innerCenter,
          direction,
          `row-${rowIndex}-dot-${dotIndex}-inner`,
        );

        cursor = getInnerExit(innerCenter, direction);
      }
    });
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
