"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type ExpressionSpecification, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { BF_BOUNDS, COLORS, GLYPHS_URL, LABEL_FONT, TERRAIN_TILES, TYPE_COLORS, bbox } from "@/lib/map/style";

type RegionFC = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { id: string; slug: string; nom: string; chefLieu: string }
>;
type StoryFC = GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; slug: string; titre: string; type: string }>;

export interface StoryMapProps {
  /** Number of stories per region id, after filters. */
  counts: Record<string, number>;
  /** Ids of the stories that pass the filters. */
  visibleStoryIds: string[];
  selectedRegionId?: string;
  onSelectRegion: (id: string | undefined) => void;
  onOpenStory: (slug: string) => void;
  mode3d: boolean;
  lowData: boolean;
  labels: {
    canvas: string;
    stories: (count: number) => string;
    chefLieu: (name: string) => string;
    error: string;
  };
}

// Copied by scripts/copy-vendor.ts (the bundler cannot locate it by itself).
setWorkerUrl("/vendor/maplibre-gl-worker.mjs");

const BASE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {},
  layers: [{ id: "fond", type: "background", paint: { "background-color": COLORS.nuit } }],
};

const STORY_LAYERS = ["recits-points", "recits-clusters"];
const REGION_LAYERS = ["regions-fill", "regions-3d"];

