# Kolampodu — Development Brief

---

## Project Overview

Kolampodu is a **mobile-first web application** that provides a **calm, guided experience** for learning and drawing kolams (South Indian floor art).

This is NOT a drawing tool.

This is a **guided visual experience**:

* User selects a dot grid
* Presses Play
* Watches the kolam being drawn step-by-step

---

## Core Product Principles

1. **Canvas is the hero**
2. **One primary action: Play**
3. **Calm + minimal UI**
4. **No clutter**
5. **Separation of concerns is mandatory**

---

## Current Stack

* React (Vite)
* SVG rendering
* No backend (yet)

---

## Folder Structure (must be maintained)

```
src/
  components/
    Header.jsx
    KolamCanvas.jsx
    Controls.jsx

  logic/
    grid.js
    kolam.js
    animation.js (to be created)

  styles/
    base.css
    layout.css
    theme.css

docs/
  DEV_BRIEF.md
```

---

## Engineering Rules (STRICT)

1. Do NOT mix logic with UI
2. Do NOT use inline styles unless absolutely necessary
3. Keep animation logic separate from rendering
4. Do NOT introduce external UI libraries
5. Keep code minimal and readable
6. Do NOT refactor unrelated files

---

# UI / UX Design Reference (MANDATORY)

## Design Intent

The UI must feel:

* Calm
* Minimal
* Guided
* Focused on the kolam

---

## Layout Rules

### Desktop

Two zones:

**Left Panel (secondary)**

* Width: 240–280px
* Contains:

  * Title
  * Grid selector (future)
  * Optional helper text
* Must NOT dominate

**Main Canvas Area (primary)**

* Takes majority width
* Kolam centered
* No boxed container
* Feels like open floor

---

### Mobile (PRIMARY TARGET)

* Header (top)
* Canvas (dominant)
* Floating controls (bottom)

---

## Canvas Behavior

* Always centered
* Scales responsively
* Largest visual element
* No borders / boxes

---

## Controls

Floating control group:

* ▶ Play (primary)
* ⏸ Pause
* ⟲ Reset

Rules:

* Bottom-centered
* Circular
* Slight elevation
* Grouped

---

## Interaction Simplification

DO NOT implement:

* “Draw Kolam”
* “Show Step by Step”

ONLY:

* Play → triggers guided drawing

---

## Design Principle

If unsure:
→ Remove complexity
→ Keep only what supports drawing experience

---

# Current Status

* Dot grid: COMPLETE
* Kolam path: PLACEHOLDER
* UI: PARTIAL
* Animation: NOT STARTED

---

# Implementation Plan (STRICT ORDER)

---

## Step 1 — Layout Upgrade

### Tasks:

* Implement responsive layout (mobile-first)
* Center canvas properly
* Implement floating controls (pill style)

### Definition of Done:

* Canvas centered on all screen sizes
* Controls visually aligned and floating
* No layout glitches

### STOP after completion.

---

## Step 2 — Animation Engine (CRITICAL)

Create:

```
src/logic/animation.js
```

### Requirements:

* Use `progress` (0 → 1)
* Animate using:

  * stroke-dasharray
  * stroke-dashoffset

### Provide API:

* start()
* pause()
* reset()

### Animation must be:

* Smooth
* Slow
* Calm

### Definition of Done:

* Path animates progressively
* Animation can be paused/resumed/reset

### STOP after completion.

---

## Step 3 — Wire Controls

### Tasks:

* Connect Controls.jsx to animation
* Manage state in App.jsx

### Definition of Done:

* Play starts animation
* Pause stops it
* Reset clears and restarts

### STOP after completion.

---

## Step 4 — KolamCanvas Update

### Tasks:

* Accept `progress` prop
* Render partial path based on progress

### Definition of Done:

* Drawing visibly progresses over time

### STOP after completion.

---

# Testing Requirements

* No runtime errors
* Controls behave correctly
* Animation works reliably
* Works on:

  * mobile viewport
  * desktop viewport

---

# Git Instructions

After EACH step:

1. Stage changes
2. Commit with clear message

Example:

```
feat: implement animation engine with progress-based SVG drawing
```

3. Push to main

---

# What NOT to do

* Do NOT redesign UI
* Do NOT add new features
* Do NOT add routing
* Do NOT add backend
* Do NOT over-engineer

---

# Expected Output

User presses ▶
→ Kolam draws gradually
→ Can pause
→ Can reset

---

# Future Roadmap (DO NOT IMPLEMENT NOW)

This is for awareness only.

### Phase 2

* Multiple grid selection
* Real kolam patterns (symmetric)
* Guided vs full draw mode

### Phase 3

* Practice mode (user draws)
* Stroke validation

### Phase 4

* Kolam generator (rule-based)
* Save / favorites

### Phase 5

* Backend (user data)
* Community sharing

---

# Instruction to Codex

Read this file completely.

Then:

1. Implement Step 1
2. STOP
3. Verify UI
4. Commit + push

Then continue step-by-step.

Do NOT skip steps.
Do NOT expand scope.
Do NOT redesign.

Proceed.
