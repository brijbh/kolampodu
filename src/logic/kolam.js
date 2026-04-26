import { getDot } from "./grid";

export function buildKolamSegments(pattern) {
  const d1 = getDot(pattern, 1, 1);
  const d2 = getDot(pattern, 1, 2);
  const d3 = getDot(pattern, 2, 1);

  return [
    {
      id: "first-curve",
      start: d1,
      control: { x: d1.x + 30, y: d1.y - 30 },
      end: d2,
    },
    {
      id: "second-curve",
      start: d2,
      control: { x: d2.x + 30, y: d2.y + 30 },
      end: d3,
    },
    {
      id: "third-curve",
      start: d3,
      control: { x: d3.x - 30, y: d3.y + 30 },
      end: d1,
    },
  ];
}

export function buildKolamPath(pattern) {
  const segments = buildKolamSegments(pattern);
  const [firstSegment, ...remainingSegments] = segments;

  return [
    `M ${firstSegment.start.x} ${firstSegment.start.y}`,
    `Q ${firstSegment.control.x} ${firstSegment.control.y} ${firstSegment.end.x} ${firstSegment.end.y}`,
    ...remainingSegments.map(
      (segment) => `Q ${segment.control.x} ${segment.control.y} ${segment.end.x} ${segment.end.y}`,
    ),
  ].join(" ");
}

export function buildSegmentPath(segment) {
  return `M ${segment.start.x} ${segment.start.y} Q ${segment.control.x} ${segment.control.y} ${segment.end.x} ${segment.end.y}`;
}
