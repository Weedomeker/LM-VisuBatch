# Restructuration du projet LM VisuBatch — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déplacer les sources de `app/` vers `app/src/` en respectant les conventions Electron (`main/`, `renderer/`) et en regroupant `core/` en sous-modules (`batch/`, `render/`, `utils/`).

**Architecture:** Tous les fichiers sources migrent vers `src/`; `resources/` et `test/` restent à la racine de `app/`. Les `require()` internes sont mis à jour en conséquence. `package.json` reflète les nouveaux chemins.

**Tech Stack:** Node.js CommonJS, Electron 44, PowerShell (Windows)

**Répertoire de travail pour toutes les commandes :** `X:\Dev\LM VisuBatch\app`

---

### Task 1 : Créer la structure de dossiers src/

**Files:**
- Créer : `src/main/`, `src/renderer/`, `src/core/`, `src/core/batch/`, `src/core/render/`, `src/core/utils/`, `src/cli/`

- [ ] **Étape 1 : Créer tous les dossiers cibles**

```powershell
$dirs = @(
  "src\main",
  "src\renderer",
  "src\core",
  "src\core\batch",
  "src\core\render",
  "src\core\utils",
  "src\cli"
)
foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force "X:\Dev\LM VisuBatch\app\$d" | Out-Null
}
Write-Host "Dossiers créés."
```

Résultat attendu : `Dossiers créés.`

---

### Task 2 : Déplacer les 20 fichiers sources

**Files:**
- Déplacer : tous les fichiers listés ci-dessous

