# Renderer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réécrire les 4 fichiers du renderer Electron (index.html, style.css, app.js, reglages-client.js) pour adopter le design system anthracite/orange LM VisuBatch avec 4 écrans (Accueil, Liste, Génération, Bilan).

**Architecture:** Remplacement complet fichier par fichier. Navigation entre écrans par `hidden` sur conteneurs HTML. Gammes récentes dans `localStorage`. Aucun changement au core ou à l'IPC.

**Tech Stack:** HTML/CSS/JS vanilla, Electron, IPC existant (`api.*`), `localStorage`.

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `app/resources/fonts/IBMPlexSans-Medium-latin.woff2` | Copier depuis le design system |
| `app/src/renderer/style.css` | Réécriture complète |
| `app/src/renderer/index.html` | Réécriture complète |
| `app/src/renderer/app.js` | Réécriture complète |
| `app/src/renderer/reglages-client.js` | Réécriture complète |

---

## Task 1 — Police IBM Plex Sans + style.css

**Files:**
- Copy: `app/resources/fonts/IBMPlexSans-Medium-latin.woff2`
- Modify: `app/src/renderer/style.css`

- [ ] **Copier la police**

```powershell
Copy-Item "design_handoff_visubatch_prototype\prototype\_ds\lm-visubatch-design-system-c6776e0c-6da9-4cfb-807b-f8ede6202445\assets\fonts\IBMPlexSans-Medium-latin.woff2" "app\resources\fonts\IBMPlexSans-Medium-latin.woff2"
```

- [ ] **Écrire le nouveau style.css** — remplacer intégralement `app/src/renderer/style.css` par :

