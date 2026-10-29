"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Layer,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import {
  BF_BOUNDS,
  GLYPHS_URL,
  LABEL_FONT,
  MAP_PALETTE,
  TERRAIN_TILES,
  TYPE_COLORS_BY_THEME,
  bbox,
} from "@/lib/map/style";
import { useTheme } from "@/lib/theme";

// Copied by scripts/copy-vendor.ts (the bundler cannot locate it by itself).
setWorkerUrl("/vendor/maplibre-gl-worker.mjs");

type RegionFC = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { id: string; slug: string; nom: string; chefLieu: string }
>;
type StoryFC = GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; slug: string; titre: string; type: string }>;
type SiteFC = GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; nom: string }>;

export interface MapLayers {
  relief: boolean;
  sites: boolean;
}

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
  layers: MapLayers;
  /** A point to fly to (guided tour). */
  focusPoint?: [number, number];
  /** Incremented to fit the whole country again. */
  recenterNonce: number;
  reducedMotion: boolean;
  labels: {
    canvas: string;
    stories: (count: number) => string;
    chefLieu: (name: string) => string;
    error: string;
  };
}

const STORY_LAYERS = ["recits-points", "recits-clusters"];
const REGION_LAYERS = ["regions-fill", "regions-3d"];
const FLY_MS = 1200;

export default function StoryMap(props: StoryMapProps) {
  const {
    counts,
    visibleStoryIds,
    selectedRegionId,
    onSelectRegion,
    onOpenStory,
    mode3d,
    lowData,
    layers,
    focusPoint,
    recenterNonce,
    reducedMotion,
    labels,
  } = props;
  const mapRef = useRef<MapRef>(null);
  const theme = useTheme();
  const palette = MAP_PALETTE[theme];
  const typeColors = TYPE_COLORS_BY_THEME[theme];
  const [regions, setRegions] = useState<RegionFC>();
  const [stories, setStories] = useState<StoryFC>();
  const [sites, setSites] = useState<SiteFC>();
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

  // Sites are only fetched once the layer is switched on.
  useEffect(() => {
    if (!layers.sites || sites) return;
    let alive = true;
    fetch("/data/sites.geojson")
      .then((r) => r.json() as Promise<SiteFC>)
      .then((s) => alive && setSites(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [layers.sites, sites]);

  const style = useMemo<StyleSpecification>(
    () => ({
      version: 8,
      glyphs: GLYPHS_URL,
      sources: {},
      layers: [{ id: "fond", type: "background", paint: { "background-color": palette.background } }],
    }),
    [palette.background],
  );

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

  const isSelected: ExpressionSpecification = ["==", ["get", "id"], selectedRegionId ?? ""];
  const fillColor: ExpressionSpecification = [
    "case",
    isSelected,
    palette.regionActive,
    ["==", ["get", "id"], hover?.id ?? ""],
    palette.regionHover,
    [">", countExpr, 0],
    palette.region,
    palette.regionEmpty,
  ];

  const duration = reducedMotion ? 0 : FLY_MS;
  const show3d = mode3d && !lowData;
  const showRelief = (layers.relief || show3d) && !lowData;

  // Fly to the selected region, or back to the whole country, keeping clear
  // of the floating panels (filters on the left, region panel on the right
  // on desktop; controls on top and the region sheet at the bottom on mobile).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regions) return;
    const feature = regions.features.find((f) => f.properties.id === selectedRegionId);
    const [w, s, e, n] = feature ? bbox(feature.geometry) : BF_BOUNDS;
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    const padding =
      width >= 1024
        ? { top: 40, bottom: 110, left: 360, right: feature ? 360 : 180 }
        : { top: 70, bottom: feature ? Math.round(height * 0.55) + 10 : 30, left: 16, right: 16 };
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding, duration, pitch: show3d ? 50 : 0 },
    );
  }, [selectedRegionId, regions, show3d, recenterNonce, duration]);

  useEffect(() => {
    if (!focusPoint) return;
    mapRef.current?.flyTo({ center: focusPoint, zoom: 8.5, duration: reducedMotion ? 0 : 2500, essential: true });
  }, [focusPoint, reducedMotion]);

  function onClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) return onSelectRegion(undefined);
    const layer = feature.layer.id;
    if (layer === "recits-points") return onOpenStory(String(feature.properties.slug));
    if (layer === "recits-clusters") {
      const map = mapRef.current;
      const source = map?.getSource("recits") as GeoJSONSource | undefined;
      void source?.getClusterExpansionZoom(Number(feature.properties.cluster_id)).then((zoom: number) => {
        map?.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration });
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
      initialViewState={{ bounds: BF_BOUNDS, fitBoundsOptions: { padding: 40 } }}
      mapStyle={style}
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
      {showRelief ? (
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
            paint={{ "fill-color": fillColor, "fill-opacity": 0.9 }}
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
              "line-color": ["case", isSelected, palette.lineActive, palette.line],
              "line-opacity": ["case", isSelected, 1, 0.45],
              "line-width": ["case", isSelected, 3.5, 1],
            }}
          />
        </Source>
      ) : null}

      {/* Hillshade sits above the flat fills so the relief shows through. */}
      {showRelief && !show3d ? (
        <Layer
          id="relief"
          type="hillshade"
          source="terrain"
          paint={{
            "hillshade-exaggeration": 0.6,
            "hillshade-shadow-color": theme === "jour" ? "#5a3b1c" : "#000000",
            "hillshade-highlight-color": theme === "jour" ? "#fff6dc" : "#4a5a96",
          }}
        />
      ) : null}

      {layers.sites && sites ? (
        <Source id="sites" type="geojson" data={sites}>
          <Layer
            id="sites-points"
            type="circle"
            minzoom={6}
            paint={{
              "circle-radius": 3,
              "circle-color": palette.line,
              "circle-opacity": 0.55,
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
              "circle-color": palette.cluster,
              "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 20, 24],
              "circle-stroke-color": palette.background,
              "circle-stroke-width": 2,
            }}
          />
          <Layer
            id="recits-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{ "text-field": ["get", "point_count_abbreviated"], "text-font": LABEL_FONT, "text-size": 13 }}
            paint={{ "text-color": palette.clusterText }}
          />
          <Layer
            id="recits-points"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": [
                "match",
                ["get", "type"],
                ...Object.entries(typeColors).flat(),
                palette.cluster,
              ] as unknown as ExpressionSpecification,
              "circle-radius": 9,
              "circle-stroke-color": palette.background,
              "circle-stroke-width": 2.5,
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
