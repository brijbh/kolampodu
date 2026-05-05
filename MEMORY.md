# Project Memory: Kolampodu

## Overview
Kolampodu is a digital Pulli Kolam generation and drawing tool. The core goal is to generate one-stroke kolam paths around anchor dots using the Alkolam gate traversal ideas from the notebook and paper in `docs/`.

## Current State: 2026-05-06

### What Works
- Diamond is the visual reference. `screenshots/diamond.png` is the target quality: smooth, continuous, beautiful, all dots engulfed, no boundary leaks.
- Diamond generation is still the best implementation and should not be broken while tuning other shapes.
- The engine now uses the diamond Alkolam traversal as the canonical path source for all shapes, then projects both dots and path points into the requested shape.
- This fixed the major failures seen earlier:
  - No more row-scallop fallback for triangle.
  - Triangle no longer misses dots.
  - Triangle path stays within the grid boundary.
  - Circle and square also draw from the same continuous closed stroke rather than separate hand-built ornaments.
- The UI pattern label for non-diamond shapes is now derived from the actual rendered dots, so the label matches what is on the canvas.
- Grid size slider, speed control, step control, and theme switching are implemented in the UI.
- `npm run lint` and `npm run build` passed after the latest changes.

### Key Implementation Notes
- Main engine: `src/logic/alkolamEngine.js`.
- `buildKolam()` always computes the canonical algorithm with `shapeId = "diamond"` first.
- `projectKolamPoint()` transforms canonical dots/path points for `square`, `circle`, and `triangle`.
- Dots and strokes must stay on the same projection. A previous attempt to repack triangle dots into prettier theoretical rows caused missed dots again.
- Triangle currently uses a projection based on:
  - `vertical = Math.max(sx, sy) + 0.5`
  - `lateral = sy - sx`
  - non-linear horizontal width scaling
- The current triangle rendered pattern at 5x5 is `1 - 1 - 3 - 3 - 5`. This is algorithm-derived and coverage-safe, but not yet as beautiful as the diamond.

## Remaining Problem

### Make Non-Diamond Kolams Beautiful Like Diamond
The next major task is aesthetic, not coverage. Triangle now covers all dots, but it is not visually as beautiful as the diamond. In screenshots `36.png` and `37.png`, triangle still has rail-like straight diagonal sides and does not yet have the organic, looped, balanced quality of the diamond.

Do not fix this by moving dots independently from the stroke. That reintroduced missed dots in `35.png`.

Promising next approaches:
- Keep dot and stroke projection coupled.
- Improve the triangle projection warp so the same canonical path bends more like the diamond instead of collapsing side paths into straight rails.
- Consider changing the triangle segment construction after projection, adding curvature tension or local control-point offsets for triangle only, while keeping dot coverage intact.
- Compare every attempt against `screenshots/diamond.png`; the target is not just "valid" but "beautiful".
- Preserve these invariants:
  - all dots covered/engulfed,
  - single continuous closed path,
  - no path outside the visible grid boundary,
  - no straight end-to-start connector outside the grid,
  - diamond remains unchanged.

## Reference Material
- `docs/Alkolam GitHub.ipynb`
- `docs/An_algorithm_for_one-stroke_kolam_generation_using.pdf`
- `docs/tasks.md`

## Debugging Trail
- Good reference: `screenshots/diamond.png`
- Bad row-scallop triangle: `screenshots/31.png`
- Pattern mismatch examples: `screenshots/32.png`, `screenshots/33.png`, `screenshots/34.png`
- Dot-miss regression from decoupled packed triangle dots: `screenshots/35.png`
- Current aesthetic issue for triangle: `screenshots/36.png`, `screenshots/37.png`