```css
@font-face { font-family: 'Montserrat'; font-weight: 400; src: url('../../resources/fonts/Montserrat-Regular.ttf'); }
@font-face { font-family: 'Montserrat'; font-weight: 700; src: url('../../resources/fonts/Montserrat-Bold.ttf'); }
@font-face { font-family: 'IBM Plex Sans'; font-weight: 500; src: url('../../resources/fonts/IBMPlexSans-Medium-latin.woff2') format('woff2'); }

:root {
  --anthracite: #2b2f33; --encre: #1e2226; --doux: #5d646b; --gris-clair: #b9c0c7;
  --trait: #d6dadd; --gris-actif: #e9ecee; --fond: #f1f3f4; --surface-douce: #f8f9fa; --surface: #ffffff;
  --orange: #ff6b1a; --orange-fonce: #e85a0a;
  --bleu: #1f6fe0; --bleu-fonce: #1859b8; --bleu-clair: #e3edfc;
  --caramel: #8c5a1e; --caramel-clair: #f3ece3; --caramel-trait: #d9c2a3;
  --rouge: #a3303a; --rouge-clair: #f2e3e4;
  --voile: rgba(30,34,38,.40); --voile-fort: rgba(30,34,38,.50); --depot-voile: rgba(255,255,255,.92);
  --t-micro: 11px; --t-petit: 12px; --t-texte: 14px; --t-titre: 19px; --t-grand: 28px;
  --font-sans: Montserrat, system-ui, sans-serif;
  --font-liste: 'IBM Plex Sans', Montserrat, system-ui, sans-serif;
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; overflow: hidden; }
body { display: flex; flex-direction: column; background: var(--fond); color: var(--encre); font: 400 var(--t-texte)/1.45 var(--font-sans); }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--bleu); outline-offset: 2px; }
[hidden] { display: none !important; }

/* Utilitaires */
.lien { background: none; border: 0; padding: 0; color: var(--encre); text-decoration: underline; text-underline-offset: 3px; }
.lien:hover { color: var(--bleu); }
.principal { background: var(--orange); color: var(--encre); border: 0; padding: 10px 22px; font-weight: 700; }
.principal:hover { background: var(--orange-fonce); }
.principal:disabled { background: var(--trait); color: var(--doux); cursor: default; }
.secondaire { background: var(--surface); border: 1px solid var(--anthracite); padding: 7px 14px; }
.secondaire:hover { background: var(--anthracite); color: var(--surface); }
.aide { color: var(--doux); font-size: var(--t-petit); margin: 0; }
.aide code { font-family: monospace; background: var(--fond); padding: 1px 5px; }
.erreur { color: var(--rouge); }

/* Bascule */
.bascule, .filtres { flex: none; display: inline-flex; border: 1px solid var(--trait); overflow: hidden; }
.bascule button, .filtres button { background: var(--surface); border: 0; padding: 5px 12px; font-size: var(--t-petit); }
.bascule button + button, .filtres button + button { border-left: 1px solid var(--trait); }
.bascule [aria-checked="true"], .filtres [aria-checked="true"] { background: var(--anthracite); color: var(--surface); font-weight: 700; }

/* En-tête */
.barre { display: flex; align-items: center; gap: 20px; flex: none; padding: 12px 20px; background: var(--anthracite); color: var(--surface); box-shadow: inset 0 -3px 0 var(--orange); position: relative; z-index: 200; white-space: nowrap; min-width: 0; }
.marque { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.28em; flex: none; line-height: 1; }
.marque-lm { color: var(--orange); font-weight: 700; }
.marque-nom { color: var(--surface); font-weight: 400; }
.barre-info { display: flex; gap: 8px; align-items: baseline; font-size: 12px; min-width: 0; }
.barre-info b { color: var(--gris-clair); flex: none; }
.barre-info-chemin { color: var(--gris-clair); min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.barre .lien { color: var(--surface); }
.barre .lien:hover { color: var(--gris-clair); }
.barre .secondaire { background: transparent; border-color: var(--surface); color: var(--surface); }
.barre .secondaire:hover { background: var(--surface); color: var(--anthracite); }
.barre-flex { flex: 1; }
.btn-aide { flex: none; width: 28px; height: 28px; border-radius: 50%; background: transparent; border: 1px solid var(--surface); color: var(--surface); font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; padding: 0; }
.btn-aide:hover { background: var(--surface); color: var(--anthracite); }

/* Écran conteneur */
.ecran { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }

/* Barre d'outils */
.barre-outils { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--surface-douce); border-bottom: 1px solid var(--trait); flex: none; flex-wrap: wrap; }
.barre-outils input[type="search"] { padding: 6px 10px; border: 1px solid var(--trait); background: var(--surface); width: 200px; }
.legende-badges { display: flex; align-items: center; gap: 4px; font-size: var(--t-petit); color: var(--doux); }

/* Dépôt overlay */
.depot { position: fixed; inset: 0; z-index: 300; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: var(--depot-voile); border: 3px dashed var(--bleu); pointer-events: none; }
.depot-titre { font-size: var(--t-grand); font-weight: 700; color: var(--encre); }

/* Liste décos */
.deco { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; background: var(--surface); }
.rangee { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid var(--trait); list-style: none; }
.rangee:hover { background: var(--gris-actif); }
.rangee input { margin: 0; accent-color: var(--bleu); }
.rangee .nom { font-family: var(--font-liste); font-weight: 500; flex: none; width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rangee .badges-types { flex: 1; display: flex; align-items: center; flex-wrap: wrap; }
.rangee .badges-statut { display: flex; gap: 4px; }
.detail-lien { background: none; border: 0; padding: 0; color: var(--doux); font-size: var(--t-petit); cursor: pointer; white-space: nowrap; flex: none; margin-left: 12px; }
.detail-lien:hover { color: var(--bleu); }

/* Badges */
.badge { display: inline-block; font-size: var(--t-micro); font-weight: 700; padding: 1px 8px; margin-left: 8px; vertical-align: 1px; }
.badge.afaire { background: var(--anthracite); color: var(--surface); box-shadow: inset 3px 0 0 var(--orange); }
.badge.ok { background: var(--fond); color: var(--doux); font-weight: 400; }
.badge.depose { background: var(--caramel-clair); color: var(--caramel); }
.badge.bloque { background: var(--rouge-clair); color: var(--rouge); }

/* Lot footer */
.lot { display: flex; align-items: center; gap: 20px; min-width: 0; padding: 14px 20px; background: var(--surface); border-top: 1px solid var(--trait); flex: none; }
.refaire { display: inline-flex; align-items: center; gap: 6px; font-size: var(--t-petit); }
.refaire input { accent-color: var(--bleu); margin: 0; }
.resume { flex: 1; min-width: 0; color: var(--doux); font-size: var(--t-petit); }
.resume strong { color: var(--encre); }
.actions { display: flex; gap: 10px; align-items: center; }
#types { display: flex; gap: 4px; flex-wrap: wrap; }
.types-label { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border: 1px solid var(--trait); font-size: var(--t-petit); cursor: pointer; background: var(--surface); }
.types-label:has(input:checked) { background: var(--bleu-clair); border-color: var(--bleu); font-weight: 700; }
.types-label input { accent-color: var(--bleu); margin: 0; }

/* Tiroir */
.tiroir-fond { position: fixed; inset: 0; background: var(--voile); z-index: 99; }
.tiroir { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; background: var(--surface); border-left: 1px solid var(--trait); box-shadow: -4px 0 24px rgba(0,0,0,.12); display: flex; flex-direction: column; z-index: 100; overflow: hidden; }
.tiroir-entete { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--trait); flex: none; }
.tiroir-titre { font-size: var(--t-grand); line-height: 1.15; font-weight: 700; }
.fermer { background: none; border: 0; font-size: 20px; color: var(--doux); cursor: pointer; padding: 4px 8px; line-height: 1; }
.fermer:hover { color: var(--encre); }
.tiroir-corps { overflow-y: auto; padding: 20px 24px 32px; flex: 1; }
.tiroir-corps h2 { font-size: var(--t-petit); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--doux); padding-bottom: 6px; border-bottom: 1px solid var(--trait); margin: 24px 0 10px; }
.tiroir-pied { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--trait); flex: none; }
.tiroir-pied .aide { flex: 1; }

/* Section titre */
.section-titre { font-size: var(--t-petit); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--doux); padding-bottom: 6px; border-bottom: 1px solid var(--trait); }

/* Panneaux */
.panneaux { display: flex; align-items: flex-end; gap: 22px; padding: 22px 24px 16px; background: var(--surface); overflow-x: auto; }
.panneau { display: grid; justify-items: center; gap: 8px; flex: none; }
.panneau-paire { display: flex; gap: 2px; align-items: flex-end; }
.panneau-image { position: relative; background: var(--fond); overflow: hidden; }
.panneau-image img { width: 100%; height: 100%; object-fit: fill; display: block; }
.panneau-image.absent { background: repeating-linear-gradient(135deg, transparent 0 7px, var(--caramel-clair) 7px 9px); outline: 1.5px dashed var(--caramel); outline-offset: -1.5px; }
.panneau-image.absent span { position: absolute; inset: auto 0 8px; text-align: center; font-size: 11px; color: var(--caramel); font-weight: 700; }
.panneau-legende { text-align: center; font-size: var(--t-petit); line-height: 1.35; }
.panneau-legende strong { display: block; font-size: var(--t-texte); }
.panneau-legende .sans-ref { color: var(--caramel); }

/* Grille visuels fiche */
.visuels-grille { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.visuel-tuile { display: grid; gap: 4px; }
.visuel-img { aspect-ratio: 3/4; width: 100%; background: var(--fond); overflow: hidden; position: relative; }
.visuel-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.visuel-afaire { aspect-ratio: 3/4; border: 1px dashed var(--anthracite); }
.visuel-manquant { aspect-ratio: 3/4; background: repeating-linear-gradient(135deg, transparent 0 7px, var(--caramel-clair) 7px 9px); outline: 1.5px dashed var(--caramel); outline-offset: -1.5px; }
.visuel-legende { font-size: var(--t-petit); line-height: 1.3; }
.visuel-legende strong { display: block; }
.visuel-legende .ok { color: var(--doux); }
.visuel-legende .afaire { color: var(--encre); }
.visuel-legende .manquant { color: var(--caramel); }
.visuel-legende .bloque { color: var(--rouge); }

/* Refs fiche */
.refs { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
.ref { display: inline-flex; gap: 6px; align-items: center; padding: 2px 8px; background: var(--fond); font-variant-numeric: tabular-nums; font-size: var(--t-petit); }
.ref.saisie { background: var(--bleu-clair); }
.ref small { color: var(--doux); }
.ref button { border: 0; background: none; padding: 0 2px; color: var(--doux); cursor: pointer; }
.ref button:hover { color: var(--rouge); }
.ajout-ref { display: inline-flex; gap: 4px; }
.ajout-ref input { width: 96px; padding: 3px 6px; border: 1px solid var(--trait); font-variant-numeric: tabular-nums; font-size: var(--t-petit); }
.ajout-ref select { padding: 2px 4px; border: 1px solid var(--trait); background: var(--surface); font-size: var(--t-petit); }
.ajout-ref button { padding: 2px 10px; background: var(--surface); border: 1px solid var(--trait); font-size: var(--t-petit); }
.ajout-ref button:hover { border-color: var(--bleu); color: var(--bleu); }
.legende-refs { margin-top: 8px; }

/* Table motifs */
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--fond); vertical-align: middle; }
th { font-size: var(--t-petit); color: var(--doux); font-weight: 400; }
td.format { font-weight: 700; white-space: nowrap; }
.motif-ok { color: var(--doux); }
.motif-absent { color: var(--caramel); font-weight: 700; }

/* Problèmes */
.problemes { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.probleme { padding: 8px 12px; border-left: 3px solid var(--caramel); background: var(--caramel-clair); }
.probleme.bloquant { border-color: var(--rouge); background: var(--rouge-clair); }

/* Progression */
.progression { display: grid; gap: 4px; }
.progression-barre { height: 8px; background: var(--fond); overflow: hidden; }
.progression-barre div { height: 100%; background: var(--orange); width: 0; transition: width .3s; }
.progression-texte { font-size: var(--t-petit); color: var(--doux); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Messages */
.messages { position: fixed; right: 20px; bottom: 80px; display: grid; gap: 8px; max-width: 460px; z-index: 400; }
.message { background: var(--anthracite); color: #fff; padding: 10px 14px; }
.message.erreur { background: var(--rouge); }

/* Options tiroir */
.opt-section { display: grid; gap: 10px; margin-bottom: 28px; }
.apercu { background: var(--fond); padding: 12px 14px; font-family: monospace; font-size: var(--t-petit); line-height: 1.7; }

/* Modale aide */
.aide-fond { position: fixed; inset: 0; background: var(--voile); z-index: 199; }
.aide-modale { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(680px,96vw); max-height: 80vh; background: var(--surface); border: 1px solid var(--trait); box-shadow: 0 12px 40px rgba(0,0,0,.18); display: flex; flex-direction: column; z-index: 200; padding: 0; }
.aide-modale:not([open]) { display: none; }
.aide-entete { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--trait); flex: none; }
.aide-titre { font-size: var(--t-titre); font-weight: 700; }
.aide-corps { overflow-y: auto; padding: 20px 24px 28px; flex: 1; }
.aide-corps section { margin-bottom: 24px; }
.aide-corps section:last-child { margin-bottom: 0; }
.aide-corps h2 { font-size: var(--t-petit); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--doux); margin: 0 0 10px; }
.aide-corps p { margin: 0 0 8px; }
.aide-code { font-family: monospace; font-size: var(--t-petit); background: var(--fond); border: 1px solid var(--trait); padding: 8px 12px; margin: 8px 0; white-space: pre-wrap; word-break: break-all; }
.aide-corps code { font-family: monospace; background: var(--fond); padding: 1px 5px; font-size: var(--t-petit); }
.aide-table { border-collapse: collapse; width: 100%; }
.aide-table th { font-size: var(--t-petit); color: var(--doux); font-weight: 700; text-align: left; padding: 6px 10px; border-bottom: 2px solid var(--trait); }
.aide-table td { font-size: var(--t-petit); padding: 7px 10px; border-bottom: 1px solid var(--fond); vertical-align: top; }
.aide-table tr:last-child td { border-bottom: 0; }
.aide-table td:first-child { white-space: nowrap; }
.aide-statique { color: var(--doux); font-style: italic; }

/* Écran Accueil */
.accueil-corps { flex: 1; overflow: auto; padding: 48px 64px; }
.accueil-inner { max-width: 960px; margin: 0 auto; display: grid; gap: 20px; }
.accueil-titre-row { display: flex; align-items: center; gap: 16px; }
.accueil-titre { font-size: var(--t-grand); line-height: 1.15; font-weight: 700; flex: 1; }
.gammes-liste { margin: 0; padding: 0; list-style: none; background: var(--surface); border-top: 1px solid var(--trait); }
.gamme-rangee { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--trait); cursor: pointer; }
.gamme-rangee:hover { background: var(--gris-actif); }
.gamme-nom { font-weight: 700; width: 160px; flex: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gamme-chemin { font-family: monospace; font-size: var(--t-petit); color: var(--doux); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gamme-decos { font-size: var(--t-petit); flex: none; color: var(--doux); }
.gamme-ouvrir { color: var(--doux); font-size: var(--t-petit); white-space: nowrap; flex: none; }
.depot-zone { border: 1px dashed var(--trait); padding: 36px; text-align: center; color: var(--doux); }
.depot-zone b { color: var(--encre); }
.accueil-footer { background: var(--surface); border-top: 1px solid var(--trait); display: flex; align-items: center; gap: 12px; padding: 14px 20px; flex: none; flex-wrap: wrap; }
.accueil-footer .section-titre { border: 0; padding: 0; }

/* Écran Génération */
.generation-corps { flex: 1; overflow: auto; padding: 48px 64px; }
.generation-inner { max-width: 960px; margin: 0 auto; display: grid; gap: 24px; }
.generation-titre { font-size: var(--t-grand); line-height: 1.15; font-weight: 700; }
.generation-globale { background: var(--surface); padding: 16px; }
.generation-liste { margin: 0; padding: 0; list-style: none; background: var(--surface); border-top: 1px solid var(--trait); }
.gen-rangee { display: flex; align-items: center; gap: 20px; padding: 12px 16px; border-bottom: 1px solid var(--trait); list-style: none; }
.gen-nom { width: 140px; flex: none; font-weight: 700; font-size: var(--t-texte); }
.gen-barre-wrap { flex: 1; }
.gen-barre-wrap .progression-barre { width: 100%; }
.gen-texte { width: 120px; text-align: right; font-variant-numeric: tabular-nums; font-size: var(--t-petit); color: var(--doux); flex: none; }
.gen-alerte { width: 120px; flex: none; }
.generation-footer { background: var(--surface); border-top: 1px solid var(--trait); display: flex; align-items: center; gap: 20px; padding: 14px 20px; flex: none; }

/* Écran Bilan */
.bilan-corps { flex: 1; overflow: auto; padding: 48px 64px; }
.bilan-inner { max-width: 960px; margin: 0 auto; display: grid; gap: 28px; }
.bilan-titre-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.bilan-titre { font-size: var(--t-grand); line-height: 1.15; font-weight: 700; margin-right: 8px; }
.bilan-section { display: grid; gap: 10px; }
.bilan-produites { margin: 0; padding: 0; list-style: none; background: var(--surface); }
.bilan-produite-rangee { display: flex; align-items: center; gap: 16px; padding: 10px 16px; border-bottom: 1px solid var(--trait); list-style: none; }
.bilan-produite-nom { width: 140px; flex: none; font-weight: 700; }
.bilan-vignettes { flex: 1; display: flex; gap: 6px; flex-wrap: wrap; }
.bilan-vignette { display: grid; gap: 2px; width: 48px; }
.bilan-vignette-img { width: 48px; height: 64px; object-fit: cover; display: block; background: var(--fond); }
.bilan-vignette-code { font-size: 10px; color: var(--doux); text-align: center; }
.bilan-produite-count { width: 90px; text-align: right; font-size: var(--t-petit); color: var(--doux); flex: none; }
.bilan-footer { background: var(--surface); border-top: 1px solid var(--trait); display: flex; align-items: center; gap: 20px; padding: 14px 20px; flex: none; }

/* Réglages client */
.rc-fond { position: fixed; inset: 0; background: var(--voile-fort); z-index: 130; }
.rc-modale { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(760px,96vw); max-height: calc(92vh - 70px); background: var(--surface); border: 1px solid var(--trait); box-shadow: 0 12px 48px rgba(0,0,0,.18); display: flex; flex-direction: column; z-index: 180; }
.rc-entete { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--trait); flex: none; }
.rc-titre { font-size: var(--t-titre); font-weight: 700; }
.rc-alerte { display: flex; align-items: center; gap: 8px; padding: 10px 22px; background: var(--caramel-clair); border-bottom: 1px solid var(--caramel-trait); flex: none; font-size: var(--t-petit); }
.rc-corps { display: grid; grid-template-columns: 170px minmax(0,1fr); flex: 1; overflow: hidden; min-height: 360px; }
.rc-nav { display: flex; flex-direction: column; border-right: 1px solid var(--trait); padding: 12px 0; overflow-y: auto; }
.rc-nav button { text-align: left; background: none; border: 0; padding: 10px 20px; font: inherit; font-size: var(--t-texte); cursor: pointer; color: var(--encre); }
.rc-nav button:hover { background: var(--gris-actif); }
.rc-nav button[aria-selected="true"] { background: var(--gris-actif); box-shadow: inset 3px 0 0 var(--bleu); font-weight: 700; }
.rc-contenu { overflow-y: auto; padding: 20px 24px 24px; display: grid; gap: 28px; align-content: start; }
.rc-pied { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trait); flex: none; }
.rc-section { display: grid; gap: 10px; }
.rc-section-titre { font-size: var(--t-petit); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--doux); padding-bottom: 6px; border-bottom: 1px solid var(--trait); }
.rc-champ { display: grid; gap: 4px; }
.rc-champ label { font-size: var(--t-petit); font-weight: 700; }
.rc-champ input[type="text"] { padding: 7px 10px; border: 1px solid var(--trait); background: var(--surface); width: 100%; }
.rc-champ input[type="text"]:focus { outline: 2px solid var(--bleu); outline-offset: 2px; border-color: var(--bleu); }
.rc-champ input.mono { font-family: monospace; font-size: var(--t-petit); }
.rc-grille2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rc-testeur { background: var(--fond); padding: 10px 12px; display: grid; gap: 4px; }
.rc-testeur label { font-size: var(--t-petit); color: var(--doux); }
.rc-testeur input { padding: 6px 9px; border: 1px solid var(--trait); background: var(--surface); font-family: monospace; font-size: var(--t-petit); width: 100%; }
.rc-testeur-res { font-size: var(--t-petit); font-weight: 700; min-height: 18px; padding-top: 4px; }
.rc-testeur-res.ok { color: var(--bleu-fonce); }
.rc-testeur-res.err { color: var(--caramel); }
.rc-bascule { display: inline-flex; border: 1px solid var(--trait); overflow: hidden; }
.rc-bascule button { background: var(--surface); border: 0; padding: 6px 14px; font: inherit; font-size: var(--t-petit); cursor: pointer; }
.rc-bascule button + button { border-left: 1px solid var(--trait); }
.rc-bascule button[aria-checked="true"] { background: var(--anthracite); color: var(--surface); font-weight: 700; }
.rc-cat-statut { display: flex; align-items: center; gap: 8px; font-size: var(--t-petit); color: var(--doux); margin-top: 6px; }
.rc-puce { width: 8px; height: 8px; border-radius: 50%; flex: none; display: inline-block; }
.rc-puce.ok { background: var(--bleu); }
.rc-puce.absent { background: var(--caramel); }
.rc-puce.fallback { background: var(--trait); }
.rc-cat-perso { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
.rc-cat-perso input { flex: 1; padding: 7px 10px; border: 1px solid var(--trait); background: var(--surface); font: inherit; font-size: var(--t-petit); }
.rc-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.rc-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px 3px 10px; background: var(--fond); border: 1px solid var(--trait); font-size: var(--t-petit); }
.rc-tag button { background: none; border: 0; padding: 0 2px; color: var(--doux); cursor: pointer; font-size: 13px; line-height: 1; }
.rc-tag button:hover { color: var(--rouge); }
.rc-tag-ajout { display: inline-flex; gap: 4px; }
.rc-tag-ajout input { width: 80px; padding: 3px 8px; border: 1px solid var(--trait); font: inherit; font-size: var(--t-petit); }
.rc-tag-ajout button { padding: 3px 10px; background: var(--surface); border: 1px solid var(--trait); font: inherit; font-size: var(--t-petit); }
.rc-tag-ajout button:hover { border-color: var(--bleu); color: var(--bleu); }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
```

