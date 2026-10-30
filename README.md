# Veillée — contes et légendes du Burkina Faso

Plateforme web multimédia et carte interactive du patrimoine oral burkinabè : parcourir le pays sur une carte 2D/3D, découvrir les contes, légendes et récits historiques rattachés à leurs lieux, les écouter en langues nationales avec des sous-titres synchronisés.

Projet universitaire (M2 ISIE, IBAM — Université Joseph Ki-Zerbo). Le contenu provient de l'ontologie **OntoBurkina** ; aucun texte de conte, nom en langue nationale ou traduction n'est inventé par le code.

## Architecture

- **Next.js 16** (App Router, TypeScript strict), pages statiques générées au build, hébergement **Vercel**.
- **Données calculées au build** (`scripts/build-data.ts`, lancé en `prebuild`) :
  1. chargement de `ontology/*.rdf|ttl` dans **Oxigraph** (WebAssembly) et fusion des doublons (`scripts/aliases.json`) ;
  2. rattachement des localités sans parent à leur région par jointure spatiale (contours COD-AB) ;
  3. inférence : 31 règles SPARQL UPDATE (`scripts/rules/*.rq`, traduction de `ontology/inference_contes.rules`) jusqu'au point fixe ;
  4. extraction, validation **Zod** (`src/data/schemas.ts`) et écriture de `src/data/generated/` (JSON, GeoJSON, `graph.nt`, rapport de qualité). Le build échoue si les données sont invalides.
- **Carte** : MapLibre GL (sans clé, sans fond de carte payant), relief Terrarium (AWS Open Data).
- **Audio** : Howler.js, sous-titres WebVTT, mini-lecteur persistant (Zustand), Media Session.
- Les fichiers de `ontology/` ne sont **jamais modifiés** : toutes les corrections se font dans le pipeline.

## Installer et lancer

Node.js 22 ou plus.

```bash
npm install
npm run dev          # génère les données puis lance http://localhost:3000
```

| Commande | Rôle |
|---|---|
| `npm run data:build` | Régénère `src/data/generated/` depuis l'ontologie |
| `npm run build` | Données + build de production |
| `npm run lint` · `npm run typecheck` | Qualité du code |
| `npm run test` | Tests unitaires (règles d'inférence, données, contraste, VTT) |
| `npm run test:e2e` | Tests Playwright (sur un build existant) |
| `npm run regions:build` | Recalcule `data/boundaries/regions.geojson` depuis `data/raw/cod-ab/` |

## Ajouter un récit

1. Décrire le récit dans `ontology/OntoBurkina_Contes.ttl` (classe, `titre`, `slug`, `resume`, `seDerouleDans` ou `estAncreSur`, `provientDeEthnie`, versions linguistiques…). Renseigner `consentementObtenu true` seulement après accord du conteur et de la communauté.
2. Déposer les médias dans `media/` (audio Opus 64 kbit/s mono + AAC, sous-titres `.vtt`, illustrations `.webp`/`.avif`) et les référencer dans le Turtle (`urlAudio "media/audio/…"`, `urlSousTitres`).
3. *(À venir, phase 6)* `npm run media:upload` enverra `media/` vers Vercel Blob et mettra à jour `src/data/media-manifest.json` (nécessite `BLOB_READ_WRITE_TOKEN`). En attendant, les médias sont servis depuis le site lui-même.
4. `npm run data:build` puis vérifier le récit et `/a-propos/donnees`.
5. Pousser sur git : Vercel redéploie.

Un récit n'est publié que s'il est **publiable** (consentement obtenu et non restreint). Un récit `estRestreint true` n'affiche jamais ni texte ni audio.

## Variables d'environnement

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL absolue du site (métadonnées, JSON-LD) |
| `NEXT_PUBLIC_SHOW_DRAFTS` | `true` : affiche aussi le contenu des récits non encore publiables, avec un badge « Brouillon » (démonstration, développement) |
| `BLOB_READ_WRITE_TOKEN` | Scripts d'envoi de médias et formulaire de contribution, jamais côté client |

## Tests

```bash
npm run build && npm run test:e2e
```

Les tests du lecteur et des modes de récit ne s'exécutent que si le build **et** les tests sont lancés avec `NEXT_PUBLIC_SHOW_DRAFTS=true` (aucun récit n'est encore publiable). En local, `PW_CHANNEL=msedge` (ou `chrome`) utilise un navigateur déjà installé.

Les médias `media/**/demo-*` sont des **sons de test** (bips) générés par `scripts/make-demo-media.ts` pour valider la synchronisation ; ce ne sont pas des enregistrements.

## Déployer

Importer le dépôt dans Vercel (framework Next.js détecté automatiquement, commande `npm run build`), définir les variables ci-dessus. Chaque push sur `main` déploie la production, chaque pull request une prévisualisation.

## Sources et licences

- Ontologie OntoBurkina (IBAM — UJKZ).
- Limites administratives : OCHA COD-AB Burkina Faso (HDX), version du 1er août 2025.
- Relief : Mapzen Terrarium (AWS Open Data). Glyphes : OpenFreeMap.
- Polices : Andika et Gentium Book (SIL, OFL).
- Contenus des récits : CC BY-NC 4.0 par défaut, avec le crédit des conteurs.
