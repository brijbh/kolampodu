import { DOT_SPACING, generateDotGrid, getPatternWidth } from "./grid";

const OPEN = 1;
const CLOSED = 0;
const TARGET_OPEN_RATIO = 0.55;
const MAX_SIMULATION_STEPS = 900;
const OPTIMIZATION_PASSES = 220;
const DIRECTIONS = [
  { name: "east", row: 0, col: 1 },
  { name: "south", row: 1, col: 0 },
  { name: "west", row: 0, col: -1 },
  { name: "north", row: -1, col: 0 },
];

function getPatternKey(pattern) {
  return pattern.join(",");
}

function createRandom(seedText) {
  let seed = [...seedText].reduce(
    (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0,
    2166136261,
  );

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function getRows(pattern) {
  const dots = generateDotGrid(pattern);
  let dotIndex = 0;

  return pattern.map((count, rowIndex) => {
    const row = dots.slice(dotIndex, dotIndex + count).map((dot, col) => ({
      ...dot,
      row: rowIndex,
      col,
    }));

    dotIndex += count;
    return row;
  });
}

function createGateMatrix(pattern, random) {
  const rowCount = pattern.length + 1;
  const colCount = getPatternWidth(pattern) + 1;

  return Array.from({ length: rowCount }, (_, row) => (
    Array.from({ length: colCount }, (_, col) => (
      row === 0 || col === 0 || row === rowCount - 1 || col === colCount - 1
        ? CLOSED
        : random() < TARGET_OPEN_RATIO ? OPEN : CLOSED
    ))
  ));
}

function cloneGates(gates) {
  return gates.map((row) => [...row]);
}

function getDotGateCorners(dot) {
  return [
    [dot.row, dot.col],
    [dot.row, dot.col + 1],
    [dot.row + 1, dot.col],
    [dot.row + 1, dot.col + 1],
  ];
}

function isInsideGateMatrix(gates, row, col) {
  return row >= 0 && col >= 0 && row < gates.length && col < gates[0].length;
}

function getGate(gates, row, col) {
  return isInsideGateMatrix(gates, row, col) ? gates[row][col] : CLOSED;
}

function enforceGateRules(gates, dots, random) {
  dots.forEach((dot) => {
    const corners = getDotGateCorners(dot).filter(([row, col]) => (
      isInsideGateMatrix(gates, row, col)
    ));
    const allClosed = corners.every(([row, col]) => gates[row][col] === CLOSED);

    if (!allClosed) {
      return;
    }

    const mutableCorners = corners.filter(([row, col]) => (
      row > 0 && col > 0 && row < gates.length - 1 && col < gates[0].length - 1
    ));
    const [row, col] = mutableCorners[Math.floor(random() * mutableCorners.length)]
      ?? mutableCorners[0]
      ?? [];

    if (row !== undefined && col !== undefined) {
      gates[row][col] = OPEN;
    }
  });

  return gates;
}

function buildGates(pattern, dots, random) {
  return enforceGateRules(createGateMatrix(pattern, random), dots, random);
}

function gatePoint(row, col) {
  return {
    x: (col - 0.5) * DOT_SPACING,
    y: (row - 0.5) * DOT_SPACING,
  };
}

function getStateKey(state) {
  return `${state.row}:${state.col}:${state.directionIndex}`;
}

function getDotCenterFromGate(dot) {
  return {
    x: dot.col * DOT_SPACING,
    y: dot.row * DOT_SPACING,
  };
}

function findNearestDot(state, dots) {
  const point = gatePoint(state.row, state.col);

  return dots.reduce((nearestDot, dot) => {
    const center = getDotCenterFromGate(dot);
    const distance = Math.hypot(point.x - center.x, point.y - center.y);

    return !nearestDot || distance < nearestDot.distance
      ? { dot, center, distance }
      : nearestDot;
  }, null);
}

function getTurnDirection(state, dots) {
  const direction = DIRECTIONS[state.directionIndex];
  const point = gatePoint(state.row, state.col);
  const nearestDot = findNearestDot(state, dots);

  if (!nearestDot) {
    return 1;
  }

  const toDot = {
    x: nearestDot.center.x - point.x,
    y: nearestDot.center.y - point.y,
  };
  const cross = direction.col * toDot.y - direction.row * toDot.x;

  if (cross === 0) {
    return (state.row + state.col) % 2 === 0 ? 1 : -1;
  }

  return cross > 0 ? -1 : 1;
}

function getNextState(state, gates, dots) {
  const isOpen = getGate(gates, state.row, state.col) === OPEN;
  const turn = isOpen ? 0 : getTurnDirection(state, dots);
  const preferredDirectionIndex = (
    state.directionIndex + turn + DIRECTIONS.length
  ) % DIRECTIONS.length;
  const directionIndex = [
    preferredDirectionIndex,
    (preferredDirectionIndex + 1) % DIRECTIONS.length,
    (preferredDirectionIndex + DIRECTIONS.length - 1) % DIRECTIONS.length,
    (preferredDirectionIndex + 2) % DIRECTIONS.length,
  ].find((candidateDirectionIndex) => {
    const candidateDirection = DIRECTIONS[candidateDirectionIndex];

    return isInsideGateMatrix(
      gates,
      state.row + candidateDirection.row,
      state.col + candidateDirection.col,
    );
  }) ?? preferredDirectionIndex;
  const direction = DIRECTIONS[directionIndex];

  return {
    row: state.row + direction.row,
    col: state.col + direction.col,
    directionIndex,
    gate: getGate(gates, state.row, state.col),
  };
}

function isStateInside(gates, state) {
  return isInsideGateMatrix(gates, state.row, state.col);
}

function simulateFrom(start, gates, dots) {
  const states = [start];
  const visited = new Map([[getStateKey(start), 0]]);
  let state = start;

  for (let step = 0; step < MAX_SIMULATION_STEPS; step += 1) {
    const nextState = getNextState(state, gates, dots);

    if (!isStateInside(gates, nextState)) {
      return { states, closed: false };
    }

    const nextKey = getStateKey(nextState);
    states.push(nextState);

    if (nextKey === getStateKey(start)) {
      return {
        states,
        closed: states.length >= Math.max(8, dots.length),
      };
    }

    if (visited.has(nextKey)) {
      const cycleStart = visited.get(nextKey);
      const cycleStates = states.slice(cycleStart);

      return {
        states: cycleStates,
        closed: cycleStates.length >= Math.max(8, dots.length),
      };
    }

    visited.set(nextKey, states.length - 1);
    state = nextState;
  }

  return { states, closed: false };
}

function getCoveredDots(states, dots) {
  const covered = new Set();

  states.forEach((state) => {
    dots.forEach((dot) => {
      const touchesDot = getDotGateCorners(dot).some(([row, col]) => (
        row === state.row && col === state.col
      ));

      if (touchesDot) {
        covered.add(`${dot.row}:${dot.col}`);
      }
    });
  });

  return covered;
}

function scoreSimulation(simulation, dots) {
  const coveredDots = getCoveredDots(simulation.states, dots).size;
  const closureBonus = simulation.closed ? dots.length * 8 : 0;

  return closureBonus + coveredDots * 10 + simulation.states.length;
}

function getStartStates(gates) {
  const states = [];

  for (let row = 0; row < gates.length; row += 1) {
    for (let col = 0; col < gates[0].length; col += 1) {
      DIRECTIONS.forEach((_, directionIndex) => {
        states.push({ row, col, directionIndex, gate: getGate(gates, row, col) });
      });
    }
  }

  return states;
}

function findBestSimulation(gates, dots) {
  return getStartStates(gates).reduce((best, start) => {
    const simulation = simulateFrom(start, gates, dots);
    const score = scoreSimulation(simulation, dots);

    return !best || score > best.score
      ? { ...simulation, score }
      : best;
  }, null);
}

function improveGates(initialGates, dots, random) {
  let gates = cloneGates(initialGates);
  let bestSimulation = findBestSimulation(gates, dots);

  for (let pass = 0; pass < OPTIMIZATION_PASSES; pass += 1) {
    const nextGates = cloneGates(gates);
    const row = 1 + Math.floor(random() * Math.max(1, nextGates.length - 2));
    const col = 1 + Math.floor(random() * Math.max(1, nextGates[0].length - 2));

    nextGates[row][col] = nextGates[row][col] === OPEN ? CLOSED : OPEN;
    enforceGateRules(nextGates, dots, random);

    const nextSimulation = findBestSimulation(nextGates, dots);

    if (nextSimulation.score >= bestSimulation.score) {
      gates = nextGates;
      bestSimulation = nextSimulation;
    }

    if (
      bestSimulation.closed
      && getCoveredDots(bestSimulation.states, dots).size === dots.length
    ) {
      break;
    }
  }

  return { gates, simulation: bestSimulation };
}

function getDirectionIndexBetween(start, end) {
  return DIRECTIONS.findIndex((direction) => (
    direction.row === Math.sign(end.row - start.row)
    && direction.col === Math.sign(end.col - start.col)
  ));
}

function toState(row, col, directionIndex, gates) {
  return {
    row,
    col,
    directionIndex,
    gate: getGate(gates, row, col),
  };
}

function buildCoverageSimulation(gates) {
  const points = [];

  for (let row = 0; row < gates.length; row += 1) {
    if (row % 2 === 0) {
      for (let col = 0; col < gates[0].length; col += 1) {
        points.push({ row, col });
      }
    } else {
      for (let col = gates[0].length - 1; col >= 0; col -= 1) {
        points.push({ row, col });
      }
    }
  }

  const lastPoint = points[points.length - 1];

  for (let row = lastPoint.row - 1; row >= 0; row -= 1) {
    points.push({ row, col: lastPoint.col });
  }

  if (points[points.length - 1].col !== points[0].col) {
    const row = points[points.length - 1].row;
    const direction = points[points.length - 1].col > points[0].col ? -1 : 1;

    for (
      let col = points[points.length - 1].col + direction;
      col !== points[0].col + direction;
      col += direction
    ) {
      points.push({ row, col });
    }
  }

  const closedPoints = [...points, points[0]];
  const states = closedPoints.map((point, index) => {
    const nextPoint = closedPoints[index + 1] ?? closedPoints[1];
    const directionIndex = Math.max(0, getDirectionIndexBetween(point, nextPoint));

    return toState(point.row, point.col, directionIndex, gates);
  });

  return { states, closed: true, score: states.length };
}

function toLineSegment(start, end, id) {
  return {
    id,
    start,
    control: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
    end,
    command: "L",
  };
}

function toArcSegment(start, end, sweep, id) {
  return {
    id,
    start,
    control: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
    end,
    radius: DOT_SPACING * 0.5,
    sweep,
    command: "A",
  };
}

function buildSegmentsFromSimulation(simulation) {
  const states = simulation.states;

  return states.slice(0, -1).map((state, index) => {
    const nextState = states[index + 1];
    const start = gatePoint(state.row, state.col);
    const end = gatePoint(nextState.row, nextState.col);

    if (state.gate === CLOSED) {
      const turnDelta = (
        nextState.directionIndex - state.directionIndex + DIRECTIONS.length
      ) % DIRECTIONS.length;

      return toArcSegment(
        start,
        end,
        turnDelta === 1 ? 1 : 0,
        `gate-${index}-turn`,
      );
    }

    return toLineSegment(start, end, `gate-${index}-straight`);
  });
}

function buildGatingBasedSikkuSegments(pattern) {
  const rows = getRows(pattern);
  const dots = rows.flat();
  const random = createRandom(getPatternKey(pattern));
  const initialGates = buildGates(pattern, dots, random);
  const { gates, simulation } = improveGates(initialGates, dots, random);
  const selectedSimulation = simulation?.closed && simulation.states.length >= dots.length
    ? simulation
    : buildCoverageSimulation(gates);

  if (!selectedSimulation?.closed) {
    return [];
  }

  return buildSegmentsFromSimulation(selectedSimulation);
}

export function buildKolamSegments(pattern) {
  return buildGatingBasedSikkuSegments(pattern);
}

function buildSegmentCommand(segment) {
  if (segment.command === "A") {
    return `A ${segment.radius} ${segment.radius} 0 0 ${segment.sweep} ${segment.end.x} ${segment.end.y}`;
  }

  return `L ${segment.end.x} ${segment.end.y}`;
}

export function buildKolamPath(pattern) {
  const segments = buildKolamSegments(pattern);
  const [firstSegment, ...remainingSegments] = segments;

  if (!firstSegment) {
    return "";
  }

  return [
    `M ${firstSegment.start.x} ${firstSegment.start.y}`,
    buildSegmentCommand(firstSegment),
    ...remainingSegments.map((segment) => buildSegmentCommand(segment)),
  ].join(" ");
}

export function buildSegmentPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} ${buildSegmentCommand(segment)}`;
}
