import { useLayoutEffect, useRef, useState } from "react";

import { generateDotGrid } from "../logic/grid";
import { getSegmentProgresses, getStrokeDrawStyles } from "../logic/animation";

export default function KolamCanvas({ pattern, segments, progress, showHint }) {
  const dots = generateDotGrid(pattern);
  const pathRefs = useRef([]);
  const [pathLengths, setPathLengths] = useState([]);
  const padding = 36;
  const minX = Math.min(...dots.map(({ x }) => x));
  const maxX = Math.max(...dots.map(({ x }) => x));
  const minY = Math.min(...dots.map(({ y }) => y));
  const maxY = Math.max(...dots.map(({ y }) => y));
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const segmentProgresses = getSegmentProgresses(segments.length, progress);

  useLayoutEffect(() => {
    setPathLengths(
      pathRefs.current.map((pathRef) => pathRef?.getTotalLength() ?? 0),
    );
  }, [segments]);

  return (
    <div className="canvas">
      {showHint && (
        <div className="hint">
          Tap Play to begin the kolam
        </div>
      )}

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

          {segments.map((segment, index) => {
            const strokeDraw = getStrokeDrawStyles(
              pathLengths[index] ?? 0,
              segmentProgresses[index] ?? 0,
            );

            return (
              <path
                key={segment}
                ref={(pathRef) => {
                  pathRefs.current[index] = pathRef;
                }}
                d={segment}
                className="kolam-line"
                strokeDasharray={strokeDraw.strokeDasharray}
                strokeDashoffset={strokeDraw.strokeDashoffset}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
