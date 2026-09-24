// Processus principal : fenêtre, réglages de l'utilisateur et pont entre l'interface et le moteur.
// La GAMME n'est jamais modifiée : les décors déposés et les références saisies restent dans les réglages de l'app.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const sharp = require('sharp');
const core = require('../core');
const { log } = core;
const { readCsv } = require('../core/utils/csv');
const { formatKey } = require('../core/inventaire');

// Gabarits, pages statiques, polices et réglages livrés : dans l'app (non archivée, voir « build.asar »).
const RESOURCES = path.join(__dirname, '..', '..', 'resources');

// ---------------------------------------------------------------------------
// Réglages de l'utilisateur (userData/reglages.json).

const settingsFile = () => path.join(app.getPath('userData'), 'reglages.json');
const DEFAULTS = { gamme: '', outDir: '', rangement: 'plat', sources: [], saisies: {}, reglages: {}, types: core.TYPES };
let settings = { ...DEFAULTS };

function loadSettings() {
  try {
    settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch (e) {
    if (e.code !== 'ENOENT') log.warn(`Réglages illisibles (${settingsFile()}), valeurs par défaut utilisées : ${e.message}`);
    settings = { ...DEFAULTS };
  }
}
function saveSettings() {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

// Réglages des décors : ceux livrés avec l'app, corrigés par ceux saisis dans l'app.
function mergedReglages() {
  const byDossier = new Map(core.defaultReglages(RESOURCES).map(r => [r.dossier, r]));
  for (const [dossier, r] of Object.entries(settings.reglages)) byDossier.set(dossier, { ...byDossier.get(dossier), dossier, ...r });
  return [...byDossier.values()];
}

const cacheDir = () => path.join(app.getPath('userData'), 'cache');
const logsDir = () => path.join(app.getPath('userData'), 'logs');

// ---------------------------------------------------------------------------
// Analyse : scan de la GAMME et des décors déposés, puis état de chaque décor dans le dossier de sortie.

let scan = null;

function analyse() {
  if (!settings.gamme) return { settings, needs: 'gamme' };
  if (!fs.existsSync(settings.gamme)) {
    log.warn(`Dossier GAMME introuvable : ${settings.gamme}`);
    return { settings, needs: 'gamme', error: `Dossier GAMME introuvable : ${settings.gamme}` };
  }
  const t0 = Date.now();
  scan = core.scanGamme(settings.gamme, { sources: settings.sources, saisies: settings.saisies });
  const reglages = mergedReglages();
  const plan = settings.outDir ? prepare({}).plan : null;
  const blockedBy = new Map();
  for (const b of plan?.blocked ?? []) {
    const list = blockedBy.get(b.dossier) || [];
    if (!list.includes(`${b.type} : ${b.message}`)) list.push(`${b.type} : ${b.message}`);
    blockedBy.set(b.dossier, list);
  }
  const decors = scan.decors.filter(d => d.depot || d.formats.some(f => f.motif || f.refs.length)).map(d => ({
    dossier: d.dossier,
    decor: d.decor,
    chemin: path.join(d.base, d.dossier),
    depot: d.depot,
    formats: d.formats.map(f => ({ ...f, chemin: f.motif ? path.join(d.base, d.dossier, f.motif) : null })),
    problems: d.problems,
    refs: new Set(d.rows.filter(r => r.ref).map(r => r.ref)).size,
    stats: plan?.byDossier[d.dossier] ?? { images: 0, upToDate: 0, blocked: 0 },
    impossibles: blockedBy.get(d.dossier) ?? [],
    reglage: reglages.find(r => r.dossier === d.dossier) ?? {},
  })).sort((a, b) => a.dossier.localeCompare(b.dossier, 'fr'));
  log.info(`Analyse de ${settings.gamme} : ${decors.length} décos, ${scan.problems.length} problèmes` +
    (plan ? `, ${plan.counts.images} images à faire, ${plan.counts.blocked} impossibles` : ', pas de dossier de sortie') +
    ` (${Date.now() - t0} ms)`);
  for (const p of scan.problems) log.debug(`Problème : ${p}`);
  for (const b of plan?.blocked ?? []) log.debug(`Impossible : ${b.dossier} ${b.ref} ${b.type} : ${b.message}`);
  const unis = scan.decors.map(d => d.dossier.match(/^(\d{3})\s+(.*)$/)).filter(Boolean).map(m => ({ code: m[1], nom: m[2] }));
  return {
    settings,
    decors,
    unis,
    counts: plan?.counts ?? null,
    lock: settings.outDir ? core.currentLock(settings.outDir) : null,
  };
}

function prepare({ dossiers, force = false }) {
  return core.prepareBatch({
    root: settings.gamme,
    outDir: settings.outDir,
    scan,
    reglages: mergedReglages(),
    resources: RESOURCES,
    cacheDir: cacheDir(),
    types: settings.types,
    rangement: settings.rangement,
    decors: dossiers,
    force,
  });
}

// ---------------------------------------------------------------------------
// Dépôt : dossiers décors (ajoutés comme sources) et CSV de références (ajoutées comme saisies).

function importCsv(file) {
  const rows = readCsv(file);
  let added = 0;
  const unknown = new Set();
  for (const r of rows) {
    const ref = (r.ref || '').trim();
    const d = scan?.decors.find(x => x.dossier === r.dossier || x.decor.toUpperCase() === (r.decor || '').toUpperCase());
    if (!/^9\d{7}$/.test(ref) || !r.largeur || !r.hauteur) continue;
    if (!d) { unknown.add(r.dossier || r.decor); continue; }
    const dir = path.join(d.base, d.dossier);
    const k = formatKey(`${r.largeur}x${r.hauteur}`, (r.cote || '').toUpperCase());
    const list = ((settings.saisies[dir] ??= {})[k] ??= []);
    const existing = list.find(x => x.ref === ref);
    if (existing) existing.finition = (r.finition || '').toUpperCase();
    else list.push({ ref, finition: (r.finition || '').toUpperCase() });
    added++;
  }
  return { added, unknown: [...unknown] };
}

function drop(paths) {
  const messages = [];
  for (const p of paths) {
    let stat;
    try { stat = fs.statSync(p); } catch { messages.push(`${path.basename(p)} : introuvable`); continue; }
    if (stat.isDirectory()) {
      const inGamme = settings.gamme && path.resolve(path.dirname(p)) === path.resolve(settings.gamme);
      if (inGamme) messages.push(`${path.basename(p)} est déjà dans la GAMME`);
      else if (!settings.sources.includes(p)) { settings.sources.push(p); messages.push(`${path.basename(p)} ajouté`); }
    } else if (/\.csv$/i.test(p)) {
      if (!scan) analyse();
      const r = importCsv(p);
      messages.push(`${path.basename(p)} : ${r.added} références importées` + (r.unknown.length ? ` ; décos inconnues : ${r.unknown.join(', ')}` : ''));
    } else {
      messages.push(`${path.basename(p)} : déposez un dossier déco ou un fichier CSV`);
    }
  }
  saveSettings();
  return messages;
}

// ---------------------------------------------------------------------------
// Génération.

let running = null; // AbortController du lot en cours
let runningDone = null; // promesse de fin du lot en cours

async function generate(win, { dossiers, force }) {
  if (running) return { error: 'Un lot est déjà en cours.' };
  if (!settings.outDir) return { error: 'Choisissez d\'abord un dossier de sortie.' };
  const batch = prepare({ dossiers, force });
  running = new AbortController();
  let finished;
  runningDone = new Promise(r => { finished = r; });
  const send = e => { if (!win.isDestroyed()) win.webContents.send('progress', e); };
  send({ type: 'begin', total: batch.plan.renders.length + batch.plan.copies.length, images: batch.plan.counts.images });
  try {
    const result = await core.runBatch(batch, { signal: running.signal, onEvent: send });
    return { ...result, images: batch.plan.counts.images };
  } catch (e) {
    if (e.code === 'LOCKED') log.warn(e.message);
    else log.error(e);
    return { error: e.message, locked: e.code === 'LOCKED' };
  } finally {
    running = null;
    finished();
  }
}

// ---------------------------------------------------------------------------
// Vignettes des motifs (mémorisées : les motifs sont lus sur le réseau).

const thumbs = new Map();
async function thumb(file, height = 240) {
  const key = `${file}|${height}`;
  if (!thumbs.has(key)) {
    thumbs.set(key, sharp(file).resize({ height }).jpeg({ quality: 80 }).toBuffer()
      .then(b => `data:image/jpeg;base64,${b.toString('base64')}`)
      .catch(e => { log.warn(`Vignette impossible (${file}) : ${e.message}`); return null; }));
  }
  return thumbs.get(key);
}

// ---------------------------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1040,
    minHeight: 680,
    title: 'Visuels web',
    backgroundColor: '#e9ecea',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  ipcMain.handle('analyse', () => {
    try { return analyse(); } catch (e) { log.error(e); throw e; }
  });
  ipcMain.handle('choose-folder', async (_, kind) => {
    const r = await dialog.showOpenDialog(win, {
      title: kind === 'gamme' ? 'Dossier GAMME' : 'Dossier de sortie',
      defaultPath: settings[kind === 'gamme' ? 'gamme' : 'outDir'] || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled) return null;
    settings[kind === 'gamme' ? 'gamme' : 'outDir'] = r.filePaths[0];
    log.info(`Dossier ${kind === 'gamme' ? 'GAMME' : 'de sortie'} choisi : ${r.filePaths[0]}`);
    saveSettings();
    return r.filePaths[0];
  });
  ipcMain.handle('set-option', (_, name, value) => {
    if (!['rangement', 'types'].includes(name)) return;
    settings[name] = value;
    saveSettings();
  });
  ipcMain.handle('drop', (_, paths) => drop(paths));
  ipcMain.handle('add-source', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Ajouter un dossier déco',
      defaultPath: settings.gamme || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled || !r.filePaths.length) return [];
    return drop(r.filePaths);
  });
  ipcMain.handle('remove-source', (_, p) => {
    settings.sources = settings.sources.filter(s => s !== p);
    saveSettings();
  });
  ipcMain.handle('set-refs', (_, dir, key, refs) => {
    const clean = refs.filter(r => /^9\d{7}$/.test(r.ref)).map(r => ({ ref: r.ref, finition: r.finition || '' }));
    settings.saisies[dir] ??= {};
    if (clean.length) settings.saisies[dir][key] = clean;
    else delete settings.saisies[dir][key];
    saveSettings();
  });
  ipcMain.handle('set-reglage', (_, dossier, reglage) => {
    settings.reglages[dossier] = { ...settings.reglages[dossier], ...reglage };
    saveSettings();
  });
  ipcMain.handle('thumb', (_, file, height) => thumb(file, height));
  ipcMain.handle('generate', (_, options) => generate(win, options));
  ipcMain.handle('cancel', () => running?.abort());
  ipcMain.handle('open-output', () => settings.outDir && shell.openPath(settings.outDir));
  ipcMain.handle('open-logs', () => shell.openPath(logsDir()));
  // Erreurs de l'interface, consignées dans le même journal.
  ipcMain.handle('log', (_, level, text) => {
    if (['error', 'warn', 'info'].includes(level)) log[level](`Interface : ${text}`);
  });
}