- [ ] **Vérifier la syntaxe CSS** — ouvrir `app/src/renderer/style.css` dans un navigateur ou DevTools, vérifier aucune erreur de parsing.

- [ ] **Commit**

```bash
git add app/resources/fonts/IBMPlexSans-Medium-latin.woff2 app/src/renderer/style.css
git commit -m "feat: design tokens anthracite/orange + IBM Plex Sans"
```

---

## Task 2 — index.html (4 écrans + surfaces)

**Files:**
- Modify: `app/src/renderer/index.html`

- [ ] **Réécrire index.html** — remplacer intégralement par :

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'">
  <title>LM VisuBatch</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

<!-- EN-TÊTE -->
<header class="barre" id="barre">
  <strong class="marque"><b class="marque-lm">LM</b> <span class="marque-nom">VisuBatch</span></strong>
  <span id="barre-gamme" hidden class="barre-info">
    <b>GAMME</b>
    <span class="barre-info-chemin" id="chemin-gamme"></span>
    <button class="lien" data-choisir="gamme">Changer</button>
  </span>
  <span id="barre-sortie" hidden class="barre-info">
    <b>Sortie</b>
    <span class="barre-info-chemin" id="chemin-sortie"></span>
    <button class="lien" data-choisir="sortie">Changer</button>
  </span>
  <span class="barre-flex"></span>
  <button class="secondaire" id="btn-options" hidden>⚙ Options</button>
  <button class="secondaire" id="btn-reglages-client">⚙ Réglages client</button>
  <button class="btn-aide" id="btn-aide" aria-label="Aide — fichiers requis">?</button>
</header>

<!-- ÉCRAN ACCUEIL -->
<div id="ecran-accueil" class="ecran">
  <div class="accueil-corps">
    <div class="accueil-inner">
      <div class="accueil-titre-row">
        <strong class="accueil-titre">Gammes récentes</strong>
        <button class="secondaire" id="parcourir">Parcourir…</button>
      </div>
      <ul class="gammes-liste" id="gammes-liste"></ul>
      <div class="depot-zone" id="depot-zone-accueil">ou déposez un dossier <b>GAMME</b> ici</div>
    </div>
  </div>
  <footer class="accueil-footer">
    <span class="section-titre">Sortie</span>
    <span class="gamme-chemin" id="accueil-sortie-chemin" style="font-family:monospace;font-size:var(--t-petit)">non choisi</span>
    <button class="lien" data-choisir="sortie">Changer</button>
    <span class="barre-flex"></span>
    <span class="aide">La sortie est mémorisée pour chaque gamme.</span>
  </footer>
</div>

<!-- ÉCRAN LISTE -->
<div id="ecran-liste" class="ecran" hidden>
  <div class="barre-outils">
    <button class="lien" id="retour-gammes">‹ Gammes</button>
    <input type="search" id="recherche" placeholder="Chercher une déco" aria-label="Chercher une déco">
    <div class="filtres" role="radiogroup" aria-label="Filtrer les décos">
      <button role="radio" data-filtre="tous">Tous</button>
      <button role="radio" data-filtre="afaire">À faire</button>
      <button role="radio" data-filtre="incomplets">Incomplets</button>
    </div>
    <button class="lien" id="cocher-afaire">Cocher les À faire</button>
    <button class="lien" id="tout-decocher">Tout décocher</button>
    <span class="barre-flex"></span>
    <span class="legende-badges">
      <span class="badge ok" style="margin:0">ok</span>
      <span class="badge afaire" style="margin:0">à faire</span>
      <span class="badge depose" style="margin:0">manquant</span>
    </span>
  </div>
  <ul id="deco" class="deco" aria-label="Décos"></ul>
  <footer class="lot" id="lot">
    <label class="refaire"><input type="checkbox" id="tout-refaire"> Tout refaire</label>
    <div class="resume" id="resume"></div>
    <div class="actions" id="actions">
      <button class="principal" id="generer">Générer</button>
    </div>
  </footer>
</div>

<!-- ÉCRAN GÉNÉRATION -->
<div id="ecran-generation" class="ecran" hidden>
  <div class="generation-corps">
    <div class="generation-inner">
      <strong class="generation-titre" id="gen-titre">Génération en cours…</strong>
      <div class="generation-globale">
        <div class="progression">
          <div class="progression-barre"><div id="gen-barre-globale"></div></div>
          <div class="progression-texte" id="gen-texte-globale">Préparation…</div>
        </div>
      </div>
      <ul class="generation-liste" id="gen-liste"></ul>
    </div>
  </div>
  <footer class="generation-footer">
    <span class="aide" id="gen-reste"></span>
    <span class="barre-flex"></span>
    <button class="secondaire" id="gen-annuler">Annuler</button>
  </footer>
</div>

<!-- ÉCRAN BILAN -->
<div id="ecran-bilan" class="ecran" hidden>
  <div class="bilan-corps">
    <div class="bilan-inner">
      <div class="bilan-titre-row">
        <strong class="bilan-titre" id="bilan-titre"></strong>
        <span id="bilan-badges"></span>
      </div>
      <div id="bilan-corriger" hidden class="bilan-section">
        <div class="section-titre">À corriger</div>
        <ul class="problemes" id="bilan-problemes"></ul>
      </div>
      <div class="bilan-section">
        <div class="section-titre">Produites</div>
        <ul class="bilan-produites" id="bilan-produites"></ul>
      </div>
    </div>
  </div>
  <footer class="bilan-footer">
    <button class="lien" id="ouvrir-sortie-bilan">Ouvrir le dossier de sortie</button>
    <span class="barre-flex"></span>
    <button class="principal" id="retour-liste">Retour à la liste</button>
  </footer>
</div>

<!-- TIROIR FICHE -->
<div class="tiroir-fond" id="tiroir-fond" hidden></div>
<aside class="tiroir" id="tiroir" hidden>
  <div class="tiroir-entete">
    <strong class="tiroir-titre" id="tiroir-titre"></strong>
    <button class="fermer" id="tiroir-fermer" aria-label="Fermer la fiche">✕</button>
  </div>
  <div class="tiroir-corps" id="tiroir-corps"></div>
</aside>

<!-- TIROIR OPTIONS -->
<div class="tiroir-fond" id="opt-fond" hidden></div>
<aside class="tiroir" id="opt-tiroir" hidden>
  <div class="tiroir-entete">
    <strong class="tiroir-titre">Options</strong>
    <button class="fermer" id="opt-fermer" aria-label="Fermer les options">✕</button>
  </div>
  <div class="tiroir-corps" id="opt-corps">
    <div class="opt-section">
      <div class="section-titre">Types de visuels</div>
      <div id="types"></div>
      <p class="aide" id="opt-types-resume"></p>
    </div>
    <div class="opt-section">
      <div class="section-titre">Rangement des images</div>
      <div class="bascule" role="radiogroup" aria-label="Rangement des images">
        <button role="radio" data-rangement="plat">Tout à plat</button>
        <button role="radio" data-rangement="decor">Un dossier par déco</button>
      </div>
    </div>
    <div class="opt-section">
      <div class="section-titre">Aperçu de la sortie</div>
      <div class="apercu" id="opt-apercu"></div>
    </div>
    <div class="opt-section">
      <div class="section-titre">Journaux</div>
      <button class="lien" id="ouvrir-logs">Ouvrir les logs</button>
    </div>
  </div>
</aside>

<!-- MESSAGES -->
<div class="messages" id="messages" role="status"></div>

