const OPEN = 1;
const CLOSED = 0;
const DEFAULT_ND = 5;
const DEFAULT_SPACING = 60;
const TARGET_OPEN_RATIO = 0.55;
const MAX_ATTEMPTS = 40;
const MAX_FLIP_STEPS = 400;
const DEBUG = true;

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

export function generateSquareDots(nd, spacing = DEFAULT_SPACING) {
  const dots = [];

  for (let row = 0; row < nd; row += 1) {
    for (let col = 0; col < nd; col += 1) {
      dots.push({
        row,
        col,
        x: col * spacing,
        y: row * spacing,
      });
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

  for (let i = 1; i <= nx - 2; i += 1) {
    A[i][i] = OPEN;
    A[i][nx - 1 - i] = OPEN;
    F[i][i] = 0;
    F[i][nx - 1 - i] = 0;
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

  if (DEBUG) {
    console.log("NEXT", {
      from: { icg, jcg, ce },
      to: { ing, jng, ne },
      gate: gates[icgx2]?.[jcx2],
    });
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
  const ns = 2 * (nd ** 2 + 1) + 5;
  const path = [];
  let state = { ...start };

  for (let step = 0; step < ns - 2; step += 1) {
    path.push(state);

    if (DEBUG) {
      console.log("STEP", step, {
        icg: state.icg,
        jcg: state.jcg,
        ce: state.ce,
        plotI: state.plotI,
        plotJ: state.plotJ,
      });
    }

    const next = nextStep(state, A, nd);

    if (
      next.icg === start.icg &&
      next.jcg === start.jcg &&
      next.ce === start.ce
    ) {
      path.push(next);

      if (DEBUG) {
        console.log("LOOP CLOSED", {
          steps: path.length,
          state: next,
        });
      }

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
  const ns = 2 * (nd ** 2 + 1) + 5;

  return (
    (result.closed ? 1000 : 0) +
    (result.count >= ns - 5 ? 500 : 0) +
    result.count
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

    if (DEBUG) {
      console.log("SCORE UPDATE", {
        step,
        bestScore,
      });
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

function loopAroundDot(dot, r) {
  return [
    `M ${dot.x - r} ${dot.y}`,
    `A ${r} ${r} 0 1 0 ${dot.x + r} ${dot.y}`,
    `A ${r} ${r} 0 1 0 ${dot.x - r} ${dot.y}`,
  ].join(" ");
}

function buildDotLoops(dots, spacing) {
  const r = spacing * 0.35;

  return dots.map((dot) => loopAroundDot(dot, r)).join(" ");
}

export function buildSquareKolam({
  nd = DEFAULT_ND,
  spacing = DEFAULT_SPACING,
  seed = "square-stability",
} = {}) {
  let best = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (DEBUG) {
      console.group(`ATTEMPT ${attempt}`);
    }

    const random = createRandom(`${seed}:${nd}:${attempt}`);
    const { A, F } = resetGateMatrix(nd);

    assignGates(A, F, random);

    if (DEBUG) {
      console.group("Gate Matrix");
      console.table(A);
      console.groupEnd();
    }

    const candidate = improveGates(A, F, nd, random);

    if (!best || candidate.score > best.score) {
      best = candidate;
    }

    if (DEBUG) {
      console.groupEnd();
    }
  }

  const dots = generateSquareDots(nd, spacing);
  const result = best?.result ?? { path: [], closed: false, count: 0 };

  return {
    dots,
    pathD: buildDotLoops(dots, spacing),
    closed: result.closed,
    count: result.count,
    nd,
  };
}
