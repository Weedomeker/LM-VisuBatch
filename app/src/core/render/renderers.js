// Les 7 visuels web d'une référence. Chaque type déclare :
//  - key(r)          : identifiant du rendu ; les réfs de même clé partagent la même image (A-02, C, II-01…) ;
//  - inputs(ctx, r)  : fichiers et réglages dont dépend l'image (empreinte de l'incrémental).
//                      Lève une erreur lisible s'il manque une entrée : c'est aussi la validation avant lot ;
//  - render(ctx, r, file).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { renderScene, drawLabels, composePage, renderFormats, saveJpeg, renderP } = require('./render');
const { extractMotif } = require('./extract-motif');

const TYPES = ['A-01', 'A-02', 'P', 'C', 'II-01', 'II-02', 'II-03'];

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
// « LEAF Mat 100x210 », « PALMERAIE Brillant 100x210 DROIT »
const productName = r => [r.decor.toUpperCase(), r.finition && capitalize(r.finition), `${r.largeur}x${r.hauteur}`, r.cote]
  .filter(Boolean).join(' ');
const outputName = (r, type) => `${r.ref}-${type}-${productName(r)}.jpg`;

// `base` : dossier d'où vient le décor (GAMME ou décor déposé) ; absent des inventaires CSV.
const motifPath = (ctx, row) => path.join(row.base || ctx.root, row.motif);
const findRow = (ctx, r, largeur, hauteur, cote) =>
  ctx.rows.find(x => x.dossier === r.dossier && x.largeur === largeur && x.hauteur === hauteur && x.cote === cote);
const requireDir = dir => {
  if (!fs.existsSync(dir)) throw new Error(`Gabarit « ${path.basename(dir)} » introuvable`);
  return dir;
};

// ---------------------------------------------------------------------------
// Unis : image et libellé (« ULM 620 » / « vert de gris foncé »).

const uniDossier = (ctx, code) => ctx.dirs.find(d => d.startsWith(`${code} `));
const uniLabel = (ctx, code) => {
  const name = (uniDossier(ctx, code) || String(code)).replace(/^\d{3}\s*/, '').toLowerCase();
  return `ULM ${code}\n${name}`;
};

// Source du motif d'un uni en 100 x hauteur : image embarquée, image « au 10ème » de la gamme,
// ou à défaut contenu du PSD web (`psd`), extrait une fois dans le cache.
function uniSource(ctx, code, hauteur) {
  const bundled = path.join(ctx.resources, 'motifs', 'unis', `ULM${code}-100x${hauteur}.jpg`);
  if (fs.existsSync(bundled)) return { file: bundled };
  const dossier = uniDossier(ctx, code);
  if (!dossier) throw new Error(`Dossier de l'uni ${code} introuvable`);
  const inv = ctx.rows.find(r => r.dossier === dossier && r.largeur === '100' && r.hauteur === hauteur);
  if (inv) return { file: motifPath(ctx, inv) };
  const webDir = path.join(ctx.root, dossier, ' LM WEB 2025');
  const psd = fs.existsSync(webDir) && fs.readdirSync(webDir).find(f => new RegExp(`100x${hauteur}\\.psd$`, 'i').test(f));
  if (!psd) throw new Error(`Aucune image ni PSD 100x${hauteur} pour l'uni ${code}`);
  return { file: path.join(ctx.cacheDir, 'unis', `ULM${code}-100x${hauteur}.jpg`), psd: path.join(webDir, psd) };
}

async function uniMotif(ctx, code, hauteur) {
  const s = uniSource(ctx, code, hauteur);
  if (s.psd && !fs.existsSync(s.file)) {
    // Plusieurs workers peuvent extraire le même uni : écriture dans un fichier temporaire puis renommage.
    const tmp = `${s.file}.${process.pid}-${require('worker_threads').threadId}.tmp.jpg`;
    await extractMotif(s.psd, tmp);
    fs.renameSync(tmp, s.file);
  }
  return s.file;
}

// ---------------------------------------------------------------------------
// A-02 : deux panneaux de 100 cm, une image par décor et par hauteur.

const LABEL_POS = {
  gauche: { side: 'left', x: 532, lineY: 1162, dotX: 1266 },
  droit: { side: 'right', x: 3481, lineY: 1162, dotX: 2747 },
};

