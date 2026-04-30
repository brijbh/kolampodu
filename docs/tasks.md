# Kolampodu — Development Roadmap

## Completed Tasks ✅

- [x] **Algorithm Research & Analysis**: Understood the gating structure and coordinate system from research papers.
- [x] **Geometry Bridge Implementation**: Implemented the `(i+j)/2` and `(i-j)/2` transformation to align algorithm coordinates with SVG space.
- [x] **Diamond Grid Stabilization**: Successfully generated a one-stroke path for the 1-3-5-3-1 Diamond pattern ($N_D=5$).
- [x] **Smooth Stroke Rendering**: Implemented a periodic Quadratic Bezier spline (Midpoint-to-Midpoint) to eliminate gaps and jagged junctions.
- [x] **Center Dot Coverage**: Updated scoring logic and removed forced gates to ensure the center dot is correctly enclosed by a "drop" loop.
- [x] **Animation Integration**: Synced smoothed segments with the guided drawing animation system.

## In Progress 🚧

- [ ] **Shape Generalization**: Refactoring the engine to support arbitrary dot patterns beyond the standard diamond.

## Future Tasks 📅

- [ ] **Triangle Shape Implementation**: Implement gate masking and path-finding for the 5-4-3-2-1 Triangle grid.
- [ ] **Circle Shape Implementation**: Implement gate masking for the 3-5-5-5-3 Circular grid.
- [ ] **Square Shape Implementation**: Implement gate masking for the 5-5-5-5-5 Square grid.
- [ ] **Rectangle Shape Implementation**: Extend algorithm to support non-square $N \times M$ gate matrices.
- [ ] **Symmetry Controls**: Add UI toggles for 1-mirror and 2-mirror symmetry constraints as described in the algorithm.
- [ ] **Aesthetic Parameters**: Implement the PI Regulator ($\sigma_{ref}$) to allow users to control the complexity (sikku vs. kambi style).
- [ ] **Performance Optimization**: Optimize the Flip-Test-Switch (FTS) steps for larger grids ($N_D > 15$).
