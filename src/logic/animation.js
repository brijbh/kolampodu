const DEFAULT_DURATION = 4200;
const DEFAULT_START_DELAY = 200;

const clampProgress = (value) => Math.min(1, Math.max(0, value));
const easeInOut = (value) => {
  const progress = clampProgress(value);
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - ((-2 * progress + 2) ** 2) / 2;
};

export function getStrokeDrawStyles(pathLength, progress) {
  const length = Math.max(0, pathLength);
  const safeProgress = clampProgress(progress);

  return {
    strokeDasharray: length,
    strokeDashoffset: length * (1 - safeProgress),
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

    setProgress(easeInOut(rawProgress));

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
    setProgress(easeInOut(elapsedBeforeStart / totalDuration));
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