- [ ] **Étape 1 : Déplacer electron/ → src/main/**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\electron\main.js"    "X:\Dev\LM VisuBatch\app\src\main\main.js"
Move-Item "X:\Dev\LM VisuBatch\app\electron\preload.js" "X:\Dev\LM VisuBatch\app\src\main\preload.js"
```

- [ ] **Étape 2 : Déplacer ui/ → src/renderer/**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\ui\index.html" "X:\Dev\LM VisuBatch\app\src\renderer\index.html"
Move-Item "X:\Dev\LM VisuBatch\app\ui\app.js"     "X:\Dev\LM VisuBatch\app\src\renderer\app.js"
Move-Item "X:\Dev\LM VisuBatch\app\ui\style.css"  "X:\Dev\LM VisuBatch\app\src\renderer\style.css"
```

- [ ] **Étape 3 : Déplacer cli/ → src/cli/**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\cli\generate.js"   "X:\Dev\LM VisuBatch\app\src\cli\generate.js"
Move-Item "X:\Dev\LM VisuBatch\app\cli\inventaire.js" "X:\Dev\LM VisuBatch\app\src\cli\inventaire.js"
```

- [ ] **Étape 4 : Déplacer core/utils/**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\core\csv.js"      "X:\Dev\LM VisuBatch\app\src\core\utils\csv.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\lock.js"     "X:\Dev\LM VisuBatch\app\src\core\utils\lock.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\manifest.js" "X:\Dev\LM VisuBatch\app\src\core\utils\manifest.js"
```

- [ ] **Étape 5 : Déplacer core/batch/**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\core\plan.js"    "X:\Dev\LM VisuBatch\app\src\core\batch\plan.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\runner.js"  "X:\Dev\LM VisuBatch\app\src\core\batch\runner.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\execute.js" "X:\Dev\LM VisuBatch\app\src\core\batch\execute.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\worker.js"  "X:\Dev\LM VisuBatch\app\src\core\batch\worker.js"
```

- [ ] **Étape 6 : Déplacer core/render/**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\core\renderers.js"          "X:\Dev\LM VisuBatch\app\src\core\render\renderers.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\render\render.js"       "X:\Dev\LM VisuBatch\app\src\core\render\render.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\render\extract-motif.js" "X:\Dev\LM VisuBatch\app\src\core\render\extract-motif.js"
```

- [ ] **Étape 7 : Déplacer core/index.js, context.js, inventaire.js**

```powershell
Move-Item "X:\Dev\LM VisuBatch\app\core\index.js"      "X:\Dev\LM VisuBatch\app\src\core\index.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\context.js"    "X:\Dev\LM VisuBatch\app\src\core\context.js"
Move-Item "X:\Dev\LM VisuBatch\app\core\inventaire.js" "X:\Dev\LM VisuBatch\app\src\core\inventaire.js"
```

- [ ] **Étape 8 : Vérifier que les 20 fichiers sont en place**

```powershell
$expected = @(
  "src\main\main.js", "src\main\preload.js",
  "src\renderer\index.html", "src\renderer\app.js", "src\renderer\style.css",
  "src\cli\generate.js", "src\cli\inventaire.js",
  "src\core\utils\csv.js", "src\core\utils\lock.js", "src\core\utils\manifest.js",
  "src\core\batch\plan.js", "src\core\batch\runner.js",
  "src\core\batch\execute.js", "src\core\batch\worker.js",
  "src\core\render\renderers.js", "src\core\render\render.js", "src\core\render\extract-motif.js",
  "src\core\index.js", "src\core\context.js", "src\core\inventaire.js"
)
$base = "X:\Dev\LM VisuBatch\app"
$missing = $expected | Where-Object { -not (Test-Path "$base\$_") }
if ($missing) { Write-Host "MANQUANTS : $($missing -join ', ')" } else { Write-Host "OK — 20 fichiers en place." }
```

Résultat attendu : `OK — 20 fichiers en place.`

---

### Task 3 : Corriger src/core/render/renderers.js

**Files:**
- Modifier : `src/core/render/renderers.js` (2 require)

`renderers.js` est passé de `core/` à `src/core/render/`. Les imports de `render.js` et `extract-motif.js` étaient préfixés `./render/` — maintenant ils sont dans le même dossier.

- [ ] **Étape 1 : Corriger les deux require**

Remplacer dans `src/core/render/renderers.js` :

```js
// Avant
const { renderScene, drawLabels, composePage, renderFormats, saveJpeg, renderP } = require('./render/render');
const { extractMotif } = require('./render/extract-motif');
```

```js
// Après
const { renderScene, drawLabels, composePage, renderFormats, saveJpeg, renderP } = require('./render');
const { extractMotif } = require('./extract-motif');
```

- [ ] **Étape 2 : Vérifier la syntaxe**

```powershell
node -e "require('X:/Dev/LM VisuBatch/app/src/core/render/renderers.js')" 2>&1
```

Résultat attendu : aucune sortie (pas d'erreur de require).

---

### Task 4 : Corriger src/core/context.js

**Files:**
- Modifier : `src/core/context.js` (1 require, 1 chemin __dirname)

`context.js` est passé de `core/` à `src/core/`. Le chemin relatif vers `resources/` doit remonter d'un niveau supplémentaire.

- [ ] **Étape 1 : Corriger require('./csv') et DEFAULT_RESOURCES**

Remplacer dans `src/core/context.js` :

```js
// Avant
const { readCsv } = require('./csv');
const DEFAULT_RESOURCES = path.join(__dirname, '..', 'resources');
```

```js
// Après
const { readCsv } = require('./utils/csv');
const DEFAULT_RESOURCES = path.join(__dirname, '..', '..', 'resources');
```

- [ ] **Étape 2 : Vérifier**

```powershell
node -e "require('X:/Dev/LM VisuBatch/app/src/core/context.js')" 2>&1
```

Résultat attendu : aucune sortie.

---

### Task 5 : Corriger src/core/batch/plan.js et execute.js

**Files:**
- Modifier : `src/core/batch/plan.js` (2 require)
- Modifier : `src/core/batch/execute.js` (1 require)

Ces fichiers sont passés de `core/` à `src/core/batch/`. Ils doivent remonter d'un niveau (`../`) pour atteindre `render/` et `utils/`.

- [ ] **Étape 1 : Corriger plan.js**

Remplacer dans `src/core/batch/plan.js` :

```js
// Avant
const { TYPES, RENDERERS, outputName } = require('./renderers');
const { fingerprint } = require('./manifest');
```

```js
// Après
const { TYPES, RENDERERS, outputName } = require('../render/renderers');
const { fingerprint } = require('../utils/manifest');
```

- [ ] **Étape 2 : Corriger execute.js**

Remplacer dans `src/core/batch/execute.js` :

```js
// Avant
const { RENDERERS } = require('./renderers');
```

```js
// Après
const { RENDERERS } = require('../render/renderers');
```

- [ ] **Étape 3 : Vérifier plan.js**

```powershell
node -e "require('X:/Dev/LM VisuBatch/app/src/core/batch/plan.js')" 2>&1
```

Résultat attendu : aucune sortie.

---

### Task 6 : Corriger src/core/batch/worker.js

**Files:**
- Modifier : `src/core/batch/worker.js` (2 require)

`worker.js` était dans `core/` et appelait `./context` et `./render/render`. Il est maintenant dans `src/core/batch/` : context est un niveau au-dessus, render est dans le dossier frère `render/`.

- [ ] **Étape 1 : Corriger les deux require**

Remplacer dans `src/core/batch/worker.js` :

```js
// Avant
const { createContext } = require('./context');
const { setFontsDir } = require('./render/render');
```

```js
// Après
const { createContext } = require('../context');
const { setFontsDir } = require('../render/render');
```

- [ ] **Étape 2 : Vérifier**

```powershell
node -e "require('X:/Dev/LM VisuBatch/app/src/core/batch/worker.js')" 2>&1
```

Résultat attendu : aucune sortie.

---

### Task 7 : Corriger src/core/index.js

**Files:**
- Modifier : `src/core/index.js` (5 require)

`index.js` est passé de `core/` à `src/core/`. Les modules déplacés dans des sous-dossiers (`batch/`, `utils/`, `render/`) nécessitent des chemins mis à jour.

- [ ] **Étape 1 : Corriger les 5 require**

Remplacer dans `src/core/index.js` :

```js
// Avant
const { buildPlan } = require('./plan');
const { runPlan, defaultJobs } = require('./runner');
const { Manifest } = require('./manifest');
const { acquireLock, currentLock } = require('./lock');
const { TYPES } = require('./renderers');
```

```js
// Après
const { buildPlan } = require('./batch/plan');
const { runPlan, defaultJobs } = require('./batch/runner');
const { Manifest } = require('./utils/manifest');
const { acquireLock, currentLock } = require('./utils/lock');
const { TYPES } = require('./render/renderers');
```

- [ ] **Étape 2 : Vérifier le module core complet**

```powershell
node -e "require('X:/Dev/LM VisuBatch/app/src/core/index.js')" 2>&1
```

Résultat attendu : aucune sortie.

---

### Task 8 : Corriger src/main/main.js

**Files:**
- Modifier : `src/main/main.js` (1 require, 2 chemins de fichier)

`main.js` est passé de `electron/` à `src/main/`. Le chemin vers `resources/` doit remonter deux niveaux au lieu d'un. L'HTML de l'UI change de `ui/` à `renderer/`. `csv` est maintenant dans `utils/`.

- [ ] **Étape 1 : Corriger require('../core/csv')**

Remplacer dans `src/main/main.js` :

```js
// Avant
const { readCsv } = require('../core/csv');
```

```js
// Après
const { readCsv } = require('../core/utils/csv');
```

- [ ] **Étape 2 : Corriger RESOURCES (chemin __dirname)**

Remplacer dans `src/main/main.js` :

```js
// Avant
const RESOURCES = path.join(__dirname, '..', 'resources');
```

```js
// Après
const RESOURCES = path.join(__dirname, '..', '..', 'resources');
```

- [ ] **Étape 3 : Corriger le chargement de l'HTML**

Remplacer dans `src/main/main.js` :

```js
// Avant
win.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
```

```js
// Après
win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
```

- [ ] **Étape 4 : Vérifier la syntaxe du module main**

```powershell
node -e "
  process.env.ELECTRON_RUN_AS_NODE = '1'
  // On ne peut pas require electron sans l'exécuteur, mais on vérifie les require Node.js
  try {
    const src = require('fs').readFileSync('X:/Dev/LM VisuBatch/app/src/main/main.js', 'utf8')
    // Vérification manuelle : chercher les 3 chaînes modifiées
    const checks = [
      src.includes(\"require('../core/utils/csv')\"),
      src.includes(\"path.join(__dirname, '..', '..', 'resources')\"),
      src.includes(\"path.join(__dirname, '..', 'renderer', 'index.html')\"),
    ]
    if (checks.every(Boolean)) console.log('OK — 3 modifications confirmées.')
    else console.log('ERREUR — modifications manquantes :', checks)
  } catch(e) { console.error(e.message) }
" 2>&1
```

Résultat attendu : `OK — 3 modifications confirmées.`

---

### Task 9 : Mettre à jour package.json

**Files:**
- Modifier : `src/../package.json` (champ `main`, `scripts`, `build.files`)

- [ ] **Étape 1 : Mettre à jour le champ `main`**

Dans `package.json`, remplacer :

```json
"main": "electron/main.js",
```

par :

```json
"main": "src/main/main.js",
```

- [ ] **Étape 2 : Mettre à jour les scripts CLI**

Dans `package.json`, remplacer :

```json
"generate": "node cli/generate.js",
"inventaire": "node cli/inventaire.js",
```

par :

```json
"generate": "node src/cli/generate.js",
"inventaire": "node src/cli/inventaire.js",
```

- [ ] **Étape 3 : Mettre à jour build.files**

Dans `package.json`, remplacer :

```json
"files": [
  "package.json",
  "core/**",
  "electron/**",
  "ui/**",
  "resources/**"
],
```

par :

```json
"files": [
  "package.json",
  "src/**",
  "resources/**"
],
```

- [ ] **Étape 4 : Vérifier la syntaxe JSON**

```powershell
node -e "JSON.parse(require('fs').readFileSync('X:/Dev/LM VisuBatch/app/package.json','utf8')); console.log('JSON valide.')" 2>&1
```

Résultat attendu : `JSON valide.`

---

### Task 10 : Vérification finale et nettoyage des anciens dossiers

**Files:**
- Supprimer : `electron/`, `ui/`, `core/`, `cli/` (vides après les déplacements)

- [ ] **Étape 1 : Vérifier que le CLI démarre sans erreur**

```powershell
node "X:\Dev\LM VisuBatch\app\src\cli\generate.js" 2>&1 | Select-Object -First 3
```

Résultat attendu (usage affiché, pas d'erreur de require) :
```
Usage : node cli/generate.js "<dossier GAMME>" ...
```

- [ ] **Étape 2 : Vérifier le CLI inventaire**

```powershell
node "X:\Dev\LM VisuBatch\app\src\cli\inventaire.js" 2>&1 | Select-Object -First 3
```

Résultat attendu : message d'usage ou erreur sur le dossier GAMME (pas sur un require).

- [ ] **Étape 3 : Vérifier que le module core se charge entièrement**

```powershell
node -e "const c = require('X:/Dev/LM VisuBatch/app/src/core'); console.log('Exports:', Object.keys(c).join(', '))" 2>&1
```

Résultat attendu :
```
Exports: prepareBatch, runBatch, runPlan, defaultJobs, defaultReglages, currentLock, scanGamme, readInventaire, writeInventaire, TYPES, FORMATS
```

- [ ] **Étape 4 : Supprimer les anciens dossiers vides**

```powershell
Remove-Item -Recurse -Force "X:\Dev\LM VisuBatch\app\electron"
Remove-Item -Recurse -Force "X:\Dev\LM VisuBatch\app\ui"
Remove-Item -Recurse -Force "X:\Dev\LM VisuBatch\app\core"
Remove-Item -Recurse -Force "X:\Dev\LM VisuBatch\app\cli"
Write-Host "Anciens dossiers supprimés."
```

Résultat attendu : `Anciens dossiers supprimés.`

- [ ] **Étape 5 : Vérifier la structure finale**

```powershell
Get-ChildItem "X:\Dev\LM VisuBatch\app" -Depth 2 | Where-Object { $_.PSIsContainer } | Select-Object -ExpandProperty FullName
```

Résultat attendu : uniquement `src\`, `src\main`, `src\renderer`, `src\core`, `src\core\batch`, `src\core\render`, `src\core\utils`, `src\cli`, `resources`, `test`, `dist`, `node_modules` (et sous-dossiers de ces derniers).

- [ ] **Étape 6 : Lancer l'application Electron**

```powershell
cd "X:\Dev\LM VisuBatch\app" && npm start
```

Résultat attendu : la fenêtre Electron s'ouvre, l'interface se charge sans erreur dans la console.
