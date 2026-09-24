// Point d'entrée du moteur (utilisé par le CLI et par l'application).
const fs = require('fs');
const path = require('path');
const { createContext, readDecors, DEFAULT_RESOURCES } = require('./context');
const { scanGamme, readInventaire, writeInventaire, FORMATS } = require('./inventaire');
const { buildPlan } = require('./batch/plan');
const { runPlan, defaultJobs } = require('./batch/runner');
const { Manifest } = require('./utils/manifest');
const { acquireLock, currentLock } = require('./utils/lock');
const { TYPES } = require('./render/renderers');
const { setFontsDir } = require('./render/render');
const { log, configureLog, logLot } = require('./utils/log');

// Réglages des décors livrés avec l'app (uni, libellé, cadrage C), relevés sur les InDesign existants.
const defaultReglages = (resources = DEFAULT_RESOURCES) => readDecors(path.join(resources, 'gamme_deco.csv'));

/**
 * Prépare un lot : scan, contexte, manifeste et plan (rien n'est encore écrit).
 * @param {object} o
 * @param {string} o.root dossier GAMME (lecture seule)
 * @param {string} o.outDir dossier de sortie
 * @param {string[]} [o.sources] décors déposés (chemins complets)
 * @param {object} [o.saisies] réfs saisies, par chemin complet de dossier décor
 * @param {string} [o.inventaire] inventaire CSV à la place du scan
 * @param {string} [o.config] gamme_deco.csv à la place des réglages livrés
 * @param {object[]} [o.reglages] réglages des décors (prioritaires sur config)
 * @param {object} [o.scan] résultat de scanGamme déjà calculé
 * Les autres options (types, decors, refs, force, rangement) sont celles de buildPlan.
 */
function prepareBatch({ root, outDir, sources, saisies, inventaire, config, reglages, resources = DEFAULT_RESOURCES, cacheDir, scan, ...selection }) {
  if (!inventaire && !scan) scan = scanGamme(root, { sources, saisies });
  const ctx = createContext({
    root,
    rows: scan ? scan.rows : readInventaire(inventaire),
    decors: reglages || (config ? readDecors(config) : defaultReglages(resources)),
    resources,
    cacheDir: cacheDir || path.join(outDir, '.cache'),
  });
  setFontsDir(path.join(ctx.resources, 'fonts'));
  const manifest = new Manifest(outDir);
  const plan = buildPlan(ctx, { outDir, manifest, ...selection });
  return { ctx, manifest, plan, scan, selection };
}

// Avec le verrou en main, aucun autre lot n'écrit dans ce dossier : les .tmp restants viennent d'un lot interrompu.
function removeStaleTmp(outDir) {
  for (const e of fs.readdirSync(outDir, { withFileTypes: true })) {
    const p = path.join(outDir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) removeStaleTmp(p);
    else if (e.isFile() && e.name.endsWith('.tmp')) fs.rmSync(p, { force: true });
  }
}

/** Exécute un plan en prenant le verrou du dossier de sortie (lève une erreur LOCKED si un autre lot y tourne). */
async function runBatch({ ctx, manifest, plan, selection = {} }, options = {}) {
  const lock = acquireLock(manifest.outDir, options.user);
  const t0 = Date.now();
  const { counts } = plan;
  const debut = `décos : ${selection.decors?.join(', ') || 'toutes'}  types : ${(selection.types || TYPES).join(',')}` +
    `  tout refaire : ${selection.force ? 'oui' : 'non'}`;
  const bilan = `${counts.images} images à produire (${counts.renders} rendus), ${counts.upToDate} à jour, ${counts.blocked} impossibles`;
  log.info(`Lot lancé dans ${manifest.outDir} — ${debut} — ${bilan}`);
  logLot(manifest.outDir, `DÉBUT  ${debut}  ${bilan}`);
  let fin = 'FIN  interrompu par une erreur';
  try {
    removeStaleTmp(manifest.outDir);
    const result = await runPlan(ctx, plan, { manifest, ...options });
    fin = `FIN  ${result.done - result.errors.length}/${result.total} tâches, ${result.errors.length} erreur${result.errors.length > 1 ? 's' : ''}` +
      `, ${((Date.now() - t0) / 1000).toFixed(1)} s${result.cancelled ? ' (annulé)' : ''}`;
    return result;
  } catch (e) {
    log.error(e);
    throw e;
  } finally {
    log.info(`Lot terminé — ${fin}`);
    logLot(manifest.outDir, fin);
    lock.release();
  }
}

module.exports = {
  prepareBatch, runBatch, runPlan, defaultJobs, defaultReglages, currentLock, log, configureLog,
  scanGamme, readInventaire, writeInventaire, TYPES, FORMATS,
};
