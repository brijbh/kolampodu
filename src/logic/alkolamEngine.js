const OPEN = 1;
const CLOSED = 0;
const DEFAULT_ND = 5;
const DEFAULT_SPACING = 60;
const MAX_MERGE_ATTEMPTS = 16;
const SQRT_3_OVER_2 = Math.sqrt(3) / 2;

const SHAPE_CONFIGS = {
  diamond: {
    symmetry: "quad",
    isActive: (i, j) => (i + j) % 2 === 0,
    toPoint: (i, j, nd) => {
      const ic = 2 * i - nd + 1;
      const jc = 2 * j - nd + 1;

      return {
        x: (ic + jc) / 2,
        y: (ic - jc) / 2,
      };
    },
    plotToPoint: (plotI, plotJ) => ({
      x: (plotI + plotJ) / 2,
      y: (plotI - plotJ) / 2,
    }),
  },
  square: {
    symmetry: "quad",
    isActive: () => true,
    toPoint: (i, j, nd) => ({
      x: j - (nd - 1) / 2,
      y: i - (nd - 1) / 2,
    }),
    plotToPoint: (plotI, plotJ, nd) => ({
      x: (plotJ + nd - 1) / 2 - (nd - 1) / 2,
      y: (plotI + nd - 1) / 2 - (nd - 1) / 2,
    }),
  },
  triangle: {
    symmetry: "diagonal",
    isActive: (i, j) => j <= i,
    toPoint: (i, j, nd) => ({
      x: j - i / 2,
      y: i * SQRT_3_OVER_2 - ((nd - 1) * SQRT_3_OVER_2) / 2,
    }),
    plotToPoint: (plotI, plotJ, nd) => {
      const plotRow = (plotI + nd - 1) / 2;
      const plotCol = (plotJ + nd - 1) / 2;
      const i = Math.max(plotRow, plotCol);
      const j = Math.min(plotRow, plotCol);

      return {
        x: j - i / 2,
        y: i * SQRT_3_OVER_2 - ((nd - 1) * SQRT_3_OVER_2) / 2,
      };
    },
  },
  circle: {
    symmetry: "quad",
    isActive: (i, j, nd) => {
      const center = (nd - 1) / 2;
      const radius = nd / 2 - 0.15;

      return Math.hypot(i - center, j - center) <= radius;
    },
    toPoint: (i, j, nd) => ({
      x: j - (nd - 1) / 2,
      y: i - (nd - 1) / 2,
    }),
    plotToPoint: (plotI, plotJ, nd) => ({
      x: (plotJ + nd - 1) / 2 - (nd - 1) / 2,
      y: (plotI + nd - 1) / 2 - (nd - 1) / 2,
    }),
  },
};

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

function getConfig(shapeId) {
  return SHAPE_CONFIGS[shapeId] ?? SHAPE_CONFIGS.diamond;
}

function createMatrix(size, value) {
  return Array.from({ length: size }, () => (
    Array.from({ length: size }, () => value)
  ));
}

