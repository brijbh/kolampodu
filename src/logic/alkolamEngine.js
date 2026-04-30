const OPEN = 1;
const CLOSED = 0;
const DEFAULT_ND = 5;
const DEFAULT_SPACING = 60;
const TARGET_OPEN_RATIO = 0.55;
const MAX_ATTEMPTS = 40;
const MAX_FLIP_STEPS = 400;
const DEBUG = false;

function createRandom(seedInput) {
  let seed = String(seedInput).split("").reduce(
    (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0,
    2166136261,
  );

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function createMatrix(size, value) {
  return Array.from({ length: size }, () => (
    Array.from({ length: size }, () => value)
  ));
}

export function generateAlgorithmDots(nd, spacing = DEFAULT_SPACING) {
  const dots = [];

  for (let i = 0; i < nd; i += 1) {
    for (let j = 0; j < nd; j += 1) {
      if ((i + j) % 2 === 0) {
        const ic = 2 * i - nd + 1;
        const jc = 2 * j - nd + 1;
        
        // Transform algorithm (i, j) to visual (x, y)
        const x = (ic + jc) / 2;
        const y = (ic - jc) / 2;

        dots.push({
          row: i,
          col: j,
          ic,
          jc,
          x: x * spacing,
          y: y * spacing,
        });
      }
    }
  }

  return dots;
}

function resetGateMatrix(nd) {
  const nx = nd + 1;
  const A = createMatrix(nx, 99);
  const F = createMatrix(nx, 1);

  for (let i = 0; i < nx; i += 1) {
    A[0][i] = CLOSED;
    A[i][0] = CLOSED;
    A[nx - 1][i] = CLOSED;
    A[i][nx - 1] = CLOSED;

    F[0][i] = 0;
    F[i][0] = 0;
    F[nx - 1][i] = 0;
    F[i][nx - 1] = 0;
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

function getSymmetricCells(i, j, nx) {
  return uniqueCells([
    [i, j],
    [j, i],
    [nx - 1 - i, nx - 1 - j],
    [nx - 1 - j, nx - 1 - i],
  ]);
}

function isMutableGroup(cells, F) {
  return cells.every(([i, j]) => F[i]?.[j] === 1);
}

function mutableGateGroups(F) {
  const nx = F.length;
  const groups = [];
  const seen = new Set();

  for (let i = 1; i <= nx - 2; i += 1) {
    for (let j = 1; j <= nx - 2; j += 1) {
      const cells = getSymmetricCells(i, j, nx);
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

function makeState(icg, jcg, ce) {
  return {
    icg,
    jcg,
    ce,
    plotI: icg,
    plotJ: jcg,
  };
}

function nextStep(state, gates, nd) {
  const { icg, jcg, ce } = state;

  const icgx = icg + nd;
  const jcx = jcg + nd;

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

function runPath(A, nd, start = makeState(1, 1, 0)) {
  const ns = 2 * (nd ** 2 + 1) * 2;
  const path = [];
  let state = { ...start };

  for (let step = 0; step < ns; step += 1) {
    const next = nextStep(state, A, nd);
    path.push(next);

    if (
      next.icg === start.icg &&
      next.jcg === start.jcg &&
      next.ce === start.ce
    ) {
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

function scorePath(result, nd) {
  const ns = 2 * (nd ** 2 + 1);
  const visitedDots = new Set();
  
  result.path.forEach(p => {
    const di = Math.round(p.plotI / 2) * 2;
    const dj = Math.round(p.plotJ / 2) * 2;
    visitedDots.add(`${di},${dj}`);
  });

  const expectedDots = (nd ** 2 + 1) / 2;
  const coverage = visitedDots.size / expectedDots;

  return (
    (result.closed ? 2000 : 0) +
    (coverage >= 1 ? 1000 : 0) +
    (result.count >= ns ? 500 : 0) +
    result.count +
    visitedDots.size * 10
  );
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

function improveGates(A, F, nd, random) {
  const groups = mutableGateGroups(F);
  let best = runPath(A, nd);
  let bestScore = scorePath(best, nd);

  for (let step = 0; step < MAX_FLIP_STEPS; step += 1) {
    let improved = false;

    for (const cells of shuffle(groups, random)) {
      flipGroup(A, cells);

      const candidate = runPath(A, nd);
      const candidateScore = scorePath(candidate, nd);

      if (candidateScore > bestScore) {
        best = candidate;
        bestScore = candidateScore;
        improved = true;
      } else {
        flipGroup(A, cells);
      }
    }

    if (!improved) {
      break;
    }
  }

  return {
    gates: cloneMatrix(A),
    result: best,
    score: bestScore,
  };
}

function buildCurvePath(pathPoints, closed) {
  if (pathPoints.length < 2) return "";

  if (!closed) {
    let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 0; i < pathPoints.length - 1; i += 1) {
      const p0 = pathPoints[i];
      const p1 = pathPoints[i + 1];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      if (i === 0) d += ` L ${midX} ${midY}`;
      else d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
    }
    d += ` L ${pathPoints[pathPoints.length - 1].x} ${pathPoints[pathPoints.length - 1].y}`;
    return d;
  }

  const p = pathPoints;
  const n = p.length;
  const startMidX = (p[n - 1].x + p[0].x) / 2;
  const startMidY = (p[n - 1].y + p[0].y) / 2;

  let d = `M ${startMidX} ${startMidY}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = p[i];
    const p1 = p[(i + 1) % n];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
  }
  return d;
}

export function buildSquareKolam({
  nd = DEFAULT_ND,
  spacing = DEFAULT_SPACING,
  seed = "square-stability",
} = {}) {
  let best = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const random = createRandom(`${seed}:${nd}:${attempt}`);
    const { A, F } = resetGateMatrix(nd);

    assignGates(A, F, random);

    const candidate = improveGates(A, F, nd, random);

    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  }

  const dots = generateAlgorithmDots(nd, spacing);
  const result = best?.result ?? { path: [], closed: false, count: 0 };
  
  const pathPoints = result.path.map((p) => {
    const x = (p.plotI + p.plotJ) / 2;
    const y = (p.plotI - p.plotJ) / 2;
    return { x: x * spacing, y: y * spacing };
  });

  const segments = [];
  if (result.closed && pathPoints.length >= 2) {
    const p = pathPoints;
    const n = p.length;
    for (let i = 0; i < n; i += 1) {
      const pPrev = p[(i - 1 + n) % n];
      const pCurr = p[i];
      const pNext = p[(i + 1) % n];
      
      const startX = (pPrev.x + pCurr.x) / 2;
      const startY = (pPrev.y + pCurr.y) / 2;
      const endX = (pCurr.x + pNext.x) / 2;
      const endY = (pCurr.y + pNext.y) / 2;

      segments.push({
        id: `seg-${i}`,
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        control: pCurr,
        path: `M ${startX} ${startY} Q ${pCurr.x} ${pCurr.y} ${endX} ${endY}`,
      });
    }
  } else if (pathPoints.length >= 2) {
    for (let i = 0; i < pathPoints.length - 1; i += 1) {
      segments.push({
        id: `seg-${i}`,
        start: pathPoints[i],
        end: pathPoints[i+1],
        path: `M ${pathPoints[i].x} ${pathPoints[i].y} L ${pathPoints[i+1].x} ${pathPoints[i+1].y}`,
      });
    }
  }

  return {
    dots,
    pathPoints,
    segments,
    pathD: buildCurvePath(pathPoints, result.closed),
    closed: result.closed,
    count: result.count,
    nd,
  };
}
