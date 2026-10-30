/**
 * Build-time data pipeline: ontology (RDF/XML + Turtle) -> static JSON/GeoJSON.
 *
 *  1. load the ontology into Oxigraph and merge duplicate individuals (aliases.json)
 *  2. attach parentless localities to a region by spatial join (point in polygon)
 *  3. run the inference rules (scripts/rules/*.rq) to their fixed point
 *  4. extract the app's data, validate it with Zod and write src/data/generated/
 *
 * Runs as `prebuild`/`predev`. Any invalid output fails the build.
 */
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultGraph, Store } from "oxigraph";
import { z } from "zod";
import {
  DataQualitySchema,
  EthnieSchema,
  FeatureCollectionSchema,
  InstrumentSchema,
  LangueSchema,
  RecitSchema,
  RegionSchema,
  SearchEntrySchema,
  SiteSchema,
  ThemeSchema,
  type DataQuality,
  type Ethnie,
  type Instrument,
  type Langue,
  type Recit,
  type RecitType,
  type Region,
  type SearchEntry,
  type Site,
  type Theme,
} from "../src/data/schemas";
import { loadRules, runInference } from "./lib/reasoner";
import { isAllowedMediaUrl, parseWktPoint, slugify } from "./lib/util";

const ROOT = process.cwd();
const NS = "http://www.ibam-ujkz.bf/ontologies/culture#";
const OUT = join(ROOT, "src/data/generated");
const PREFIXES = `PREFIX onto: <${NS}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dcterms: <http://purl.org/dc/terms/>
`;

/** Generic ethnic "groups" that are not peoples and must not be listed. */
const GENERIC_ETHNIES = /^ethnie_(plusieurs_ethnies|communautes_)/;

// ---------------------------------------------------------------------------
// Store helpers
// ---------------------------------------------------------------------------

type Row = Record<string, string>;

const local = (iri: string) => (iri.startsWith(NS) ? iri.slice(NS.length) : iri);

function select(store: Store, query: string): Row[] {
  const rows = store.query(PREFIXES + query) as Map<string, { termType: string; value: string }>[];
  return rows.map((row) => {
    const out: Row = {};
    for (const [key, term] of row) out[key] = term.termType === "NamedNode" ? local(term.value) : term.value;
    return out;
  });
}

/** Groups rows by `key`, collecting distinct `value`s. */
function multimap(rows: Row[], key: string, value: string): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const k = row[key];
    const v = row[value];
    if (k === undefined || v === undefined) continue;
    if (!map.has(k)) map.set(k, new Set());
    map.get(k)!.add(v);
  }
  return new Map([...map].map(([k, set]) => [k, [...set].sort()]));
}

function firstBy(rows: Row[], key: string, value: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const k = row[key];
    const v = row[value];
    if (k !== undefined && v !== undefined && !map.has(k)) map.set(k, v);
  }
  return map;
}

// ---------------------------------------------------------------------------
// 1. Load and merge aliases
// ---------------------------------------------------------------------------

function loadStore(): Store {
  const store = new Store();
  store.load(readFileSync(join(ROOT, "ontology/OntoBurkina_Culture.rdf"), "utf8"), {
    format: "application/rdf+xml",
    base_iri: "http://www.ibam-ujkz.bf/ontologies/culture",
  });
  store.load(readFileSync(join(ROOT, "ontology/OntoBurkina_Contes.ttl"), "utf8"), {
    format: "text/turtle",
  });
  return store;
}

function mergeAliases(store: Store): { merged: number; mappings: Record<string, string> } {
  const raw = JSON.parse(readFileSync(join(ROOT, "scripts/aliases.json"), "utf8")) as Record<
    string,
    string
  >;
  const mappings = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("$")));
  let merged = 0;
  for (const [alias, canonical] of Object.entries(mappings)) {
    const a = `<${NS}${alias}>`;
    const c = `<${NS}${canonical}>`;
    const exists = store.query(`ASK { { ${a} ?p ?o } UNION { ?s ?p ${a} } }`) as boolean;
    if (!exists) continue;
    merged++;
    store.update(`DELETE { ${a} ?p ?o } INSERT { ${c} ?p ?o } WHERE { ${a} ?p ?o }`);
    store.update(`DELETE { ?s ?p ${a} } INSERT { ?s ?p ${c} } WHERE { ?s ?p ${a} }`);
  }
  return { merged, mappings };
}

