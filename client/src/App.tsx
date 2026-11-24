import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);

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

  return (
    <div className="app">
      <header>
        <h1>Global Population Intelligence</h1>
        <p>Objective statistical analysis of drugs, diet, climate, crime, and conflict (1930–2026)</p>
      </header>
      <div ref={mapContainer} className="map" />
      <aside>
        <h2>Sources</h2>
        <p>Loading registry…</p>
      </aside>
    </div>
  );
}
