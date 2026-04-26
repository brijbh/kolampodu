import { useLayoutEffect, useRef, useState } from "react";

import { generateDotGrid } from "../logic/grid";
import { getStrokeDrawStyles } from "../logic/animation";

export default function KolamCanvas({ pattern, path, progress }) {
  const dots = generateDotGrid(pattern);
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const padding = 36;
  const minX = Math.min(...dots.map(({ x }) => x));
  const maxX = Math.max(...dots.map(({ x }) => x));
  const minY = Math.min(...dots.map(({ y }) => y));
  const maxY = Math.max(...dots.map(({ y }) => y));
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const strokeDraw = getStrokeDrawStyles(pathLength, progress);

  useLayoutEffect(() => {
    if (!pathRef.current) {
      return;
    }

    setPathLength(pathRef.current.getTotalLength());
  }, [path]);

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
            ref={pathRef}
            d={path}
            className="kolam-line"
            strokeDasharray={strokeDraw.strokeDasharray}
            strokeDashoffset={strokeDraw.strokeDashoffset}
          />
        </g>
      </svg>
    </div>
  );
}
