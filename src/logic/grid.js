export const DOT_SPACING = 60;

export function getPatternWidth(pattern) {
  return pattern.length ? Math.max(...pattern) : 0;
}

export function generateDotGrid(pattern) {
  const dots = [];
  const max = getPatternWidth(pattern);

  pattern.forEach((count, rowIndex) => {
    const offset = (max - count) / 2;

    for (let i = 0; i < count; i++) {
      dots.push({
        x: (i + offset) * DOT_SPACING,
        y: rowIndex * DOT_SPACING,
      });
    }
  });

  return dots;
}

export function getDot(pattern, row, col) {
  const max = getPatternWidth(pattern);
  const offset = (max - pattern[row]) / 2;

  return {
    x: (col + offset) * DOT_SPACING,
    y: row * DOT_SPACING,
  };
}