<!-- MODALE AIDE -->
<div class="aide-fond" id="aide-fond" hidden></div>
<dialog class="aide-modale" id="aide-modale">
  <div class="aide-entete">
    <strong class="aide-titre">Fichiers requis</strong>
    <button class="fermer" id="aide-fermer" aria-label="Fermer l'aide">✕</button>
  </div>
  <div class="aide-corps">
    <section>
      <h2>Visuel source</h2>
      <p>Seuls les JPEG contenant <strong>« au 10ème »</strong> dans le nom sont reconnus comme visuels sources :</p>
      <pre class="aide-code">&lt;Déco&gt; &lt;largeur&gt;x&lt;hauteur&gt; au 10ème [GAUCHE|DROIT].jpg</pre>
      <p>Formats : <strong>100×210, 100×255, 125×210, 125×255, 150×210, 150×255</strong></p>
    </section>
    <section>
      <h2>Référence produit</h2>
      <p>La référence (<code>9xxxxxxx</code>) et la finition (<code>MAT</code> / <code>BRILLANT</code>) sont lues dans le nom de <em>n'importe quel fichier</em> du dossier (PDF, JPEG…) qui contient la bonne dimension.</p>
    </section>
    <section>
      <h2>Visuels sources requis par visuel</h2>
      <table class="aide-table">
        <thead><tr><th>Visuel</th><th>Visuel source nécessaire</th></tr></thead>
        <tbody>
          <tr><td><strong>A-01</strong> Douche</td><td>Format exact de la référence</td></tr>
          <tr><td><strong>A-02</strong> Deux panneaux</td><td>100×hauteur (+ GAUCHE/DROIT si diptyque)</td></tr>
          <tr><td><strong>P</strong> Panneau seul</td><td>Format exact de la référence</td></tr>
          <tr><td><strong>C</strong> Composition</td><td>150×255 (+ GAUCHE/DROIT si diptyque)</td></tr>
          <tr><td><strong>II-01</strong> Formats</td><td>Les 6 formats — × GAUCHE et DROIT si diptyque</td></tr>
          <tr><td><strong>II-02</strong> Profilés</td><td class="aide-statique">Statique — aucun visuel source requis</td></tr>
          <tr><td><strong>II-03</strong> Kit de pose</td><td class="aide-statique">Statique — aucun visuel source requis</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</dialog>

<!-- RÉGLAGES CLIENT -->
<div class="rc-fond" id="rc-fond" hidden></div>
<div class="rc-modale" id="rc-modale" role="dialog" aria-modal="true" aria-labelledby="rc-titre" hidden>
  <div class="rc-entete">
    <strong class="rc-titre" id="rc-titre">Réglages client</strong>
    <button class="fermer" id="rc-fermer" aria-label="Fermer">✕</button>
  </div>
  <div class="rc-alerte" id="rc-alerte" hidden>
    Aucune configuration trouvée — complétez les réglages pour activer l'analyse.
  </div>
  <div class="rc-corps">
    <nav class="rc-nav" id="rc-nav">
      <button data-onglet="refs" aria-selected="true">Références</button>
      <button data-onglet="finitions" aria-selected="false">Finitions</button>
      <button data-onglet="noms" aria-selected="false">Noms des images</button>
      <button data-onglet="gabarits" aria-selected="false">Gabarits</button>
      <button data-onglet="avance" aria-selected="false">Avancé</button>
    </nav>
    <div class="rc-contenu" id="rc-contenu"></div>
  </div>
  <div class="rc-pied">
    <button class="secondaire" id="rc-annuler">Annuler</button>
    <button class="principal" id="rc-enregistrer">Enregistrer</button>
  </div>
</div>

<!-- DÉPÔT OVERLAY -->
<div class="depot" id="depot" hidden>
  <strong class="depot-titre" id="depot-titre"></strong>
  <span class="aide" id="depot-aide"></span>
</div>

<script src="reglages-client.js"></script>
<script src="app.js"></script>
</body>
</html>
```

- [ ] **Vérifier syntaxe**

```powershell
node --check app/src/renderer/app.js 2>&1 | Select-Object -First 5
```
_(app.js n'existe pas encore : le check doit échouer proprement, pas avec une erreur HTML)_

- [ ] **Commit**

```bash
git add app/src/renderer/index.html
git commit -m "feat: index.html 4 écrans + surfaces redessinées"
```

---

## Task 3 — app.js (state, navigation, accueil, en-tête)

**Files:**
- Modify: `app/src/renderer/app.js`

- [ ] **Écrire la première partie de app.js** — remplacer intégralement `app/src/renderer/app.js` par le contenu ci-dessous (Tasks 3 à 7 décrivent le fichier complet en sections) :

```js
// Helpers
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const plural = (n, one, many = one + 's') => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

const TYPES = [
  ['A-01','Douche'],['A-02','Deux panneaux'],['P','Panneau seul'],['C','Composition'],
  ['II-01','Formats'],['II-02','Profilés'],['II-03','Kit de pose'],
];
const PX_PAR_CM = 0.95;
const GAMMES_KEY = 'vb-gammes-recentes';

// Motifs requis par type (format|cote, '' = sans cote)
const MOTIFS_PAR_TYPE = {
  'A-01': ['100x210|'], 'A-02': ['120x250|GAUCHE','120x250|DROIT'],
  'P':    ['100x210|'], 'C':    ['120x250|GAUCHE','120x250|DROIT'],
  'II-01':['100x210|','120x250|GAUCHE'], 'II-02':[], 'II-03':[],
};

window.addEventListener('error', e => api.log('error', `${e.message} (${e.filename}:${e.lineno})\n${e.error?.stack??''}`));
window.addEventListener('unhandledrejection', e => api.log('error', e.reason?.stack ?? String(e.reason)));

const state = {
  ecran: 'accueil',
  data: null,
  courant: null,
  coches: new Set(),
  filtre: 'tous',
  recherche: '',
  enCours: false,
  analyse: false,
  optionsOuvert: false,
  depot: null,
  bilan: null,
};

// --- Navigation ---
function afficherEcran(nom) {
  for (const id of ['ecran-accueil','ecran-liste','ecran-generation','ecran-bilan'])
    document.getElementById(id).hidden = (id !== 'ecran-' + nom);
  state.ecran = nom;
  $('#btn-options').hidden = (nom !== 'liste');
  $('#barre-gamme').hidden = (nom === 'accueil');
  $('#barre-sortie').hidden = (nom === 'accueil');
}

// --- Gammes récentes ---
function getGammesRecentes() {
  try { return JSON.parse(localStorage.getItem(GAMMES_KEY) || '[]'); } catch { return []; }
}
function sauvegarderGamme(gamme, outDir) {
  const lst = getGammesRecentes().filter(g => g.gamme !== gamme);
  lst.unshift({ gamme, outDir: outDir || '' });
  localStorage.setItem(GAMMES_KEY, JSON.stringify(lst.slice(0, 8)));
}

// --- Refresh ---
async function refresh() {
  state.analyse = true;
  if (state.ecran === 'liste') renderLot();
  try {
    state.data = await api.analyse();
    if (state.data?.needs === 'config') {
      state.analyse = false;
      if (state.data.settings?.gamme) renderBarre();
      window.ouvrirReglagesClient(true);
      if (state.ecran === 'liste') renderLot();
      return;
    }
  } catch (e) {
    message(`Analyse impossible : ${e.message}`, true);
  }
  state.analyse = false;
  const d = state.data;
  if (!d?.deco) { if (state.ecran !== 'accueil') renderAccueil(); return; }
  const noms = new Set(d.deco.map(x => x.dossier));
  for (const c of state.coches) if (!noms.has(c)) state.coches.delete(c);
  if (!noms.has(state.courant)) state.courant = null;
  sauvegarderGamme(d.settings.gamme, d.settings.outDir);
  renderBarre();
  if (state.ecran === 'liste') { renderListe(); renderFiche(); renderLot(); }
}

function message(text, erreur = false) {
  const el = document.createElement('div');
  el.className = `message${erreur ? ' erreur' : ''}`;
  el.textContent = text;
  $('#messages').append(el);
  setTimeout(() => el.remove(), erreur ? 9000 : 5000);
}

// --- En-tête ---
function renderBarre() {
  const s = state.data?.settings;
  if (!s) return;
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
  $('#chemin-gamme').textContent = court(s.gamme);
  $('#chemin-gamme').title = s.gamme ?? '';
  $('#chemin-sortie').textContent = court(s.outDir);
  $('#chemin-sortie').title = s.outDir ?? '';
}

// --- Écran Accueil ---
function renderAccueil() {
  afficherEcran('accueil');
  const gammes = getGammesRecentes();
  const s = state.data?.settings;
  const outDir = s?.outDir || '';
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
  $('#accueil-sortie-chemin').textContent = court(outDir);
  $('#accueil-sortie-chemin').title = outDir;

  $('#gammes-liste').innerHTML = gammes.map(g => `
    <li class="gamme-rangee" data-gamme="${esc(g.gamme)}">
      <span class="gamme-nom" title="${esc(g.gamme)}">${esc(g.gamme.split(/[\\/]/).pop())}</span>
      <span class="gamme-chemin" title="${esc(g.gamme)}">${esc(g.gamme)}</span>
      <span class="gamme-decos"></span>
      <span class="gamme-ouvrir">Ouvrir →</span>
    </li>`).join('') || '<li style="padding:20px 16px;color:var(--doux);font-size:var(--t-petit)">Aucune gamme récente.</li>';
}

$('#parcourir').addEventListener('click', async () => {
  if (await api.chooseFolder('gamme')) { await refresh(); if (state.data?.deco) afficherEcran('liste'); }
});

$('#gammes-liste').addEventListener('click', async e => {
  if (e.target.closest('.gamme-rangee')) {
    if (await api.chooseFolder('gamme')) { await refresh(); if (state.data?.deco) afficherEcran('liste'); }
  }
});

$('#retour-gammes').addEventListener('click', () => {
  closeTiroir(); fermerOptions(); renderAccueil();
});

document.addEventListener('click', async e => {
  const choisir = e.target.closest('[data-choisir]');
  if (choisir) {
    const kind = choisir.dataset.choisir;
    if (await api.chooseFolder(kind)) refresh();
  }
  const filtre = e.target.closest('[data-filtre]');
  if (filtre) { state.filtre = filtre.dataset.filtre; renderListe(); }
});
```

- [ ] **Vérifier syntaxe (partielle — le fichier est incomplet à ce stade)**

```powershell
node -e "require('fs').readFileSync('app/src/renderer/app.js','utf8')" 2>&1 | Select-Object -First 3
```

---

## Task 4 — app.js (suite) : Liste, Lot, Types

- [ ] **Ajouter à la suite de app.js** (append — ne pas écraser) :

```js
// --- Liste des décos ---
const incomplet = d => d.impossibles.length > 0 || d.problems.length > 0;

