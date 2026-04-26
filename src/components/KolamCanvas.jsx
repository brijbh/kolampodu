import { generateDotGrid } from "../logic/grid";

export default function KolamCanvas({ pattern, path }) {
  const dots = generateDotGrid(pattern);
  const padding = 36;
  const minX = Math.min(...dots.map(({ x }) => x));
  const maxX = Math.max(...dots.map(({ x }) => x));
  const minY = Math.min(...dots.map(({ y }) => y));
  const maxY = Math.max(...dots.map(({ y }) => y));
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  return (
    <div className="canvas">
      <div className="hint">
        Tap Play to begin the kolam
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="svg">
        <g transform={`translate(${padding - minX} ${padding - minY})`}>
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