export default function StoryMap(props: StoryMapProps) {
  const { counts, visibleStoryIds, selectedRegionId, onSelectRegion, onOpenStory, mode3d, lowData, labels } = props;
  const mapRef = useRef<MapRef>(null);
  const [regions, setRegions] = useState<RegionFC>();
  const [stories, setStories] = useState<StoryFC>();
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<{ id: string; lng: number; lat: number }>();
  const [cursor, setCursor] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/regions.geojson").then((r) => r.json() as Promise<RegionFC>),
      fetch("/data/recits.geojson").then((r) => r.json() as Promise<StoryFC>),
    ])
      .then(([reg, rec]) => {
        if (!alive) return;
        setRegions(reg);
        setStories(rec);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const visibleStories = useMemo<StoryFC | undefined>(() => {
    if (!stories) return undefined;
    const ids = new Set(visibleStoryIds);
    return { ...stories, features: stories.features.filter((f) => ids.has(f.properties.id)) };
  }, [stories, visibleStoryIds]);

  const countExpr = useMemo<ExpressionSpecification>(() => {
    const pairs = Object.entries(counts).flatMap(([id, n]) => [id, n]);
    return pairs.length > 0
      ? (["match", ["get", "id"], ...pairs, 0] as unknown as ExpressionSpecification)
      : (["literal", 0] as ExpressionSpecification);
  }, [counts]);

  const fillColor: ExpressionSpecification = [
    "case",
    ["==", ["get", "id"], selectedRegionId ?? ""],
    COLORS.indigoClair,
    ["==", ["get", "id"], hover?.id ?? ""],
    COLORS.indigoClair,
    COLORS.indigo,
  ];
  const fillOpacity: ExpressionSpecification = ["case", [">", countExpr, 0], 0.92, 0.4];

  // Fly to the selected region (or back to the whole country).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regions) return;
    const feature = regions.features.find((f) => f.properties.id === selectedRegionId);
    const [w, s, e, n] = feature ? bbox(feature.geometry) : BF_BOUNDS;
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 40, duration: 1200, pitch: mode3d ? 50 : 0 },
    );
  }, [selectedRegionId, regions, mode3d]);

  const show3d = mode3d && !lowData;

  function onClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) return onSelectRegion(undefined);
    const layer = feature.layer.id;
    if (layer === "recits-points") return onOpenStory(String(feature.properties.slug));
    if (layer === "recits-clusters") {
      const map = mapRef.current;
      const source = map?.getSource("recits") as GeoJSONSource | undefined;
      void source?.getClusterExpansionZoom(Number(feature.properties.cluster_id)).then((zoom: number) => {
        map?.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      return;
    }
    onSelectRegion(String(feature.properties.id));
  }

  function onMove(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) {
      setHover(undefined);
      setCursor("");
      return;
    }
    setCursor("pointer");
    if (REGION_LAYERS.includes(feature.layer.id)) {
      setHover({ id: String(feature.properties.id), lng: e.lngLat.lng, lat: e.lngLat.lat });
    } else {
      setHover(undefined);
    }
  }

  if (failed) {
    return <p className="p-6 text-center text-muted">{labels.error}</p>;
  }

  const hovered = hover && regions?.features.find((f) => f.properties.id === hover.id);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ bounds: BF_BOUNDS, fitBoundsOptions: { padding: 20 } }}
      mapStyle={BASE_STYLE}
      style={{ width: "100%", height: "100%" }}
      maxBounds={[-12, 4, 9, 20]}
      minZoom={4.5}
      maxZoom={13}
      maxPitch={60}
      dragRotate={show3d}
      attributionControl={{ compact: true }}
      interactiveLayerIds={[...STORY_LAYERS, ...REGION_LAYERS]}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(undefined)}
      cursor={cursor}
      terrain={show3d ? { source: "terrain", exaggeration: 1.4 } : undefined}
      aria-label={labels.canvas}
    >
      <NavigationControl position="top-right" showCompass={show3d} />

      {show3d ? (
        <Source
          id="terrain"
          type="raster-dem"
          tiles={[TERRAIN_TILES]}
          encoding="terrarium"
          tileSize={256}
          maxzoom={11}
          attribution="Relief : Mapzen Terrarium (AWS Open Data)"
        />
      ) : null}

      {regions ? (
        <Source id="regions" type="geojson" data={regions} attribution="Contours : OCHA COD-AB">
          <Layer
            id="regions-fill"
            type="fill"
            layout={{ visibility: show3d ? "none" : "visible" }}
            paint={{ "fill-color": fillColor, "fill-opacity": fillOpacity }}
          />
          <Layer
            id="regions-3d"
            type="fill-extrusion"
            layout={{ visibility: show3d ? "visible" : "none" }}
            paint={{
              "fill-extrusion-color": fillColor,
              "fill-extrusion-opacity": 0.85,
              "fill-extrusion-height": ["+", 1500, ["*", countExpr, 6000]],
            }}
          />
          <Layer
            id="regions-line"
            type="line"
            paint={{
              "line-color": [
                "case",
                ["==", ["get", "id"], selectedRegionId ?? ""],
                COLORS.flamme,
                COLORS.karite,
              ],
              "line-opacity": ["case", ["==", ["get", "id"], selectedRegionId ?? ""], 1, 0.25],
              "line-width": ["case", ["==", ["get", "id"], selectedRegionId ?? ""], 2.5, 1],
            }}
          />
        </Source>
      ) : null}

      {visibleStories ? (
        <Source id="recits" type="geojson" data={visibleStories} cluster clusterRadius={40} clusterMaxZoom={8}>
          <Layer
            id="recits-clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": COLORS.flamme,
              "circle-opacity": 0.9,
              "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 20, 24],
              "circle-stroke-color": COLORS.nuit,
              "circle-stroke-width": 2,
            }}
          />
          <Layer
            id="recits-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{ "text-field": ["get", "point_count_abbreviated"], "text-font": LABEL_FONT, "text-size": 13 }}
            paint={{ "text-color": COLORS.nuit }}
          />
          <Layer
            id="recits-points"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": [
                "match",
                ["get", "type"],
                ...Object.entries(TYPE_COLORS).flat(),
                COLORS.flamme,
              ] as unknown as ExpressionSpecification,
              "circle-radius": 8,
              "circle-stroke-color": COLORS.nuit,
              "circle-stroke-width": 2,
            }}
          />
        </Source>
      ) : null}

      {hovered ? (
        <Popup
          longitude={hover.lng}
          latitude={hover.lat}
          closeButton={false}
          closeOnClick={false}
          offset={12}
          className="veillee-popup"
        >
          <strong className="block font-display text-base">{hovered.properties.nom}</strong>
          <span className="block">{labels.chefLieu(hovered.properties.chefLieu)}</span>
          <span className="block">{labels.stories(counts[hovered.properties.id] ?? 0)}</span>
        </Popup>
      ) : null}
    </MapGL>
  );
}
