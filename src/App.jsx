import Header from "./components/Header";
import KolamCanvas from "./components/KolamCanvas";
import Controls from "./components/Controls";

import { buildKolamPath } from "./logic/kolam";

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/theme.css";

export default function App() {
  const pattern = [5, 4, 3, 2, 1];
  const path = buildKolamPath(pattern);

  return (
    <div className="page">
      <aside className="side-panel">
        <Header />
        <section className="selector-group" aria-label="Grid selector">
          <p className="section-label">Select Grid</p>
          <button className="select-button" type="button">
            <span>5 - 4 - 3 - 2 - 1</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </section>
        <section className="desktop-actions" aria-label="Actions">
          <p className="section-label">Actions</p>
          <button className="action-button action-button-primary" type="button">
            <span aria-hidden="true">▶</span>
            <span>Draw Kolam</span>
          </button>
          <button className="action-button" type="button">
            <span aria-hidden="true">⠿</span>
            <span>Show Step by Step</span>
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
        <section className="mobile-selector" aria-label="Grid selector">
          <p className="section-label">Select Grid</p>
          <button className="select-button" type="button">
            <span>5 - 4 - 3 - 2 - 1</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </section>
        <KolamCanvas pattern={pattern} path={path} />
        <Controls />
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
