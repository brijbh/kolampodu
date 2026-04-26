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
        <p className="side-note">Choose a grid and watch the kolam unfold.</p>
      </aside>
      <main className="canvas-area" aria-label="Kolam drawing area">
        <KolamCanvas pattern={pattern} path={path} />
        <Controls />
      </main>
    </div>
  );
}
