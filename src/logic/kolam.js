import { DOT_SPACING, generateDotGrid } from "./grid";

const HANDCRAFTED_PATTERN = "5,4,3,2,1";
const PLACEHOLDER_PATTERNS = new Set([
  "5,5,5,5,5",
  "1,2,3,4,3,2,1",
  "3,5,5,5,3",
]);
const ANCHOR_RADIUS = 24;
const LOOP_RADIUS = DOT_SPACING * 0.36;
const ROW_DROP_HANDLE = DOT_SPACING * 0.6;
const ANCHOR_TURN_RULE = {
  left: "top",
  top: "right",
  right: "bottom",
  bottom: "left",
};

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

function addAnchorSegment(segments, start, control, end, id) {
  if (start.x === end.x && start.y === end.y) {
    return;
  }

  segments.push(toSegment(start, control, end, id));
}

function dotAnchors(dot, radius = ANCHOR_RADIUS) {
  return {
    top: { x: dot.x, y: dot.y - radius },
    right: { x: dot.x + radius, y: dot.y },
    bottom: { x: dot.x, y: dot.y + radius },
    left: { x: dot.x - radius, y: dot.y },
  };
}

function getAnchorTurnControl(start, end, entrySide) {
  if (entrySide === "left" || entrySide === "right") {
    return {
      x: start.x,
      y: end.y,
    };
  }

  return {
    x: end.x,
    y: start.y,
  };
}

function addAnchorTurn(segments, dot, entrySide, id) {
  const exitSide = ANCHOR_TURN_RULE[entrySide];
  const anchors = dotAnchors(dot);
  const start = anchors[entrySide];
  const end = anchors[exitSide];

  addAnchorSegment(
    segments,
    start,
    getAnchorTurnControl(start, end, entrySide),
    end,
    id,
  );

  return exitSide;
}

function addAnchorConnector(segments, start, end, id, side = 0) {
  addAnchorSegment(
    segments,
    start,
    {
      x: (start.x + end.x) / 2 + side * ANCHOR_RADIUS,
      y: (start.y + end.y) / 2,
    },
    end,
    id,
  );
}

function addAnchorClosure(segments, start, end) {
  const maxX = Math.max(
    ...segments.flatMap((segment) => [
      segment.start.x,
      segment.control.x,
      segment.end.x,
    ]),
  );
  const shoulder = {
    x: maxX + ANCHOR_RADIUS * 2,
    y: (start.y + end.y) / 2,
  };

  addAnchorSegment(
    segments,
    start,
    { x: shoulder.x, y: start.y },
    shoulder,
    "anchor-close-outside-entry",
  );
  addAnchorSegment(
    segments,
    shoulder,
    { x: shoulder.x, y: end.y },
    end,
    "anchor-close-outside-return",
  );
}

function buildHandcraftedSikkuSegments(pattern) {
  const rows = getRows(pattern).filter((row) => row.length > 0);
  const segments = [];
  let cursor = null;
  let firstAnchor = null;

  rows.forEach((row, rowIndex) => {
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const orderedDots = direction === 1 ? row : [...row].reverse();
    const rowEntrySide = direction === 1 ? "left" : "right";
    let entrySide = rowEntrySide;

    orderedDots.forEach((dot, dotIndex) => {
      const entry = dotAnchors(dot)[entrySide];

      if (cursor) {
        addAnchorConnector(
          segments,
          cursor,
          entry,
          `anchor-row-${rowIndex}-dot-${dotIndex}-join`,
          dotIndex === 0 ? direction * -1 : 0,
        );
      }

      if (!firstAnchor) {
        firstAnchor = entry;
      }

      entrySide = addAnchorTurn(
        segments,
        dot,
        entrySide,
        `anchor-row-${rowIndex}-dot-${dotIndex}-turn-0`,
      );
      entrySide = addAnchorTurn(
        segments,
        dot,
        entrySide,
        `anchor-row-${rowIndex}-dot-${dotIndex}-turn-1`,
      );

      cursor = dotAnchors(dot)[entrySide];
      entrySide = rowEntrySide;
    });
  });

  if (cursor && firstAnchor) {
    addAnchorClosure(segments, cursor, firstAnchor);
  }

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
