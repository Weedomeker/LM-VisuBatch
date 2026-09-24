// Recense les motifs « au 10ème » d'un dossier décor et leur associe une référence produit (8 chiffres)
// et une finition, trouvées dans le nom de n'importe quel fichier du même format (et côté DROIT/GAUCHE),
// ou saisies dans l'application. Les dossiers ne sont jamais modifiés.
const fs = require('fs');
const path = require('path');
const { readCsv, writeCsv } = require('./utils/csv');

const COLS = ['ref', 'decor', 'finition', 'largeur', 'hauteur', 'cote', 'dossier', 'motif'];
const FORMATS = ['100x210', '100x255', '125x210', '125x255', '150x210', '150x255'];

// Les noms viennent d'un Mac et n'ont pas tous la même forme :
// « Leaf 100x210 94953622 MAT.pdf », « ARCHE BEIGE 100x210+BLANC 94963987 MAT.pdf »,
// « ULM180 CARAMEL 100x210 94964391.pdf », « 000 BLANC 100X210 au 10ème 94956949.jpg »…
function parse(file) {
  const name = file.normalize('NFC');
  const size = name.match(/(\d{2,3})\s*x\s*(\d{3})/i);
  if (!size) return null;
  const side = (name.match(/\b(DROIT|GAUCHE)\b/i) || [])[1];
  const ref = (name.match(/\b(9\d{7})\b/) || [])[1];
  const finition = ((name.match(/\b(MAT|BRILLANT)\b/i) || [])[1] || '').toUpperCase();
  return {
    name,
    decor: name.slice(0, size.index).trim(),
    largeur: size[1],
    hauteur: size[2],
    cote: (side || '').toUpperCase(),
    ref,
    finition,
    // Tolère les fautes vues dans la gamme : « au 10éme », « au 10èmr ».
    isMotif: /au\s*10\s*[èée]m/i.test(name) && /\.jpe?g$/i.test(name),
  };
}

const formatKey = (format, cote) => `${format}|${cote || ''}`;

const decorDirs = root => fs.readdirSync(root, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name.trim())
  .map(d => d.name);

/**
 * Scanne un dossier décor (seule sa racine est lue : OLD, SUR MESURE, LM WEB… sont ignorés).
 * @param {string} base dossier parent (la GAMME, ou le dossier d'où vient un décor déposé)
 * @param {string} dir nom du dossier décor
 * @param {Object<string, {ref: string, finition: string}[]>} [saisies] réfs saisies dans l'app, par « 100x210|DROIT »
 * @returns {{dossier, base, decor, formats: object[], rows: object[], problems: string[]}}
 *   `formats` : tableau format × côté (motif, réfs et leur origine) ; `rows` : une ligne par référence
 */
function scanDecor(base, dir, saisies = {}) {
  const files = fs.readdirSync(path.join(base, dir)).map(parse).filter(Boolean);
  const key = f => formatKey(`${f.largeur}x${f.hauteur}`, f.cote);

  const refsByKey = new Map();
  const addRef = (k, ref, finition, origine) => {
    const list = refsByKey.get(k) || [];
    const existing = list.find(r => r.ref === ref);
    if (!existing) list.push({ ref, finition, origine });
    else if (origine === 'saisie') Object.assign(existing, { finition, origine }); // la saisie corrige la finition
    refsByKey.set(k, list);
  };
  for (const f of files) if (f.ref) addRef(key(f), f.ref, f.finition, 'fichier');
  for (const [k, list] of Object.entries(saisies)) for (const r of list) if (r.ref) addRef(k, r.ref, r.finition || '', 'saisie');

  const motifs = new Map();
  for (const m of files.filter(f => f.isMotif)) if (!motifs.has(key(m))) motifs.set(key(m), m);

  const rows = [];
  const problems = [];
  for (const [k, m] of motifs) {
    const refs = refsByKey.get(k) || [];
    const base_ = { decor: m.decor, largeur: m.largeur, hauteur: m.hauteur, cote: m.cote, dossier: dir, motif: `${dir}/${m.name}`, base };
    if (!refs.length) {
      problems.push(`${dir} : motif ${m.name} sans référence`);
      rows.push({ ...base_, ref: '', finition: '' });
    }
    // Un même motif peut exister en MAT et en BRILLANT : une ligne par référence.
    for (const r of refs) rows.push({ ...base_, ref: r.ref, finition: r.finition });
    if (new Set(refs.map(r => r.finition)).size < refs.length) {
      problems.push(`${dir} : ${k.replace('|', ' ')} réfs ambiguës (${refs.map(r => `${r.ref} ${r.finition || 'sans finition'}`).join(', ')})`);
    }
  }
  for (const [k, refs] of refsByKey) {
    if (!motifs.has(k)) problems.push(`${dir} : ${k.replace('|', ' ').trim()} réf ${refs.map(r => r.ref).join(', ')} sans motif « au 10ème »`);
  }

  // Tableau des formats attendus (+ ceux, hors standard, trouvés dans le dossier).
  const cotes = [...motifs.values()].some(m => m.cote) ? ['GAUCHE', 'DROIT'] : [''];
  const keys = new Set(FORMATS.flatMap(f => cotes.map(c => formatKey(f, c))));
  for (const k of [...motifs.keys(), ...refsByKey.keys()]) keys.add(k);
  const formats = [...keys].map(k => {
    const [format, cote] = k.split('|');
    return { key: k, format, cote, motif: motifs.get(k)?.name || null, refs: refsByKey.get(k) || [] };
  });

  const decor = [...motifs.values()][0]?.decor || dir;
  return { dossier: dir, base, decor, formats, rows, problems };
}

/**
 * Scanne la GAMME et les décors déposés (un décor déposé remplace le dossier de même nom de la GAMME).
 * @param {string} root dossier GAMME
 * @param {object} [options]
 * @param {string[]} [options.sources] chemins complets de dossiers décors déposés
 * @param {Object<string, object>} [options.saisies] réfs saisies, par chemin complet du dossier décor
 */
function scanGamme(root, { sources = [], saisies = {} } = {}) {
  const entries = new Map();
  if (root) for (const dir of decorDirs(root)) entries.set(dir, { base: root, dir, depot: false });
  for (const src of sources) {
    if (!fs.existsSync(src)) continue;
    const dir = path.basename(src);
    entries.set(dir, { base: path.dirname(src), dir, depot: true });
  }
  const decors = [];
  for (const { base, dir, depot } of entries.values()) {
    try {
      decors.push({ ...scanDecor(base, dir, saisies[path.join(base, dir)]), depot });
    } catch (e) {
      decors.push({ dossier: dir, base, decor: dir, formats: [], rows: [], problems: [`${dir} : illisible (${e.message})`], depot });
    }
  }
  return {
    decors,
    rows: decors.flatMap(d => d.rows),
    problems: decors.flatMap(d => d.problems),
    sansMotif: decors.filter(d => !d.rows.length).map(d => d.dossier),
  };
}

// Les inventaires du prototype ont été écrits sous Windows (« TROPICAL\TROPICAL … ») : on normalise en « / ».
const readInventaire = file => readCsv(file).map(r => ({ ...r, motif: (r.motif || '').replace(/\\/g, '/') }));
const writeInventaire = (file, rows) => writeCsv(file, COLS, rows);

module.exports = { scanGamme, readInventaire, writeInventaire, formatKey, FORMATS };
