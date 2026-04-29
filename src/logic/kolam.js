import { DOT_SPACING, getPatternWidth } from "./grid";

const OPEN = 1;
const CLOSED = 0;

const DIRS = [
  { dr: 0, dc: 1 },   // east
  { dr: 1, dc: 0 },   // south
  { dr: 0, dc: -1 },  // west
  { dr: -1, dc: 0 },  // north
];

// ----------------------
// Gate Matrix
// ----------------------

function createGateMatrix(pattern) {
  const rows = pattern.length + 1;
  const cols = getPatternWidth(pattern) + 1;

  const gates = [];

  for (let r = 0; r < rows; r++) {
    gates[r] = [];
    for (let c = 0; c < cols; c++) {
      const isBoundary =
        r === 0 || c === 0 || r === rows - 1 || c === cols - 1;

      gates[r][c] = isBoundary
        ? CLOSED
        : Math.random() < 0.55
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

function findLoop(gates) {
  for (let r = 0; r < gates.length; r++) {
    for (let c = 0; c < gates[0].length; c++) {
      for (let d = 0; d < 4; d++) {
        const result = simulate(gates, { row: r, col: c, dir: d });

        if (result.closed && result.path.length > 10) {
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
  const gates = createGateMatrix(pattern);
  const result = findLoop(gates);

  if (!result) {
    return [];
  }

  return buildSegments(result.path);
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
