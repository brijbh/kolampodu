import { useEffect, useRef, useState } from "react";

import Header from "./components/Header";
import KolamCanvas from "./components/KolamCanvas";
import Controls from "./components/Controls";

import { createKolamAnimation } from "./logic/animation";
import { buildKolamPath } from "./logic/kolam";

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/theme.css";

const SHAPES = [
  { id: "triangle", label: "Triangle", pattern: [1, 2, 3, 4] },
  { id: "circle", label: "Circle", pattern: [3, 5, 5, 5, 3] },
  { id: "square", label: "Square", pattern: [5, 5, 5, 5, 5] },
  { id: "diamond", label: "Diamond", pattern: [1, 2, 3, 4, 3, 2, 1] },
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

export default function App() {
  const [selectedShape, setSelectedShape] = useState("diamond");
  const shape = SHAPES.find(({ id }) => id === selectedShape) ?? SHAPES[3];
  const pattern = shape.pattern;
  const gridLabel = pattern.join(" - ");
  const path = buildKolamPath(pattern);
  const animationRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAnimationStarted, setHasAnimationStarted] = useState(false);

  useEffect(() => {
    animationRef.current = createKolamAnimation({
      onProgress: setProgress,
      onComplete: () => setIsPlaying(false),
    });

    return () => {
      animationRef.current?.pause();
    };
  }, []);

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

  const handleSelectShape = (shapeId) => {
    setSelectedShape(shapeId);
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
        <section className="selector-group" aria-label="Grid selector">
          <p className="section-label">Select Grid</p>
          <button className="select-button" type="button">
            <span>{gridLabel}</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </section>
        <p className="side-note">A kolam a day,<br />brings peace<br />in every way.</p>
      </aside>
      <main className="canvas-area" aria-label="Kolam drawing area">
        <div className="desktop-tools" aria-label="Display options">
          <button className="icon-button" type="button" aria-label="Theme">☼</button>
          <button className="icon-button" type="button" aria-label="Settings">⚙</button>
        </div>
        <div className="mobile-topbar" aria-label="Mobile header">
          <button className="icon-button" type="button" aria-label="Menu">☰</button>
          <Header />
          <button className="icon-button" type="button" aria-label="Theme">☼</button>
        </div>
        <div className="mobile-selector">
          <ShapeSelector
            selectedShape={selectedShape}
            onSelectShape={handleSelectShape}
          />
        </div>
        <section className="mobile-selector" aria-label="Grid selector">
          <p className="section-label">Select Grid</p>
          <button className="select-button" type="button">
            <span>{gridLabel}</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </section>
        <KolamCanvas
          pattern={pattern}
          path={path}
          progress={progress}
          showHint={!hasAnimationStarted}
        />
        <Controls
          isPlaying={isPlaying}
          progress={progress}
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
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