// Développement : VISUELS_USERDATA isole les réglages ; VISUELS_CAPTURE=<png> exécute VISUELS_SCRIPT dans la page,
// enregistre une capture de la fenêtre puis quitte.
if (process.env.VISUELS_USERDATA) app.setPath('userData', process.env.VISUELS_USERDATA);

// Plantage du processus principal : consigné, puis signalé comme le fait Electron par défaut.
const crash = e => {
  log.error(e instanceof Error ? e : new Error(String(e)));
  dialog.showErrorBox('Erreur inattendue', `${e?.stack || e}

Détails dans les logs : ${logsDir()}`);
};
process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

app.whenReady().then(() => {
  core.configureLog({ dir: logsDir() });
  log.info(`Démarrage de Visuels web ${app.getVersion()} — ${os.type()} ${os.release()} ${process.arch}, Electron ${process.versions.electron}`);
  loadSettings();
  log.info(`GAMME : ${settings.gamme || 'non choisie'} — sortie : ${settings.outDir || 'non choisie'}`);
  createWindow();
  const capture = process.env.VISUELS_CAPTURE;
  if (capture) {
    const win = BrowserWindow.getAllWindows()[0];
    win.webContents.once('did-finish-load', async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      await wait(Number(process.env.VISUELS_WAIT || 4000));
      if (process.env.VISUELS_SCRIPT) {
        await win.webContents.executeJavaScript(fs.readFileSync(process.env.VISUELS_SCRIPT, 'utf8'));
        await wait(Number(process.env.VISUELS_WAIT_AFTER || 3000));
      }
      fs.writeFileSync(capture, (await win.webContents.capturePage()).toPNG());
      app.quit();
    });
  }
});
// Fermeture pendant un lot : on l'annule et on attend qu'il libère le verrou et ses fichiers temporaires.
app.on('before-quit', async e => {
  if (!running) return;
  e.preventDefault();
  running.abort();
  await runningDone;
  app.quit();
});
app.on('window-all-closed', () => app.quit());
