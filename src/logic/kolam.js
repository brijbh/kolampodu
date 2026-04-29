import { DOT_SPACING, getPatternWidth } from "./grid";

const OPEN = 1;
const CLOSED = 0;
const MAX_ATTEMPTS = 50;

const DIRS = [
  { dr: 0, dc: 1 },   // east
  { dr: 1, dc: 0 },   // south
  { dr: 0, dc: -1 },  // west
  { dr: -1, dc: 0 },  // north
];

function createRandom(pattern, attempt) {
  let seed = `${pattern.join(",")}:${attempt}`.split("").reduce(
    (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0,
    2166136261,
  );

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

// ----------------------
// Gate Matrix
// ----------------------

function createGateMatrix(pattern, attempt) {
  const rows = pattern.length + 1;
  const cols = getPatternWidth(pattern) + 1;
  const random = createRandom(pattern, attempt);

  const gates = [];

  for (let r = 0; r < rows; r++) {
    gates[r] = [];
    for (let c = 0; c < cols; c++) {
      const isBoundary =
        r === 0 || c === 0 || r === rows - 1 || c === cols - 1;

      gates[r][c] = isBoundary
        ? CLOSED
        : random() < 0.55
        ? OPEN
        : CLOSED;
    }
  }

  return gates;
}

// ----------------------
// Turn rule (γk simplified)
// ----------------------

function getTurn(state) {
  const parity = (state.row + state.col) % 2;
  return parity === 0 ? +1 : -1;
}

// ----------------------
// Next State (CORE)
// ----------------------

function nextState(state, gates) {
  const gate = gates[state.row][state.col];
  let dir = state.dir;

  if (gate === CLOSED) {
    dir = (dir + getTurn(state) + 4) % 4;
  }

  const move = DIRS[dir];

  return {
    row: state.row + move.dr,
    col: state.col + move.dc,
    dir,
  };
}

// ----------------------
// Simulation
// ----------------------

function simulate(gates, start) {
  const visited = new Set();
  const path = [];

  let state = { ...start };

  while (true) {
    const key = `${state.row}:${state.col}:${state.dir}`;

    if (visited.has(key)) {
      return { closed: false, path };
    }

    visited.add(key);
    path.push(state);

    const next = nextState(state, gates);

    if (
      next.row < 0 ||
      next.col < 0 ||
      next.row >= gates.length ||
      next.col >= gates[0].length
    ) {
      return { closed: false, path };
    }

    if (
      next.row === start.row &&
      next.col === start.col &&
      next.dir === start.dir
    ) {
      path.push(next);
      return { closed: true, path };
    }

    state = next;
  }
}

// ----------------------
// Find valid loop
// ----------------------

function isValidLoop(result, threshold) {
  const [start] = result?.path ?? [];
  const end = result?.path?.[result.path.length - 1];

  return Boolean(
    result?.closed
    && result.path.length > threshold
    && start
    && end
    && end.row === start.row
    && end.col === start.col
    && end.dir === start.dir,
  );
}

function findLoop(gates, threshold) {
  for (let r = 0; r < gates.length; r++) {
    for (let c = 0; c < gates[0].length; c++) {
      for (let d = 0; d < 4; d++) {
        const result = simulate(gates, { row: r, col: c, dir: d });

        if (isValidLoop(result, threshold)) {
          return result;
        }
      }
    }
  }

  return null;
}

// ----------------------
// Convert to SVG segments
// ----------------------

function gatePoint(row, col) {
  return {
    x: (col - 0.5) * DOT_SPACING,
    y: (row - 0.5) * DOT_SPACING,
  };
}

function buildSegments(path) {
  const segments = [];

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];

    const start = gatePoint(a.row, a.col);
    const end = gatePoint(b.row, b.col);

    segments.push({
      id: `seg-${i}`,
      start,
      end,
      control: {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      },
      command: "L",
    });
  }

  return segments;
}

// ----------------------
// Public API
// ----------------------

export function buildKolamSegments(pattern) {
  const threshold = pattern.reduce((sum, count) => sum + count, 0) * 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const gates = createGateMatrix(pattern, attempt);
    const result = findLoop(gates, threshold);

    console.log(
      `[kolam] gate attempt ${attempt + 1}/${MAX_ATTEMPTS}: ${
        result ? `valid loop (${result.path.length} states)` : "no valid loop"
      }`,
    );

    if (result) {
      return buildSegments(result.path);
    }
  }

  return [];
}

export function buildKolamPath(pattern) {
  const segments = buildKolamSegments(pattern);

  if (!segments.length) return "";

  const [first, ...rest] = segments;

  const commands = [
    `M ${first.start.x} ${first.start.y}`,
    `L ${first.end.x} ${first.end.y}`,
    ...rest.map((s) => `L ${s.end.x} ${s.end.y}`),
  ];

  return commands.join(" ");
}

export function buildSegmentPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} L ${segment.end.x} ${segment.end.y}`;
}
