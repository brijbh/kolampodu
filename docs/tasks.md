# Kolampodu — Development Roadmap

## Completed Tasks ✅

- [x] **Algorithm Research & Analysis**: Understood the gating structure and coordinate system from research papers.
- [x] **Geometry Bridge Implementation**: Implemented the `(i+j)/2` and `(i-j)/2` transformation to align algorithm coordinates with SVG space.
- [x] **Diamond Grid Stabilization**: Successfully generated a one-stroke path for the 1-3-5-3-1 Diamond pattern ($N_D=5$).
- [x] **Smooth Stroke Rendering**: Implemented a periodic Quadratic Bezier spline (Midpoint-to-Midpoint) to eliminate gaps and jagged junctions.
- [x] **Center Dot Coverage**: Updated scoring logic and removed forced gates to ensure the center dot is correctly enclosed by a "drop" loop.
- [x] **Animation Integration**: Synced smoothed segments with the guided drawing animation system.
- [x] **Canonical Projection Breakthrough**: Reused the working diamond Alkolam traversal as the canonical path and projected dots/path together for triangle, circle, and square.
- [x] **Triangle Coverage Fix**: Fixed the triangle dot-miss and boundary leakage regressions by keeping dots and stroke on the same projection.
- [x] **Rendered Pattern Labels**: Derived non-diamond pattern labels from the actual rendered dot rows so UI labels match the drawing.

## In Progress 🚧

- [ ] **Shape Generalization**: Refactoring the engine to support projected shapes beyond the standard diamond without sacrificing kolam aesthetics.
- [ ] **Dynamic Grid Sizing**: Allow users to choose $N_D$ (3, 5, 7, 9...) for supported shapes.
- [ ] **Animation Speed Control**: Add UI to adjust the drawing duration (Slow, Normal, Fast).
- [ ] **Theme Switching**: Implement Light and Dark modes using CSS variables.
- [ ] **Triangle Aesthetic Tuning**: Make triangle as beautiful as the diamond reference while preserving all-dot coverage and boundary safety.

## Future Tasks 📅

- [ ] **Triangle Shape Implementation**: Improve the current canonical projection so the triangle has organic diamond-like loops instead of rail-like straight sides.
- [ ] **Circle Shape Implementation**: Tune circular projection aesthetics and confirm larger grids.
- [ ] **Square Shape Implementation**: Tune square projection aesthetics and confirm larger grids.
- [ ] **Rectangle Shape Implementation**: Extend algorithm to support non-square $N \times M$ gate matrices.
- [ ] **Symmetry Controls**: Add UI toggles for 1-mirror and 2-mirror symmetry constraints as described in the algorithm.
- [ ] **Aesthetic Parameters**: Implement the PI Regulator ($\sigma_{ref}$) to allow users to control the complexity (sikku vs. kambi style).
- [ ] **Performance Optimization**: Optimize the Flip-Test-Switch (FTS) steps for larger grids ($N_D > 15$).
