# Config par client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre VisuBatch universel via un `config.json` par client dans le dossier GAMME, configurable depuis un panneau UI dans l'app.

**Architecture:** Un nouveau module `clientConfig.js` charge et valide le `config.json`, expose les constantes/regex paramétrées. `inventaire.js` et `renderers.js` reçoivent ces paramètres via le contexte. Le panneau UI (modal) permet de créer/modifier le config ; s'ouvre automatiquement si absent.

**Tech Stack:** Node.js CommonJS, Electron 44 (contextBridge/ipcMain), `node:test` pour les tests, pas de dépendances supplémentaires.

---

## Carte des fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `app/src/core/utils/clientConfig.js` | Créer | Charge/valide config.json, expose LM_DEFAULTS, buildRegex, resolveCatalogue |
| `app/resources/config.example.json` | Créer | Template livré avec l'app |
| `app/test/clientConfig.test.js` | Créer | Tests unitaires clientConfig.js |
| `app/test/inventaire.test.js` | Créer | Tests unitaires parse() avec regex custom |
| `app/src/renderer/reglages-client.js` | Créer | Logique du panneau UI |
| `app/src/core/inventaire.js` | Modifier | FORMATS/regex hardcodés → params |
| `app/src/core/context.js` | Modifier | Expose clientConfig |
| `app/src/core/render/renderers.js` | Modifier | outputFolder/uniPrefix → ctx.clientConfig |
| `app/src/core/index.js` | Modifier | prepareBatch() accepte clientConfig |
| `app/src/main/main.js` | Modifier | Chargement config.json, IPC, importCsv |
| `app/src/main/preload.js` | Modifier | Expose API config-client au renderer |
| `app/src/renderer/index.html` | Modifier | Bouton + modal Réglages client |
| `app/src/renderer/style.css` | Modifier | Styles de la modal |
| `app/src/renderer/app.js` | Modifier | Branchement panel + gestion needs:'config' |
| `app/package.json` | Modifier | Ajouter script test |

---

## Task 1 : clientConfig.js + setup tests

**Files:**
- Create: `app/src/core/utils/clientConfig.js`
- Create: `app/test/clientConfig.test.js`
- Modify: `app/package.json`

- [ ] **Step 1 : Ajouter le script test à package.json**

Dans `app/package.json`, ajouter dans `"scripts"` :
```json
"test": "node --test app/test/clientConfig.test.js app/test/inventaire.test.js"
```

- [ ] **Step 2 : Créer le dossier test**

```powershell
New-Item -ItemType Directory -Force "app/test"
```

- [ ] **Step 3 : Écrire les tests (qui échoueront)**

Créer `app/test/clientConfig.test.js` :
```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { toSlug, catalogueFilename, buildRegex, loadClientConfig, resolveCatalogue, LM_DEFAULTS } = require('../src/core/utils/clientConfig');

test('toSlug normalise les noms de client', () => {
  assert.equal(toSlug('Leroy Merlin'), 'Leroy_Merlin');
  assert.equal(toSlug('Villeroy & Boch'), 'Villeroy_Boch');
  assert.equal(toSlug('  Espaces  '), 'Espaces');
});

test('catalogueFilename construit le nom du fichier', () => {
  assert.equal(catalogueFilename('Leroy Merlin'), 'gamme_Leroy_Merlin.csv');
  assert.equal(catalogueFilename('Villeroy & Boch'), 'gamme_Villeroy_Boch.csv');
});

test('LM_DEFAULTS contient les 8 champs requis', () => {
  const champs = ['client', 'catalogue', 'refPattern', 'outputFolder', 'formats', 'finitions', 'motifPattern', 'uniPrefix'];
  for (const c of champs) assert.ok(c in LM_DEFAULTS, `champ manquant : ${c}`);
});

test('buildRegex construit les regex depuis la config', () => {
  const { refRe, finitionRe, motifRe } = buildRegex(LM_DEFAULTS);
  assert.ok(refRe.test('94953622'), 'refRe doit matcher une référence LM');
  assert.ok(!refRe.test('12345678'), 'refRe ne doit pas matcher un nombre sans 9');
  assert.ok(finitionRe.test('MAT'), 'finitionRe doit matcher MAT');
  assert.ok(finitionRe.test('brillant'), 'finitionRe doit matcher brillant (casse)');
  assert.ok(motifRe.test('au 10ème'), 'motifRe doit matcher au 10ème');
  assert.ok(motifRe.test('au 10éme'), 'motifRe doit matcher au 10éme (faute)');
});

test('loadClientConfig retourne null si pas de config.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  assert.equal(loadClientConfig(tmp), null);
  fs.rmdirSync(tmp);
});

test('loadClientConfig charge et fusionne avec LM_DEFAULTS', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  fs.writeFileSync(path.join(tmp, 'config.json'), JSON.stringify({ client: 'Test', uniPrefix: 'TST' }));
  const config = loadClientConfig(tmp);
  assert.equal(config.client, 'Test');
  assert.equal(config.uniPrefix, 'TST');
  assert.deepEqual(config.formats, LM_DEFAULTS.formats, 'les formats LM sont gardés par défaut');
  fs.rmSync(tmp, { recursive: true });
});

test('resolveCatalogue — chemin personnalisé absolu', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  const csvPath = path.join(tmp, 'mon_catalogue.csv');
  fs.writeFileSync(csvPath, 'dossier;uni\n');
  const config = { ...LM_DEFAULTS, catalogue: csvPath };
  assert.equal(resolveCatalogue(config, tmp, '/fallback.csv'), csvPath);
  fs.rmSync(tmp, { recursive: true });
});

test('resolveCatalogue — auto-détection gamme_Client.csv', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  const autoPath = path.join(tmp, 'gamme_Test_Client.csv');
  fs.writeFileSync(autoPath, 'dossier;uni\n');
  const config = { ...LM_DEFAULTS, client: 'Test Client', catalogue: '' };
  assert.equal(resolveCatalogue(config, tmp, '/fallback.csv'), autoPath);
  fs.rmSync(tmp, { recursive: true });
});

test('resolveCatalogue — fallback si rien trouvé', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  const config = { ...LM_DEFAULTS, client: 'Inconnu', catalogue: '' };
  assert.equal(resolveCatalogue(config, tmp, '/fallback.csv'), '/fallback.csv');
  fs.rmdirSync(tmp);
});
```

