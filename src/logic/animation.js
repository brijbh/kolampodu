const DEFAULT_DURATION = 4600;
const DEFAULT_START_DELAY = 200;
const DEFAULT_END_HOLD = 500;
const SEGMENT_OVERLAP = 0.12;
const LEADING_EDGE_LENGTH = 12;
const SPEED_VARIATION = [1, 0.94, 1.08, 0.98, 1.04];

const clampProgress = (value) => Math.min(1, Math.max(0, value));
const easeSlowEntryFastExit = (value) => {
  const progress = clampProgress(value);
  return progress * progress * (1.2 - 0.2 * progress);
};

export function getStrokeDrawStyles(pathLength, progress) {
  const length = Math.max(0, pathLength);
  const safeProgress = clampProgress(progress);

  return {
    strokeDasharray: length,
    strokeDashoffset: length * (1 - safeProgress),
  };
}

export function getPathRangeDrawStyles(pathLength, startLength, endLength) {
  const length = Math.max(0, pathLength);
  const start = Math.min(length, Math.max(0, startLength));
  const end = Math.min(length, Math.max(start, endLength));
  const visibleLength = end - start;

  return {
    strokeDasharray: `${visibleLength} ${length}`,
    strokeDashoffset: -start,
  };
}

export function getStrokeMaterial(progress, activeSegmentProgress = 0) {
  const fadeIn = clampProgress(progress * 12);
  const pulse = Math.sin(activeSegmentProgress * Math.PI);

  return {
    opacity: 0.18 + fadeIn * 0.82,
    strokeWidth: 2.34 + pulse * 0.18,
    tipOpacity: 0.28 + fadeIn * 0.52,
    tipStrokeWidth: 2.75 + pulse * 0.16,
  };
}

function getPointAt(segment, progress) {
  const inverse = 1 - progress;

  return {
    x: inverse * inverse * segment.start.x
      + 2 * inverse * progress * segment.control.x
      + progress * progress * segment.end.x,
    y: inverse * inverse * segment.start.y
      + 2 * inverse * progress * segment.control.y
      + progress * progress * segment.end.y,
  };
}