// Motif 100 x hauteur du même dossier (et du côté demandé pour les diptyques).
const decorMotif = (ctx, r, cote = r.cote) => {
  const m = findRow(ctx, r, '100', r.hauteur, cote);
  if (!m) throw new Error(`Pas de motif 100x${r.hauteur}${cote ? ' ' + cote : ''} pour ${r.dossier}`);
  return motifPath(ctx, m);
};

// Motifs : chemin d'image, ou { uni } résolu au rendu (extraction éventuelle du PSD).
function planA02(ctx, r) {
  const dims = `L 100 x H ${r.hauteur} cm`;
  const config = ctx.decorConfig.get(r.dossier) || {};
  const decorName = config.libelle || capitalize(r.decor);
  const uni = config.uni;
  const isUni = uni && r.dossier.startsWith(`${uni} `);
  if (isUni) {
    return { motifs: { gauche: { uni }, droit: { uni } }, labels: { gauche: uniLabel(ctx, uni), droit: uniLabel(ctx, uni) }, dims };
  }
  if (r.cote) {
    return {
      motifs: { gauche: decorMotif(ctx, r, 'GAUCHE'), droit: decorMotif(ctx, r, 'DROIT') },
      labels: { gauche: `${decorName}\ngauche`, droit: `${decorName}\ndroit` },
      dims,
    };
  }
  if (uni) {
    return { motifs: { gauche: { uni }, droit: decorMotif(ctx, r) }, labels: { gauche: uniLabel(ctx, uni), droit: decorName }, dims };
  }
  return { motifs: { gauche: decorMotif(ctx, r), droit: decorMotif(ctx, r) }, labels: { gauche: decorName, droit: decorName }, dims };
}

// ---------------------------------------------------------------------------
// C : vue éclatée du panneau ; l'impression montre un extrait carré du motif 150x255
// (panorama gauche + droit pour un diptyque). Une image par décor et par finition.

// Extrait par défaut, en cm (x, y, côté), mesuré sur les compositions existantes.
const DEFAULT_CROP = { simple: [25, 58, 100], diptyque: [87, 105, 126] };

function compositionSources(ctx, r) {
  if (r.cote) {
    const [g, d] = [findRow(ctx, r, '150', '255', 'GAUCHE'), findRow(ctx, r, '150', '255', 'DROIT')];
    if (!g || !d) throw new Error(`Motifs 150x255 GAUCHE/DROIT manquants pour ${r.dossier}`);
    return [motifPath(ctx, g), motifPath(ctx, d)];
  }
  const m = findRow(ctx, r, '150', '255', '');
  if (!m) throw new Error(`Pas de motif 150x255 pour ${r.dossier}`);
  return [motifPath(ctx, m)];
}

const compositionCrop = (ctx, r) => {
  const custom = (ctx.decorConfig.get(r.dossier)?.cadrage_c || '').split(',').map(Number);
  return custom.length === 3 && custom.every(Number.isFinite) ? custom : DEFAULT_CROP[r.cote ? 'diptyque' : 'simple'];
};

async function compositionMotif(ctx, r) {
  const sources = compositionSources(ctx, r);
  let source, widthCm;
  if (sources.length === 2) {
    const [a, b] = await Promise.all(sources.map(s => sharp(s).toBuffer()));
    const m = await sharp(a).metadata();
    const bm = await sharp(b).resize(m.width, m.height, { fit: 'fill' }).toBuffer();
    source = await sharp({ create: { width: m.width * 2, height: m.height, channels: 3, background: '#ffffff' } })
      .composite([{ input: a, left: 0, top: 0 }, { input: bm, left: m.width, top: 0 }]).png().toBuffer();
    widthCm = 300;
  } else {
    source = sources[0];
    widthCm = 150;
  }
  const [x, y, side] = compositionCrop(ctx, r);
  const meta = await sharp(source).metadata();
  const k = meta.width / widthCm; // pixels par cm
  const box = { left: Math.round(x * k), top: Math.round(y * k), width: Math.round(side * k), height: Math.round(side * k) };
  box.width = box.height = Math.min(box.width, meta.width - box.left, meta.height - box.top);
  return sharp(source).extract(box).png().toBuffer();
}

const finitionC = r => (r.finition === 'BRILLANT' ? 'brillant' : 'mat');

