import { useMemo } from "react";

import { buildSquareKolam } from "../logic/alkolamEngine";

const PADDING = 48;

function getBounds(dots) {
  const points = [...dots];

  if (!points.length) {
    return {
      minX: 0,
      minY: 0,
      width: 1,
      height: 1,
    };
  }

  const minX = Math.min(...points.map((point) => point.x)) - PADDING;
  const minY = Math.min(...points.map((point) => point.y)) - PADDING;
  const maxX = Math.max(...points.map((point) => point.x)) + PADDING;
  const maxY = Math.max(...points.map((point) => point.y)) + PADDING;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export default function AlkolamSandbox() {
  const kolam = useMemo(() => buildSquareKolam({ nd: 5 }), []);
  const bounds = getBounds(kolam.dots);

  return (
    <section className="alkolam-sandbox">
      <svg
        className="svg"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        role="img"
        aria-label="Square grid kolam sandbox"
      >
        <path
          d={kolam.pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {kolam.dots.map((dot) => (
          <circle
            key={`${dot.row}-${dot.col}`}
            cx={dot.x}
            cy={dot.y}
            r="4"
            className="dot"
          />
        ))}
      </svg>

      <dl className="alkolam-debug">
        <div>
          <dt>closed</dt>
          <dd>{String(kolam.closed)}</dd>
        </div>
        <div>
          <dt>count</dt>
          <dd>{kolam.count}</dd>
        </div>
        <div>
          <dt>nd</dt>
          <dd>{kolam.nd}</dd>
        </div>
      </dl>
    </section>
  );
}
