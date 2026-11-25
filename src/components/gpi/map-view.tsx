import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap, Popup as MlPopup } from "maplibre-gl";
import worldJson from "@/lib/gpi/world-110m.json";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import {
  colorStats,
  countryByCode,
  formatWithUnit,
  indicatorByCode,
  MAP_OCEAN,
  NO_DATA,
  paintColor,
  ranking,
  type Indicator,
} from "@/lib/gpi/model";

export type MapViewProps = {
  code: string;
  year: number;
  focus: string;
  onSelect: (iso3: string) => void;
};

type FeatureProps = {
  iso3: string;
  name: string;
  color: string;
  valueLabel: string;
};

type World = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { iso3: string; name: string };
    geometry: { type: string; coordinates: unknown };
  }>;
};

const WORLD = worldJson as World;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "\u0026amp;";
      case "<":
        return "\u0026lt;";
      case ">":
        return "\u0026gt;";
      case '"':
        return "\u0026quot;";
      default:
        return "\u0026#39;";
    }
  });
}

function paintWorld(code: string, year: number) {
  const indicator = indicatorByCode(code);
  const rows = ranking(code, year);
  const stats = colorStats(
    rows.map((row) => row.value),
    indicator.scale,
  );
  const values = new Map(rows.map((row) => [row.iso3, row.value]));
  return {
    indicator,
    stats,
    data: {
      type: "FeatureCollection" as const,
      features: WORLD.features.map((feature) => {
        const value = values.has(feature.properties.iso3) ? values.get(feature.properties.iso3)! : null;
        const properties: FeatureProps = {
          iso3: feature.properties.iso3,
          name: feature.properties.name,
          color: paintColor(value, stats, indicator),
          valueLabel: value === null ? "" : formatWithUnit(value, indicator),
        };
        return { ...feature, properties };
      }),
    },
  };
}

export function MapView({ code, year, focus, onSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<MlPopup | null>(null);
  const selectRef = useRef(onSelect);
  const focusRef = useRef(focus);
  const dataRef = useRef<ReturnType<typeof paintWorld>["data"] | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const painted = useMemo(() => paintWorld(code, year), [code, year]);
  const focusCountry = countryByCode(focus);

  selectRef.current = onSelect;
  focusRef.current = focus;
  dataRef.current = painted.data;

  useEffect(() => {
    let dead = false;
    let map: MlMap | null = null;
    const hovered = { id: "" };

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        maplibregl.setWorkerUrl(maplibreWorkerUrl);
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (dead || !container.current || !dataRef.current) return;
        map = new maplibregl.Map({
          container: container.current,
          style: {
            version: 8,
            sources: {},
            layers: [{ id: "ocean", type: "background", paint: { "background-color": MAP_OCEAN } }],
          },
          center: [12, 16],
          zoom: 1.05,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          const current = map;
          if (!current || !dataRef.current) return;
          current.addSource("countries", {
            type: "geojson",
            data: dataRef.current as never,
            promoteId: "iso3",
          });
          current.addLayer({
            id: "fill",
            type: "fill",
            source: "countries",
            paint: {
              "fill-color": ["coalesce", ["get", "color"], NO_DATA],
              "fill-opacity": 0.94,
            },
          });
          current.addLayer({
            id: "line",
            type: "line",
            source: "countries",
            paint: { "line-color": "#1c1915", "line-width": 0.45, "line-opacity": 0.35 },
          });
          current.addLayer({
            id: "focus-line",
            type: "line",
            source: "countries",
            filter: ["==", ["get", "iso3"], focusRef.current],
            paint: { "line-color": "#1c1915", "line-width": 2 },
          });
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 10,
            className: "gpi-popup",
          });
          popupRef.current = popup;
          current.on("mousemove", "fill", (event) => {
                        const feature = event.features?.[0];
            const props = feature?.properties as FeatureProps | undefined;
            if (!props?.iso3) return;
            current.getCanvas().style.cursor = "pointer";
            if (hovered.id && hovered.id !== props.iso3) {
              current.setFeatureState({ source: "countries", id: hovered.id }, { hover: false });
            }
            hovered.id = props.iso3;
            current.setFeatureState({ source: "countries", id: props.iso3 }, { hover: true });
            const value = props.valueLabel
              ? escapeHtml(props.valueLabel)
              : "No observation this year";
            popup
              .setLngLat(event.lngLat)
              .setHTML(`<strong>${escapeHtml(props.name)}</strong><div>${value}</div>`)
              .addTo(current);
          });
          current.on("mouseleave", "fill", () => {
                        current.getCanvas().style.cursor = "";
            if (hovered.id) current.setFeatureState({ source: "countries", id: hovered.id }, { hover: false });
            hovered.id = "";
            popup.remove();
          });
          current.on("click", "fill", (event) => {
            const iso3 = event.features?.[0]?.properties?.iso3;
            if (typeof iso3 === "string" && iso3) selectRef.current(iso3);
          });
          mapRef.current = current;
          setReady(true);
        });
      } catch (error) {
        if (!dead) setMapError(error instanceof Error ? error.message : String(error));
      }
    })();

    return () => {
      dead = true;
      popupRef.current?.remove();
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource("countries") as GeoJSONSource | undefined;
    source?.setData(painted.data as never);
    if (map.getLayer("focus-line")) {
      map.setFilter("focus-line", ["==", ["get", "iso3"], focus]);
    }
  }, [painted, focus, ready]);

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const indicator: Indicator = painted.indicator;

  return (
    <div className="map-card">
      <div className="map-frame">
        <div ref={container} className="map-canvas" />
        {!ready && !mapError && <p className="map-fallback">Drawing countries…</p>}
        {mapError && <p className="map-fallback">Map failed to start. {mapError}</p>}
      </div>
      <div className="legend-row">
        <div className={indicator.scale === "diverging" ? "legend legend-div" : "legend legend-seq"} />
        <div className="legend-labels">
          <span>{painted.stats ? formatWithUnit(painted.stats.low, indicator) : "Low"}</span>
          <span>{indicator.scale === "diverging" ? "baseline" : "darker is higher"}</span>
          <span>
            {painted.stats ? formatWithUnit(painted.stats.high, indicator) : "High"}
            {painted.stats && painted.stats.max > painted.stats.high ? " · top 5% capped" : ""}
          </span>
        </div>
      </div>
      <p className="fine">
        Click a country to read it. Scroll to zoom. Gray has no row this year — a light tint can still be a real zero.
        {focusCountry && !focusCountry.mapped ? ` ${focusCountry.name} has no polygon on this map.` : ""} Boundaries: Natural Earth, public domain.
      </p>
    </div>
  );
}