- [ ] **Step 4 : Vérifier que les tests échouent**

```powershell
cd app && npm test
```
Résultat attendu : `Error: Cannot find module '../src/core/utils/clientConfig'`

- [ ] **Step 5 : Créer clientConfig.js**

Créer `app/src/core/utils/clientConfig.js` :
```js
const fs = require('fs');
const path = require('path');

const LM_DEFAULTS = {
  client: 'Leroy Merlin',
  catalogue: '',
  refPattern: '9\\d{7}',
  outputFolder: ' LM WEB 2025',
  formats: ['100x210', '100x255', '125x210', '125x255', '150x210', '150x255'],
  finitions: ['MAT', 'BRILLANT'],
  motifPattern: 'au\\s*10\\s*[èée]m',
  uniPrefix: 'ULM',
};

function toSlug(name) {
  return name.normalize('NFC').trim().replace(/[^a-zA-ZÀ-ÿ0-9]+/g, '_').replace(/^_|_$/g, '');
}

const catalogueFilename = client => `gamme_${toSlug(client)}.csv`;

function buildRegex(config) {
  return {
    refRe: new RegExp(`\\b(${config.refPattern})\\b`),
    finitionRe: new RegExp(`\\b(${config.finitions.join('|')})\\b`, 'i'),
    motifRe: new RegExp(config.motifPattern, 'i'),
  };
}

function loadClientConfig(gammeDir) {
  const configPath = path.join(gammeDir, 'config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...LM_DEFAULTS, ...raw };
  } catch (e) {
    throw new Error(`config.json invalide : ${e.message}`);
  }
}

function resolveCatalogue(config, gammeDir, defaultCsvPath) {
  if (config.catalogue) {
    const p = path.isAbsolute(config.catalogue) ? config.catalogue : path.join(gammeDir, config.catalogue);
    if (fs.existsSync(p)) return p;
  }
  const autoPath = path.join(gammeDir, catalogueFilename(config.client));
  if (fs.existsSync(autoPath)) return autoPath;
  return defaultCsvPath;
}

module.exports = { LM_DEFAULTS, toSlug, catalogueFilename, buildRegex, loadClientConfig, resolveCatalogue };
```

- [ ] **Step 6 : Vérifier que les tests passent**

```powershell
cd app && npm test 2>&1 | Select-String -Pattern "pass|fail|error" -CaseSensitive:$false
```
Résultat attendu : toutes les assertions `clientConfig.test.js` passent. `inventaire.test.js` échouera (pas encore créé, normal).

- [ ] **Step 7 : Commit**

```powershell
git add app/src/core/utils/clientConfig.js app/test/clientConfig.test.js app/package.json
git commit -m "feat: module clientConfig — chargement et validation du config.json par client"
```

---

## Task 2 : inventaire.js — paramétrer parse/scanDecor/scanGamme

**Files:**
- Modify: `app/src/core/inventaire.js`
- Create: `app/test/inventaire.test.js`

- [ ] **Step 1 : Écrire les tests inventaire (qui échoueront)**

Créer `app/test/inventaire.test.js` :
```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRegex, LM_DEFAULTS } = require('../src/core/utils/clientConfig');

// On importe parse via une exposition temporaire (voir Step 3)
const inventaire = require('../src/core/inventaire');

test('parse reconnaît une référence LM standard', () => {
  const regex = buildRegex(LM_DEFAULTS);
  const r = inventaire._parse('000 BLANC 100x210 94953622 MAT.jpg', regex);
  assert.ok(r, 'doit retourner un objet');
  assert.equal(r.ref, '94953622');
  assert.equal(r.finition, 'MAT');
  assert.equal(r.largeur, '100');
  assert.equal(r.hauteur, '210');
  assert.equal(r.isMotif, false);
});

test('parse reconnaît un motif au 10ème', () => {
  const regex = buildRegex(LM_DEFAULTS);
  const r = inventaire._parse('000 BLANC 100x210 au 10ème 94956949.jpg', regex);
  assert.ok(r);
  assert.equal(r.isMotif, true);
});

test('parse utilise un refPattern custom', () => {
  const config = { ...LM_DEFAULTS, refPattern: 'REF-\\d{5}', finitions: ['LISSE', 'TEXTURÉ'] };
  const regex = buildRegex(config);
  const r = inventaire._parse('MON_DECOR 100x210 REF-12345 LISSE.jpg', regex);
  assert.ok(r);
  assert.equal(r.ref, 'REF-12345');
  assert.equal(r.finition, 'LISSE');
});

test('parse retourne null si pas de dimension', () => {
  const regex = buildRegex(LM_DEFAULTS);
  assert.equal(inventaire._parse('fichier_sans_dimension.jpg', regex), null);
});

test('FORMATS est exporté et correspond aux LM_DEFAULTS', () => {
  assert.deepEqual(inventaire.FORMATS, LM_DEFAULTS.formats);
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```powershell
cd app && npm test 2>&1 | Select-String "inventaire"
```
Résultat attendu : `TypeError: inventaire._parse is not a function`

- [ ] **Step 3 : Mettre à jour inventaire.js**

Remplacer les premières lignes et la fonction `parse` de `app/src/core/inventaire.js` :

```js
// Recense les motifs « au 10ème » d'un dossier décor et leur associe une référence produit (8 chiffres)
// et une finition, trouvées dans le nom de n'importe quel fichier du même format (et côté DROIT/GAUCHE),
// ou saisies dans l'application. Les dossiers ne sont jamais modifiés.
const fs = require('fs');
const path = require('path');
const { readCsv, writeCsv } = require('./utils/csv');
const { LM_DEFAULTS, buildRegex } = require('./utils/clientConfig');