function getDistance(firstPoint, secondPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function getDotSlowdown(segment, dots) {
  if (!dots.length) {
    return 1;
  }

  const samples = [0.25, 0.5, 0.75].map((progress) => getPointAt(segment, progress));
  const nearestDistance = Math.min(
    ...samples.flatMap((sample) => dots.map((dot) => getDistance(sample, dot))),
  );

  if (nearestDistance < 20) {
    return 1.18;
  }

  if (nearestDistance < 36) {
    return 1.1;
  }

  return 1;
}

function getSegmentTimings(segments, {
  duration = DEFAULT_DURATION,
  endHold = DEFAULT_END_HOLD,
  segmentLengths = [],
  dots = [],
} = {}) {
  const count = Math.max(1, segments.length);
  const totalDuration = Math.max(1, duration);
  const drawableDuration = Math.max(1, totalDuration - Math.max(0, endHold));
  const weights = Array.from(
    { length: count },
    (_, index) => {
      const lengthWeight = Math.max(1, segmentLengths[index] ?? 1);
      const speedWeight = SPEED_VARIATION[index % SPEED_VARIATION.length];
      const dotWeight = getDotSlowdown(segments[index], dots);

      return lengthWeight * speedWeight * dotWeight;
    },
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  return weights.map((weight) => {
    const segmentDuration = drawableDuration * (weight / totalWeight);
    const timing = {
      start: cursor,
      end: cursor + segmentDuration,
    };

    cursor = timing.end;
    return timing;
  });
}

export function getSegmentProgresses(segments, progress, timingOptions) {
  const elapsed = clampProgress(progress) * Math.max(1, timingOptions?.duration ?? DEFAULT_DURATION);

  return getSegmentTimings(segments, timingOptions).map(({ start, end }) => {
    const segmentDuration = Math.max(1, end - start);
    return easeSlowEntryFastExit((elapsed - start) / segmentDuration);
  });
}

export function getContinuousDrawState({
  segments,
  segmentLengths,
  dots,
  progress,
  timingOptions,
}) {
  const elapsed = clampProgress(progress) * Math.max(1, timingOptions?.duration ?? DEFAULT_DURATION);
  const timings = getSegmentTimings(segments, {
    ...timingOptions,
    segmentLengths,
    dots,
  });
  const completedLength = segmentLengths.reduce((sum, segmentLength, index) => (
    elapsed >= timings[index].end ? sum + segmentLength : sum
  ), 0);
  const activeIndex = timings.findIndex(({ start, end }) => elapsed >= start && elapsed < end);

  if (activeIndex === -1) {
    const totalLength = segmentLengths.reduce((sum, segmentLength) => sum + segmentLength, 0);

    return {
      completedLength: progress >= 1 ? totalLength : completedLength,
      activeStartLength: completedLength,
      activeEndLength: completedLength,
      activeIndex,
      activeProgress: 1,
      leadingPoint: null,
      tipStartLength: completedLength,
      tipEndLength: completedLength,
    };
  }

  const activeSegmentStart = segmentLengths
    .slice(0, activeIndex)
    .reduce((sum, segmentLength) => sum + segmentLength, 0);
  const activeSegmentLength = segmentLengths[activeIndex] ?? 0;
  const { start, end } = timings[activeIndex];
  const activeProgress = easeSlowEntryFastExit((elapsed - start) / Math.max(1, end - start));
  const previousSegmentLength = segmentLengths[activeIndex - 1] ?? 0;
  const overlapLength = activeIndex === 0
    ? 0
    : Math.min(previousSegmentLength, activeSegmentLength) * SEGMENT_OVERLAP;
  const activeEndLength = activeSegmentStart + activeSegmentLength * activeProgress;

  return {
    completedLength,
    activeStartLength: Math.max(0, activeSegmentStart - overlapLength),
    activeEndLength,
    activeIndex,
    activeProgress,
    leadingPoint: activeProgress > 0
      ? getPointAt(segments[activeIndex], activeProgress)
      : null,
    tipStartLength: Math.max(activeSegmentStart, activeEndLength - LEADING_EDGE_LENGTH),
    tipEndLength: activeEndLength,
  };
}

export function getDotMaterial(dot, leadingPoint) {
  if (!leadingPoint) {
    return {
      opacity: 0.7,
      radius: 2.5,
    };
  }

  const distance = getDistance(dot, leadingPoint);
  const intensity = clampProgress((34 - distance) / 22);

  return {
    opacity: 0.7 + intensity * 0.22,
    radius: 2.5 + intensity * 0.7,
  };
}

export function createKolamAnimation({
  duration = DEFAULT_DURATION,
  startDelay = DEFAULT_START_DELAY,
  onProgress = () => {},
  onComplete = () => {},
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame,
  setDelay = globalThis.setTimeout,
  clearDelay = globalThis.clearTimeout,
  now = () => globalThis.performance.now(),
} = {}) {
  const totalDuration = Math.max(1, duration);
  const delay = Math.max(0, startDelay);
  let frameId = null;
  let delayId = null;
  let startedAt = 0;
  let elapsedBeforeStart = 0;
  let progress = 0;
  let running = false;

  const stopFrame = () => {
    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }

    if (delayId !== null) {
      clearDelay(delayId);
      delayId = null;
    }
  };

  const setProgress = (nextProgress) => {
    progress = clampProgress(nextProgress);
    onProgress(progress);
  };

  const tick = (time) => {
    const elapsed = elapsedBeforeStart + Math.max(0, time - startedAt);
    const rawProgress = clampProgress(elapsed / totalDuration);

    setProgress(rawProgress);

    if (rawProgress < 1) {
      frameId = requestFrame(tick);
      return;
    }

    running = false;
    frameId = null;
    elapsedBeforeStart = totalDuration;
    onComplete();
  };

  const start = () => {
    if (running || progress >= 1) {
      return progress;
    }

    const begin = () => {
      delayId = null;
      startedAt = now();
      frameId = requestFrame(tick);
    };

    running = true;

    if (delay > 0 && elapsedBeforeStart === 0 && progress === 0) {
      startedAt = now() + delay;
      delayId = setDelay(begin, delay);
      return progress;
    }

    begin();
    return progress;
  };

  const pause = () => {
    if (!running) {
      return progress;
    }

    elapsedBeforeStart += Math.max(0, now() - startedAt);
    setProgress(elapsedBeforeStart / totalDuration);
    running = false;
    stopFrame();
    return progress;
  };

  const reset = () => {
    running = false;
    elapsedBeforeStart = 0;
    stopFrame();
    setProgress(0);
    return progress;
  };

  return {
    start,
    pause,
    reset,
    get progress() {
      return progress;
    },
    get isRunning() {
      return running;
    },
  };
}