function renderListe() {
  for (const b of document.querySelectorAll('[data-filtre]'))
    b.setAttribute('aria-checked', b.dataset.filtre === state.filtre);
  const q = state.recherche.trim().toLowerCase();
  const visibles = state.data.deco.filter(d =>
    (!q || d.dossier.toLowerCase().includes(q)) &&
    (state.filtre === 'tous' ||
     (state.filtre === 'afaire' && d.stats.images > 0) ||
     (state.filtre === 'incomplets' && incomplet(d))));

  const actifs = new Set(state.data.settings?.types ?? TYPES.map(t => t[0]));
  // codes impossibles extraits des chaînes d.impossibles
  const codesImpossibles = d => {
    const out = new Set();
    for (const p of d.impossibles) for (const [code] of TYPES) if (p.includes(code)) out.add(code);
    return out;
  };

  $('#deco').innerHTML = visibles.map(d => {
    const bloque = !d.refs && !d.depot;
    const imp = codesImpossibles(d);
    // filet gauche
    const filet = bloque ? 'box-shadow:inset 3px 0 0 var(--rouge)'
      : imp.size ? 'box-shadow:inset 3px 0 0 var(--caramel)'
      : d.dossier === state.courant ? 'box-shadow:inset 3px 0 0 var(--bleu)' : '';

    // badges types par code
    const badgesTypes = bloque ? '' : [...actifs].map(code => {
      const cls = imp.has(code) ? 'depose' : (d.stats.images > 0 ? 'afaire' : 'ok');
      return `<span class="badge ${cls}">${esc(code)}</span>`;
    }).join('');

    // badges statut
    const badgesStatut = [];
    if (bloque) badgesStatut.push(`<span class="badge bloque">${d.refs ? 'référence invalide' : 'sans référence'}</span>`);
    else {
      if (d.stats.images > 0) badgesStatut.push(`<span class="badge afaire">${plural(d.stats.images,'image')} à faire</span>`);
      if (imp.size) badgesStatut.push(`<span class="badge depose">motif manquant</span>`);
      if (!d.stats.images && !imp.size && d.stats.upToDate) badgesStatut.push(`<span class="badge ok">à jour</span>`);
      if (!d.refs && !d.depot) badgesStatut.push(`<span class="badge ok">sans référence</span>`);
    }

    const coche = state.coches.has(d.dossier) && !bloque;
    return `<li class="rangee" data-dossier="${esc(d.dossier)}" aria-current="${d.dossier === state.courant}" style="${filet}">
      <input type="checkbox" aria-label="Générer ${esc(d.dossier)}" ${coche ? 'checked' : ''} ${bloque ? 'disabled' : ''}>
      <span class="nom" title="${esc(d.dossier)}">${esc(d.dossier)}</span>
      <span class="badges-types">${badgesTypes}</span>
      <span class="badges-statut">${badgesStatut.join('')}</span>
      <button class="detail-lien" data-detail aria-label="Voir la fiche de ${esc(d.dossier)}">Détail →</button>
    </li>`;
  }).join('') || '<li style="list-style:none;padding:32px 16px;color:var(--doux)">Aucune déco ne correspond.</li>';
}

$('#deco').addEventListener('click', e => {
  const li = e.target.closest('li[data-dossier]');
  if (!li) return;
  if (e.target.matches('input[type="checkbox"]')) {
    e.target.checked ? state.coches.add(li.dataset.dossier) : state.coches.delete(li.dataset.dossier);
    renderLot(); return;
  }
  if (e.target.matches('[data-detail]')) { openTiroir(li.dataset.dossier); return; }
});

$('#recherche').addEventListener('input', e => { state.recherche = e.target.value; renderListe(); });
$('#cocher-afaire').addEventListener('click', () => {
  for (const d of state.data?.deco ?? []) if (d.stats.images > 0) state.coches.add(d.dossier);
  renderListe(); renderLot();
});
$('#tout-decocher').addEventListener('click', () => { state.coches.clear(); renderListe(); renderLot(); });

// --- Types (lot) ---
function renderTypes() {
  const actifs = new Set(state.data?.settings?.types ?? TYPES.map(t => t[0]));
  $('#types').innerHTML = TYPES.map(([t, nom]) =>
    `<label class="types-label" title="${esc(nom)}"><input type="checkbox" value="${t}" ${actifs.has(t) ? 'checked' : ''}> ${t}</label>`).join('');
}
$('#types').addEventListener('change', async () => {
  const types = [...document.querySelectorAll('#types input:checked')].map(i => i.value);
  await api.setOption('types', types); refresh();
});
$('#tout-refaire').addEventListener('change', renderLot);

// --- Lot ---
function renderLot() {
  const resume = $('#resume');
  const bouton = $('#generer');
  if (state.enCours) return;
  const d = state.data;
  if (state.analyse) { resume.textContent = 'Analyse de la gamme…'; bouton.disabled = true; return; }
  if (!d?.deco) { resume.textContent = ''; bouton.disabled = true; return; }
  if (!d.settings.outDir) { resume.innerHTML = 'Choisissez un <strong>dossier de sortie</strong> pour générer.'; bouton.disabled = true; return; }
  if (d.lock) { resume.innerHTML = `Lot en cours dans ce dossier par <strong>${esc(d.lock.user)}</strong> (${esc(d.lock.host)})`; }
  const choisis = d.deco.filter(x => state.coches.has(x.dossier));
  const refaire = $('#tout-refaire').checked;
  const images = choisis.reduce((n, x) => n + x.stats.images + (refaire ? x.stats.upToDate : 0), 0);
  const impossibles = choisis.reduce((n, x) => n + x.stats.blocked, 0);
  if (!d.lock) {
    resume.innerHTML = !choisis.length ? 'Cochez les décos à générer'
      : `${plural(choisis.length,'déco')} : <strong>${plural(images,'image')} à produire</strong>`
        + (impossibles ? `, ${plural(impossibles,'impossible')}` : '')
        + (!images && !refaire ? ', tout est à jour' : '');
  }
  bouton.disabled = !images || !!d.lock;
}
```

---

## Task 5 — app.js (suite) : Génération + Bilan

- [ ] **Ajouter à la suite de app.js** :

```js
// --- Génération ---
async function lancer() {
  const dossiers = [...state.coches];
  state.enCours = true;
  afficherEcran('generation');
  $('#gen-titre').textContent = 'Génération en cours…';
  $('#gen-barre-globale').style.width = '0%';
  $('#gen-texte-globale').textContent = 'Préparation…';
  $('#gen-reste').textContent = '';
  $('#gen-annuler').disabled = false;

  // initialiser les lignes par déco
  const genItems = {};
  for (const dos of dossiers) genItems[dos] = { fait: 0, total: 0 };
  renderLignesGen(dossiers, genItems);

  $('#gen-annuler').addEventListener('click', () => {
    api.cancel();
    $('#gen-titre').textContent = 'Annulation…';
    $('#gen-reste').textContent = 'Les images déjà produites sont conservées.';
    $('#gen-annuler').disabled = true;
  }, { once: true });

  const result = await api.generate({ dossiers, force: $('#tout-refaire').checked });
  state.enCours = false;
  state.bilan = result;
  $('#tout-refaire').checked = false;

  if (result.error) {
    message(result.error, true);
    afficherEcran('liste'); renderListe(); renderLot();
  } else {
    afficherEcran('bilan'); renderBilan();
  }
  refresh();
}

function renderLignesGen(dossiers, items) {
  $('#gen-liste').innerHTML = dossiers.map(dos => {
    const it = items[dos] || { fait: 0, total: 0 };
    const pct = it.total ? Math.round(it.fait / it.total * 100) : 0;
    const texte = it.total ? `${it.fait} / ${it.total}` : (it.rien ? 'rien à faire' : '');
    return `<li class="gen-rangee" data-dossier="${esc(dos)}">
      <strong class="gen-nom">${esc(dos)}</strong>
      <span class="gen-barre-wrap"><div class="progression-barre"><div style="width:${pct}%"></div></div></span>
      <span class="gen-texte">${texte}</span>
      <span class="gen-alerte" id="gen-alerte-${esc(dos)}"></span>
    </li>`;
  }).join('');
}

$('#generer').addEventListener('click', lancer);

api.onProgress(e => {
  if (!state.enCours || state.ecran !== 'generation') return;
  const barre = $('#gen-barre-globale'), texte = $('#gen-texte-globale');
  if (!barre) return;
  if (e.type === 'begin') { texte.textContent = `${plural(e.images,'image')} à produire…`; return; }
  barre.style.width = `${(e.done / Math.max(1, e.total)) * 100}%`;
  if (e.type === 'start') {
    texte.textContent = `${e.done} / ${e.total} · ${e.task.dossier} ${e.task.type}`;
    const resteSec = Math.ceil((e.total - e.done) * 350 / 1000);
    $('#gen-reste').textContent = resteSec > 0 ? `environ ${plural(resteSec,'seconde restante')}` : '';
    // mise à jour ligne déco
    const li = document.querySelector(`[data-dossier="${CSS.escape(e.task.dossier)}"] .gen-barre-wrap .progression-barre div`);
    if (li) li.style.width = `${(e.done / Math.max(1,e.total))*100}%`;
  }
});

// --- Bilan ---
function renderBilan() {
  const r = state.bilan;
  if (!r) return;
  const ok = (r.done ?? 0) - (r.errors?.length ?? 0);
  $('#bilan-titre').textContent = plural(r.images ?? ok, 'image produite', 'images produites');

  // badges
  const badges = [];
  if (r.cancelled) badges.push(`<span class="badge afaire">lot annulé · ${plural((r.done??0) - ok,'non produite','non produites')}</span>`);
  if (r.errors?.length) badges.push(`<span class="badge depose">${plural(r.errors.length,'impossible')}</span>`);
  $('#bilan-badges').innerHTML = badges.join('');

  // à corriger
  const problemes = r.errors?.slice(0, 20).map(e =>
    `<li class="probleme"><strong>${esc(e.dossier)}</strong> · ${esc(e.ref)} ${esc(e.type)} : ${esc(e.error)}</li>`
  ) ?? [];
  if (problemes.length) {
    $('#bilan-corriger').hidden = false;
    $('#bilan-problemes').innerHTML = problemes.join('');
  } else {
    $('#bilan-corriger').hidden = true;
  }

  // produites — regrouper par dossier
  const par = {};
  for (const item of (r.produced ?? [])) {
    (par[item.dossier] = par[item.dossier] || []).push(item);
  }
  $('#bilan-produites').innerHTML = Object.keys(par).map(dos => {
    const items = par[dos];
    const vignettes = items.map(it =>
      `<span class="bilan-vignette">
        <img class="bilan-vignette-img" alt="${esc(it.type)}" data-src="${esc(it.path??'')}">
        <span class="bilan-vignette-code">${esc(it.type)}</span>
      </span>`).join('');
    return `<li class="bilan-produite-rangee">
      <strong class="bilan-produite-nom">${esc(dos)}</strong>
      <span class="bilan-vignettes">${vignettes}</span>
      <span class="bilan-produite-count">${plural(items.length,'image')}</span>
    </li>`;
  }).join('') || `<li style="list-style:none;padding:20px 16px;color:var(--doux)">
    ${r.cancelled ? 'Lot annulé avant toute production.' : 'Aucune image produite.'}</li>`;

  // charger vignettes
  for (const img of document.querySelectorAll('#bilan-produites img[data-src]')) {
    if (img.dataset.src) api.thumb(img.dataset.src, 128).then(src => { if (src) img.src = src; });
  }
}

$('#retour-liste').addEventListener('click', () => {
  if ($('#bilan-corriger') && !$('#bilan-corriger').hidden) state.filtre = 'incomplets';
  afficherEcran('liste'); renderListe(); renderLot();
});
$('#ouvrir-sortie-bilan').addEventListener('click', () => api.openOutput());
```

---

## Task 6 — app.js (suite) : Fiche déco + Options

- [ ] **Ajouter à la suite de app.js** :

```js
// --- Fiche déco ---
const courant = () => state.data?.deco?.find(d => d.dossier === state.courant);

function openTiroir(dossier) {
  state.courant = dossier;
  $('#tiroir-fond').hidden = false;
  $('#tiroir').hidden = false;
  renderListe();
  renderFiche();
}