const COLS = ['ref', 'decor', 'finition', 'largeur', 'hauteur', 'cote', 'dossier', 'motif'];
const FORMATS = LM_DEFAULTS.formats; // conservé pour rétrocompatibilité CLI

function _parse(file, regex) {
  const name = file.normalize('NFC');
  const size = name.match(/(\d{2,3})\s*x\s*(\d{3})/i);
  if (!size) return null;
  const side = (name.match(/\b(DROIT|GAUCHE)\b/i) || [])[1];
  const ref = (name.match(regex.refRe) || [])[1];
  const finition = ((name.match(regex.finitionRe) || [])[1] || '').toUpperCase();
  return {
    name,
    decor: name.slice(0, size.index).trim(),
    largeur: size[1],
    hauteur: size[2],
    cote: (side || '').toUpperCase(),
    ref,
    finition,
    isMotif: regex.motifRe.test(name) && /\.jpe?g$/i.test(name),
  };
}
```

Mettre à jour `scanDecor` pour accepter `{ regex, formats }` :
```js
function scanDecor(base, dir, saisies = {}, { regex = buildRegex(LM_DEFAULTS), formats = FORMATS } = {}) {
  const files = fs.readdirSync(path.join(base, dir)).map(f => _parse(f, regex)).filter(Boolean);
  const key = f => formatKey(`${f.largeur}x${f.hauteur}`, f.cote);
  // ... (reste du code inchangé jusqu'à la ligne des keys)

  const cotes = [...motifs.values()].some(m => m.cote) ? ['GAUCHE', 'DROIT'] : [''];
  const keys = new Set(formats.flatMap(f => cotes.map(c => formatKey(f, c))));
  // ... reste inchangé
}
```

Mettre à jour `scanGamme` pour accepter `clientConfig` :
```js
function scanGamme(root, { sources = [], saisies = {}, clientConfig = LM_DEFAULTS } = {}) {
  const regex = buildRegex(clientConfig);
  const formats = clientConfig.formats;
  const entries = new Map();
  if (root) for (const dir of decorDirs(root)) entries.set(dir, { base: root, dir, depot: false });
  for (const src of sources) {
    if (!fs.existsSync(src)) continue;
    const dir = path.basename(src).normalize('NFC');
    entries.set(dir, { base: path.dirname(src), dir, depot: true });
  }
  const deco = [];
  for (const { base, dir, depot } of entries.values()) {
    try {
      deco.push({ ...scanDecor(base, dir, saisies[path.join(base, dir)], { regex, formats }), depot });
    } catch (e) {
      deco.push({ dossier: dir, base, decor: dir, formats: [], rows: [], problems: [`${dir} : illisible (${e.message})`], depot });
    }
  }
  return {
    deco,
    rows: deco.flatMap(d => d.rows),
    problems: deco.flatMap(d => d.problems),
    sansMotif: deco.filter(d => !d.rows.length).map(d => d.dossier),
  };
}
```

Ajouter `_parse` à `module.exports` :
```js
module.exports = { scanGamme, readInventaire, writeInventaire, formatKey, FORMATS, _parse };
```

- [ ] **Step 4 : Vérifier que les tests passent**

```powershell
cd app && npm test
```
Résultat attendu : toutes les assertions de `clientConfig.test.js` et `inventaire.test.js` passent.

- [ ] **Step 5 : Commit**

```powershell
git add app/src/core/inventaire.js app/test/inventaire.test.js
git commit -m "feat: inventaire — parse/scanGamme paramétrés par clientConfig"
```

---

## Task 3 : context.js — exposer clientConfig

**Files:**
- Modify: `app/src/core/context.js`

- [ ] **Step 1 : Mettre à jour createContext()**

Remplacer le contenu de `app/src/core/context.js` :
```js
const fs = require('fs');
const path = require('path');
const { readCsv } = require('./utils/csv');
const { LM_DEFAULTS } = require('./utils/clientConfig');

const DEFAULT_RESOURCES = path.join(__dirname, '..', '..', 'resources');

/**
 * @param {object} data
 * @param {string} data.root dossier GAMME
 * @param {object[]} data.rows lignes d'inventaire
 * @param {object[]} [data.deco] lignes de gamme_deco.csv
 * @param {string} [data.resources] dossier des gabarits, statiques et polices
 * @param {string} data.cacheDir dossier inscriptible (unis extraits des PSD)
 * @param {object} [data.clientConfig] configuration du client (clientConfig.js)
 */
function createContext({ root, rows, deco = [], resources = DEFAULT_RESOURCES, cacheDir, clientConfig = LM_DEFAULTS }) {
  let dirs;
  return {
    root, rows, deco, resources, cacheDir, clientConfig,
    decorConfig: new Map(deco.map(r => [r.dossier, r])),
    get dirs() { return dirs ??= fs.readdirSync(root).map(n => n.normalize('NFC')); },
    gabarit: name => path.join(resources, 'gabarits', name),
    toData: () => ({ root, rows, deco, resources, cacheDir, clientConfig }),
  };
}

const readDecors = file => readCsv(file);