// ---------------------------------------------------------------------------
// 2. Spatial join
// ---------------------------------------------------------------------------

interface RegionFeature {
  type: "Feature";
  properties: { code: string; nom: string };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

function spatialJoin(store: Store, polygons: RegionFeature[]) {
  const regionByCode = firstBy(
    select(store, `SELECT ?r ?code WHERE { ?r a onto:Region ; onto:codeLocalite ?code }`),
    "code",
    "r",
  );

  // Localities with no parent, except regions and the country itself.
  const orphans = select(
    store,
    `SELECT ?l ?lat ?lon WHERE {
      ?l a onto:Localite .
      FILTER NOT EXISTS { ?l onto:estSitueeDans ?any }
      FILTER NOT EXISTS { ?l a onto:Region }
      FILTER NOT EXISTS { ?l a onto:Pays }
      OPTIONAL { ?l onto:latitude ?lat ; onto:longitude ?lon }
    }`,
  );
  const sitePoints = multimap(
    select(store, `SELECT ?l ?wkt WHERE { ?s onto:estSitueDans ?l ; onto:geometrieWKT ?wkt }`),
    "l",
    "wkt",
  );

  const regionOf = (lon: number, lat: number): string | undefined => {
    const hit = polygons.find((f) => booleanPointInPolygon([lon, lat], f));
    return hit ? regionByCode.get(hit.properties.code) : undefined;
  };

  const attached: { id: string; regionId: string }[] = [];
  const unresolved: string[] = [];
  let siteLocalities = 0;

  for (const { l, lat, lon } of orphans) {
    const points: [number, number][] = [];
    if (lat && lon) points.push([Number(lon), Number(lat)]);
    const wkts = sitePoints.get(l!) ?? [];
    if (wkts.length > 0) siteLocalities++;
    for (const wkt of wkts) {
      const p = parseWktPoint(wkt);
      if (p) points.push(p);
    }
    if (points.length === 0) continue; // abstract zone ("zones rurales"…): nothing to place

    // Majority vote when a locality hosts sites in several regions.
    const votes = new Map<string, number>();
    for (const [x, y] of points) {
      const r = regionOf(x, y);
      if (r) votes.set(r, (votes.get(r) ?? 0) + 1);
    }
    const best = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!best) {
      unresolved.push(l!);
      continue;
    }
    store.update(`INSERT DATA { <${NS}${l}> <${NS}estDansRegion> <${NS}${best}> }`);
    attached.push({ id: l!, regionId: best });
  }

  return { total: siteLocalities, attached, unresolved };
}

// ---------------------------------------------------------------------------
// 4. Extraction
// ---------------------------------------------------------------------------

const TYPE_PRIORITY: [string, RecitType][] = [
  ["Fable", "fable"],
  ["MytheFondateur", "mythe_fondateur"],
  ["RecitHistorique", "recit_historique"],
  ["Conte", "conte"],
  ["Legende", "legende"],
];

/** Locality -> region, through the administrative hierarchy or the spatial join. */
function localityRegions(store: Store): Map<string, string> {
  const rows = select(
    store,
    `SELECT ?l ?r WHERE {
      ?r a onto:Region .
      { ?l onto:estSitueeDans* ?r }
      UNION { ?l onto:estSitueeDans*/onto:estDansRegion ?r }
    }`,
  );
  return firstBy(rows, "l", "r");
}

interface DemoMedia {
  audio: string;
  audioFallback: string;
  vtt: string;
  dureeSecondes: number;
  scenes: Record<string, [number, number]>;
}

