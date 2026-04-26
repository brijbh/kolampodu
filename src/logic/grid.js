export const DOT_SPACING = 60;

export function getPatternWidth(pattern) {
  return pattern.length ? Math.max(...pattern) : 0;
}

function getRowStartX(maxCount, count) {
  const totalWidth = (maxCount - 1) * DOT_SPACING;
  const rowWidth = (count - 1) * DOT_SPACING;

  return (totalWidth - rowWidth) / 2;
}

export function generateDotGrid(pattern) {
  const dots = [];
  const max = getPatternWidth(pattern);

  pattern.forEach((count, rowIndex) => {
    const startX = getRowStartX(max, count);

    for (let i = 0; i < count; i++) {
      dots.push({
        x: startX + i * DOT_SPACING,
        y: rowIndex * DOT_SPACING,
      });
    }
  });

  return dots;
}

export function getDot(pattern, row, col) {
  const max = getPatternWidth(pattern);
  const startX = getRowStartX(max, pattern[row]);

  return {
    x: startX + col * DOT_SPACING,
    y: row * DOT_SPACING,
  };
}