function closeTiroir() {
  $('#tiroir-fond').hidden = true;
  $('#tiroir').hidden = true;
  state.courant = null;
  if (state.ecran === 'liste') renderListe();
}

$('#tiroir-fermer').addEventListener('click', closeTiroir);
$('#tiroir-fond').addEventListener('click', closeTiroir);

function renderFiche() {
  if (!state.courant) return;
  const d = courant();
  if (!d) { closeTiroir(); return; }
  const bloque = !d.refs && !d.depot;
  $('#tiroir-titre').textContent = d.dossier.toUpperCase();

  // statuts
  const statuts = [];
  if (bloque) statuts.push(`<span class="badge bloque" style="margin:0">${d.refs ? 'référence invalide' : 'sans référence'}</span>`);
  else {
    if (d.stats.images > 0) statuts.push(`<span class="badge afaire" style="margin:0">${plural(d.stats.images,'image')} à faire</span>`);
    if (d.stats.blocked > 0) statuts.push(`<span class="badge depose" style="margin:0">${plural(d.stats.blocked,'impossible')}</span>`);
    if (!d.stats.images && !d.stats.blocked && d.stats.upToDate) statuts.push(`<span class="badge ok" style="margin:0">à jour</span>`);
  }

  $('#tiroir-corps').innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">${statuts.join('')}</div>
    <h2>Références</h2>
    ${renderRefs(d)}
    <h2>Motifs au 10ème</h2>
    ${renderMotifs(d)}
    <h2>Visuels</h2>
    ${renderVisuels(d)}
    <div class="tiroir-pied" style="margin:28px -24px -32px;padding:14px 20px;border-top:1px solid var(--trait);display:flex;align-items:center;gap:16px">
      <span class="aide" style="flex:1">${esc(resumerFiche(d))}</span>
      <button class="principal" id="fiche-generer" ${bloque ? 'disabled' : ''}>Générer cette déco</button>
    </div>`;

  for (const img of $('#tiroir-corps').querySelectorAll('img[data-motif]'))
    api.thumb(img.dataset.motif, Number(img.dataset.h)||300).then(src => { if (src) img.src = src; });

  bindFiche(d);
}

function renderRefs(d) {
  const sansRef = !d.refs && !d.depot;
  const rows = d.formats.map(f =>
    f.refs.map(r =>
      `<span class="ref ${r.origine}" title="${r.origine === 'saisie' ? 'Saisie dans l\'application' : 'Lue dans les noms de fichiers'}">
        ${esc(r.ref)} <small>${esc(r.finition ? r.finition.toLowerCase() : 'sans finition')}</small>
        ${r.origine === 'saisie' ? `<button data-retirer-ref="${esc(r.ref)}" data-key="${esc(f.key)}" aria-label="Retirer ${esc(r.ref)}">×</button>` : ''}
      </span>`).join('')).flat();
  const uniqueRefs = [...new Map(d.formats.flatMap(f => f.refs).map(r => [r.ref, r])).values()];
  const puces = uniqueRefs.map(r =>
    `<span class="ref ${r.origine}">
      ${esc(r.ref)} <small>${esc(r.finition ? r.finition.toLowerCase() : 'sans finition')}</small>
      ${r.origine === 'saisie' ? `<button data-retirer-ref-global="${esc(r.ref)}" aria-label="Retirer ${esc(r.ref)}">×</button>` : ''}
    </span>`).join('');

  return `<div class="refs">
    ${puces || (sansRef ? `<span style="color:var(--rouge);font-weight:700;font-size:var(--t-petit)">${d.refs ? 'référence invalide' : 'sans référence'}</span>` : '')}
    <span class="ajout-ref">
      <input inputmode="numeric" maxlength="8" placeholder="9xxxxxxx" aria-label="Nouvelle référence">
      <select aria-label="Finition"><option value="MAT">mat</option><option value="BRILLANT">brillant</option><option value="">sans</option></select>
      <button class="secondaire" data-ajouter-ref>+ Ajouter</button>
    </span>
  </div>
  <p class="aide legende-refs">Les références en bleu sont saisies ici ; les autres sont lues dans les noms de fichiers du dossier.</p>`;
}

function renderMotifs(d) {
  const rows = d.formats.map(f => {
    const nomAttendu = `${d.dossier} ${f.format.replace('x',' × ')}${f.cote ? ' ' + f.cote : ''} au 10ème.jpg`;
    const statut = f.motif
      ? `<span class="motif-ok">présent</span>`
      : `<span style="display:grid;gap:2px;justify-items:end"><span class="motif-absent">manquant</span><button class="lien" data-deposer="${esc(f.key)}" style="font-size:var(--t-petit)">Déposer le motif…</button></span>`;
    return `<tr data-key="${esc(f.key)}">
      <td class="format">${esc(f.format.replace('x',' × '))}${f.cote ? ' ' + esc(f.cote.toLowerCase()) : ''}</td>
      <td style="font-family:monospace;font-size:var(--t-petit);color:var(--doux)">${esc(nomAttendu)}</td>
      <td style="text-align:right">${statut}</td>
    </tr>`;
  }).join('');
  return `<table><thead><tr><th>Format</th><th>Fichier attendu</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderVisuels(d) {
  const actifs = state.data?.settings?.types ?? TYPES.map(t => t[0]);
  const bloque = !d.refs && !d.depot;
  const impCodes = new Set();
  for (const p of d.impossibles) for (const [code] of TYPES) if (p.includes(code)) impCodes.add(code);

  const tuiles = actifs.map(code => {
    let tuileHtml, labelCls, labelTxt;
    if (bloque) {
      tuileHtml = `<div class="visuel-afaire" style="border-color:var(--rouge);opacity:.4"></div>`;
      labelCls = 'bloque'; labelTxt = 'bloqué';
    } else if (impCodes.has(code)) {
      tuileHtml = `<div class="visuel-manquant"></div>`;
      labelCls = 'manquant'; labelTxt = 'motif manquant';
    } else {
      tuileHtml = `<div class="visuel-afaire"></div>`;
      labelCls = 'afaire'; labelTxt = 'à faire';
    }
    return `<div class="visuel-tuile">
      ${tuileHtml}
      <span class="visuel-legende"><strong>${esc(code)}</strong> <span class="${labelCls}">${labelTxt}</span></span>
    </div>`;
  });
  return `<div class="visuels-grille">${tuiles.join('')}</div>`;
}

function resumerFiche(d) {
  const actifs = state.data?.settings?.types ?? TYPES.map(t => t[0]);
  const bloque = !d.refs && !d.depot;
  if (bloque) return 'Déco bloquée — référence manquante ou invalide.';
  const images = d.stats.images, imp = d.stats.blocked;
  if (!images && !imp) return 'Toutes les images sont à jour.';
  return [images ? plural(images,'image') + ' à produire' : '', imp ? plural(imp,'impossible') : ''].filter(Boolean).join(' · ');
}

function bindFiche(d) {
  // Retirer ref globale
  $('#tiroir-corps').addEventListener('click', async e => {
    const retirerG = e.target.closest('[data-retirer-ref-global]');
    if (retirerG) {
      const ref = retirerG.dataset.retirerRefGlobal;
      for (const f of d.formats) {
        const saisies = f.refs.filter(r => r.origine === 'saisie' && r.ref !== ref).map(({ref,finition}) => ({ref,finition}));
        if (f.refs.some(r => r.ref === ref && r.origine === 'saisie'))
          await api.setRefs(d.chemin, f.key, saisies);
      }
      return refresh();
    }
    // Ajouter ref
    if (e.target.matches('[data-ajouter-ref]')) {
      const input = $('#tiroir-corps').querySelector('.ajout-ref input');
      const sel = $('#tiroir-corps').querySelector('.ajout-ref select');
      const ref = input.value.trim();
      const regex = state.data?.settings?.refPattern || '9\\d{7}';
      try { if (!new RegExp('^(?:' + regex + ')$').test(ref)) { message('Référence invalide selon le pattern configuré.', true); return; } }
      catch { message('Pattern de référence invalide.', true); return; }
      const finition = sel.value;
      for (const f of d.formats) {
        const saisies = f.refs.filter(r => r.origine === 'saisie').map(({ref:r,finition:fin}) => ({ref:r,finition:fin}));
        if (!saisies.find(s => s.ref === ref)) await api.setRefs(d.chemin, f.key, [...saisies, {ref, finition}]);
      }
      message(`Référence ${ref} ajoutée.`); refresh(); return;
    }
    // Déposer motif
    const deposer = e.target.closest('[data-deposer]');
    if (deposer) { message('Glissez le fichier motif sur la fenêtre pour le déposer.'); return; }
    // Générer cette déco
    if (e.target.matches('#fiche-generer')) {
      state.coches.clear(); state.coches.add(d.dossier);
      closeTiroir(); lancer(); return;
    }
  });
}

// --- Options tiroir ---
function ouvrirOptions() {
  state.optionsOuvert = true;
  $('#opt-fond').hidden = false;
  $('#opt-tiroir').hidden = false;
  renderOptions();
}
function fermerOptions() {
  state.optionsOuvert = false;
  $('#opt-fond').hidden = true;
  $('#opt-tiroir').hidden = true;
}
function renderOptions() {
  if (!state.data?.settings) return;
  renderTypes();
  for (const b of document.querySelectorAll('[data-rangement]'))
    b.setAttribute('aria-checked', b.dataset.rangement === state.data.settings.rangement);
  // résumé types
  const actifs = state.data.settings.types ?? TYPES.map(t => t[0]);
  $('#opt-types-resume').textContent = actifs.length === TYPES.length
    ? `${actifs.length} types actifs — tous`
    : `${actifs.length} / ${TYPES.length} types actifs`;
  // aperçu sortie
  const outDir = state.data.settings.outDir || '…';
  const rang = state.data.settings.rangement;
  const ligne = rang === 'decor' ? `${outDir}\n  DÉCO\n    REF_TYPE.jpg` : `${outDir}\n  REF_TYPE.jpg`;
  $('#opt-apercu').textContent = ligne;
}

$('#btn-options').addEventListener('click', e => { e.stopPropagation(); state.optionsOuvert ? fermerOptions() : ouvrirOptions(); });
$('#opt-fermer').addEventListener('click', fermerOptions);
$('#opt-fond').addEventListener('click', fermerOptions);

$('#opt-corps').addEventListener('click', async e => {
  e.stopPropagation();
  const rangement = e.target.closest('[data-rangement]');
  if (rangement) { await api.setOption('rangement', rangement.dataset.rangement); refresh(); renderOptions(); }
  if (e.target.closest('#ouvrir-logs')) api.openLogs();
});
```

---

## Task 7 — app.js (suite) : Dépôt, Aide, Init

- [ ] **Ajouter à la suite de app.js** :

```js
// --- Dépôt de fichiers ---
let dragCpt = 0;

function cibleDepot() {
  if (state.ecran === 'accueil') return { titre: 'Déposez le dossier GAMME', aide: 'La gamme s'ouvre avec sa sortie mémorisée.' };
  if (state.courant) {
    const d = courant();
    const manquants = d?.formats.filter(f => !f.motif) ?? [];
    if (manquants.length) return { titre: 'Déposez le motif au 10ème', aide: manquants.map(f => `${f.format.replace('x',' × ')}${f.cote ? ' ' + f.cote : ''}`).join(', ') };
  }
  return { titre: 'Dépôt impossible ici', aide: 'Ouvrez la fiche d'une déco dont un motif manque.' };
}

document.addEventListener('dragenter', e => {
  if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
  e.preventDefault(); dragCpt++;
  const c = cibleDepot();
  $('#depot-titre').textContent = c.titre;
  $('#depot-aide').textContent = c.aide;
  $('#depot').hidden = false;
});
document.addEventListener('dragover', e => { if (!$('#depot').hidden) e.preventDefault(); });
document.addEventListener('dragleave', () => { if (--dragCpt <= 0) { dragCpt = 0; $('#depot').hidden = true; } });
document.addEventListener('drop', async e => {
  e.preventDefault(); dragCpt = 0; $('#depot').hidden = true;
  if (!e.dataTransfer.files.length) return;
  const msgs = await api.drop(e.dataTransfer.files);
  for (const m of msgs) message(m);
  await refresh();
  if (state.data?.deco) afficherEcran('liste');
  const nouveau = state.data?.deco?.find(d => d.depot && msgs.some(m => m.startsWith(`${d.dossier} ajouté`)));
  if (nouveau) openTiroir(nouveau.dossier);
});

// --- Aide ---
$('#btn-aide').addEventListener('click', () => { $('#aide-fond').hidden = false; $('#aide-modale').setAttribute('open',''); });
$('#aide-fermer').addEventListener('click', fermerAide);
$('#aide-fond').addEventListener('click', fermerAide);
function fermerAide() { $('#aide-fond').hidden = true; $('#aide-modale').removeAttribute('open'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#tiroir').hidden) { closeTiroir(); return; }
    if (!$('#opt-tiroir').hidden) { fermerOptions(); return; }
    if ($('#aide-modale').hasAttribute('open')) { fermerAide(); return; }
  }
});

// --- Init ---
async function init() {
  renderAccueil();
  await refresh();
  if (state.data?.deco) { afficherEcran('liste'); renderListe(); renderLot(); }
}

init();
window.addEventListener('rc:saved', () => refresh());
```

- [ ] **Vérifier syntaxe app.js**

```powershell
node --check app/src/renderer/app.js
```

Expected : aucune sortie (pas d'erreur).

- [ ] **Commit**

```bash
git add app/src/renderer/app.js
git commit -m "feat: app.js — 4 écrans, fiche redessinée, options tiroir"
```

---

## Task 8 — reglages-client.js (5 onglets)

**Files:**
- Modify: `app/src/renderer/reglages-client.js`

- [ ] **Réécrire reglages-client.js** — remplacer intégralement par :

```js
const $ = sel => document.querySelector(sel);

let catalogueMode = 'auto';
let ongletActif = 'refs';
let snapConfig = null;

// --- Onglets ---
function afficherOnglet(nom) {
  ongletActif = nom;
  for (const btn of document.querySelectorAll('#rc-nav button'))
    btn.setAttribute('aria-selected', btn.dataset.onglet === nom);
  renderContenu();
}

function renderContenu() {
  const el = $('#rc-contenu');
  if (!el) return;
  if (ongletActif === 'refs')      el.innerHTML = htmlRefs();
  if (ongletActif === 'finitions') el.innerHTML = htmlFinitions();
  if (ongletActif === 'noms')      el.innerHTML = htmlNoms();
  if (ongletActif === 'gabarits')  el.innerHTML = htmlGabarits();
  if (ongletActif === 'avance')    el.innerHTML = htmlAvance();
  bindOnglet();
}

// ---- Onglet Références ----
function htmlRefs() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Format des références</div>
    <div class="rc-champ">
      <label for="rc-ref-pattern">Motif (expression régulière)</label>
      <input type="text" id="rc-ref-pattern" class="mono">
      <p class="aide">Une référence compte 8 chiffres et commence par 9.</p>
    </div>
    <div class="rc-testeur">
      <label for="rc-ref-test">Tester avec un nom de fichier</label>
      <input type="text" id="rc-ref-test" placeholder="Tropical 91234567 MAT.jpg">
      <div class="rc-testeur-res" id="rc-ref-res"></div>
    </div>
  </div>
  <div class="rc-section" id="rc-sans-ref-section">
    <div class="rc-section-titre">Décos sans référence</div>
    <div id="rc-sans-ref-liste"><p class="aide">Toutes les décos ont une référence.</p></div>
  </div>`;
}

// ---- Onglet Finitions ----
function htmlFinitions() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Finitions</div>
    <div class="rc-tags" id="rc-finitions-tags"></div>
    <p class="aide">Telles qu'écrites dans les noms de fichiers (insensible à la casse).</p>
  </div>`;
}

// ---- Onglet Noms des images ----
function htmlNoms() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Noms des images</div>
    <div class="rc-champ">
      <label for="rc-nom-pattern">Modèle</label>
      <input type="text" id="rc-nom-pattern" class="mono">
      <p class="aide">Variables : <code>{ref}</code> <code>{type}</code> <code>{deco}</code> <code>{finition}</code></p>
    </div>
    <div class="rc-testeur">
      <label>Exemple</label>
      <span id="rc-nom-exemple" style="font-family:monospace;font-size:var(--t-petit)"></span>
    </div>
  </div>`;
}

// ---- Onglet Gabarits ----
function htmlGabarits() {
  const { TYPES } = window.__appTypes || {};
  const types = TYPES || [['A-01','Douche'],['A-02','Deux panneaux'],['P','Panneau seul'],['C','Composition'],['II-01','Formats'],['II-02','Profilés'],['II-03','Kit de pose']];
  const rows = types.map(([code, nom]) =>
    `<tr><td class="format">${code}</td><td>${nom}</td><td><span class="rc-puce ok"></span> présent</td></tr>`).join('');
  return `<div class="rc-section">
    <div class="rc-section-titre">Gabarits de rendu</div>
    <table><tbody>${rows}</tbody></table>
  </div>`;
}

// ---- Onglet Avancé ----
function htmlAvance() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Identité</div>
    <div class="rc-champ"><label for="rc-client">Nom du client</label><input type="text" id="rc-client"></div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Catalogue décors</div>
    <div class="rc-champ">
      <label>Source du catalogue</label>
      <div class="rc-bascule" role="radiogroup" id="rc-cat-bascule">
        <button role="radio" data-mode="auto">Auto</button>
        <button role="radio" data-mode="perso">Fichier personnalisé</button>
      </div>
      <div class="rc-cat-statut" id="rc-cat-auto-statut">
        <span class="rc-puce ok" id="rc-cat-puce"></span>
        <span id="rc-cat-label"></span>
      </div>
      <div id="rc-cat-perso-wrap" hidden>
        <div class="rc-cat-perso">
          <input type="text" id="rc-cat-chemin" placeholder="Chemin vers le fichier CSV…">
          <button class="secondaire" id="rc-cat-parcourir">Parcourir…</button>
        </div>
      </div>
    </div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Reconnaissance des fichiers</div>
    <div class="rc-champ">
      <label for="rc-motif-pattern">Pattern — Motif source</label>
      <input type="text" id="rc-motif-pattern" class="mono">
      <p class="aide">Identifie un fichier image comme visuel source. Ex : <code>au\\s*10\\s*[èée]m</code></p>
    </div>
    <div class="rc-testeur">
      <label for="rc-motif-test">Tester avec un nom de fichier</label>
      <input type="text" id="rc-motif-test" placeholder="BLANC 100x210 au 10ème.jpg">
      <div class="rc-testeur-res" id="rc-motif-res"></div>
    </div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Génération</div>
    <div class="rc-grille2">
      <div class="rc-champ"><label for="rc-output">Dossier WEB (source des unis)</label><input type="text" id="rc-output"><p class="aide">Nom du sous-dossier contenant les PSD.</p></div>
      <div class="rc-champ"><label for="rc-prefix">Préfixe couleurs unies</label><input type="text" id="rc-prefix"><p class="aide">Affiché sous forme « ULM 620 ».</p></div>
    </div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Formats produit</div>
    <div class="rc-tags" id="rc-formats-tags"></div>
    <p class="aide">Format « largeurxhauteur » en cm. Ex : 100x210</p>
  </div>`;
}

