import { DOT_SPACING, getDot } from "./grid";

const OPEN = 1;
const CLOSED = 0;
const ND = 5;
const NX = ND + 1;
const NS = 2 * (ND ** 2 + 1) + 5;
const MAX_ATTEMPTS = 40;
const MAX_FLIP_STEPS = 400;
const TARGET_OPEN_RATIO = 0.55;
const ARC_RADIUS = DOT_SPACING * 0.5;
const OFFSET = DOT_SPACING * 0.35;
const solutionCache = new Map();

function createRandom(pattern, attempt) {
  const key = Array.isArray(pattern) ? pattern.join(",") : String(pattern);
  let seed = `${key}:${attempt}`.split("").reduce(
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

function createMatrix(size, value) {
  return Array.from({ length: size }, () => (
    Array.from({ length: size }, () => value)
  ));
}

function resetGateMatrix() {
  const A = createMatrix(NX, 99);
  const F = createMatrix(NX, 1);

  for (let i = 0; i < NX; i += 1) {
    A[0][i] = CLOSED;
    A[i][0] = CLOSED;
    A[NX - 1][i] = CLOSED;
    A[i][NX - 1] = CLOSED;

    F[0][i] = 0;
    F[i][0] = 0;
    F[NX - 1][i] = 0;
    F[i][NX - 1] = 0;
  }

  for (let i = 1; i <= NX - 2; i += 1) {
    A[i][i] = OPEN;
    A[i][NX - 1 - i] = OPEN;
    F[i][i] = 0;
    F[i][NX - 1 - i] = 0;
  }

  return { A, F };
}

function uniqueCells(cells) {
  const seen = new Set();

  return cells.filter(([i, j]) => {
    const key = `${i}:${j}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getSymmetricCells(i, j) {
  return uniqueCells([
    [i, j],
    [j, i],
    [NX - 1 - i, NX - 1 - j],
    [NX - 1 - j, NX - 1 - i],
  ]);
}

function isMutableGroup(cells, F) {
  return cells.every(([i, j]) => F[i]?.[j] === 1);
}

function mutableGateGroups(F) {
  const groups = [];
  const seen = new Set();

  for (let i = 1; i <= NX - 2; i += 1) {
    for (let j = 1; j <= NX - 2; j += 1) {
      const cells = getSymmetricCells(i, j);
      const key = cells.map(([r, c]) => `${r}:${c}`).sort().join("|");

      if (seen.has(key) || !isMutableGroup(cells, F)) {
        continue;
      }

      seen.add(key);
      groups.push(cells);
    }
  }

  return groups;
}

function setGateGroup(A, cells, value) {
  for (const [i, j] of cells) {
    A[i][j] = value;
  }
}

function assignGates(A, F, random) {
  for (const cells of mutableGateGroups(F)) {
    setGateGroup(A, cells, random() < TARGET_OPEN_RATIO ? OPEN : CLOSED);
  }

  return A;
}

// ----------------------
// Next State (CORE)
// ----------------------

function makeState(icg, jcg, ce) {
  return {
    icg,
    jcg,
    ce,
    plotI: icg,
    plotJ: jcg,
  };
}

function nextStep(state, gates, ND) {
  const { icg, jcg, ce } = state;

  const icgx = icg + ND;
  const jcx = jcg + ND;

  const icgx2 = Math.floor(icgx / 2);
  const jcx2 = Math.floor(jcx / 2);

  const calpha = ce % 2;
  const cbeta = ce > 1 ? -1 : 1;

  const cgamma = (Math.trunc(icgx + jcx) % 4 === 0) ? -1 : 1;

  const cg = gates[icgx2]?.[jcx2] > 0.5 ? 1 : 0;
  const cgd = 1 - cg;
  const calphad = 1 - calpha;

  const nalpha = cg * calpha + cgd * calphad;
  const nbeta = (cg + cgd * cgamma) * cbeta;

  const nh = (calphad * cgamma * cgd + calpha * cg) * cbeta;
  const nv = (calpha * cgamma * cgd + calphad * cg) * cbeta;

  const ing = Math.trunc(icg + nh * 2);
  const jng = Math.trunc(jcg + nv * 2);

  const ingp = icg + cgd * (calphad * cgamma - calpha) * cbeta * 0.5;
  const jngp = jcg + cgd * (calpha * cgamma - calphad) * cbeta * 0.5;

  let ne;

  if (nalpha === 0) {
    ne = nbeta === 1 ? 0 : 2;
  } else {
    ne = nbeta === 1 ? 1 : 3;
  }

  return {
    icg: ing,
    jcg: jng,
    ce: ne,
    plotI: ingp,
    plotJ: jngp,
  };
}

// ----------------------
// Simulation
// ----------------------

function runPath(A, start) {
  const path = [];

  let state = { ...start };

  for (let step = 0; step < NS - 2; step += 1) {
    path.push(state);

    const next = nextStep(state, A, ND);

    if (
      next.icg === start.icg &&
      next.jcg === start.jcg &&
      next.ce === start.ce
    ) {
      path.push(next);
      return {
        count: path.length,
        path,
        closed: true,
      };
    }

    state = next;
  }

  return {
    count: path.length,
    path,
    closed: false,
  };
}

function findValidStart(A) {
  if (!A.length) return makeState(1, 1, 0);

  let best = null;

  for (let i = -ND; i <= ND; i += 2) {
    for (let j = -ND; j <= ND; j += 2) {
      for (let ce = 0; ce < 4; ce += 1) {
        const start = makeState(i, j, ce);
        const candidate = runPath(A, start);

        if (
          candidate.closed &&
          (!best || scoreLoop(candidate) > scoreLoop(best.result))
        ) {
          best = { start, result: candidate };
        }
      }
    }
  }

  return best?.start ?? makeState(1, 1, 0);
}

function pathCount(A) {
  return runPath(A, findValidStart(A));
}

// ----------------------
// Find valid loop
// ----------------------

function coversAllDots(path, ND) {
  const visited = new Set();

  for (const p of path) {
    const key = `${Math.round(p.plotI)},${Math.round(p.plotJ)}`;
    visited.add(key);
  }

  const expected = ND * ND;

  return visited.size >= expected * 0.6;
}

function isValidLoop(result) {
  return Boolean(
    result?.closed &&
    result.count >= NS - 5 &&
    coversAllDots(result.path, ND)
  );
}

function scoreLoop(simulation) {
  return (
    (simulation?.closed ? 1000 : 0) +
    (coversAllDots(simulation?.path ?? [], ND) ? 500 : 0) +
    (simulation?.count ?? 0)
  );
}

function evaluateLoop(result) {
  return {
    result,
    length: result?.count ?? 0,
    score: scoreLoop(result),
    valid: isValidLoop(result),
  };
}

function isBetterLoop(candidate, current) {
  if (!current) return true;
  if (candidate.score !== current.score) {
    return candidate.score > current.score;
  }

  return candidate.length > current.length;
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function flipGroup(A, cells) {
  const nextValue = A[cells[0][0]][cells[0][1]] === OPEN ? CLOSED : OPEN;
  setGateGroup(A, cells, nextValue);
}

function shuffle(items, random) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function improveGates(A, F, random) {
  const groups = mutableGateGroups(F);
  let best = evaluateLoop(pathCount(A));

  for (let step = 0; step < MAX_FLIP_STEPS && !best.valid; step += 1) {
    let improved = false;

    for (const cells of shuffle(groups, random)) {
      flipGroup(A, cells);

      const candidate = evaluateLoop(pathCount(A));

      if (candidate.length > best.length) {
        best = candidate;
        improved = true;

        if (best.valid) {
          break;
        }
      } else {
        flipGroup(A, cells);
      }
    }

    if (!improved) {
      break;
    }
  }

  return best;
}

function buildNotebookSolution(pattern) {
  let bestValid = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const random = createRandom(pattern, `notebook-${attempt}`);
    const { A, F } = resetGateMatrix();
    assignGates(A, F, random);

    const current = improveGates(A, F, random);

    console.log({
      closed: current.result.closed,
      steps: current.result.count,
    });

    console.log(
      `[kolam] notebook attempt ${attempt + 1}/${MAX_ATTEMPTS}: ` +
      `count ${current.length}/${NS - 5}`,
    );

    if (current.valid && isBetterLoop(current, bestValid)) {
      bestValid = {
        ...current,
        gates: cloneMatrix(A),
      };
    }

    if (bestValid) {
      return bestValid;
    }
  }

  return bestValid;
}

// ----------------------
// Convert to SVG segments
// ----------------------

function mapToDotSpace(plotI, plotJ, pattern) {
  const row = Math.round(plotI);
  const col = Math.round(plotJ);

  if (!pattern[row]) return null;
  if (col < 0 || col >= pattern[row]) return null;

  return getDot(pattern, row, col);
}

function getFallbackDot(plotI, plotJ, pattern) {
  const row = Math.min(
    Math.max(Math.round(plotI), 0),
    Math.max(pattern.length - 1, 0),
  );
  const col = Math.min(
    Math.max(Math.round(plotJ), 0),
    Math.max((pattern[row] ?? 1) - 1, 0),
  );

  return getDot(pattern, row, col);
}

function algorithmPointToSvg(plotI, plotJ, pattern, prev, curr) {
  const dot = mapToDotSpace(plotI, plotJ, pattern) ??
    getFallbackDot(plotI, plotJ, pattern);

  if (!prev || !curr) {
    return dot;
  }

  const dx = curr.plotJ - prev.plotJ;
  const dy = curr.plotI - prev.plotI;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const px = -ny;
  const py = nx;

  return {
    x: dot.x + px * OFFSET,
    y: dot.y + py * OFFSET,
  };
}

function turnDirection(prev, curr) {
  const dx = curr.plotJ - prev.plotJ;
  const dy = curr.plotI - prev.plotI;

  return dx - dy;
}

function buildArcPath(path, pattern) {
  if (path.length < 2) return "";

  let d = "";

  for (let i = 1; i < path.length; i += 1) {
    const prevState = path[i - 1];
    const curr = path[i];
    const start = algorithmPointToSvg(
      prevState.plotI,
      prevState.plotJ,
      pattern,
      prevState,
      curr,
    );
    const point = algorithmPointToSvg(
      curr.plotI,
      curr.plotJ,
      pattern,
      prevState,
      curr,
    );
    const sweep = turnDirection(prevState, curr) > 0 ? 1 : 0;

    if (i === 1) {
      d += `M ${start.x} ${start.y}`;
    }

    d += ` A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 ${sweep} ${point.x} ${point.y}`;
  }

  return d;
}

function buildDebugPoints(path, pattern) {
  return path.map((point, index) => {
    const prev = path[index - 1] ?? point;

    return algorithmPointToSvg(point.plotI, point.plotJ, pattern, prev, point);
  });
}

function buildSegments(path, pattern) {
  if (path.length < 2) return [];

  const start = algorithmPointToSvg(
    path[0].plotI,
    path[0].plotJ,
    pattern,
    path[0],
    path[1],
  );
  const end = algorithmPointToSvg(
    path[path.length - 1].plotI,
    path[path.length - 1].plotJ,
    pattern,
    path[path.length - 2],
    path[path.length - 1],
  );
  const control = algorithmPointToSvg(
    (path[0].plotI + path[Math.floor(path.length / 2)].plotI) / 2,
    (path[0].plotJ + path[Math.floor(path.length / 2)].plotJ) / 2,
    pattern,
    path[0],
    path[Math.floor(path.length / 2)],
  );

  return [{
    id: "seg-0",
    start,
    end,
    control,
    command: "A",
    path: buildArcPath(path, pattern),
    debugPoints: buildDebugPoints(path, pattern),
  }];
}

// ----------------------
// Public API
// ----------------------

export function buildKolamSegments(pattern) {
  const cacheKey = `canonical-notebook-nd-5:${pattern.join("-")}`;

  if (solutionCache.has(cacheKey)) {
    return solutionCache.get(cacheKey);
  }

  const solution = buildNotebookSolution(pattern);
  const segments = solution ? buildSegments(solution.result.path, pattern) : [];
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
