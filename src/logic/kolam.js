import { DOT_SPACING, getPatternWidth } from "./grid";

const OPEN = 1;
const CLOSED = 0;
const MAX_ATTEMPTS = 50;
const MAX_OPTIMIZATION_STEPS = 200;
const solutionCache = new Map();

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

function isBoundaryGate(gates, row, col) {
  return (
    row === 0 ||
    col === 0 ||
    row === gates.length - 1 ||
    col === gates[0].length - 1
  );
}

function createDotCoordinates(pattern) {
  const width = getPatternWidth(pattern);

  return pattern.flatMap((count, row) => {
    const offset = (width - count) / 2;

    return Array.from({ length: count }, (_, col) => ({
      row: row + 1,
      col: offset + col + 1,
    }));
  });
}

// ----------------------
// Turn rule (γk simplified)
// ----------------------

function getTurn() {
  return +1;
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

function isDotCovered(dot, path) {
  return path.some((point) => (
    Math.abs(point.row - dot.row) <= 1 &&
    Math.abs(point.col - dot.col) <= 1
  ));
}

function getCoveredDots(dots, path) {
  return dots.filter((dot) => isDotCovered(dot, path));
}

function isClosedLoop(result) {
  const [start] = result?.path ?? [];
  const end = result?.path?.[result.path.length - 1];

  return Boolean(
    result?.closed
    && start
    && end
    && end.row === start.row
    && end.col === start.col
    && end.dir === start.dir,
  );
}

function isValidLoop(result, dots) {
  const coveredDots = getCoveredDots(dots, result?.path ?? []);

  return Boolean(
    isClosedLoop(result) &&
    result.path.length >= dots.length * 2 &&
    coveredDots.length === dots.length
  );
}

function scoreLoop(simulation, dots) {
  const covered = getCoveredDots(dots, simulation?.path ?? []).length;

  return (
    (simulation?.closed ? 1000 : 0) +
    (covered === dots.length ? 500 : 0) +
    (simulation?.path?.length ?? 0)
  );
}

function evaluateLoop(result, dots) {
  const coveredDots = getCoveredDots(dots, result?.path ?? []);

  return {
    result,
    coverage: coveredDots.length,
    length: result?.path?.length ?? 0,
    score: scoreLoop(result, dots),
    valid: isValidLoop(result, dots),
  };
}

function isBetterLoop(candidate, current) {
  if (!current) return true;
  if (candidate.score !== current.score) {
    return candidate.score > current.score;
  }

  return candidate.length > current.length;
}

function findBestLoop(gates, dots) {
  let best = null;

  for (let r = 0; r < gates.length; r++) {
    for (let c = 0; c < gates[0].length; c++) {
      for (let d = 0; d < 4; d++) {
        const candidate = evaluateLoop(
          simulate(gates, { row: r, col: c, dir: d }),
          dots,
        );

        if (isBetterLoop(candidate, best)) {
          best = candidate;
        }
      }
    }
  }

  return best;
}

function flipRandomGate(gates, random) {
  const row = 1 + Math.floor(random() * (gates.length - 2));
  const col = 1 + Math.floor(random() * (gates[0].length - 2));

  if (isBoundaryGate(gates, row, col)) {
    return null;
  }

  gates[row][col] = gates[row][col] === OPEN ? CLOSED : OPEN;

  return { row, col };
}

function restoreGate(gates, flip) {
  if (!flip) return;

  gates[flip.row][flip.col] = gates[flip.row][flip.col] === OPEN ? CLOSED : OPEN;
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
  const cacheKey = pattern.join("-");

  if (solutionCache.has(cacheKey)) {
    return solutionCache.get(cacheKey);
  }

  const dots = createDotCoordinates(pattern);
  const qualityTarget = dots.length * 6;
  let bestValid = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const random = createRandom(pattern, `opt-${attempt}`);
    const gates = createGateMatrix(pattern, attempt);
    let current = findBestLoop(gates, dots);

    console.log(
      `[kolam] gate attempt ${attempt + 1}/${MAX_ATTEMPTS}: ` +
      `score ${current.score}, ${current.coverage}/${dots.length} dots, ` +
      `${current.length} states`,
    );

    if (current.valid && isBetterLoop(current, bestValid)) {
      bestValid = current;

      if (bestValid.length >= qualityTarget) {
        const segments = buildSegments(bestValid.result.path);
        solutionCache.set(cacheKey, segments);
        return segments;
      }
    }

    for (let step = 0; step < MAX_OPTIMIZATION_STEPS; step += 1) {
      const flip = flipRandomGate(gates, random);
      const candidate = findBestLoop(gates, dots);

      if (isBetterLoop(candidate, current)) {
        current = candidate;

        console.log(
          `[kolam] optimization ${attempt + 1}.${step + 1}: ` +
          `score ${current.score}, ${current.coverage}/${dots.length} dots, ` +
          `${current.length} states`,
        );

        if (current.valid && isBetterLoop(current, bestValid)) {
          bestValid = current;

          if (bestValid.length >= qualityTarget) {
            const segments = buildSegments(bestValid.result.path);
            solutionCache.set(cacheKey, segments);
            return segments;
          }
        }
      } else {
        restoreGate(gates, flip);
      }
    }
  }

  const segments = bestValid ? buildSegments(bestValid.result.path) : [];
  solutionCache.set(cacheKey, segments);
  return segments;
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