/** Synthetic test media (media/demo-media.json), keyed by "recitId|langueId". */
function loadDemoMedia(): Record<string, DemoMedia> {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, "media/demo-media.json"), "utf8")) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("$"))) as Record<string, DemoMedia>;
  } catch {
    return {};
  }
}

function extract(store: Store) {
  const regionOfLoc = localityRegions(store);
  const demoMedia = loadDemoMedia();
  let externalMedia = 0;
  const media = (url: string | undefined) => {
    if (!url) return undefined;
    if (isAllowedMediaUrl(url)) return url;
    externalMedia++;
    return undefined;
  };
  // Media referenced elsewhere in the ontology (instruments…) are all external today.
  for (const { url } of select(store, `SELECT ?url WHERE { ?m onto:urlMedia ?url }`)) media(url);

  // --- Themes --------------------------------------------------------------
  const themes: Theme[] = select(
    store,
    `SELECT ?t ?label WHERE { ?t a onto:Theme ; skos:prefLabel ?label }`,
  ).map((r) => ({ id: r.t!, label: r.label! }));

  // --- Languages -----------------------------------------------------------
  const langueRegions = multimap(
    select(store, `SELECT ?l ?loc WHERE { ?l a onto:Langue ; onto:estParleeDans ?loc }`).map((r) => ({
      l: r.l!,
      r: regionOfLoc.get(r.loc!) ?? "",
    })),
    "l",
    "r",
  );
  const langues: Langue[] = select(
    store,
    `SELECT ?l ?nom ?code ?nb WHERE {
      ?l a onto:Langue ; onto:nomLangue ?nom .
      OPTIONAL { ?l onto:codeIso6393 ?code }
      OPTIONAL { ?l onto:nombreLocuteurs ?nb }
    }`,
  ).map((r) => ({
    id: r.l!,
    nom: r.nom!,
    codeIso: r.code?.split(/[;,\s]+/)[0],
    nombreLocuteurs: r.nb ? Number(r.nb) : undefined,
    regionIds: (langueRegions.get(r.l!) ?? []).filter(Boolean),
  }));
  const langueById = new Map(langues.map((l) => [l.id, l]));

  // --- Ethnic groups -------------------------------------------------------
  const ethnieRows = select(
    store,
    `SELECT ?e ?nom ?label WHERE {
      ?e a onto:Ethnie .
      OPTIONAL { ?e onto:nomEthnie ?nom }
      OPTIONAL { ?e rdfs:label ?label }
    }`,
  );
  const ethnieLangues = multimap(
    select(store, `SELECT ?e ?l WHERE { ?e a onto:Ethnie ; onto:parle|onto:aPourLangueMaternelle ?l }`),
    "e",
    "l",
  );
  const parentes = multimap(
    select(store, `SELECT ?a ?b WHERE { ?a onto:aPourParentePlaisanterie ?b }`),
    "a",
    "b",
  );
  const ethnieRegions = multimap(
    select(store, `SELECT ?e ?loc WHERE { ?e a onto:Ethnie ; onto:habite ?loc }`).map((r) => ({
      e: r.e!,
      r: regionOfLoc.get(r.loc!) ?? "",
    })),
    "e",
    "r",
  );
  const ethnieNames = new Map<string, string>();
  let sansNom = 0;
  const generiques: string[] = [];
  for (const r of ethnieRows) {
    if (ethnieNames.has(r.e!) || generiques.includes(r.e!)) continue;
    if (GENERIC_ETHNIES.test(r.e!)) {
      generiques.push(r.e!);
      continue;
    }
    if (!r.nom) sansNom++;
    const name = r.nom ?? r.label;
    if (name) ethnieNames.set(r.e!, name);
  }
  const ethnies: Ethnie[] = [...ethnieNames].map(([id, nom]) => ({
    id,
    nom,
    langueIds: (ethnieLangues.get(id) ?? []).filter((l) => langueById.has(l)),
    parentePlaisanterieIds: (parentes.get(id) ?? []).filter((e) => ethnieNames.has(e)),
    regionIds: (ethnieRegions.get(id) ?? []).filter(Boolean),
  }));
  const ethnieIds = new Set(ethnieNames.keys());

  // --- Instruments ---------------------------------------------------------
  const instrEthnies = multimap(
    select(store, `SELECT ?i ?e WHERE { ?i a onto:Instrument ; onto:estJouePar ?e }`),
    "i",
    "e",
  );
  const instrRegions = multimap(
    select(store, `SELECT ?i ?loc WHERE { ?i a onto:Instrument ; onto:estLocaliseDans ?loc }`).map(
      (r) => ({ i: r.i!, r: regionOfLoc.get(r.loc!) ?? "" }),
    ),
    "i",
    "r",
  );
  const instruments: Instrument[] = select(
    store,
    `SELECT ?i ?nom ?desc WHERE {
      ?i a onto:Instrument ; onto:nomInstrument ?nom .
      OPTIONAL { ?i onto:descriptionInstrument ?desc }
    }`,
  ).map((r) => ({
    id: r.i!,
    nom: r.nom!,
    description: r.desc,
    ethnieIds: (instrEthnies.get(r.i!) ?? []).filter((e) => ethnieIds.has(e)),
    regionIds: (instrRegions.get(r.i!) ?? []).filter(Boolean),
  }));
  const instrumentIds = new Set(instruments.map((i) => i.id));

  // --- Sites ---------------------------------------------------------------
  const siteRows = select(
    store,
    `SELECT ?s ?nom ?desc ?wkt ?loc ?cat WHERE {
      ?s a onto:SiteTouristique ; onto:nomSite ?nom ; onto:geometrieWKT ?wkt .
      OPTIONAL { ?s onto:descriptionSite ?desc }
      OPTIONAL { ?s onto:estSitueDans ?loc }
      OPTIONAL {
        ?s a ?cat . ?cat rdfs:subClassOf+ onto:SiteTouristique .
        FILTER NOT EXISTS { ?sub rdfs:subClassOf+ ?cat . ?s a ?sub . FILTER(?sub != ?cat) }
      }
    }`,
  );
  const sites = new Map<string, Site>();
  for (const r of siteRows) {
    if (sites.has(r.s!)) continue;
    const point = parseWktPoint(r.wkt!);
    if (!point) continue;
    sites.set(r.s!, {
      id: r.s!,
      nom: r.nom!,
      description: r.desc,
      categorie: r.cat ?? "SiteTouristique",
      lon: point[0],
      lat: point[1],
      regionId: r.loc ? regionOfLoc.get(r.loc) : undefined,
    });
  }

  // --- Stories -------------------------------------------------------------
  const recitIds = select(store, `SELECT DISTINCT ?r WHERE { ?r a onto:RecitOral ; onto:slug ?slug }`).map(
    (r) => r.r!,
  );
  const types = multimap(select(store, `SELECT ?r ?t WHERE { ?r a onto:RecitOral ; a ?t }`), "r", "t");
  const scalars = select(
    store,
    `SELECT ?r ?slug ?titre ?resume ?public ?statut ?restreint ?date ?morale WHERE {
      ?r a onto:RecitOral ; onto:slug ?slug ; onto:titre ?titre .
      FILTER(LANG(?titre) = "fr" || LANG(?titre) = "")
      OPTIONAL { ?r onto:resume ?resume FILTER(LANG(?resume) = "fr" || LANG(?resume) = "") }
      OPTIONAL { ?r onto:publicCible ?public }
      OPTIONAL { ?r onto:statutCollecte ?statut }
      OPTIONAL { ?r onto:estRestreint ?restreint }
      OPTIONAL { ?r onto:dateCollecte ?date }
      OPTIONAL {
        ?r onto:aPourMorale/onto:enonceMorale ?morale
        FILTER(LANG(?morale) = "fr" || LANG(?morale) = "")
      }
    }`,
  );
  const scalarById = new Map(scalars.map((r) => [r.r!, r]));
  const rel = (prop: string) =>
    multimap(select(store, `SELECT ?r ?o WHERE { ?r a onto:RecitOral ; onto:${prop} ?o }`), "r", "o");
  const regionsByRecit = rel("estRaconteDansRegion");
  const ethniesByRecit = rel("provientDeEthnie");
  const themesByRecit = rel("aPourTheme");
  const instrByRecit = rel("estAccompagneParInstrument");
  const liesByRecit = rel("estLieA");
  const aEnregistrer = rel("langueAEnregistrer");
  const siteByRecit = firstBy(
    select(store, `SELECT ?r ?s WHERE { ?r onto:estAncreSur ?s }`),
    "r",
    "s",
  );
  // Asserted locality only (not the one inferred from the site), with coordinates.
  const locPointByRecit = firstBy(
    select(
      store,
      `SELECT ?r ?pt WHERE {
        ?r onto:seDerouleDans ?l . ?l onto:latitude ?lat ; onto:longitude ?lon .
        BIND(CONCAT(STR(?lon), " ", STR(?lat)) AS ?pt)
      }`,
    ),
    "r",
    "pt",
  );
  const personnages = multimap(
    select(
      store,
      `SELECT ?r ?p WHERE { ?r onto:metEnScene ?p }`,
    ),
    "r",
    "p",
  );
  const persoInfo = new Map(
    select(
      store,
      `SELECT ?p ?nom ?cat WHERE {
        ?p onto:nomPersonnage ?nom .
        OPTIONAL { ?p a ?c . VALUES (?c ?cat) {
          (onto:PersonnageHumain "humain") (onto:PersonnageAnimal "animal") (onto:EtreSurnaturel "surnaturel") } }
      }`,
    ).map((r) => [r.p!, { nom: r.nom!, categorie: (r.cat ?? "humain") as "humain" | "animal" | "surnaturel" }]),
  );

  // Versions, scenes and choices.
  const versionRows = select(
    store,
    `SELECT ?r ?v ?langue ?code ?audio ?vtt ?duree ?texte ?conteur WHERE {
      ?r onto:aPourVersion ?v . ?v onto:estRaconteeEn ?langue .
      OPTIONAL { ?langue onto:codeIso6393 ?code }
      OPTIONAL { ?v onto:urlAudio ?audio }
      OPTIONAL { ?v onto:urlSousTitres ?vtt }
      OPTIONAL { ?v onto:dureeSecondes ?duree }
      OPTIONAL { ?v onto:texteIntegral ?texte }
      OPTIONAL { ?v onto:estRacontePar/onto:nomConteur ?conteur }
    } ORDER BY ?r ?v`,
  );
  const sceneRows = select(
    store,
    `SELECT ?v ?s ?ordre ?texte ?debut ?fin ?illu ?anim WHERE {
      ?v onto:aPourScene ?s . ?s onto:ordreScene ?ordre ; onto:texteScene ?texte .
      OPTIONAL { ?s onto:debutAudio ?debut }
      OPTIONAL { ?s onto:finAudio ?fin }
      OPTIONAL { ?s onto:aPourIllustration/onto:urlMedia ?illu }
      OPTIONAL { ?s onto:aPourAnimation/onto:urlMedia ?anim }
    }`,
  );
  const choixRows = select(
    store,
    `SELECT ?s ?libelle ?fin ?cible WHERE {
      ?s onto:proposeChoix ?c . ?c onto:libelleChoix ?libelle ; onto:choixMeneA ?t .
      ?t onto:ordreScene ?cible .
      OPTIONAL { ?c onto:estVraieFin ?fin }
    } ORDER BY ?s ?libelle`,
  );

  const recits: Recit[] = recitIds.map((id) => {
    const s = scalarById.get(id);
    if (!s) throw new Error(`Story ${id} has no French title or slug`);
    const t = types.get(id) ?? [];
    const type = TYPE_PRIORITY.find(([cls]) => t.includes(cls))?.[1];
    if (!type) throw new Error(`Story ${id} has no known type (${t.join(", ")})`);

    const siteId = siteByRecit.get(id);
    const site = siteId ? sites.get(siteId) : undefined;
    const locPoint = locPointByRecit.get(id)?.split(" ").map(Number);
    const lieu = site
      ? { lon: site.lon, lat: site.lat, source: "site" as const }
      : locPoint
        ? { lon: locPoint[0]!, lat: locPoint[1]!, source: "localite" as const }
        : undefined;

    const versions = versionRows
      .filter((v) => v.r === id)
      .map((v) => {
        // Test media only fill in what the ontology does not provide.
        const demo = v.audio ? undefined : demoMedia[`${id}|${v.langue}`];
        return {
        id: v.v!,
        langueId: v.langue!,
        codeIso: (v.code ?? langueById.get(v.langue!)?.codeIso ?? "und").split(/[;,\s]+/)[0]!,
        audio: media(v.audio) ?? demo?.audio,
        audioFallback: demo?.audioFallback,
        demo: Boolean(demo),
        vtt: media(v.vtt) ?? demo?.vtt,
        dureeSecondes: v.duree ? Number(v.duree) : demo?.dureeSecondes,
        texte: v.texte,
        conteur: v.conteur,
        scenes: sceneRows
          .filter((sc) => sc.v === v.v)
          .map((sc) => ({
            ordre: Number(sc.ordre),
            texte: sc.texte!,
            illustration: media(sc.illu),
            animation: media(sc.anim),
            debutAudio: sc.debut ? Number(sc.debut) : demo?.scenes[sc.ordre!]?.[0],
            finAudio: sc.fin ? Number(sc.fin) : demo?.scenes[sc.ordre!]?.[1],
            choix: choixRows
              .filter((c) => c.s === sc.s)
              .map((c) => ({ libelle: c.libelle!, vraieFin: c.fin === "true", cibleOrdre: Number(c.cible) })),
          }))
          .sort((a, b) => a.ordre - b.ordre),
        };
      });

    return {
      id,
      slug: s.slug!,
      type,
      titre: s.titre!,
      resume: s.resume,
      regionIds: regionsByRecit.get(id) ?? [],
      lieu,
      siteId: site ? siteId : undefined,
      ethnieIds: (ethniesByRecit.get(id) ?? []).filter((e) => ethnieIds.has(e)),
      themeIds: themesByRecit.get(id) ?? [],
      personnages: (personnages.get(id) ?? []).flatMap((p) => {
        const info = persoInfo.get(p);
        return info ? [{ id: p, ...info }] : [];
      }),
      instrumentIds: (instrByRecit.get(id) ?? []).filter((i) => instrumentIds.has(i)),
      versions,
      estInteractif: t.includes("RecitInteractif"),
      publicCible: (["enfant", "tout_public", "adulte"].includes(s.public ?? "")
        ? s.public
        : "tout_public") as Recit["publicCible"],
      statutCollecte: s.statut ?? "a_collecter",
      dateCollecte: s.date,
      morale: s.morale,
      publiable: t.includes("RecitPubliable"),
      restreint: s.restreint === "true",
      liesA: liesByRecit.get(id) ?? [],
      langueAEnregistrer: aEnregistrer.get(id) ?? [],
    };
  });
  recits.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

  // --- Regions -------------------------------------------------------------
  const regionRows = select(
    store,
    `SELECT ?r ?nom ?code ?chef ?lat ?lon WHERE {
      ?r a onto:Region ; onto:nomLocalite ?nom ; onto:codeLocalite ?code ; onto:chefLieu ?chef ;
         onto:latitude ?lat ; onto:longitude ?lon .
    }`,
  );
  const by = <T extends { regionIds: string[]; id: string }>(items: T[], region: string) =>
    items.filter((x) => x.regionIds.includes(region)).map((x) => x.id);
  const regions: Region[] = regionRows.map((r) => {
    const recitsHere = recits.filter((x) => x.regionIds.includes(r.r!));
    return {
      id: r.r!,
      slug: slugify(r.nom!),
      nom: r.nom!,
      chefLieu: r.chef!,
      code: r.code!,
      centre: [Number(r.lon), Number(r.lat)],
      nbRecits: recitsHere.length,
      recitIds: recitsHere.map((x) => x.id),
      langueIds: by(langues, r.r!),
      ethnieIds: by(ethnies, r.r!),
      instrumentIds: by(instruments, r.r!),
      siteIds: [...sites.values()].filter((s) => s.regionId === r.r).map((s) => s.id),
    };
  });
  regions.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return { themes, langues, ethnies, instruments, sites: [...sites.values()], recits, regions, externalMedia, sansNom, generiques };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** Files also served statically: GeoJSON for the map, the search index for ⌘K. */
const PUBLIC_OUT = join(ROOT, "public/data");
const PUBLIC_FILES = /\.geojson$|^search-index\.json$/;

function write(name: string, data: unknown) {
  const isPublic = PUBLIC_FILES.test(name);
  const body = JSON.stringify(data, null, isPublic ? 0 : 1);
  writeFileSync(join(OUT, name), body);
  if (isPublic) writeFileSync(join(PUBLIC_OUT, name), body);
}

function validate<T>(name: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`${name} is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function searchIndex(d: ReturnType<typeof extract>): SearchEntry[] {
  const regionName = new Map(d.regions.map((r) => [r.id, r.nom]));
  const langueName = new Map(d.langues.map((l) => [l.id, l.nom]));
  const themeName = new Map(d.themes.map((t) => [t.id, t.label]));
  return [
    ...d.recits.map((r) => ({
      kind: "recit" as const,
      id: r.id,
      href: `/contes/${r.slug}`,
      title: r.titre,
      subtitle: r.resume,
      keywords: [
        ...r.personnages.map((p) => p.nom),
        ...r.regionIds.map((id) => regionName.get(id) ?? ""),
        ...r.versions.map((v) => langueName.get(v.langueId) ?? ""),
        ...r.themeIds.map((id) => themeName.get(id) ?? ""),
      ].filter(Boolean),
    })),
    ...d.regions.map((r) => ({
      kind: "region" as const,
      id: r.id,
      href: `/regions/${r.slug}`,
      title: r.nom,
      subtitle: r.chefLieu,
      keywords: [r.chefLieu, r.code],
    })),
    ...d.langues.map((l) => ({
      kind: "langue" as const,
      id: l.id,
      href: `/contes?langue=${l.id}`,
      title: l.nom,
      keywords: l.codeIso ? [l.codeIso] : [],
    })),
    ...d.themes.map((t) => ({
      kind: "theme" as const,
      id: t.id,
      href: `/contes?theme=${t.id}`,
      title: t.label,
      keywords: [],
    })),
  ];
}

function main() {
  const started = Date.now();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUBLIC_OUT, { recursive: true });

  const store = loadStore();
  const sourceTriples = store.size;
  const aliases = mergeAliases(store);

  const regionsGeo = JSON.parse(readFileSync(join(ROOT, "data/boundaries/regions.geojson"), "utf8")) as {
    features: RegionFeature[];
  };
  const join_ = spatialJoin(store, regionsGeo.features);

  const rules = loadRules();
  const inference = runInference(store, rules);
  const d = extract(store);

  // Validate everything before writing anything.
  const recits = validate("recits.json", z.array(RecitSchema), d.recits);
  const regions = validate("regions.json", z.array(RegionSchema), d.regions);
  const langues = validate("langues.json", z.array(LangueSchema), d.langues);
  const ethnies = validate("ethnies.json", z.array(EthnieSchema), d.ethnies);
  const instruments = validate("instruments.json", z.array(InstrumentSchema), d.instruments);
  const sites = validate("sites.json", z.array(SiteSchema), d.sites);
  const themes = validate("themes.json", z.array(ThemeSchema), d.themes);
  const search = validate("search-index.json", z.array(SearchEntrySchema), searchIndex(d));

  const regionById = new Map(regions.map((r) => [r.code, r]));
  const regionsGeoOut = validate("regions.geojson", FeatureCollectionSchema, {
    type: "FeatureCollection",
    features: regionsGeo.features.map((f) => {
      const r = regionById.get(f.properties.code);
      if (!r) throw new Error(`No ontology region for polygon ${f.properties.code}`);
      return {
        type: "Feature",
        geometry: f.geometry,
        properties: { id: r.id, slug: r.slug, nom: r.nom, chefLieu: r.chefLieu, code: r.code, nbRecits: r.nbRecits },
      };
    }),
  });
  if (regionsGeoOut.features.length !== 17) throw new Error("regions.geojson must have 17 features");

  const recitsGeo = validate("recits.geojson", FeatureCollectionSchema, {
    type: "FeatureCollection",
    features: recits
      .filter((r) => r.lieu)
      .map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lieu!.lon, r.lieu!.lat] },
        properties: {
          id: r.id,
          slug: r.slug,
          titre: r.titre,
          type: r.type,
          regionIds: r.regionIds,
          langueIds: r.versions.map((v) => v.langueId),
          themeIds: r.themeIds,
          publicCible: r.publicCible,
          publiable: r.publiable,
          restreint: r.restreint,
        },
      })),
  });
  const sitesGeo = validate("sites.geojson", FeatureCollectionSchema, {
    type: "FeatureCollection",
    features: sites.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: { id: s.id, nom: s.nom, categorie: s.categorie, regionId: s.regionId ?? null },
    })),
  });

  const parStatut: Record<string, number> = {};
  for (const r of recits) parStatut[r.statutCollecte] = (parStatut[r.statutCollecte] ?? 0) + 1;
  const quality: DataQuality = validate("data-quality.json", DataQualitySchema, {
    generatedAt: new Date().toISOString(),
    triples: { source: sourceTriples, afterInference: store.size },
    inference: { rules: rules.length, iterations: Object.fromEntries(Object.entries(inference.iterations)), added: inference.added },
    aliases,
    localitesSansParent: {
      total: join_.total,
      rattacheesParJointureSpatiale: join_.attached,
      nonResolues: join_.unresolved,
    },
    ethnies: { sansNomEthnie: d.sansNom, generiquesIgnorees: d.generiques },
    mediasExternesMasques: d.externalMedia,
    recits: {
      total: recits.length,
      publiables: recits.filter((r) => r.publiable).length,
      restreints: recits.filter((r) => r.restreint).length,
      sansRegion: recits.filter((r) => r.regionIds.length === 0).map((r) => r.id),
      parStatut,
      languesAEnregistrer: recits.reduce((n, r) => n + r.langueAEnregistrer.length, 0),
    },
  });

  write("recits.json", recits);
  write("regions.json", regions);
  write("langues.json", langues);
  write("ethnies.json", ethnies);
  write("instruments.json", instruments);
  write("sites.json", sites);
  write("themes.json", themes);
  write("search-index.json", search);
  write("regions.geojson", regionsGeoOut);
  write("recits.geojson", recitsGeo);
  write("sites.geojson", sitesGeo);
  write("data-quality.json", quality);
  writeFileSync(join(OUT, "graph.nt"), store.dump({ format: "application/n-triples", from_graph_name: defaultGraph() }));

  console.log(
    `[data] ${sourceTriples} -> ${store.size} triples (inference ${JSON.stringify(inference.iterations)}), ` +
      `${recits.length} récits, ${regions.length} régions, ${sites.length} sites, ` +
      `${join_.attached.length} localités rattachées par jointure spatiale, ${Date.now() - started} ms`,
  );
}

main();
