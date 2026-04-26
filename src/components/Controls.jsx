export default function Controls() {
  return (
    <div className="controls" aria-label="Kolam playback controls">
      <button className="control-button control-button-primary" type="button" title="Play" aria-label="Play">▶</button>
      <button className="control-button" type="button" title="Pause" aria-label="Pause">⏸</button>
      <button className="control-button" type="button" title="Reset" aria-label="Reset">⟲</button>
    </div>
  );
}
