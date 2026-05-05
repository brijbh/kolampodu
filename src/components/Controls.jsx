export default function Controls({
  isPlaying,
  progress,
  speed,
  onPlay,
  onPause,
  onReset,
  onStep,
  onSpeedChange,
}) {
  const speeds = [
    { label: "Slow", value: 0.5 },
    { label: "Normal", value: 1 },
    { label: "Fast", value: 2 },
  ];

  return (
    <div
      className="controls"
      aria-label="Kolam playback controls"
      data-progress={progress.toFixed(3)}
    >
      <div className="speed-control" aria-label="Animation speed">
        {speeds.map((s) => (
          <button
            key={s.label}
            className={`speed-button ${speed === s.value ? "is-active" : ""}`}
            type="button"
            onClick={() => onSpeedChange(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="main-controls">
        <button
          className="control-item"
          type="button"
          title="Play"
          aria-label="Play"
          aria-pressed={isPlaying}
          onClick={onPlay}
        >
          <span className="control-button control-button-primary" aria-hidden="true">▶</span>
          <span className="control-label">Play</span>
        </button>
        <button
          className="control-item"
          type="button"
          title="Pause"
          aria-label="Pause"
          disabled={!isPlaying}
          onClick={onPause}
        >
          <span className="control-button" aria-hidden="true">Ⅱ</span>
          <span className="control-label">Pause</span>
        </button>
        <button
          className="control-item"
          type="button"
          title="Step"
          aria-label="Step"
          disabled={isPlaying || progress >= 1}
          onClick={onStep}
        >
          <span className="control-button" aria-hidden="true">→</span>
          <span className="control-label">Step</span>
        </button>
        <button
          className="control-item"
          type="button"
          title="Reset"
          aria-label="Reset"
          onClick={onReset}
        >
          <span className="control-button" aria-hidden="true">⟳</span>
          <span className="control-label">Reset</span>
        </button>
      </div>
    </div>
  );
}