module.exports = { createContext, readDecors, DEFAULT_RESOURCES };
```

- [ ] **Step 2 : Vérifier que les tests existants passent toujours**

```powershell
cd app && npm test
```
Résultat attendu : aucune régression.

- [ ] **Step 3 : Commit**

```powershell
git add app/src/core/context.js
git commit -m "feat: context — expose clientConfig dans le contexte de rendu"
```

---

## Task 4 : renderers.js — outputFolder et uniPrefix

**Files:**
- Modify: `app/src/core/render/renderers.js`

- [ ] **Step 1 : Mettre à jour uniLabel()**

Dans `app/src/core/render/renderers.js`, remplacer :
```js
const uniLabel = (ctx, code) => {
  const name = (uniDossier(ctx, code) || String(code)).replace(/^\d{3}\s*/, '').toLowerCase();
  return `ULM ${code}\n${name}`;
};
```
par :
```js
const uniLabel = (ctx, code) => {
  const name = (uniDossier(ctx, code) || String(code)).replace(/^\d{3}\s*/, '').toLowerCase();
  const prefix = ctx.clientConfig?.uniPrefix ?? 'ULM';
  return `${prefix} ${code}\n${name}`;
};
```

- [ ] **Step 2 : Mettre à jour uniSource()**

Dans `uniSource()`, remplacer :
```js
  const webDir = path.join(ctx.root, dossier, ' LM WEB 2025');
  const psd = fs.existsSync(webDir) && fs.readdirSync(webDir).find(f => new RegExp(`100x${hauteur}\\.psd$`, 'i').test(f));
  if (!psd) throw new Error(`Aucune image ni PSD 100x${hauteur} pour l'uni ${code}`);
  return { file: path.join(ctx.cacheDir, 'unis', `ULM${code}-100x${hauteur}.jpg`), psd: path.join(webDir, psd) };
```
par :
```js
  const outputFolder = ctx.clientConfig?.outputFolder ?? ' LM WEB 2025';
  const prefix = ctx.clientConfig?.uniPrefix ?? 'ULM';
  const webDir = path.join(ctx.root, dossier, outputFolder);
  const psd = fs.existsSync(webDir) && fs.readdirSync(webDir).find(f => new RegExp(`100x${hauteur}\\.psd$`, 'i').test(f));
  if (!psd) throw new Error(`Aucune image ni PSD 100x${hauteur} pour l'uni ${code}`);
  return { file: path.join(ctx.cacheDir, 'unis', `${prefix}${code}-100x${hauteur}.jpg`), psd: path.join(webDir, psd) };
```

- [ ] **Step 3 : Vérifier que les tests passent**

```powershell
cd app && npm test
```

- [ ] **Step 4 : Commit**

```powershell
git add app/src/core/render/renderers.js
git commit -m "feat: renderers — outputFolder et uniPrefix lus depuis clientConfig"
```

---

## Task 5 : index.js — prepareBatch accepte clientConfig

**Files:**
- Modify: `app/src/core/index.js`

- [ ] **Step 1 : Mettre à jour prepareBatch()**

Dans `app/src/core/index.js`, ajouter `{ LM_DEFAULTS, resolveCatalogue }` à l'import de clientConfig (nouveau) et mettre à jour `prepareBatch` :

Ajouter en haut du fichier, après les autres requires :
```js
const { LM_DEFAULTS, resolveCatalogue } = require('./utils/clientConfig');
```

Remplacer la signature et le corps de `prepareBatch` :
```js
function prepareBatch({ root, outDir, sources, saisies, inventaire, config, reglages, resources = DEFAULT_RESOURCES, cacheDir, scan, clientConfig, ...selection }) {
  const resolvedConfig = clientConfig || LM_DEFAULTS;
  if (!inventaire && !scan) scan = scanGamme(root, { sources, saisies, clientConfig: resolvedConfig });
  const cataloguePath = config
    ? config
    : resolveCatalogue(resolvedConfig, root || '', path.join(resources, 'gamme_deco.csv'));
  const ctx = createContext({
    root,
    rows: scan ? scan.rows : readInventaire(inventaire),
    deco: reglages || readDecors(cataloguePath),
    resources,
    cacheDir: cacheDir || path.join(outDir, '.cache'),
    clientConfig: resolvedConfig,
  });
  setFontsDir(path.join(ctx.resources, 'fonts'));
  const manifest = new Manifest(outDir);
  const plan = buildPlan(ctx, { outDir, manifest, ...selection });
  return { ctx, manifest, plan, scan, selection };
}
```

Supprimer la fonction `defaultReglages` (remplacée par `resolveCatalogue`) et retirer son export. Mettre à jour `module.exports` :
```js
module.exports = {
  prepareBatch, runBatch, runPlan, defaultJobs, currentLock, log, configureLog,
  scanGamme, readInventaire, writeInventaire, TYPES, FORMATS, LM_DEFAULTS,
};
```

- [ ] **Step 2 : Vérifier que les tests passent**

```powershell
cd app && npm test
```

- [ ] **Step 3 : Commit**

```powershell
git add app/src/core/index.js
git commit -m "feat: prepareBatch — accepte clientConfig, résout le catalogue dynamiquement"
```

---

## Task 6 : main.js — chargement config, IPC, importCsv

**Files:**
- Modify: `app/src/main/main.js`

- [ ] **Step 1 : Importer clientConfig et déclarer la variable**

En haut de `app/src/main/main.js`, ajouter après les requires existants :
```js
const { LM_DEFAULTS, loadClientConfig, buildRegex } = require('../core/utils/clientConfig');
```

Juste après `let settings = { ...DEFAULTS };`, ajouter :
```js
let clientConfig = LM_DEFAULTS;
```

- [ ] **Step 2 : Ajouter loadClientConfigFromGamme()**

Après la fonction `saveSettings()`, ajouter :
```js
function loadClientConfigFromGamme() {
  if (!settings.gamme) { clientConfig = LM_DEFAULTS; return; }
  try {
    clientConfig = loadClientConfig(settings.gamme) || LM_DEFAULTS;
  } catch (e) {
    log.warn(`config.json invalide dans ${settings.gamme} : ${e.message}`);
    clientConfig = LM_DEFAULTS;
  }
}
```

- [ ] **Step 3 : Mettre à jour analyse() pour signaler l'absence de config**

Dans `analyse()`, juste après la vérification `fs.existsSync(settings.gamme)` et avant le scan, ajouter :
```js
  loadClientConfigFromGamme();
  const configPath = path.join(settings.gamme, 'config.json');
  if (!fs.existsSync(configPath)) {
    return { settings, needs: 'config', clientConfig: LM_DEFAULTS };
  }
