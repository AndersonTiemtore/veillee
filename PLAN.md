# PLAN — « Veillée »

Échéance du rendu : **4 novembre 2026** (rapport + lien du site).

## Préalables
- [x] Lire `ontology/` (Contes.ttl, inference_contes.rules, requetes_plateforme.sparql)
- [ ] **Bloquant phase 2 :** obtenir `ontology/OntoBurkina_Culture.rdf` (absent du dossier)
- [x] Télécharger COD-AB BFA (HDX) → `data/raw/cod-ab/` — admin1 contient déjà les 17 nouvelles régions (BF47…BF64, valid_on 2025-08-01) : pas de dissolve nécessaire

## Phase 1 — Socle
- [ ] Next.js (App Router) + TypeScript strict, ESLint, Prettier, Vitest, Playwright
- [ ] Tailwind v4 + `src/styles/tokens.css` (charte § 5), mode clair/sombre
- [ ] Polices Gentium Book Plus / Andika (`next/font/google`)
- [ ] next-intl : `/[locale]`, `fr` par défaut, `mos`/`dyu`/`fuh` en repli sur `fr`
- [ ] Layout : en-tête, pied de page, bascule de thème, emplacement du mini-lecteur
- [ ] Page d'accueil statique
- [ ] Tests : contraste WCAG AA de tous les couples, caractères ɛ ɩ ʋ ɓ ɗ ŋ ɲ ƴ ã ẽ ĩ õ ũ (Playwright + `document.fonts.check`)
- [ ] Workflow GitHub Actions (lint, typecheck, test, build)
- [ ] Commit `feat(socle): …`

## Phase 2 — Pipeline de données
- [ ] `scripts/build-regions.ts` : COD-AB admin1 → simplification ~5 % → `data/boundaries/regions.geojson` (< 300 Ko, 17 entités)
- [ ] `scripts/aliases.json` + fusion des doublons au chargement
- [ ] `scripts/rules/*.rq` : toutes les règles de `inference_contes.rules` en SPARQL UPDATE
- [ ] `scripts/queries/*.rq` : Q1 à Q12
- [ ] `scripts/build-data.ts` : Oxigraph, jointure spatiale (`estDansRegion`), point fixe, export JSON/GeoJSON, `graph.nt`
- [ ] `src/data/schemas.ts` (Zod) ; échec du build si invalide
- [ ] `data-quality.json`
- [ ] Tests Vitest : une règle = un test sur mini-graphe ; Yennenga → Nakambé, Sabou → Nando, Bazoulé/Dafra régionalisés, Yennenga interactif, 17 régions

## Phase 3 — Carte
- [ ] `/carte` : polygones, survol/infobulle, `flyTo`, panneau/tiroir, marqueurs + clusters, filtres dans l'URL
- [ ] 2D/3D (Terrarium, pitch 50, extrusion), mode faible débit
- [ ] Liste textuelle accessible des régions
- [ ] `/regions/[slug]`
- [ ] Playwright : carte → Nakambé → Yennenga → page du récit

## Phase 4 — Récits et lecteur
- [ ] `/contes` (grille, filtres, tri, états vides)
- [ ] `/contes/[slug]` : Écouter (VTT synchronisé, clic sur phrase) et Lire (bilingue)
- [ ] Mini-lecteur persistant (Zustand + Howler), Media Session
- [ ] États « en collecte » et « restreint »
- [ ] SEO : metadata, OG image, JSON-LD
- [ ] Médias de test `demo-*` (bip/silence + VTT)

## Phase 5 — Immersion
- [ ] Mode « Vivre » (GSAP ScrollTrigger, choix, fin, quiz)
- [ ] Animation d'accueil (Rive, repli SVG), passable
- [ ] `/frise`, `/jeunesse`, recherche ⌘K (Fuse.js)
- [ ] `prefers-reduced-motion`

## Phase 6 — Hors ligne, contributions, API
- [ ] Serwist, « Garder pour la veillée », `/hors-ligne`
- [ ] `/contribuer` (Server Action, Blob, consentement, anti-spam)
- [ ] `/api/sparql` lecture seule
- [ ] `scripts/upload-media.ts` + `mediaUrl()`

## Phase 7 — Qualité et lancement
- [ ] Lighthouse CI ≥ 90, axe, budgets de taille, en-têtes de sécurité
- [ ] README
- [ ] Déploiement de prévisualisation Vercel
