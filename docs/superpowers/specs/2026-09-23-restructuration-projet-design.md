# Restructuration du projet LM VisuBatch

**Date :** 2026-09-23  
**Périmètre :** `app/` — sources seulement, `resources/` et `test/` inchangés

---

## Contexte

La structure actuelle place les sources directement sous `app/` sans séparation entre code et configuration/assets, et utilise des noms de dossiers (`electron/`, `ui/`) qui ne correspondent pas aux conventions Electron standard. `core/` concentre 11 fichiers à plat sans regroupement par responsabilité.

Objectif : structure claire, nommage standard Electron, `core/` navigable.

---

## Structure cible

```
app/
├── src/
│   ├── main/            ← renommage de electron/
│   │   ├── main.js
│   │   └── preload.js
│   ├── renderer/        ← renommage de ui/
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   ├── core/
│   │   ├── batch/       ← plan.js · runner.js · execute.js · worker.js
│   │   ├── render/      ← render.js · extract-motif.js · renderers.js (remonté de core/)
│   │   ├── utils/       ← csv.js · lock.js · manifest.js
│   │   ├── context.js
│   │   ├── inventaire.js
│   │   └── index.js
│   └── cli/
│       ├── generate.js
│       └── inventaire.js
├── resources/           ← inchangé
├── test/                ← inchangé
├── package.json
└── LISEZMOI.md
```

---

## Déplacements de fichiers (20 fichiers)

| Ancienne position | Nouvelle position |
|---|---|
| `electron/main.js` | `src/main/main.js` |
| `electron/preload.js` | `src/main/preload.js` |
| `ui/index.html` | `src/renderer/index.html` |
| `ui/app.js` | `src/renderer/app.js` |
| `ui/style.css` | `src/renderer/style.css` |
| `core/index.js` | `src/core/index.js` |
| `core/context.js` | `src/core/context.js` |
| `core/inventaire.js` | `src/core/inventaire.js` |
| `core/csv.js` | `src/core/utils/csv.js` |
| `core/lock.js` | `src/core/utils/lock.js` |
| `core/manifest.js` | `src/core/utils/manifest.js` |
| `core/plan.js` | `src/core/batch/plan.js` |
| `core/runner.js` | `src/core/batch/runner.js` |
| `core/execute.js` | `src/core/batch/execute.js` |
| `core/worker.js` | `src/core/batch/worker.js` |
| `core/renderers.js` | `src/core/render/renderers.js` |
| `core/render/render.js` | `src/core/render/render.js` |
| `core/render/extract-motif.js` | `src/core/render/extract-motif.js` |
| `cli/generate.js` | `src/cli/generate.js` |
| `cli/inventaire.js` | `src/cli/inventaire.js` |

---

## Modifications de require() (17 changements)

| Fichier | Ancien chemin | Nouveau chemin |
|---|---|---|
| `src/core/context.js` | `require('./csv')` | `require('./utils/csv')` |
| `src/core/context.js` | `path.join(__dirname, '..', 'resources')` | `path.join(__dirname, '..', '..', 'resources')` |
| `src/core/index.js` | `require('./plan')` | `require('./batch/plan')` |
| `src/core/index.js` | `require('./runner')` | `require('./batch/runner')` |
| `src/core/index.js` | `require('./manifest')` | `require('./utils/manifest')` |
| `src/core/index.js` | `require('./lock')` | `require('./utils/lock')` |
| `src/core/index.js` | `require('./renderers')` | `require('./render/renderers')` |
| `src/core/batch/plan.js` | `require('./renderers')` | `require('../render/renderers')` |
| `src/core/batch/plan.js` | `require('./manifest')` | `require('../utils/manifest')` |
| `src/core/batch/execute.js` | `require('./renderers')` | `require('../render/renderers')` |
| `src/core/batch/worker.js` | `require('./context')` | `require('../context')` |
| `src/core/batch/worker.js` | `require('./render/render')` | `require('../render/render')` |
| `src/core/render/renderers.js` | `require('./render/render')` | `require('./render')` |
| `src/core/render/renderers.js` | `require('./render/extract-motif')` | `require('./extract-motif')` |
| `src/main/main.js` | `require('../core/csv')` | `require('../core/utils/csv')` |
| `src/main/main.js` | `path.join(__dirname, '..', 'resources')` | `path.join(__dirname, '..', '..', 'resources')` |
| `src/main/main.js` | `path.join(__dirname, '..', 'ui', 'index.html')` | `path.join(__dirname, '..', 'renderer', 'index.html')` |

**Chemins inchangés (aucune modification nécessaire) :**
- `src/main/main.js` : `require('../core')`, `require('../core/inventaire')`, `path.join(__dirname, 'preload.js')`
- `src/core/batch/runner.js` : `require('./execute')`, `path.join(__dirname, 'worker.js')`
- `src/core/batch/worker.js` : `require('./execute')`
- `src/core/index.js` : `require('./render/render')`
- `src/cli/*.js` : `require('../core')`, `require('../core/inventaire')`

---

## Modifications de package.json

```json
"main": "src/main/main.js",
"scripts": {
  "start": "electron .",
  "generate": "node src/cli/generate.js",
  "inventaire": "node src/cli/inventaire.js",
  ...
},
"build": {
  "files": [
    "package.json",
    "src/**",
    "resources/**"
  ],
  ...
}
```

---

## Vérification

1. `npm start` → l'application Electron s'ouvre et l'interface se charge
2. `node src/cli/generate.js` sans arguments → affiche l'usage (pas d'erreur require)
3. `node src/cli/inventaire.js` sans arguments → affiche l'usage
4. Génération d'un lot sur `exemple/` → images produites correctement
