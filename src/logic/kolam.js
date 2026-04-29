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

function createGridDots(pattern) {
  const width = getPatternWidth(pattern);

  return pattern.flatMap((count, row) => {
    const offset = (width - count) / 2;

    return Array.from({ length: count }, (_, col) => ({
      row: row + 0.5,
      col: offset + col + 0.5,
    }));
  });
}

function createDotSet(dots) {
  return new Set(dots.map((dot) => `${dot.row},${dot.col}`));
}

function buildActiveMask(pattern) {
  const mask = [];
  const maxWidth = getPatternWidth(pattern);

  for (let row = 0; row < pattern.length; row += 1) {
    const count = pattern[row];
    const start = (maxWidth - count) / 2;
    const end = start + count;

    mask[row] = [];

    for (let col = 0; col < maxWidth; col += 1) {
      mask[row][col] = col < end && col + 1 > start;
    }
  }

  return mask;
}

function isGateActive(row, col, mask) {
  return Boolean(
    mask[row]?.[col] ||
    mask[row]?.[col - 1] ||
    mask[row - 1]?.[col] ||
    mask[row - 1]?.[col - 1],
  );
}

// ----------------------
// Turn rule (γk simplified)
// ----------------------

function getTurn() {
  return +1;
}

function crossesDot(current, next, dotSet) {
  const key1 = `${current.row},${current.col}`;
  const key2 = `${next.row},${next.col}`;

  return dotSet.has(key1) || dotSet.has(key2);
}

// ----------------------
// Next State (CORE)
// ----------------------

function nextState(state, gates, mask, dotSet) {
  const gate = isGateActive(state.row, state.col, mask)
    ? gates[state.row][state.col]
    : CLOSED;
  let dir = state.dir;

  if (gate === CLOSED) {
    dir = (dir + getTurn(state) + 4) % 4;
  }

  const move = DIRS[dir];

  const next = {
    row: state.row + move.dr,
    col: state.col + move.dc,
    dir,
  };

  if (crossesDot(state, next, dotSet)) {
    dir = (dir + getTurn(state) + 4) % 4;

    const turnMove = DIRS[dir];
    const turnNext = {
      row: state.row + turnMove.dr,
      col: state.col + turnMove.dc,
      dir,
    };

    return isGateActive(turnNext.row, turnNext.col, mask) ? turnNext : null;
  }

  return isGateActive(next.row, next.col, mask) ? next : null;
}

// ----------------------
// Simulation
// ----------------------

function simulate(gates, start, mask, dotSet) {
  const visited = new Set();
  const path = [];

  let state = { ...start };

  while (true) {
    if (!isGateActive(state.row, state.col, mask)) {
      return { closed: false, path };
    }

    const key = `${state.row}:${state.col}:${state.dir}`;

    if (visited.has(key)) {
      return { closed: false, path };
    }

    visited.add(key);
    path.push(state);

    const next = nextState(state, gates, mask, dotSet);

    if (
      !next ||
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

function findBestLoop(gates, dots, mask, dotSet) {
  let best = null;

  for (let r = 0; r < gates.length; r++) {
    for (let c = 0; c < gates[0].length; c++) {
      if (!isGateActive(r, c, mask)) {
        continue;
      }

      for (let d = 0; d < 4; d++) {
        const candidate = evaluateLoop(
          simulate(gates, { row: r, col: c, dir: d }, mask, dotSet),
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

function buildSmoothPath(path) {
  if (!path.length) return "";

  let d = "";

  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    const prev = path[i - 1];
    const next = path[i + 1] ?? path[1];
    const point = gatePoint(p.row, p.col);

    if (i === 0) {
      d += `M ${point.x} ${point.y}`;
      continue;
    }

    if (prev && next) {
      const prevPoint = gatePoint(prev.row, prev.col);
      const nextPoint = gatePoint(next.row, next.col);

      const cx = (prevPoint.x + nextPoint.x) / 2;
      const cy = (prevPoint.y + nextPoint.y) / 2;

      d += ` Q ${cx} ${cy}, ${point.x} ${point.y}`;
    }
  }

  return d;
}

function buildSegments(path) {
  if (path.length < 2) return [];

  const start = gatePoint(path[0].row, path[0].col);
  const end = gatePoint(path[path.length - 1].row, path[path.length - 1].col);
  const control = gatePoint(
    (path[0].row + path[Math.floor(path.length / 2)].row) / 2,
    (path[0].col + path[Math.floor(path.length / 2)].col) / 2,
  );

  return [{
    id: "seg-0",
    start,
    end,
    control,
    command: "Q",
    path: buildSmoothPath(path),
  }];
}

// ----------------------
// Public API
// ----------------------

export function buildKolamSegments(pattern) {
  const cacheKey = pattern.join("-");

  if (solutionCache.has(cacheKey)) {
    return solutionCache.get(cacheKey);
  }

  const dots = createGridDots(pattern);
  const dotSet = createDotSet(dots);
  const mask = buildActiveMask(pattern);
  const qualityTarget = dots.length * 6;
  let bestValid = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const random = createRandom(pattern, `opt-${attempt}`);
    const gates = createGateMatrix(pattern, attempt);
    let current = findBestLoop(gates, dots, mask, dotSet);
    console.log({
      closed: current.result.closed,
      steps: current.result.path.length,
    });

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
      const candidate = findBestLoop(gates, dots, mask, dotSet);

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

  return segments[0].path;
}

export function buildSegmentPath(segment) {
  return segment.path;
}
