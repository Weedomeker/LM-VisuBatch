// Incrémental : le dossier de sortie garde, pour chaque image, l'empreinte des entrées qui l'ont produite.
// Une image est à jour si elle existe et que son empreinte n'a pas changé.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// À incrémenter quand le rendu change (gabarits recalés, étiquettes…) : tout sera régénéré.
const ENGINE_VERSION = 2;
const MANIFEST = '.visuels-manifest.json';

// Tampon d'un fichier (taille + date) ou d'un dossier (gabarit : ses fichiers, récursivement).
function stamp(p, memo) {
  if (memo.has(p)) return memo.get(p);
  const st = fs.statSync(p);
  const value = st.isDirectory()
    ? fs
        .readdirSync(p)
        .sort()
        .map(f => `${f}:${stamp(path.join(p, f), memo)}`)
        .join('|')
    : `${st.size}-${Math.round(st.mtimeMs)}`;
  memo.set(p, value);
  return value;
}

// Chemin relatif à la GAMME ou aux ressources : déplacer la gamme ou réinstaller l'app ne change pas l'empreinte.
function portable(f, bases) {
  for (const [name, base] of Object.entries(bases)) {
    const rel = path.relative(base, f);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) return `${name}:${rel.split(path.sep).join('/')}`;
  }
  return f;
}

/**
 * Empreinte d'un rendu : type, fichiers d'entrée (chemin + tampon) et réglages (`salt`).
 * @param {Object<string,string>} bases dossiers de référence des chemins ({ gamme, resources, cache })
 */
function fingerprint(type, { files, salt }, memo, bases = {}) {
  const h = crypto.createHash('sha1');
  h.update(JSON.stringify([ENGINE_VERSION, type, salt ?? null]));
  for (const f of files) h.update(`\n${portable(f, bases).normalize('NFC')}=${stamp(f, memo)}`);
  return h.digest('hex');
}

// Clés = chemins relatifs au dossier de sortie (« TROPICAL/94922880-A-01-….jpg » si rangé par décor).
// Plusieurs personnes peuvent partager un dossier de sortie : à l'enregistrement, on relit le fichier
// et on n'y reporte que nos propres changements.
class Manifest {
  constructor(outDir) {
    this.outDir = outDir;
    this.file = path.join(outDir, MANIFEST);
    this.entries = read(this.file);
    this.changes = {};
  }
  rel(file) {
    return path.relative(this.outDir, file).split(path.sep).join('/');
  }
  isFresh(file, hash) {
    return this.entries[this.rel(file)] === hash && fs.existsSync(file);
  }
  set(file, hash) {
    this.entries[this.rel(file)] = this.changes[this.rel(file)] = hash;
  }
  save() {
    if (!Object.keys(this.changes).length) return;
    const tmp = `${this.file}.${os.hostname()}-${process.pid}.tmp`;
    fs.mkdirSync(this.outDir, { recursive: true });
    this.entries = { ...read(this.file), ...this.changes };
    fs.writeFileSync(tmp, JSON.stringify({ version: ENGINE_VERSION, images: this.entries }));
    fs.renameSync(tmp, this.file);
    this.changes = {};
  }
}

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).images || {};
  } catch {
    return {};
  } // absent ou illisible : tout est à faire
}

module.exports = { Manifest, fingerprint, ENGINE_VERSION };
