// Contexte d'un lot : gamme, inventaire, réglages des décors et ressources (gabarits, polices…).
// Il est sérialisable (toData) pour être recréé à l'identique dans chaque worker.
const fs = require('fs');
const path = require('path');
const { readCsv } = require('./utils/csv');

const DEFAULT_RESOURCES = path.join(__dirname, '..', '..', 'resources');

/**
 * @param {object} data
 * @param {string} data.root dossier GAMME
 * @param {object[]} data.rows lignes d'inventaire
 * @param {object[]} [data.decors] lignes de gamme_deco.csv
 * @param {string} [data.resources] dossier des gabarits, statiques et polices
 * @param {string} data.cacheDir dossier inscriptible (unis extraits des PSD)
 */
function createContext({ root, rows, decors = [], resources = DEFAULT_RESOURCES, cacheDir }) {
  let dirs;
  return {
    root, rows, decors, resources, cacheDir,
    decorConfig: new Map(decors.map(r => [r.dossier, r])),
    // Dossiers de la gamme, lus une seule fois (recherche des unis « 620 VERT… »).
    get dirs() { return dirs ??= fs.readdirSync(root); },
    gabarit: name => path.join(resources, 'gabarits', name),
    toData: () => ({ root, rows, decors, resources, cacheDir }),
  };
}

const readDecors = file => readCsv(file);

module.exports = { createContext, readDecors, DEFAULT_RESOURCES };