function resetGateMatrix(nd) {
  const nx = nd + 1;
  const gates = createMatrix(nx, CLOSED);

  return gates;
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

function getSymmetricCells(i, j, nx, shapeId) {
  const config = getConfig(shapeId);

  if (config.symmetry === "diagonal") {
    return uniqueCells([
      [i, j],
      [j, i],
    ]);
  }

  return uniqueCells([
    [i, j],
    [j, i],
    [nx - 1 - i, nx - 1 - j],
    [nx - 1 - j, nx - 1 - i],
  ]);
}

function setGateCells(gates, cells, value) {
  for (const [i, j] of cells) {
    if (i > 0 && j > 0 && i < gates.length - 1 && j < gates.length - 1) {
      gates[i][j] = value;
    }
  }
}

function isDotActive(i, j, nd, shapeId) {
  if (i < 0 || j < 0 || i >= nd || j >= nd) return false;

  return getConfig(shapeId).isActive(i, j, nd);
}

function isGateMutable(i, j, nd, shapeId) {
  if (i <= 0 || j <= 0 || i >= nd || j >= nd) return false;

  return [
    [-1, -1],
    [0, -1],
    [-1, 0],
    [0, 0],
  ].some(([di, dj]) => isDotActive(i + di, j + dj, nd, shapeId));
}

function getMutableGateGroups(nd, shapeId) {
  const nx = nd + 1;
  const groups = [];
  const seen = new Set();

  for (let i = 1; i < nx - 1; i += 1) {
    for (let j = 1; j < nx - 1; j += 1) {
      if (!isGateMutable(i, j, nd, shapeId)) continue;

      const cells = getSymmetricCells(i, j, nx, shapeId)
        .filter(([r, c]) => isGateMutable(r, c, nd, shapeId));
      const key = cells.map(([r, c]) => `${r}:${c}`).sort().join("|");

      if (key && !seen.has(key)) {
        seen.add(key);
        groups.push(cells);
      }
    }
  }

  return groups;
}

function getMutableGates(nd, shapeId) {
  const gates = [];

  for (let i = 1; i < nd; i += 1) {
    for (let j = 1; j < nd; j += 1) {
      if (isGateMutable(i, j, nd, shapeId)) {
        gates.push([[i, j]]);
      }
    }
  }

  return gates;
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
  const ne = nalpha === 0
    ? (nbeta === 1 ? 0 : 2)
    : (nbeta === 1 ? 1 : 3);

  return {
    icg: ing,
    jcg: jng,
    ce: ne,
    plotI: ingp,
    plotJ: jngp,
  };
}

function stateKey(state) {
  return `${state.icg}:${state.jcg}:${state.ce}`;
}

function traceLoop(gates, nd, start) {
  const maxSteps = 8 * (nd + 1) * (nd + 1);
  const path = [];
  let state = { ...start };

  for (let step = 0; step < maxSteps; step += 1) {
    const next = nextStep(state, gates, nd);
    path.push(next);

    if (stateKey(next) === stateKey(start)) {
      return {
        path,
        closed: true,
      };
    }

    state = next;
  }

  return {
    path,
    closed: false,
  };
}

function loopTouchesActiveDot(loopStates, nd, shapeId) {
  for (const state of loopStates) {
    const i = Math.floor((state.icg + nd) / 2);
    const j = Math.floor((state.jcg + nd) / 2);

    if (
      isDotActive(i - 1, j - 1, nd, shapeId) ||
      isDotActive(i, j - 1, nd, shapeId) ||
      isDotActive(i - 1, j, nd, shapeId) ||
      isDotActive(i, j, nd, shapeId)
    ) {
      return true;
    }
  }

  return false;
}

function getActiveLoops(gates, nd, shapeId) {
  const visited = new Set();
  const loops = [];

  for (let i = 0; i <= nd; i += 1) {
    for (let j = 0; j <= nd; j += 1) {
      if (!isGateMutable(Math.min(Math.max(i, 1), nd - 1), Math.min(Math.max(j, 1), nd - 1), nd, shapeId)) {
        continue;
      }

      for (let ce = 0; ce < 4; ce += 1) {
        const start = makeState(2 * i - nd, 2 * j - nd, ce);
        const key = stateKey(start);

        if (visited.has(key)) continue;

        const loop = traceLoop(gates, nd, start);
        for (const state of loop.path) {
          visited.add(stateKey(state));
        }

        if (loop.closed && loop.path.length > 2 && loopTouchesActiveDot(loop.path, nd, shapeId)) {
          loops.push({
            start,
            path: loop.path,
            size: loop.path.length,
          });
        }
      }
    }
  }

  return loops;
}

function shuffle(items, random) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function mergeLoops(gates, nd, shapeId, random) {
  let activeLoops = getActiveLoops(gates, nd, shapeId);

  for (const groups of [
    getMutableGateGroups(nd, shapeId),
    getMutableGates(nd, shapeId),
  ]) {
    for (const cells of shuffle(groups, random)) {
      if (activeLoops.length <= 1) break;

      setGateCells(gates, cells, OPEN);
      const nextLoops = getActiveLoops(gates, nd, shapeId);

      if (nextLoops.length > 0 && nextLoops.length < activeLoops.length) {
        activeLoops = nextLoops;
      } else {
        setGateCells(gates, cells, CLOSED);
      }
    }
  }

  return activeLoops;
}

function generateDots(nd, spacing, shapeId) {
  const config = getConfig(shapeId);
  const dots = [];

  for (let i = 0; i < nd; i += 1) {
    for (let j = 0; j < nd; j += 1) {
      if (!isDotActive(i, j, nd, shapeId)) continue;

      const point = config.toPoint(i, j, nd);
      dots.push({
        row: i,
        col: j,
        x: point.x * spacing,
        y: point.y * spacing,
      });
    }
  }

  return dots;
}

export function generateAlgorithmDots(nd, spacing = DEFAULT_SPACING, shapeId = "diamond") {
  return projectKolamPoints(generateDots(nd, spacing, "diamond"), shapeId, nd, spacing);
}

function getCanonicalProjection(point, nd, spacing) {
  const extent = Math.max(1, (nd - 1) * spacing);
  const squareX = (point.x + point.y) / 2;
  const squareY = (point.x - point.y) / 2;

  return {
    sx: squareX / extent,
    sy: squareY / extent,
    extent,
  };
}

function projectKolamPoint(point, shapeId, nd, spacing) {
  if (shapeId === "diamond") return { ...point };

  const { sx, sy, extent } = getCanonicalProjection(point, nd, spacing);

  if (shapeId === "square") {
    return {
      ...point,
      x: sx * extent,
      y: sy * extent,
    };
  }

  if (shapeId === "circle") {
    const radius = Math.max(Math.abs(sx), Math.abs(sy)) * extent;
    const angle = Math.atan2(sy, sx);

    return {
      ...point,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }

  if (shapeId === "triangle") {
    const vertical = Math.max(sx, sy) + 0.5;
    const height = extent * 1.32;
    const lateral = sy - sx;
    const widthScale = 0.34 + vertical * 0.6;

    return {
      ...point,
      x: lateral * extent * widthScale,
      y: (vertical - 0.5) * height,
    };
  }

  return { ...point };
}

function projectKolamPoints(points, shapeId, nd, spacing) {
  return points.map((point) => projectKolamPoint(point, shapeId, nd, spacing));
}

function plotToPoint(state, nd, shapeId, spacing) {
  const point = getConfig(shapeId).plotToPoint(state.plotI, state.plotJ, nd);

  return {
    x: point.x * spacing,
    y: point.y * spacing,
  };
}

function buildSegments(pathPoints, closed) {
  if (pathPoints.length < 2) return [];

  if (!closed) {
    return pathPoints.slice(0, -1).map((point, index) => ({
      id: `seg-${index}`,
      start: point,
      end: pathPoints[index + 1],
      control: {
        x: (point.x + pathPoints[index + 1].x) / 2,
        y: (point.y + pathPoints[index + 1].y) / 2,
      },
      path: `M ${point.x} ${point.y} L ${pathPoints[index + 1].x} ${pathPoints[index + 1].y}`,
    }));
  }

  return pathPoints.map((point, index) => {
    const prev = pathPoints[(index - 1 + pathPoints.length) % pathPoints.length];
    const next = pathPoints[(index + 1) % pathPoints.length];
    const start = {
      x: (prev.x + point.x) / 2,
      y: (prev.y + point.y) / 2,
    };
    const end = {
      x: (point.x + next.x) / 2,
      y: (point.y + next.y) / 2,
    };

    return {
      id: `seg-${index}`,
      start,
      end,
      control: point,
      path: `M ${start.x} ${start.y} Q ${point.x} ${point.y} ${end.x} ${end.y}`,
    };
  });
}

function buildCurvePath(segments) {
  if (!segments.length) return "";

  const commands = segments.map((segment, index) => {
    const command = segment.path.replace(/^M\s+[-\d.eE]+\s+[-\d.eE]+\s+/, "");

    return index === 0 || segment.breakBefore
      ? `M ${segment.start.x} ${segment.start.y} ${command}`
      : command;
  });

  return commands.join(" ");
}

function chooseBestLoop(loops) {
  return [...loops].sort((a, b) => b.size - a.size)[0] ?? null;
}

export function buildKolam({
  nd = DEFAULT_ND,
  shapeId = "diamond",
  spacing = DEFAULT_SPACING,
  seed = "kolampodu",
} = {}) {
  const safeNd = Math.max(3, Math.floor(nd));
  const algorithmShapeId = "diamond";

  let best = null;

  for (let attempt = 0; attempt < MAX_MERGE_ATTEMPTS; attempt += 1) {
    const random = createRandom(`${seed}:${algorithmShapeId}:${safeNd}:${attempt}`);
    const gates = resetGateMatrix(safeNd);
    const activeLoops = mergeLoops(gates, safeNd, algorithmShapeId, random);
    const loop = chooseBestLoop(activeLoops);

    if (loop && (!best || loop.size > best.size || activeLoops.length < best.loopCount)) {
      best = {
        loop,
        loopCount: activeLoops.length,
      };
    }

    if (activeLoops.length === 1 && loop) break;
  }

  const canonicalDots = generateDots(safeNd, spacing, algorithmShapeId);
  const path = best?.loop.path ?? [];
  const canonicalPathPoints = path.map((state) => (
    plotToPoint(state, safeNd, algorithmShapeId, spacing)
  ));
  const dots = projectKolamPoints(canonicalDots, shapeId, safeNd, spacing);
  const pathPoints = projectKolamPoints(canonicalPathPoints, shapeId, safeNd, spacing);
  const segments = buildSegments(pathPoints, true);

  return {
    dots,
    pathPoints,
    segments,
    pathD: buildCurvePath(segments),
    closed: pathPoints.length > 2,
    count: pathPoints.length,
    nd: safeNd,
    shapeId,
    diagnostics: {
      activeDots: dots.length,
      activeLoops: best?.loopCount ?? 0,
      projection: shapeId === algorithmShapeId ? "algorithm" : `${shapeId}-algorithm-projection`,
    },
  };
}

export function buildSquareKolam(options = {}) {
  return buildKolam({
    ...options,
    shapeId: options.shapeId ?? "square",
  });
}