// --- Chargement config dans les onglets ---
let currentConfig = {};

function remplirOnglet() {
  const c = currentConfig;
  if (ongletActif === 'refs') {
    if ($('#rc-ref-pattern')) $('#rc-ref-pattern').value = c.refPattern ?? '9\\d{7}';
    testerRef();
    renderSansRef();
  }
  if (ongletActif === 'finitions') {
    if ($('#rc-finitions-tags')) renderTags('finitions', c.finitions ?? []);
  }
  if (ongletActif === 'noms') {
    if ($('#rc-nom-pattern')) { $('#rc-nom-pattern').value = c.nomPattern ?? '{ref}_{type}.jpg'; majExempleNom(); }
  }
  if (ongletActif === 'avance') {
    if ($('#rc-client')) $('#rc-client').value = c.client ?? '';
    if ($('#rc-motif-pattern')) $('#rc-motif-pattern').value = c.motifPattern ?? '';
    if ($('#rc-output')) $('#rc-output').value = c.outputFolder ?? '';
    if ($('#rc-prefix')) $('#rc-prefix').value = c.uniPrefix ?? '';
    setCatalogueMode(c.catalogue ? 'perso' : 'auto');
    if (c.catalogue && $('#rc-cat-chemin')) $('#rc-cat-chemin').value = c.catalogue;
    if ($('#rc-formats-tags')) renderTags('formats', c.formats ?? []);
    testerMotif();
  }
}

function renderSansRef() {
  const el = $('#rc-sans-ref-liste');
  if (!el) return;
  el.innerHTML = '<p class="aide">Toutes les décos ont une référence.</p>';
}

function majExempleNom() {
  const pat = $('#rc-nom-pattern')?.value ?? '{ref}_{type}.jpg';
  const ex = pat.replace('{ref}','91234567').replace('{type}','A-01').replace('{deco}','Tropical').replace('{finition}','MAT');
  if ($('#rc-nom-exemple')) $('#rc-nom-exemple').textContent = ex;
}

function bindOnglet() {
  remplirOnglet();
  if ($('#rc-ref-pattern')) { $('#rc-ref-pattern').addEventListener('input', testerRef); }
  if ($('#rc-ref-test')) { $('#rc-ref-test').addEventListener('input', testerRef); }
  if ($('#rc-motif-pattern')) { $('#rc-motif-pattern').addEventListener('input', testerMotif); }
  if ($('#rc-motif-test')) { $('#rc-motif-test').addEventListener('input', testerMotif); }
  if ($('#rc-nom-pattern')) { $('#rc-nom-pattern').addEventListener('input', majExempleNom); }
  if ($('#rc-cat-bascule')) {
    $('#rc-cat-bascule').addEventListener('click', e => {
      const btn = e.target.closest('[data-mode]');
      if (btn) setCatalogueMode(btn.dataset.mode);
    });
  }
  if ($('#rc-cat-parcourir')) {
    $('#rc-cat-parcourir').addEventListener('click', async () => {
      const p = await api.browseCatalogue();
      if (p && $('#rc-cat-chemin')) $('#rc-cat-chemin').value = p;
    });
  }
  document.querySelectorAll('#rc-contenu [data-suppr]').forEach(() => {}); // géré par délégation globale
}

