import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Source = { id: number; name: string; description: string; url: string; trust_score: number };

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20],
      zoom: 1.5
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    return () => map.remove();
  }, []);

  useEffect(() => {
    fetch('/api/sources')
      .then(r => r.json())
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Global Population Intelligence</h1>
        <p>Objective statistical analysis of drugs, diet, climate, crime, and conflict (1930–2026)</p>
      </header>
      <div ref={mapContainer} className="map" />
      <aside>
        <h2>Data Sources</h2>
        {sources.length === 0 && <p>Loading registry…</p>}
        <ul>
          {sources.map(s => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
              <div className="desc">{s.description}</div>
              <div className="meta">Trust: {s.trust_score}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
