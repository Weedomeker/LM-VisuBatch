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
