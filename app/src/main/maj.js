// Vérifie au démarrage si une version plus récente est publiée.
// Le dépôt du code est privé : les installeurs sont aussi publiés dans un dépôt public, lisible sans jeton.
const { net } = require('electron');
const { log } = require('../core');
const { comparerVersions } = require('../core/utils/version');

const DEPOT_RELEASES = 'Weedomeker/LM-VisuBatch-releases';
const PAGE_RELEASES = `https://github.com/${DEPOT_RELEASES}/`;

// { version, url, notes } si une version plus récente existe, sinon null (y compris hors ligne : jamais bloquant).
async function verifierMiseAJour(versionActuelle) {
  try {
    const r = await net.fetch(`https://api.github.com/repos/${DEPOT_RELEASES}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'LM-VisuBatch' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const release = await r.json();
    if (comparerVersions(release.tag_name, versionActuelle) <= 0) return null;
    const version = String(release.tag_name).replace(/^v/, '');
    log.info(`Nouvelle version ${version} disponible (installée : ${versionActuelle})`);
    return { version, actuelle: versionActuelle, url: release.html_url, notes: release.body || '' };
  } catch (e) {
    log.warn(`Vérification des mises à jour impossible : ${e.message}`);
    return null;
  }
}

module.exports = { verifierMiseAJour, PAGE_RELEASES };
