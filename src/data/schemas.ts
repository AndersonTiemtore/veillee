/**
 * Data contract between the build-time pipeline (scripts/build-data.ts) and
 * the app. Every generated file is validated against these schemas; the build
 * fails if one does not match.
 */
import { z } from "zod";

export const RECIT_TYPES = [
  "conte",
  "fable",
  "legende",
  "mythe_fondateur",
  "recit_historique",
] as const;
export const RecitTypeSchema = z.enum(RECIT_TYPES);
export type RecitType = z.infer<typeof RecitTypeSchema>;

export const PUBLICS = ["enfant", "tout_public", "adulte"] as const;
export const PublicCibleSchema = z.enum(PUBLICS);
export type PublicCible = z.infer<typeof PublicCibleSchema>;

const id = z.string().min(1);
const lonLat = z.tuple([z.number().min(-6).max(3), z.number().min(9).max(16)]);

export const ChoixSchema = z.object({
  libelle: z.string().min(1),
  vraieFin: z.boolean(),
  cibleOrdre: z.number().int().positive(),
});

export const SceneSchema = z.object({
  ordre: z.number().int().positive(),
  texte: z.string().min(1),
  illustration: z.string().optional(),
  animation: z.string().optional(),
  debutAudio: z.number().nonnegative().optional(),
  finAudio: z.number().nonnegative().optional(),
  choix: z.array(ChoixSchema),
});
export type Scene = z.infer<typeof SceneSchema>;

export const VersionSchema = z.object({
  id,
  langueId: id,
  codeIso: z.string().min(2),
  /** Opus (preferred) and AAC fallback. */
  audio: z.string().optional(),
  audioFallback: z.string().optional(),
  /** True for synthetic test media (scripts/make-demo-media.ts), never a recording. */
  demo: z.boolean(),
  vtt: z.string().optional(),
  dureeSecondes: z.number().nonnegative().optional(),
  texte: z.string().optional(),
  conteur: z.string().optional(),
  scenes: z.array(SceneSchema),
});
export type Version = z.infer<typeof VersionSchema>;

export const PersonnageSchema = z.object({
  id,
  nom: z.string().min(1),
  categorie: z.enum(["humain", "animal", "surnaturel"]),
});

export const RecitSchema = z.object({
  id,
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  type: RecitTypeSchema,
  titre: z.string().min(1),
  resume: z.string().optional(),
  regionIds: z.array(id),
  lieu: z
    .object({ lon: z.number(), lat: z.number(), source: z.enum(["site", "localite"]) })
    .optional(),
  siteId: id.optional(),
  ethnieIds: z.array(id),
  themeIds: z.array(id),
  personnages: z.array(PersonnageSchema),
  instrumentIds: z.array(id),
  versions: z.array(VersionSchema),
  estInteractif: z.boolean(),
  publicCible: PublicCibleSchema,
  statutCollecte: z.string(),
  dateCollecte: z.string().optional(),
  morale: z.string().optional(),
  publiable: z.boolean(),
  restreint: z.boolean(),
  liesA: z.array(id),
  langueAEnregistrer: z.array(id),
});
export type Recit = z.infer<typeof RecitSchema>;

export const RegionSchema = z.object({
  id,
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  nom: z.string().min(1),
  chefLieu: z.string().min(1),
  code: z.string().regex(/^BF\d{2}$/),
  centre: lonLat,
  nbRecits: z.number().int().nonnegative(),
  recitIds: z.array(id),
  langueIds: z.array(id),
  ethnieIds: z.array(id),
  instrumentIds: z.array(id),
  siteIds: z.array(id),
});
export type Region = z.infer<typeof RegionSchema>;

export const LangueSchema = z.object({
  id,
  nom: z.string().min(1),
  codeIso: z.string().optional(),
  nombreLocuteurs: z.number().int().nonnegative().optional(),
  regionIds: z.array(id),
});
export type Langue = z.infer<typeof LangueSchema>;

export const EthnieSchema = z.object({
  id,
  nom: z.string().min(1),
  langueIds: z.array(id),
  parentePlaisanterieIds: z.array(id),
  regionIds: z.array(id),
});
export type Ethnie = z.infer<typeof EthnieSchema>;

export const InstrumentSchema = z.object({
  id,
  nom: z.string().min(1),
  description: z.string().optional(),
  ethnieIds: z.array(id),
  regionIds: z.array(id),
});
export type Instrument = z.infer<typeof InstrumentSchema>;

export const SiteSchema = z.object({
  id,
  nom: z.string().min(1),
  description: z.string().optional(),
  categorie: z.string(),
  lon: z.number(),
  lat: z.number(),
  regionId: id.optional(),
});
export type Site = z.infer<typeof SiteSchema>;

export const ThemeSchema = z.object({ id, label: z.string().min(1) });
export type Theme = z.infer<typeof ThemeSchema>;

export const SearchEntrySchema = z.object({
  kind: z.enum(["recit", "region", "langue", "theme"]),
  id,
  href: z.string().startsWith("/"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  keywords: z.array(z.string()),
});
export type SearchEntry = z.infer<typeof SearchEntrySchema>;

export const DataQualitySchema = z.object({
  generatedAt: z.string(),
  triples: z.object({ source: z.number(), afterInference: z.number() }),
  inference: z.object({
    rules: z.number(),
    iterations: z.record(z.string(), z.number()),
    added: z.number(),
  }),
  aliases: z.object({ merged: z.number(), mappings: z.record(z.string(), z.string()) }),
  localitesSansParent: z.object({
    total: z.number(),
    rattacheesParJointureSpatiale: z.array(z.object({ id, regionId: id })),
    nonResolues: z.array(id),
  }),
  ethnies: z.object({
    sansNomEthnie: z.number(),
    generiquesIgnorees: z.array(id),
  }),
  mediasExternesMasques: z.number(),
  recits: z.object({
    total: z.number(),
    publiables: z.number(),
    restreints: z.number(),
    sansRegion: z.array(id),
    parStatut: z.record(z.string(), z.number()),
    languesAEnregistrer: z.number(),
  }),
});
export type DataQuality = z.infer<typeof DataQualitySchema>;

const point = z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) });
export const FeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: z.union([point, z.object({ type: z.string(), coordinates: z.unknown() })]),
      properties: z.record(z.string(), z.unknown()),
    }),
  ),
});
