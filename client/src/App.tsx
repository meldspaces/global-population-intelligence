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
  }, []);

  useEffect(() => {
    fetch(`/api/observations?indicator=${indicator}&limit=120`)
      .then(r => r.json())
      .then(setSeries)
      .catch(() => setSeries([]));
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
          <ReactECharts option={chartOption} style={{ height: 260 }} />
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