// ---------------------------------------------------------------------------
// II-01 : les 6 formats du décor.

function formatsPlan(ctx, r) {
  const templateDir = requireDir(ctx.gabarit(`formats-${r.cote ? 'diptyque' : 'simple'}`));
  const spec = JSON.parse(fs.readFileSync(path.join(templateDir, 'vignettes.json'), 'utf8'));
  const motifs = new Map(spec.vignettes.map(v => [v.format, spec.cotes.map(cote => {
    const [l, h] = v.format.split('x');
    const m = findRow(ctx, r, l, h, cote);
    if (!m) throw new Error(`Pas de motif ${v.format}${cote ? ' ' + cote : ''} pour ${r.dossier}`);
    return motifPath(ctx, m);
  })]));
  return { templateDir, motifs };
}

// ---------------------------------------------------------------------------

const staticPage = (ctx, type) => path.join(ctx.resources, 'statiques', `${type}.jpg`);
const copyStatic = type => ({
  key: () => type,
  inputs: ctx => {
    const file = staticPage(ctx, type);
    if (!fs.existsSync(file)) throw new Error(`Page ${type} introuvable dans les ressources`);
    return { files: [file] };
  },
  render: async (ctx, r, file) => fs.copyFileSync(staticPage(ctx, type), file),
});

const RENDERERS = {
  'A-01': {
    key: r => `A-01|${r.ref}`,
    inputs: (ctx, r) => ({ files: [motifPath(ctx, r), requireDir(ctx.gabarit(`douche-${r.largeur}x${r.hauteur}`))] }),
    render: async (ctx, r, file) =>
      saveJpeg(await renderScene(ctx.gabarit(`douche-${r.largeur}x${r.hauteur}`), { unique: motifPath(ctx, r) }), file),
  },
  'A-02': {
    key: r => `A-02|${r.dossier}|${r.hauteur}`,
    inputs: (ctx, r) => {
      const plan = planA02(ctx, r);
      const files = Object.values(plan.motifs).map(m => (typeof m === 'string' ? m : (s => s.psd || s.file)(uniSource(ctx, m.uni, r.hauteur))));
      return { files: [...files, requireDir(ctx.gabarit(`inspiration-${r.hauteur}`))], salt: plan.labels };
    },
    render: async (ctx, r, file) => {
      const plan = planA02(ctx, r);
      const motifs = {};
      for (const [pos, m] of Object.entries(plan.motifs)) motifs[pos] = typeof m === 'string' ? m : await uniMotif(ctx, m.uni, r.hauteur);
      let img = await renderScene(ctx.gabarit(`inspiration-${r.hauteur}`), motifs);
      img = await drawLabels(img, ['gauche', 'droit'].map(p => ({ ...LABEL_POS[p], name: plan.labels[p], dims: plan.dims })));
      await saveJpeg(img, file);
    },
  },
  P: {
    key: r => `P|${r.ref}`,
    inputs: (ctx, r) => ({ files: [motifPath(ctx, r)] }),
    render: (ctx, r, file) => renderP(motifPath(ctx, r), file),
  },
  C: {
    key: r => `C|${r.dossier}|${finitionC(r)}`,
    inputs: (ctx, r) => ({
      files: [...compositionSources(ctx, r), requireDir(ctx.gabarit(`composition-${finitionC(r)}`))],
      salt: compositionCrop(ctx, r),
    }),
    render: async (ctx, r, file) => {
      const templateDir = ctx.gabarit(`composition-${finitionC(r)}`);
      const scene = await renderScene(templateDir, { unique: await compositionMotif(ctx, r) });
      await saveJpeg(await composePage(templateDir, scene), file);
    },
  },
  'II-01': {
    key: r => `II-01|${r.dossier}`,
    inputs: (ctx, r) => {
      const { templateDir, motifs } = formatsPlan(ctx, r);
      return { files: [...[...motifs.values()].flat(), templateDir] };
    },
    render: async (ctx, r, file) => {
      const { templateDir, motifs } = formatsPlan(ctx, r);
      await saveJpeg(await renderFormats(templateDir, format => motifs.get(format)), file);
    },
  },
  'II-02': copyStatic('II-02'),
  'II-03': copyStatic('II-03'),
};

module.exports = { TYPES, RENDERERS, productName, outputName };
