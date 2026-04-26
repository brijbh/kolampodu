export default function Controls() {
  return (
    <div className="controls" aria-label="Kolam playback controls">
      <button className="control-item" type="button" title="Play" aria-label="Play">
        <span className="control-button control-button-primary" aria-hidden="true">▶</span>
        <span className="control-label">Play</span>
      </button>
      <button className="control-item" type="button" title="Pause" aria-label="Pause">
        <span className="control-button" aria-hidden="true">Ⅱ</span>
        <span className="control-label">Pause</span>
      </button>
      <button className="control-item" type="button" title="Reset" aria-label="Reset">
        <span className="control-button" aria-hidden="true">⟳</span>
        <span className="control-label">Reset</span>
      </button>
    </div>
  );
}
