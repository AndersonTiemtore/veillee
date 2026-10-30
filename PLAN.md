# PLAN — « Veillée »

Échéance du rendu : **4 novembre 2026** (rapport + lien du site).

## Préalables
- [x] Lire `ontology/` (Contes.ttl, inference_contes.rules, requetes_plateforme.sparql)
- [x] Obtenir `ontology/OntoBurkina_Culture.rdf`
- [x] Télécharger COD-AB BFA (HDX) → `data/raw/cod-ab/` — admin1 contient déjà les 17 nouvelles régions (BF47…BF64, valid_on 2025-08-01) : pas de dissolve nécessaire

## Phase 1 — Socle
- [x] Next.js (App Router) + TypeScript strict, ESLint, Prettier, Vitest, Playwright
- [x] Tailwind v4 + `src/styles/tokens.css` (charte § 5), mode clair/sombre — variantes `--laterite-fort`/`--savane-fort` pour atteindre AA
- [x] Polices : Andika (`next/font/google`) ; Gentium Book auto-hébergé depuis SIL (la version Google n'a pas ɛ ɩ ʋ ɓ ɗ ɲ)
- [x] next-intl : `/[locale]`, `fr` par défaut, `mos`/`dyu`/`fuh` en repli sur `fr`
- [x] Layout : en-tête, pied de page, bascule de thème (mini-lecteur : phase 4)
- [x] Page d'accueil statique
- [x] Tests : contraste WCAG AA de tous les couples, caractères ɛ ɩ ʋ ɓ ɗ ŋ ɲ ƴ ã ẽ ĩ õ ũ (Playwright + `document.fonts.check`)
- [x] Workflow GitHub Actions (lint, typecheck, test, build)
- [x] Commit `feat(socle): …`

## Phase 2 — Pipeline de données
- [x] `scripts/build-regions.ts` : COD-AB admin1 → simplification ~5 % → `data/boundaries/regions.geojson` (261 Ko, 17 entités)
- [x] `scripts/aliases.json` + fusion des doublons au chargement (8 fusions)
- [x] `scripts/rules/*.rq` : 30 règles Jena + 1 règle de raccord spatial, en 2 strates (négation après le point fixe)
- [x] `scripts/queries/*.rq` : Q1 à Q12
- [x] `scripts/build-data.ts` : Oxigraph, jointure spatiale (`estDansRegion`, 46 localités), point fixe, export JSON/GeoJSON, `graph.nt`
- [x] `src/data/schemas.ts` (Zod) ; échec du build si invalide
- [x] `data-quality.json` + page `/a-propos/donnees`
- [x] Tests Vitest : une règle = un test sur mini-graphe ; Yennenga → Nakambé, Sabou → Nando, Bazoulé/Dafra régionalisés, Yennenga interactif, 17 régions

## Phase 3 — Carte
- [x] `/carte` : polygones, survol/infobulle, `flyTo`, panneau/tiroir, marqueurs + clusters, filtres dans l'URL
- [x] 2D/3D (Terrarium, pitch 50, extrusion), mode faible débit
- [x] Liste textuelle accessible des régions
- [x] `/regions/[slug]`
- [x] Playwright : carte → Nakambé → Yennenga → page du récit

## Phase 4 — Récits et lecteur
- [x] `/contes` (grille, filtres, tri, états vides)
- [x] `/contes/[slug]` : Écouter (VTT synchronisé, clic sur phrase) et Lire (bilingue)
- [x] Mini-lecteur persistant (Zustand + Howler), Media Session
- [x] États « en collecte » et « restreint »
- [x] SEO : metadata, OG image, JSON-LD
- [x] Médias de test `demo-*` (bip/silence + VTT)

## Phase 5 — Immersion
- [x] Mode « Vivre » (GSAP ScrollTrigger, choix, fin, quiz)
- [x] Animation d'accueil (Rive, repli SVG), passable
- [x] `/frise`, `/jeunesse`, recherche ⌘K (Fuse.js)
- [x] `prefers-reduced-motion`

## Phase 6 — Hors ligne, contributions, API
- [ ] Serwist, « Garder pour la veillée », `/hors-ligne`
- [ ] `/contribuer` (Server Action, Blob, consentement, anti-spam)
- [ ] `/api/sparql` lecture seule
- [ ] `scripts/upload-media.ts` + `mediaUrl()`

## Phase 7 — Qualité et lancement
- [ ] Lighthouse CI ≥ 90, axe, budgets de taille, en-têtes de sécurité
- [ ] README
- [ ] Déploiement de prévisualisation Vercel
