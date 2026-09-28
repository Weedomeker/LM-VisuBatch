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
  return name
    .normalize('NFC')
    .trim()
    .replace(/[^a-zA-ZÀ-ÿ0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const catalogueFilename = client => `gamme_${toSlug(client)}.csv`;

function buildRegex(config) {
  return {
    refRe: new RegExp(`\\b(${config.refPattern})\\b`),
    finitionRe: new RegExp(`(?<![a-zA-ZÀ-ÿ0-9])(${config.finitions.join('|')})(?![a-zA-ZÀ-ÿ0-9])`, 'i'),
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