```

- [ ] **Step 4 : Mettre à jour prepare() pour passer clientConfig**

Remplacer `prepare()` :
```js
function prepare({ dossiers, force = false }) {
  return core.prepareBatch({
    root: settings.gamme,
    outDir: settings.outDir,
    scan,
    clientConfig,
    resources: RESOURCES,
    cacheDir: cacheDir(),
    types: settings.types,
    rangement: settings.rangement,
    deco: dossiers,
    force,
  });
}
```

- [ ] **Step 5 : Mettre à jour importCsv() et set-refs pour utiliser clientConfig**

Dans `importCsv()`, remplacer :
```js
    if (!/^9\d{7}$/.test(ref) || !r.largeur || !r.hauteur) continue;
```
par :
```js
    const refFullRe = new RegExp(`^(${clientConfig.refPattern})$`);
    if (!refFullRe.test(ref) || !r.largeur || !r.hauteur) continue;
```

Dans le handler `ipcMain.handle('set-refs', ...)`, remplacer :
```js
    const clean = refs.filter(r => /^9\d{7}$/.test(r.ref)).map(r => ({ ref: r.ref, finition: r.finition || '' }));
```
par :
```js
    const refFullRe = new RegExp(`^(${clientConfig.refPattern})$`);
    const clean = refs.filter(r => refFullRe.test(r.ref)).map(r => ({ ref: r.ref, finition: r.finition || '' }));
```

- [ ] **Step 6 : Ajouter les 3 handlers IPC config-client**

Dans `createWindow()`, après les handlers existants, ajouter :
```js
  ipcMain.handle('config-client:load', () => {
    if (!settings.gamme) return { config: LM_DEFAULTS, catalogueStatus: 'fallback' };
    const { resolveCatalogue, catalogueFilename } = require('../core/utils/clientConfig');
    const autoName = catalogueFilename(clientConfig.client);
    const autoPath = path.join(settings.gamme, autoName);
    const defaultCsv = path.join(RESOURCES, 'gamme_deco.csv');
    const resolved = resolveCatalogue(clientConfig, settings.gamme, defaultCsv);
    const catalogueStatus = clientConfig.catalogue && resolved !== defaultCsv ? 'custom'
      : resolved !== defaultCsv ? 'auto'
      : 'fallback';
    return { config: clientConfig, catalogueStatus, autoName };
  });

  ipcMain.handle('config-client:save', (_, newConfig) => {
    if (!settings.gamme) throw new Error('Aucun dossier GAMME sélectionné');
    const configPath = path.join(settings.gamme, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    loadClientConfigFromGamme();
    scan = null;
    log.info(`config.json enregistré pour ${newConfig.client}`);
  });

  ipcMain.handle('config-client:browse-catalogue', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Choisir le fichier catalogue CSV',
      defaultPath: settings.gamme || undefined,
      filters: [{ name: 'Fichiers CSV', extensions: ['csv'] }],
      properties: ['openFile'],
    });
    return r.canceled ? null : r.filePaths[0];
  });
```

- [ ] **Step 7 : Mettre à jour le handler choose-folder pour recharger le config**

Dans le handler `choose-folder`, après `saveSettings();`, ajouter :
```js
    if (kind === 'gamme') { loadClientConfigFromGamme(); scan = null; }
```

- [ ] **Step 8 : Vérifier que les tests passent**

```powershell
cd app && npm test
```

- [ ] **Step 9 : Commit**

```powershell
git add app/src/main/main.js
git commit -m "feat: main — chargement config.json par GAMME, IPC config-client, regex dynamique"
```

---

## Task 7 : preload.js — exposer l'API config-client

**Files:**
- Modify: `app/src/main/preload.js`

- [ ] **Step 1 : Ajouter les 3 méthodes dans l'objet api**

Dans `app/src/main/preload.js`, ajouter dans `contextBridge.exposeInMainWorld('api', { ... })` :
```js
  loadClientConfig: () => ipcRenderer.invoke('config-client:load'),
  saveClientConfig: config => ipcRenderer.invoke('config-client:save', config),
  browseCatalogue: () => ipcRenderer.invoke('config-client:browse-catalogue'),
