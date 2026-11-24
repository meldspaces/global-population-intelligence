import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import ReactECharts from 'echarts-for-react';

type Source = { id: number; name: string; description: string; url: string; trust_score: number };
type Obs = { year: number; value: number; location: string; indicator: string };

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [series, setSeries] = useState<Obs[]>([]);

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
    fetch('/api/sources').then(r => r.json()).then(setSources).catch(() => setSources([]));
    fetch('/api/observations?indicator=homicide_rate_per_100k&limit=80')
      .then(r => r.json())
      .then(setSeries)
      .catch(() => setSeries([]));
  }, []);

  const chartOption = {
    title: { text: 'Homicide rate sample (recent observations)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: series.map(s => s.year).slice().reverse() },
    yAxis: { type: 'value', name: 'per 100k' },
    series: [{
      type: 'line',
      data: series.map(s => s.value).slice().reverse(),
      smooth: true,
      name: 'Homicide rate'
    }]
  };

  return (
    <div className="app">
      <header>
        <h1>Global Population Intelligence</h1>
        <p>Objective statistical analysis of drugs, diet, climate, crime, and conflict (1930–2026)</p>
      </header>
      <div className="main">
        <div ref={mapContainer} className="map" />
        <div className="chart">
          <ReactECharts option={chartOption} style={{ height: 280 }} />
        </div>
      </div>
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
