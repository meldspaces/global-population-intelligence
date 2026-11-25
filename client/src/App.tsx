import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import ReactECharts from 'echarts-for-react';

type Source = { id: number; name: string; description: string; url: string; trust_score: number };
type Obs = { year: number; value: number; location: string; indicator: string; indicator_name: string };

const INDICATORS = [
  { code: 'homicide_rate_per_100k', name: 'Homicide rate (per 100k)' },
  { code: 'calorie_supply', name: 'Daily calorie supply' },
  { code: 'conflict_deaths', name: 'Armed conflict deaths' }
];

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [series, setSeries] = useState<Obs[]>([]);
  const [indicator, setIndicator] = useState('homicide_rate_per_100k');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/sources').then(r => r.ok ? r.json() : Promise.reject('sources failed')),
      fetch(`/api/observations?indicator=${indicator}&limit=120`).then(r => r.ok ? r.json() : Promise.reject('observations failed'))
    ])
      .then(([src, obs]) => {
        setSources(src);
        setSeries(obs);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [indicator]);

  const chartOption = {
    title: { text: INDICATORS.find(i => i.code === indicator)?.name || 'Trend', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: series.map(s => s.year).slice().reverse() },
    yAxis: { type: 'value' },
    series: [{
      type: 'line',
      data: series.map(s => s.value).slice().reverse(),
      smooth: true,
      name: indicator
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
          <select value={indicator} onChange={e => setIndicator(e.target.value)} className="indicator-select">
            {INDICATORS.map(i => <option key={i.code} value={i.code}>{i.name}</option>)}
          </select>
          {loading && <p className="status">Loading data…</p>}
          {error && <p className="status error">Error: {error}</p>}
          {!loading && !error && <ReactECharts option={chartOption} style={{ height: 240 }} />}
        </div>
      </div>
      <aside>
        <h2>Data Sources</h2>
        {loading && <p>Loading registry…</p>}
        {error && <p className="error">{error}</p>}
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