```

- [ ] **Step 2 : Commit**

```powershell
git add app/src/main/preload.js
git commit -m "feat: preload — expose API config-client au renderer"
```

---

## Task 8 : UI — panneau Réglages client

**Files:**
- Modify: `app/src/renderer/index.html`
- Modify: `app/src/renderer/style.css`
- Create: `app/src/renderer/reglages-client.js`
- Modify: `app/src/renderer/app.js`

- [ ] **Step 1 : Ajouter les styles dans style.css**

À la fin de `app/src/renderer/style.css`, ajouter :
```css
/* Panneau Réglages client */
.rc-fond { position: fixed; inset: 0; background: rgba(31,43,42,0.32); z-index: 150; }
.rc-fond[hidden] { display: none !important; }
.rc-modale {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: min(640px, 96vw); max-height: 92vh;
  background: var(--surface); border: 1px solid var(--trait); border-radius: 6px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.18);
  display: flex; flex-direction: column; z-index: 151;
}
.rc-entete {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid var(--trait); flex: none;
}
.rc-titre { font-size: var(--t-titre); font-weight: 700; }
.rc-alerte {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 22px; background: var(--caramel-clair);
  border-bottom: 1px solid #e8c9a0; flex: none; font-size: var(--t-petit);
}
.rc-alerte[hidden] { display: none !important; }
.rc-corps { overflow-y: auto; padding: 20px 24px 24px; flex: 1; display: grid; gap: 18px; }
.rc-section { display: grid; gap: 10px; }
.rc-section-titre {
  font-size: var(--t-petit); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--doux); padding-bottom: 6px; border-bottom: 1px solid var(--trait);
}
.rc-champ { display: grid; gap: 4px; }
.rc-champ label { font-size: var(--t-petit); font-weight: 700; }
.rc-champ input[type="text"] {
  padding: 7px 10px; border: 1px solid var(--trait); border-radius: 3px;
  background: var(--surface); font: inherit; color: inherit; width: 100%;
}
.rc-champ input[type="text"]:focus { outline: 2px solid var(--vdg); outline-offset: 2px; border-color: var(--vdg); }
.rc-champ input.mono { font-family: monospace; font-size: var(--t-petit); }
.rc-grille2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rc-testeur { background: var(--fond); border-radius: 3px; padding: 10px 12px; display: grid; gap: 4px; }
.rc-testeur label { font-size: var(--t-petit); color: var(--doux); }
.rc-testeur input { padding: 6px 9px; border: 1px solid var(--trait); border-radius: 3px; background: var(--surface); font-family: monospace; font-size: var(--t-petit); width: 100%; }
.rc-testeur-res { font-size: var(--t-petit); font-weight: 700; min-height: 18px; padding-top: 4px; }
.rc-testeur-res.ok { color: var(--vdg-fonce); }
.rc-testeur-res.err { color: var(--caramel); }
.rc-bascule { display: inline-flex; border: 1px solid var(--trait); border-radius: 3px; overflow: hidden; }
.rc-bascule button { background: var(--surface); border: 0; padding: 6px 14px; font: inherit; font-size: var(--t-petit); cursor: pointer; }
.rc-bascule button + button { border-left: 1px solid var(--trait); }
.rc-bascule button[aria-checked="true"] { background: var(--vdg-clair); color: var(--vdg-fonce); font-weight: 700; }
.rc-cat-statut { display: flex; align-items: center; gap: 8px; font-size: var(--t-petit); color: var(--doux); margin-top: 6px; }
.rc-puce { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.rc-puce.ok { background: var(--vdg); }
.rc-puce.absent { background: var(--caramel); }
.rc-puce.fallback { background: var(--trait); }
.rc-cat-perso { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
.rc-cat-perso input { flex: 1; padding: 7px 10px; border: 1px solid var(--trait); border-radius: 3px; background: var(--surface); font: inherit; font-size: var(--t-petit); }
.rc-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.rc-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px 3px 10px; background: var(--fond); border: 1px solid var(--trait); border-radius: 3px; font-size: var(--t-petit); }
.rc-tag button { background: none; border: 0; padding: 0 2px; color: var(--doux); cursor: pointer; font-size: 13px; line-height: 1; }
.rc-tag button:hover { color: var(--rouge); }
.rc-tag-ajout { display: inline-flex; gap: 4px; }
.rc-tag-ajout input { width: 80px; padding: 3px 8px; border: 1px solid var(--trait); border-radius: 3px; font: inherit; font-size: var(--t-petit); }
.rc-tag-ajout button { padding: 3px 10px; background: var(--surface); border: 1px solid var(--trait); border-radius: 3px; font: inherit; font-size: var(--t-petit); cursor: pointer; }
.rc-tag-ajout button:hover { border-color: var(--vdg); color: var(--vdg); }
.rc-pied { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trait); flex: none; }
```

- [ ] **Step 2 : Ajouter le bouton et la modal dans index.html**

Dans `app/src/renderer/index.html`, dans `<header class="barre">`, ajouter avant `<div class="options-wrap">` :
```html
    <button class="secondaire" id="btn-reglages-client">⚙ Réglages client</button>
```

Avant `<script src="app.js"></script>`, ajouter la modal et le script :
```html
  <!-- Panneau Réglages client -->
  <div class="rc-fond" id="rc-fond" hidden></div>
  <div class="rc-modale" id="rc-modale" role="dialog" aria-modal="true" aria-labelledby="rc-titre" hidden>
    <div class="rc-entete">
      <strong class="rc-titre" id="rc-titre">Réglages client</strong>
      <button class="tiroir-fermer" id="rc-fermer" aria-label="Fermer">✕</button>
    </div>
    <div class="rc-alerte" id="rc-alerte" hidden>
      Aucune configuration trouvée — complétez les réglages pour activer l'analyse.
    </div>
    <div class="rc-corps">
      <div class="rc-section">
        <div class="rc-section-titre">Identité</div>
        <div class="rc-champ"><label for="rc-client">Nom du client</label><input type="text" id="rc-client"></div>
      </div>
      <div class="rc-section">
        <div class="rc-section-titre">Catalogue décors</div>
        <div class="rc-champ">
          <label>Source du catalogue</label>
          <div class="rc-bascule" role="radiogroup" id="rc-cat-bascule">
            <button role="radio" aria-checked="true" data-mode="auto">Auto</button>
            <button role="radio" aria-checked="false" data-mode="perso">Fichier personnalisé</button>
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
          <label for="rc-ref-pattern">Pattern — Référence produit</label>
          <input type="text" id="rc-ref-pattern" class="mono">
          <p class="aide">Expression régulière. Ex : <code>9\d{7}</code> → 8 chiffres commençant par 9.</p>
        </div>
        <div class="rc-testeur">
          <label for="rc-ref-test">Tester avec un nom de fichier</label>
          <input type="text" id="rc-ref-test" placeholder="000 BLANC 100x210 94953622 MAT.jpg">
          <div class="rc-testeur-res" id="rc-ref-res"></div>
        </div>
        <div class="rc-champ">
          <label for="rc-motif-pattern">Pattern — Motif source</label>
          <input type="text" id="rc-motif-pattern" class="mono">
          <p class="aide">Identifie un fichier image comme visuel source. Ex : <code>au\s*10\s*[èée]m</code></p>
        </div>
        <div class="rc-testeur">
          <label for="rc-motif-test">Tester avec un nom de fichier</label>
          <input type="text" id="rc-motif-test" placeholder="000 BLANC 100x210 au 10ème 94956949.jpg">
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
      </div>
      <div class="rc-section">
        <div class="rc-section-titre">Finitions</div>
        <div class="rc-tags" id="rc-finitions-tags"></div>
        <p class="aide">Tels qu'écrits dans les noms de fichiers (insensible à la casse).</p>
      </div>
    </div>
    <div class="rc-pied">
      <button class="secondaire" id="rc-annuler">Annuler</button>
      <button class="principal" id="rc-enregistrer">Enregistrer</button>
    </div>
  </div>
  <script src="reglages-client.js"></script>
