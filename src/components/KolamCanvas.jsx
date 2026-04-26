import { useLayoutEffect, useRef, useState } from "react";

import { generateDotGrid } from "../logic/grid";
import {
  getContinuousDrawState,
  getDotMaterial,
  getPathRangeDrawStyles,
  getStrokeMaterial,
} from "../logic/animation";
import { getViewBoxBounds } from "../logic/bounds";
import { buildSegmentPath } from "../logic/kolam";

export default function KolamCanvas({ pattern, path, segments, progress, showHint }) {
  const dots = generateDotGrid(pattern);
  const pathRef = useRef(null);
  const segmentRefs = useRef([]);
  const [pathLength, setPathLength] = useState(0);
  const [segmentLengths, setSegmentLengths] = useState([]);
  const bounds = getViewBoxBounds({
    dots,
    segments,
    padding: 48,
  });
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const drawState = getContinuousDrawState({
    segments,
    segmentLengths,
    dots,
    progress,
  });
  const completedStroke = getPathRangeDrawStyles(
    pathLength,
    0,
    drawState.completedLength,
  );
  const activeStroke = getPathRangeDrawStyles(
    pathLength,
    drawState.activeStartLength,
    drawState.activeEndLength,
  );
  const tipStroke = getPathRangeDrawStyles(
    pathLength,
    drawState.tipStartLength,
    drawState.tipEndLength,
  );
  const strokeMaterial = getStrokeMaterial(progress, drawState.activeProgress);

  useLayoutEffect(() => {
    setPathLength(pathRef.current?.getTotalLength() ?? 0);
    setSegmentLengths(
      segments.map((_, index) => segmentRefs.current[index]?.getTotalLength() ?? 0),
    );
  }, [path, segments]);

  return (
    <div className="canvas">
      {showHint && (
        <div className="hint">
          Tap Play to begin the kolam
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="svg">
        <g transform={`translate(${-bounds.minX} ${-bounds.minY})`}>
          {dots.map((dot, i) => {
            const dotMaterial = getDotMaterial(dot, drawState.leadingPoint);

            return (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={dotMaterial.radius}
                className="dot"
                opacity={dotMaterial.opacity}
              />
            );
          })}

          <path
            ref={pathRef}
            d={path}
            className="kolam-line"
            strokeDasharray={completedStroke.strokeDasharray}
            strokeDashoffset={completedStroke.strokeDashoffset}
            strokeWidth={strokeMaterial.strokeWidth}
            opacity={strokeMaterial.opacity}
          />
          <path
            d={path}
            className="kolam-line"
            strokeDasharray={activeStroke.strokeDasharray}
            strokeDashoffset={activeStroke.strokeDashoffset}
            strokeWidth={strokeMaterial.strokeWidth}
            opacity={strokeMaterial.opacity}
          />
          <path
            d={path}
            className="kolam-line"
            strokeDasharray={tipStroke.strokeDasharray}
            strokeDashoffset={tipStroke.strokeDashoffset}
            strokeWidth={strokeMaterial.tipStrokeWidth}
            opacity={strokeMaterial.tipOpacity}
          />
          {segments.map((segment, index) => (
            <path
              key={segment.id}
              ref={(segmentRef) => {
                segmentRefs.current[index] = segmentRef;
              }}
              d={buildSegmentPath(segment)}
              fill="none"
              stroke="transparent"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
