import { useState, useMemo, useEffect, useRef } from "react";

import Header from "./components/Header";
import KolamCanvas from "./components/KolamCanvas";
import Controls from "./components/Controls";

import { createKolamAnimation } from "./logic/animation";
import { buildKolam } from "./logic/alkolamEngine";

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/theme.css";

const SHAPES = [
  { id: "diamond", label: "Diamond" },
  { id: "triangle", label: "Triangle" },
  { id: "circle", label: "Circle" },
  { id: "square", label: "Square" },
];

function ShapeSelector({ selectedShape, onSelectShape }) {
  return (
    <section className="selector-group" aria-label="Shape selector">
      <p className="section-label">Select Shape</p>
      <div className="shape-options">
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            className="shape-button"
            type="button"
            aria-label={shape.label}
            aria-pressed={shape.id === selectedShape}
            onClick={() => onSelectShape(shape.id)}
          >
            <span className={`shape-icon shape-icon-${shape.id}`} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function GridSelector({ gridSize, onSelectGrid }) {
  const [localSize, setLocalSize] = useState(gridSize);

  return (
    <section className="selector-group" aria-label="Grid selector">
      <p className="section-label">Grid Size</p>
      <div className="grid-options">
        <input
          type="range"
          min="3"
          max="15"
          value={localSize}
          onChange={(e) => {
            const size = parseInt(e.target.value);
            setLocalSize(size);
            onSelectGrid(size);
          }}
          className="grid-slider"
        />
        <span className="grid-size-label">{localSize}x{localSize}</span>
      </div>
    </section>
  );
}

function getRenderedPattern(dots) {
  const sortedDots = [...dots].sort((a, b) => a.y - b.y);
  const rows = [];

  for (const dot of sortedDots) {
    const row = rows[rows.length - 1];

    if (!row || Math.abs(row.y - dot.y) > 1) {
      rows.push({
        y: dot.y,
        count: 1,
      });
    } else {
      row.count += 1;
    }
  }

  return rows.map((row) => row.count);
}

export default function App() {
  const [selectedShape, setSelectedShape] = useState("diamond");
  const [gridSize, setGridSize] = useState(5);

  const shape = SHAPES.find(({ id }) => id === selectedShape) ?? SHAPES[0];
  
  const getPattern = (id, nd) => {
    if (id === "diamond") {
      const p = [];
      for (let i = 1; i <= nd; i += 1) p.push(i);
      for (let i = nd - 1; i >= 1; i -= 1) p.push(i);
      return p;
    }
    if (id === "triangle") {
      const p = [];
      for (let i = 1; i <= nd; i += 1) p.push(i);
      return p;
    }
    if (id === "square") {
      return Array(nd).fill(nd);
    }
    if (id === "circle") {
      // Approximate circular pattern label
      if (nd === 3) return [1, 3, 1];
      if (nd === 5) return [3, 5, 5, 5, 3];
      if (nd === 7) return [3, 5, 7, 7, 7, 5, 3];
      return [nd];
    }
    return [nd];
  };

  const kolam = useMemo(() => {
    return buildKolam({ nd: gridSize, shapeId: shape.id });
  }, [shape.id, gridSize]);
  const pattern = shape.id === "diamond"
    ? getPattern(shape.id, gridSize)
    : getRenderedPattern(kolam.dots);
  const gridLabel = pattern.join(" - ");

  const animationRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAnimationStarted, setHasAnimationStarted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    animationRef.current = createKolamAnimation({
      onProgress: setProgress,
      onComplete: () => setIsPlaying(false),
    });

    return () => {
      animationRef.current?.pause();
    };
  }, []);

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    animationRef.current?.updateOptions({ speedMultiplier: newSpeed });
  };

  const handlePlay = () => {
    if (animationRef.current?.progress >= 1) {
      animationRef.current.reset();
    }

    animationRef.current?.start();
    setIsPlaying(true);
    setHasAnimationStarted(true);
  };

  const handlePause = () => {
    animationRef.current?.pause();
    setIsPlaying(false);
  };

  const handleReset = () => {
    animationRef.current?.reset();
    setIsPlaying(false);
    setHasAnimationStarted(false);
  };

  const handleStep = () => {
    if (animationRef.current) {
      animationRef.current.stepForward(kolam.segments, [], kolam.dots);
      setHasAnimationStarted(true);
    }
  };

  const handleSelectShape = (shapeId) => {
    setSelectedShape(shapeId);
    animationRef.current?.reset();
    setIsPlaying(false);
    setHasAnimationStarted(false);
  };

  const handleSelectGridSize = (size) => {
    setGridSize(size);
    animationRef.current?.reset();
    setIsPlaying(false);
    setHasAnimationStarted(false);
  };

  return (
    <div className="page">
      <aside className="side-panel">
        <Header />
        <ShapeSelector
          selectedShape={selectedShape}
          onSelectShape={handleSelectShape}
        />
        <GridSelector
          selectedShape={selectedShape}
          gridSize={gridSize}
          onSelectGrid={handleSelectGridSize}
        />
        <div className="pattern-preview">
          <p className="section-label">Pattern</p>
          <p className="pattern-label">{gridLabel}</p>
        </div>
        <p className="side-note">A kolam a day,<br />brings peace<br />in every way.</p>
      </aside>
      <main className="canvas-area" aria-label="Kolam drawing area">
        <div className="desktop-tools" aria-label="Display options">
          <button className="icon-button" type="button" aria-label="Theme" onClick={toggleTheme}>
            {theme === "light" ? "☼" : "☾"}
          </button>
          <button className="icon-button" type="button" aria-label="Settings">⚙</button>
        </div>
        <div className="mobile-topbar" aria-label="Mobile header">
          <button className="icon-button" type="button" aria-label="Menu">☰</button>
          <Header />
          <button className="icon-button" type="button" aria-label="Theme" onClick={toggleTheme}>
            {theme === "light" ? "☼" : "☾"}
          </button>
        </div>
        <div className="mobile-selector">
          <ShapeSelector
            selectedShape={selectedShape}
            onSelectShape={handleSelectShape}
          />
          <GridSelector
            selectedShape={selectedShape}
            gridSize={gridSize}
            onSelectGrid={(size) => {
              setGridSize(size);
              animationRef.current?.reset();
              setIsPlaying(false);
              setHasAnimationStarted(false);
            }}
          />
          <p className="mobile-pattern-label">Grid: {gridLabel}</p>
        </div>
        
        <KolamCanvas
          dots={kolam.dots}
          path={kolam.pathD}
          segments={kolam.segments}
          progress={progress}
          showHint={!hasAnimationStarted}
        />

        <Controls
          isPlaying={isPlaying}
          progress={progress}
          speed={speed}
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
          onStep={handleStep}
          onSpeedChange={handleSpeedChange}
        />

        <nav className="mobile-nav" aria-label="Primary">
          <a className="mobile-nav-item is-active" href="#home">
            <span aria-hidden="true">⌂</span>
            <span>Home</span>
          </a>
          <a className="mobile-nav-item" href="#grids">
            <span aria-hidden="true">⠿</span>
            <span>Grids</span>
          </a>
          <a className="mobile-nav-item" href="#favorites">
            <span aria-hidden="true">♡</span>
            <span>Favorites</span>
          </a>
        </nav>
      </main>
    </div>
  );
}