```

- [ ] **Step 3 : Créer reglages-client.js**

Créer `app/src/renderer/reglages-client.js` :
```js
// Panneau de configuration client (modal).
const $ = sel => document.querySelector(sel);

const rcFond = $('#rc-fond');
const rcModale = $('#rc-modale');
let catalogueMode = 'auto';
let isFirstLaunch = false;

function ouvrirPanel(premierLancement = false) {
  isFirstLaunch = premierLancement;
  $('#rc-alerte').hidden = !premierLancement;
  $('#rc-annuler').textContent = premierLancement ? 'Continuer avec les valeurs par défaut' : 'Annuler';
  rcFond.hidden = false;
  rcModale.hidden = false;
  chargerConfig();
}

function fermerPanel() {
  rcFond.hidden = true;
  rcModale.hidden = true;
}

async function chargerConfig() {
  const { config, catalogueStatus, autoName } = await api.loadClientConfig();
  $('#rc-client').value = config.client;
  $('#rc-ref-pattern').value = config.refPattern;
  $('#rc-motif-pattern').value = config.motifPattern;
  $('#rc-output').value = config.outputFolder;
  $('#rc-prefix').value = config.uniPrefix;
  setCatalogueMode(config.catalogue ? 'perso' : 'auto');
  if (config.catalogue) $('#rc-cat-chemin').value = config.catalogue;
  majStatutCatalogue(catalogueStatus, autoName);
  renderTags('formats', config.formats);
  renderTags('finitions', config.finitions);
  testerRef();
  testerMotif();
}

function setCatalogueMode(mode) {
  catalogueMode = mode;
  for (const btn of document.querySelectorAll('#rc-cat-bascule button'))
    btn.setAttribute('aria-checked', btn.dataset.mode === mode);
  $('#rc-cat-auto-statut').hidden = mode !== 'auto';
  $('#rc-cat-perso-wrap').hidden = mode !== 'perso';
}

function majStatutCatalogue(status, autoName) {
  const puce = $('#rc-cat-puce');
  const label = $('#rc-cat-label');
  if (status === 'auto') {
    puce.className = 'rc-puce ok';
    label.innerHTML = `<code style="font-family:monospace;font-size:11px;background:var(--fond);padding:1px 5px;border-radius:2px">${autoName}</code> trouvé dans le dossier GAMME`;
  } else if (status === 'fallback') {
    puce.className = 'rc-puce fallback';
    label.textContent = `${autoName} absent — fallback sur le catalogue intégré`;
  } else {
    puce.className = 'rc-puce ok';
    label.textContent = 'Fichier personnalisé utilisé';
  }
}

function testerRef() {
  const pattern = $('#rc-ref-pattern').value;
  const texte = $('#rc-ref-test').value;
  const el = $('#rc-ref-res');
  if (!texte) { el.textContent = ''; el.className = 'rc-testeur-res'; return; }
  try {
    const m = texte.match(new RegExp(`\\b(${pattern})\\b`));
    el.className = `rc-testeur-res ${m ? 'ok' : 'err'}`;
    el.textContent = m ? `✓ Référence trouvée : ${m[1]}` : '✗ Aucune référence trouvée';
  } catch { el.className = 'rc-testeur-res err'; el.textContent = '✗ Pattern invalide'; }
}

