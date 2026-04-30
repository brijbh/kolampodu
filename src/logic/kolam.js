import { DOT_SPACING, getPatternWidth } from "./grid";

const OPEN = 1;
const CLOSED = 0;
const MAX_ATTEMPTS = 50;
const MAX_SIMULATION_STEPS = 2000;
const solutionCache = new Map();

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

function simulate(gates, start, ND) {
  const path = [];

  let state = { ...start };

  for (let step = 0; step < MAX_SIMULATION_STEPS; step += 1) {
    path.push(state);

    const next = nextStep(state, gates, ND);

    if (
      next.icg === start.icg &&
      next.jcg === start.jcg &&
      next.ce === start.ce
    ) {
      path.push(next);
      return { closed: true, path };
    }

    state = next;
  }

  return { closed: false, path };
}

// ----------------------
// Find valid loop
// ----------------------

function isClosedLoop(result) {
  const [start] = result?.path ?? [];
  const end = result?.path?.[result.path.length - 1];

  return Boolean(
    result?.closed
    && start
    && end
    && end.icg === start.icg
    && end.jcg === start.jcg
    && end.ce === start.ce,
  );
}

function isValidLoop(result) {
  return Boolean(
    isClosedLoop(result) &&
    result.path.length > 1
  );
}

function scoreLoop(simulation) {
  return (
    (simulation?.closed ? 1000 : 0) +
    (simulation?.path?.length ?? 0)
  );
}

function evaluateLoop(result) {
  return {
    result,
    length: result?.path?.length ?? 0,
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

// ----------------------
// Convert to SVG segments
// ----------------------

function algorithmPointToSvg(plotI, plotJ, ND) {
  return {
    x: (plotJ + ND) * (DOT_SPACING / 2),
    y: (plotI + ND) * (DOT_SPACING / 2),
  };
}

function buildSmoothPath(path, ND) {
  if (!path.length) return "";

  let d = "";

  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    const prev = path[i - 1];
    const next = path[i + 1] ?? path[1];
    const point = algorithmPointToSvg(p.plotI, p.plotJ, ND);

    if (i === 0) {
      d += `M ${point.x} ${point.y}`;
      continue;
    }

    if (prev && next) {
      const prevPoint = algorithmPointToSvg(prev.plotI, prev.plotJ, ND);
      const nextPoint = algorithmPointToSvg(next.plotI, next.plotJ, ND);

      const cx = (prevPoint.x + nextPoint.x) / 2;
      const cy = (prevPoint.y + nextPoint.y) / 2;

      d += ` Q ${cx} ${cy}, ${point.x} ${point.y}`;
    }
  }

  return d;
}

function buildSegments(path, ND) {
  if (path.length < 2) return [];

  const start = algorithmPointToSvg(path[0].plotI, path[0].plotJ, ND);
  const end = algorithmPointToSvg(
    path[path.length - 1].plotI,
    path[path.length - 1].plotJ,
    ND,
  );
  const control = algorithmPointToSvg(
    (path[0].plotI + path[Math.floor(path.length / 2)].plotI) / 2,
    (path[0].plotJ + path[Math.floor(path.length / 2)].plotJ) / 2,
    ND,
  );

  return [{
    id: "seg-0",
    start,
    end,
    control,
    command: "Q",
    path: buildSmoothPath(path, ND),
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

  const ND = getPatternWidth(pattern);
  let bestValid = null;
  const start = makeState(1, 1, 0);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const gates = createGateMatrix(pattern, attempt);
    const current = evaluateLoop(simulate(gates, start, ND));

    console.log({
      closed: current.result.closed,
      steps: current.result.path.length,
    });

    console.log(
      `[kolam] gate attempt ${attempt + 1}/${MAX_ATTEMPTS}: ` +
      `score ${current.score}, ` +
      `${current.length} states`,
    );

    if (current.valid && isBetterLoop(current, bestValid)) {
      bestValid = current;
      const segments = buildSegments(bestValid.result.path, ND);
      solutionCache.set(cacheKey, segments);
      return segments;
    }
  }

  const segments = bestValid ? buildSegments(bestValid.result.path, ND) : [];
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
