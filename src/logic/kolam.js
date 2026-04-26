import { getDot } from "./grid";

export function buildKolamPath(pattern) {
  const d1 = getDot(pattern, 1, 1);
  const d2 = getDot(pattern, 1, 2);
  const d3 = getDot(pattern, 2, 1);

  return `
    M ${d1.x} ${d1.y}
    Q ${d1.x + 30} ${d1.y - 30} ${d2.x} ${d2.y}
    Q ${d2.x + 30} ${d2.y + 30} ${d3.x} ${d3.y}
    Q ${d3.x - 30} ${d3.y + 30} ${d1.x} ${d1.y}
  `;
}