// --- Testeurs ---
function testerRef() {
  const pattern = $('#rc-ref-pattern')?.value ?? '';
  const texte = $('#rc-ref-test')?.value ?? '';
  const el = $('#rc-ref-res');
  if (!el) return;
  if (!texte) { el.textContent = ''; el.className = 'rc-testeur-res'; return; }
  try {
    const m = texte.match(new RegExp(`\\b(${pattern})\\b`));
    el.className = `rc-testeur-res ${m ? 'ok' : 'err'}`;
    el.textContent = m ? `✓ Référence trouvée : ${m[1]}` : '✗ Aucune référence trouvée';
  } catch { el.className = 'rc-testeur-res err'; el.textContent = '✗ Pattern invalide'; }
}

function testerMotif() {
  const pattern = $('#rc-motif-pattern')?.value ?? '';
  const texte = $('#rc-motif-test')?.value ?? '';
  const el = $('#rc-motif-res');
  if (!el) return;
  if (!texte) { el.textContent = ''; el.className = 'rc-testeur-res'; return; }
  try {
    const re = new RegExp(pattern, 'i');
    const estJpeg = /\.jpe?g$/i.test(texte);
    const match = re.test(texte);
    el.className = `rc-testeur-res ${match && estJpeg ? 'ok' : 'err'}`;
    el.textContent = match && estJpeg ? '✓ Reconnu comme motif source'
      : match ? '✗ Pattern trouvé mais fichier non JPEG'
      : '✗ Non reconnu comme motif source';
  } catch { el.className = 'rc-testeur-res err'; el.textContent = '✗ Pattern invalide'; }
}

// --- Tags ---
function renderTags(type, values) {
  const container = $(`#rc-${type}-tags`);
  if (!container) return;
  const inputId = `rc-${type}-input`;
  container.innerHTML = values.map(v =>
    `<span class="rc-tag">${esc(v)} <button data-suppr="${esc(v)}" data-type="${type}" aria-label="Supprimer ${esc(v)}">✕</button></span>`
  ).join('') +
  `<div class="rc-tag-ajout"><input id="${inputId}" type="text" placeholder="${type==='formats'?'125x300':'SATINÉ'}"><button data-ajouter="${type}">+ Ajouter</button></div>`;
}

function getTagValues(type) {
  return [...document.querySelectorAll(`#rc-${type}-tags .rc-tag`)].map(el => el.childNodes[0].textContent.trim());
}

// --- Mode catalogue ---
function setCatalogueMode(mode) {
  catalogueMode = mode;
  for (const btn of document.querySelectorAll('#rc-cat-bascule button'))
    btn.setAttribute('aria-checked', btn.dataset.mode === mode);
  const auto = $('#rc-cat-auto-statut'), perso = $('#rc-cat-perso-wrap');
  if (auto) auto.hidden = mode !== 'auto';
  if (perso) perso.hidden = mode !== 'perso';
}

function majStatutCatalogue(status, autoName) {
  const puce = $('#rc-cat-puce'), label = $('#rc-cat-label');
  if (!puce || !label) return;
  if (status === 'auto') {
    puce.className = 'rc-puce ok';
    label.innerHTML = `<code style="font-family:monospace;font-size:11px;background:var(--fond);padding:1px 5px">${esc(autoName)}</code> trouvé dans le dossier GAMME`;
  } else if (status === 'fallback') {
    puce.className = 'rc-puce fallback';
    label.textContent = `${autoName} absent — fallback sur le catalogue intégré`;
  } else {
    puce.className = 'rc-puce ok';
    label.textContent = 'Fichier personnalisé utilisé';
  }
}

// --- Ouvrir / Fermer ---
function ouvrirPanel(premierLancement = false) {
  $('#rc-alerte').hidden = !premierLancement;
  $('#rc-annuler').textContent = premierLancement ? 'Continuer avec les valeurs par défaut' : 'Annuler';
  $('#rc-fond').hidden = false;
  $('#rc-modale').hidden = false;
  chargerConfig();
}

function fermerPanel() {
  $('#rc-fond').hidden = true;
  $('#rc-modale').hidden = true;
}

async function chargerConfig() {
  const { config, catalogueStatus, autoName } = await api.loadClientConfig();
  currentConfig = { ...config };
  snapConfig = { ...config };
  afficherOnglet(ongletActif || 'refs');
  if (ongletActif === 'avance') majStatutCatalogue(catalogueStatus, autoName);
}

// --- Lire config depuis DOM ---
function lireConfig() {
  return {
    client: $('#rc-client')?.value.trim() ?? currentConfig.client,
    catalogue: catalogueMode === 'perso' ? (($('#rc-cat-chemin')?.value || '').trim()) : '',
    refPattern: $('#rc-ref-pattern')?.value.trim() ?? currentConfig.refPattern,
    motifPattern: $('#rc-motif-pattern')?.value.trim() ?? currentConfig.motifPattern,
    outputFolder: $('#rc-output')?.value ?? currentConfig.outputFolder,
    uniPrefix: $('#rc-prefix')?.value.trim() ?? currentConfig.uniPrefix,
    nomPattern: $('#rc-nom-pattern')?.value ?? currentConfig.nomPattern,
    formats: $('#rc-formats-tags') ? getTagValues('formats') : currentConfig.formats,
    finitions: $('#rc-finitions-tags') ? getTagValues('finitions') : currentConfig.finitions,
  };
}

async function enregistrer() {
  // fusionner les valeurs DOM avec currentConfig (onglets non visités gardent leurs valeurs)
  const config = { ...currentConfig, ...lireConfig() };
  try {
    await api.saveClientConfig(config);
    fermerPanel();
    window.dispatchEvent(new Event('rc:saved'));
  } catch (e) {
    alert(`Erreur lors de l'enregistrement : ${e.message}`);
  }
}

// --- Listeners ---
$('#btn-reglages-client').addEventListener('click', () => ouvrirPanel(false));
$('#rc-fermer').addEventListener('click', fermerPanel);
$('#rc-annuler').addEventListener('click', fermerPanel);
$('#rc-enregistrer').addEventListener('click', enregistrer);
$('#rc-fond').addEventListener('click', fermerPanel);

$('#rc-nav').addEventListener('click', e => {
  const btn = e.target.closest('[data-onglet]');
  if (btn) { currentConfig = { ...currentConfig, ...lireConfig() }; afficherOnglet(btn.dataset.onglet); }
});

// Délégation tags (suppr + ajouter)
document.addEventListener('click', e => {
  const suppr = e.target.closest('[data-suppr]');
  if (suppr && suppr.closest('#rc-contenu')) { suppr.closest('.rc-tag').remove(); return; }
  const ajouter = e.target.closest('[data-ajouter]');
  if (ajouter && ajouter.closest('#rc-contenu')) {
    const type = ajouter.dataset.ajouter;
    const input = $(`#rc-${type}-input`);
    const val = input?.value.trim();
    if (!val) return;
    const container = $(`#rc-${type}-tags`);
    const ajoutEl = container?.querySelector('.rc-tag-ajout');
    if (!container || !ajoutEl) return;
    const tag = document.createElement('span');
    tag.className = 'rc-tag';
    tag.innerHTML = `${esc(val)} <button data-suppr="${esc(val)}" data-type="${type}" aria-label="Supprimer ${esc(val)}">✕</button>`;
    container.insertBefore(tag, ajoutEl);
    if (input) { input.value = ''; input.focus(); }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = e.target.closest('[id$="-input"]');
    if (input && input.closest('#rc-contenu')) input.nextElementSibling?.click();
  }
});

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

window.ouvrirReglagesClient = ouvrirPanel;
```

- [ ] **Vérifier syntaxe reglages-client.js**

```powershell
node --check app/src/renderer/reglages-client.js
```

Expected : aucune sortie.

- [ ] **Vérifier syntaxe app.js (final)**

```powershell
node --check app/src/renderer/app.js
```

Expected : aucune sortie.

- [ ] **Lancer l'app et vérifier visuellement**

```powershell
cd app && npm start
```

Vérifications :
1. L'en-tête est anthracite avec filet orange en bas
2. « LM » est en orange, « VisuBatch » en blanc
3. L'écran Accueil s'affiche (liste vide ou gammes récentes)
4. Clic « Parcourir… » ouvre le dialogue de dossier
5. Après sélection d'une gamme, l'écran Liste s'affiche
6. Boutons principaux (Générer) sont en orange
7. Clic « ⚙ Réglages client » ouvre la modale avec 5 onglets

- [ ] **Commit final**

```bash
git add app/src/renderer/reglages-client.js
git commit -m "feat: reglages-client.js — 5 onglets (Références, Finitions, Noms, Gabarits, Avancé)"
```

---

## Self-Review

**Spec coverage :**
- ✅ Design tokens anthracite/orange — Task 1
- ✅ IBM Plex Sans — Task 1
- ✅ Rayons 0 partout (sauf btn-aide) — Task 1
- ✅ En-tête anthracite + filet orange + marque — Task 1 + Task 2
- ✅ 4 écrans HTML — Task 2
- ✅ Gammes récentes localStorage — Task 3
- ✅ Navigation entre écrans — Task 3
- ✅ Écran Liste avec filet coloré + badges types — Task 4
- ✅ Écran Génération — Task 5
- ✅ Écran Bilan — Task 5
- ✅ Fiche redessinée (visuels grille 4 col) — Task 6
- ✅ Options tiroir — Task 6
- ✅ Dépôt contextuel — Task 7
- ✅ Réglages client 5 onglets — Task 8
- ✅ Sections existantes conservées dans onglet Avancé — Task 8
- ✅ CSP inchangée — Task 2

**Points d'attention à l'exécution :**

1. `esc` est défini dans reglages-client.js (chargé en premier) ET dans app.js — supprimer la définition dans reglages-client.js ou dans app.js pour éviter le doublon. Garder dans reglages-client.js (chargé en premier) et retirer de app.js la ligne `const esc = ...` puisqu'elle sera globale.

2. Le bilan utilise `r.produced` (tableau `{dossier, type, path}`) — si l'API retourne un format différent pour les images produites, adapter `renderBilan()` à la structure réelle. Vérifier la shape de l'objet `result` retourné par `api.generate()` en consultant `app/src/core/`.

3. `renderLignesGen()` initialise les barres à 0% — les mises à jour via `onProgress` sont partielles (uniquement globale). Pour les barres par déco, l'event `onProgress` ne contient que `e.task.dossier` et `e.done/total` globaux. Les barres individuelles resteront à 0% ; à améliorer si `onProgress` émet des événements par déco.
