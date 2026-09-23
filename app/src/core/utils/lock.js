// Verrou d'un dossier de sortie partagé : un seul lot à la fois par dossier.
// Le verrou est rafraîchi pendant le lot ; s'il ne l'est plus (app fermée brutalement), il est libéré après STALE_MS.
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOCK = '.visuels-lot-en-cours.json';
const REFRESH_MS = 30 * 1000;
const STALE_MS = 3 * 60 * 1000;

const lockFile = outDir => path.join(outDir, LOCK);

/** Lot en cours sur ce dossier par quelqu'un d'autre, ou null. */
function currentLock(outDir) {
  try {
    const info = JSON.parse(fs.readFileSync(lockFile(outDir), 'utf8'));
    const age = Date.now() - fs.statSync(lockFile(outDir)).mtimeMs;
    if (age > STALE_MS) return null;
    // Verrou posé depuis ce poste par un processus qui n'existe plus (app plantée) : libre tout de suite.
    if (info.host === os.hostname() && !isAlive(info.pid)) return null;
    return info;
  } catch {
    return null;
  }
}

/**
 * Prend le verrou, ou lève une erreur lisible si un autre lot tourne sur ce dossier.
 * @returns {{release: () => void}}
 */
function acquireLock(outDir, user = os.userInfo().username) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = lockFile(outDir);
  const info = { user, host: os.hostname(), pid: process.pid, since: new Date().toISOString() };
  const create = () => fs.writeFileSync(file, JSON.stringify(info), { flag: 'wx' }); // échoue si le fichier existe
  try {
    create();
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const other = currentLock(outDir);
    if (other) {
      const err = new Error(`Un lot est déjà en cours dans ce dossier : ${other.user} (${other.host}) depuis ${new Date(other.since).toLocaleTimeString('fr-FR')}`);
      err.code = 'LOCKED';
      err.lock = other;
      throw err;
    }
    fs.rmSync(file, { force: true }); // verrou abandonné
    create();
  }
  const timer = setInterval(() => {
    try { const now = new Date(); fs.utimesSync(file, now, now); } catch { /* dossier réseau momentanément indisponible */ }
  }, REFRESH_MS);
  timer.unref();
  return {
    release() {
      clearInterval(timer);
      try {
        const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (cur.host === info.host && cur.pid === info.pid) fs.rmSync(file, { force: true });
      } catch { /* déjà libéré */ }
    },
  };
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

module.exports = { acquireLock, currentLock };
