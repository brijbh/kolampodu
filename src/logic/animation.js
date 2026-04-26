const DEFAULT_DURATION = 6000;

const clampProgress = (value) => Math.min(1, Math.max(0, value));

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
  onProgress = () => {},
  onComplete = () => {},
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame,
  now = () => globalThis.performance.now(),
} = {}) {
  const totalDuration = Math.max(1, duration);
  let frameId = null;
  let startedAt = 0;
  let elapsedBeforeStart = 0;
  let progress = 0;
  let running = false;

  const stopFrame = () => {
    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }
  };

  const setProgress = (nextProgress) => {
    progress = clampProgress(nextProgress);
    onProgress(progress);
  };

  const tick = (time) => {
    const elapsed = elapsedBeforeStart + time - startedAt;
    setProgress(elapsed / totalDuration);

    if (progress < 1) {
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

    running = true;
    startedAt = now();
    frameId = requestFrame(tick);
    return progress;
  };

  const pause = () => {
    if (!running) {
      return progress;
    }

    elapsedBeforeStart += now() - startedAt;
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
