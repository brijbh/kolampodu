import { generateDotGrid } from "../logic/grid";

export default function KolamCanvas({ pattern, path }) {
  const dots = generateDotGrid(pattern);

  return (
    <div className="canvas">
      <div className="hint">
        Tap ▶ to begin
      </div>

      <svg viewBox="0 0 300 300" className="svg">
        <g transform="translate(30 30)">
          {dots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r="2.5"
              className="dot"
            />
          ))}

          <path
            d={path}
            className="kolam-line"
          />
        </g>
      </svg>
    </div>
  );
}
