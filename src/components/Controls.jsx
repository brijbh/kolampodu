export default function Controls({
  isPlaying,
  progress,
  onPlay,
  onPause,
  onReset,
}) {
  return (
    <div
      className="controls"
      aria-label="Kolam playback controls"
      data-progress={progress.toFixed(3)}
    >
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
        title="Reset"
        aria-label="Reset"
        onClick={onReset}
      >
        <span className="control-button" aria-hidden="true">⟳</span>
        <span className="control-label">Reset</span>
      </button>
    </div>
  );
}
