// Journaux : diagnostic technique (propre au poste) et historique des lots (commun, dans le dossier de sortie).
//  - `log` : logger winston, muet tant que configureLog n'a pas été appelé (CLI, workers) ;
//  - `logLot` : ajoute une ligne à <sortie>/.logs/lots.log. Appelé verrou en main : un seul poste écrit à la fois.
const fs = require('fs');
const os = require('os');
const path = require('path');
const winston = require('winston');

const LOG_FILE = 'visuels.log';
const HISTORY = path.join('.logs', 'lots.log');

const stamp = (d = new Date()) => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const log = winston.createLogger({
  level: 'info',
  silent: true,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, stack }) => `${stamp()} [${level}] ${message}${stack ? `\n${stack}` : ''}`),
  ),
});

/**
 * Écrit le diagnostic dans dir/visuels.log (5 fichiers de 5 Mo au plus).
 * @param {object} o
 * @param {string} o.dir dossier des journaux
 * @param {string} [o.level] niveau minimal (VISUELS_LOG=debug pour tout voir)
 */
function configureLog({ dir, level = process.env.VISUELS_LOG || 'info' }) {
  fs.mkdirSync(dir, { recursive: true });
  log.clear();
  log.add(new winston.transports.File({ filename: path.join(dir, LOG_FILE), maxsize: 5 * 2 ** 20, maxFiles: 5, tailable: true }));
  log.level = level;
  log.silent = false;
}

/** Ajoute une ligne à l'historique des lots du dossier de sortie ; un échec (réseau…) n'arrête pas le lot. */
function logLot(outDir, text) {
  const file = path.join(outDir, HISTORY);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${stamp()}  ${os.hostname()}  ${os.userInfo().username}  ${text}\n`);
  } catch (e) {
    log.warn(`Historique des lots non écrit (${file}) : ${e.message}`);
  }
}

module.exports = { log, configureLog, logLot };