function testerMotif() {
  const pattern = $('#rc-motif-pattern').value;
  const texte = $('#rc-motif-test').value;
  const el = $('#rc-motif-res');
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

function renderTags(type, values) {
  const container = $(`#rc-${type}-tags`);
  const inputId = type === 'formats' ? 'rc-format-input' : 'rc-finition-input';
  container.innerHTML = values.map(v =>
    `<span class="rc-tag">${v} <button data-suppr="${v}" data-type="${type}" aria-label="Supprimer ${v}">✕</button></span>`
  ).join('') +
  `<div class="rc-tag-ajout"><input id="${inputId}" type="text" placeholder="${type === 'formats' ? '125x300' : 'SATINÉ'}"><button data-ajouter="${type}">+ Ajouter</button></div>`;
}

function getValues(type) {
  return [...document.querySelectorAll(`#rc-${type}-tags .rc-tag`)].map(el => el.childNodes[0].textContent.trim());
}

async function enregistrer() {
  const config = {
    client: $('#rc-client').value.trim(),
    catalogue: catalogueMode === 'perso' ? $('#rc-cat-chemin').value.trim() : '',
    refPattern: $('#rc-ref-pattern').value.trim(),
    outputFolder: $('#rc-output').value,
    formats: getValues('formats'),
    finitions: getValues('finitions'),
    motifPattern: $('#rc-motif-pattern').value.trim(),
    uniPrefix: $('#rc-prefix').value.trim(),
  };
  try {
    await api.saveClientConfig(config);
    fermerPanel();
    window.dispatchEvent(new Event('rc:saved'));
  } catch (e) {
    alert(`Erreur lors de l'enregistrement : ${e.message}`);
  }
}

// Événements
$('#btn-reglages-client').addEventListener('click', () => ouvrirPanel(false));
$('#rc-fermer').addEventListener('click', fermerPanel);
$('#rc-annuler').addEventListener('click', fermerPanel);
$('#rc-enregistrer').addEventListener('click', enregistrer);
$('#rc-fond').addEventListener('click', fermerPanel);

$('#rc-cat-bascule').addEventListener('click', e => {
  const btn = e.target.closest('[data-mode]');
  if (btn) setCatalogueMode(btn.dataset.mode);
});

$('#rc-cat-parcourir').addEventListener('click', async () => {
  const p = await api.browseCatalogue();
  if (p) $('#rc-cat-chemin').value = p;
});

$('#rc-ref-pattern').addEventListener('input', testerRef);
$('#rc-ref-test').addEventListener('input', testerRef);
$('#rc-motif-pattern').addEventListener('input', testerMotif);
$('#rc-motif-test').addEventListener('input', testerMotif);

document.addEventListener('click', e => {
  const suppr = e.target.closest('[data-suppr]');
  if (suppr) { suppr.closest('.rc-tag').remove(); return; }
  const ajouter = e.target.closest('[data-ajouter]');
  if (ajouter) {
    const type = ajouter.dataset.ajouter;
    const inputId = type === 'formats' ? 'rc-format-input' : 'rc-finition-input';
    const input = $(`#${inputId}`);
    const val = input.value.trim();
    if (!val) return;
    const container = $(`#rc-${type}-tags`);
    const ajoutEl = container.querySelector('.rc-tag-ajout');
    const tag = document.createElement('span');
    tag.className = 'rc-tag';
    tag.innerHTML = `${val} <button data-suppr="${val}" data-type="${type}" aria-label="Supprimer ${val}">✕</button>`;
    container.insertBefore(tag, ajoutEl);
    input.value = '';
    input.focus();
  }
});

document.addEventListener('keydown', e => { if (e.key === 'Enter') {
  const ajouter = e.target.closest('[id$="-input"]');
  if (ajouter) ajouter.nextElementSibling?.click();
}});

window.ouvrirReglagesClient = ouvrirPanel;
```

- [ ] **Step 4 : Brancher dans app.js**

Dans `app/src/renderer/app.js`, dans la fonction `refresh()`, après `state.data = await api.analyse();`, ajouter :
```js
    if (state.data?.needs === 'config') {
      window.ouvrirReglagesClient(true);
      return renderLot();
    }
```

Ajouter l'écoute de l'événement `rc:saved` en bas de `app.js` :
```js
window.addEventListener('rc:saved', () => refresh());
```

- [ ] **Step 5 : Lancer l'app et vérifier**

```powershell
cd app && npm start
```

Vérifier :
- Le bouton "⚙ Réglages client" est visible dans la barre
- Ouvrir un dossier GAMME sans `config.json` → le panneau s'ouvre automatiquement avec l'alerte
- Le panneau s'ouvre via le bouton
- Les testeurs fonctionnent en live
- Enregistrer crée `config.json` dans le dossier GAMME et relance l'analyse

- [ ] **Step 6 : Commit**

```powershell
git add app/src/renderer/style.css app/src/renderer/reglages-client.js app/src/renderer/index.html app/src/renderer/app.js app/src/main/preload.js
git commit -m "feat: UI — panneau Réglages client (modal, testeurs, tags)"
```

---

## Task 9 : config.example.json

**Files:**
- Create: `app/resources/config.example.json`

- [ ] **Step 1 : Créer le template**

Créer `app/resources/config.example.json` :
```json
{
  "_commentaire": "Copiez ce fichier sous le nom config.json dans votre dossier GAMME et adaptez les valeurs.",
  "client": "Nom du client",
  "catalogue": "",
  "refPattern": "9\\d{7}",
  "outputFolder": " LM WEB 2025",
  "formats": ["100x210", "100x255", "125x210", "125x255", "150x210", "150x255"],
  "finitions": ["MAT", "BRILLANT"],
  "motifPattern": "au\\s*10\\s*[èée]m",
  "uniPrefix": "ULM"
}
```

- [ ] **Step 2 : Commit final**

```powershell
git add app/resources/config.example.json
git commit -m "feat: ajouter config.example.json comme modèle par client"
```

---

## Self-review

**Couverture spec :**
- ✅ `config.json` par client dans le dossier GAMME
- ✅ 8 champs requis (client, catalogue, refPattern, outputFolder, formats, finitions, motifPattern, uniPrefix)
- ✅ Catalogue : priorité custom > auto `gamme_{Client}.csv` > fallback LM
- ✅ Convention `gamme_{Client}.csv` avec normalisation underscores
- ✅ Bouton "Réglages client" toujours visible
- ✅ Auto-ouverture si `config.json` absent
- ✅ Testeurs live pour refPattern et motifPattern
- ✅ Tags add/remove pour formats et finitions
- ✅ Rétrocompatibilité CLI (LM_DEFAULTS si pas de config)
- ✅ Améliorations futures notées dans la spec, hors scope ici

**Types cohérents entre tâches :**
- `buildRegex(config)` → `{ refRe, finitionRe, motifRe }` : utilisé Task 1 (test), Task 2 (inventaire), Task 8 (testeur JS)
- `clientConfig` : objet avec les 8 champs de `LM_DEFAULTS`, propagé Task 3→4→5→6
- `api.loadClientConfig()` → `{ config, catalogueStatus, autoName }` : défini Task 6, consommé Task 8
