// Moteur de rendu : mises en situation (A-01, A-02, C), étiquettes, pages InDesign (C, II-01) et image produit (P).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

let FONTS = path.join(__dirname, '..', '..', 'resources', 'fonts');
// Dossier des polices (l'app empaquetée les place hors de l'archive asar).
const setFontsDir = dir => { FONTS = dir; };

const readRaw = async (input, resize) => {
  let img = sharp(input).ensureAlpha();
  if (resize) img = img.resize(resize[0], resize[1], { fit: 'cover' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

// Résout le système 8x8 donnant l'homographie qui envoie src[i] sur dst[i].
function homography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return [...b.map((v, i) => v / A[i][i]), 1];
}

// Échantillonnage bilinéaire RGB ; renvoie false hors de l'image.
function sample(img, x, y, out) {
  if (x < 0 || y < 0 || x > img.width - 1 || y > img.height - 1) return false;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, img.width - 1), y1 = Math.min(y0 + 1, img.height - 1);
  const fx = x - x0, fy = y - y0;
  const d = img.data, w = img.width;
  for (let c = 0; c < 3; c++) {
    const a = d[(y0 * w + x0) * 4 + c], b = d[(y0 * w + x1) * 4 + c];
    const e = d[(y1 * w + x0) * 4 + c], f = d[(y1 * w + x1) * 4 + c];
    out[c] = (a + (b - a) * fx) * (1 - fy) + (e + (f - e) * fx) * fy;
  }
  return true;
}

// Opacité « Si gris » de Photoshop : [noir bas, noir haut, blanc bas, blanc haut].
function blendIf(gray, [bl, bh, wl, wh]) {
  let a = 1;
  if (gray < bh) a = bh === bl ? (gray < bl ? 0 : 1) : Math.max(0, (gray - bl) / (bh - bl));
  if (gray > wl) a *= wh === wl ? (gray > wh ? 0 : 1) : Math.max(0, (wh - gray) / (wh - wl));
  return a;
}

// Valeur (0..1) d'un masque de calque au pixel (x, y) du document.
const maskAt = (mask, img, x, y) => {
  const mx = x - mask.left, my = y - mask.top;
  if (mx < 0 || my < 0 || mx >= img.width || my >= img.height) return mask.defaultColor / 255;
  return img.data[(my * img.width + mx) * 4] / 255;
};

/**
 * Compose une mise en situation en rejouant la pile de calques du gabarit sur un fond blanc.
 * @param {string} templateDir dossier produit par extract-template.js
 * @param {Object<string,string|Buffer>} motifs motif (chemin ou image) par position de panneau (« unique », « gauche », « droit »)
 * @param {{show?: string[]}} [options] noms des calques masqués à afficher (ex. « Texture brillante »)
 * @returns {Promise<{data: Buffer, width: number, height: number}>} image RGBA opaque
 */
async function renderScene(templateDir, motifs, { show = [] } = {}) {
  const tpl = JSON.parse(fs.readFileSync(path.join(templateDir, 'template.json'), 'utf8'));
  const W = tpl.width, Ht = tpl.height;
  const outBuf = Buffer.alloc(W * Ht * 4, 255);
  const out = new Uint8ClampedArray(outBuf.buffer, outBuf.byteOffset, outBuf.length); // arrondi + bornage 0..255
  const rgb = [0, 0, 0];

  // Applique une couleur au pixel (px, py) selon le mode de fusion et l'opacité a.
  const blend = (i, r, g, b, a, mode) => {
    if (mode === 'multiply') {
      out[i] += (out[i] * r / 255 - out[i]) * a;
      out[i + 1] += (out[i + 1] * g / 255 - out[i + 1]) * a;
      out[i + 2] += (out[i + 2] * b / 255 - out[i + 2]) * a;
    } else {
      out[i] += (r - out[i]) * a;
      out[i + 1] += (g - out[i + 1]) * a;
      out[i + 2] += (b - out[i + 2]) * a;
    }
  };

  for (const layer of tpl.layers) {
    if (layer.hidden && !show.includes(layer.name)) continue;

    if (layer.type === 'panel') {
      // Panneau : chaque pixel couvert est projeté dans le motif (homographie inverse).
      const motifInput = motifs[layer.position];
      if (!motifInput) throw new Error(`Aucun motif fourni pour le panneau « ${layer.position} »`);
      const [cov, motif] = await Promise.all([
        sharp(path.join(templateDir, layer.coverage)).raw().toBuffer({ resolveWithObject: true }),
        // Motif ramené à la taille de l'objet dynamique d'origine (même ratio que le panneau).
        readRaw(motifInput, layer.sourceSize),
      ]);
      const cw = cov.info.width, ch = cov.info.height, cc = cov.info.channels;
      const H = homography(layer.quad, [[0, 0], [motif.width, 0], [motif.width, motif.height], [0, motif.height]]);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const a = cov.data[(y * cw + x) * cc] / 255 * layer.opacity;
          if (a === 0) continue;
          const px = x + layer.left, py = y + layer.top;
          if (px < 0 || py < 0 || px >= W || py >= Ht) continue;
          const X = px + 0.5, Y = py + 0.5;
          const w = H[6] * X + H[7] * Y + H[8];
          if (!sample(motif, (H[0] * X + H[1] * Y + H[2]) / w - 0.5, (H[3] * X + H[4] * Y + H[5]) / w - 0.5, rgb)) continue;
          blend((py * W + px) * 4, rgb[0], rgb[1], rgb[2], a, layer.blendMode);
        }
      }
      continue;
    }

    // Calque image : pixels du PSD, filtrés par « Si gris » et le masque de calque.
    const img = await readRaw(path.join(templateDir, layer.file));
    const mask = layer.mask && await readRaw(path.join(templateDir, layer.mask.file));
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const px = x + layer.left, py = y + layer.top;
        if (px < 0 || py < 0 || px >= W || py >= Ht) continue;
        const j = (y * img.width + x) * 4;
        const r = img.data[j], g = img.data[j + 1], b = img.data[j + 2];
        let a = (img.data[j + 3] / 255) * layer.opacity;
        if (a && layer.blendIfGray) a *= blendIf(0.299 * r + 0.587 * g + 0.114 * b, layer.blendIfGray);
        if (a && mask) a *= maskAt(layer.mask, mask, px, py);
        if (a === 0) continue;
        blend((py * W + px) * 4, r, g, b, a, layer.blendMode);
      }
    }
  }

  return { data: outBuf, width: W, height: Ht };
}

// ---------------------------------------------------------------------------
// Étiquettes (A-02) : nom en Montserrat Bold, dimensions en Regular, trait + point.

// Mesures relevées sur les A-02 existants (image 4000 px).
const LABEL = {
  nameSize: 82, nameLeading: 94, nameWrap: 600,
  dimsSize: 64,
  nameToDims: 97, // écart entre la dernière ligne du nom et la ligne des dimensions
  dimsToLine: 78, // écart entre la ligne des dimensions et le trait
  lineWidth: 5, dotRadius: 12.5,
  color: '#000000',
};

const escapeXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Rend une ligne de texte et mesure son encre ; `baseline` = position de la ligne de base dans l'image.
const lineCache = new Map();
async function textLine(text, weight, size) {
  const key = `${weight}|${size}|${text}`;
  if (lineCache.has(key)) return lineCache.get(key);
  const render = async t => {
    const { data, info } = await sharp({
      text: {
        text: `<span foreground="${LABEL.color}">${escapeXml(t)}</span>`,
        font: `Montserrat ${weight} ${size}px`,
        fontfile: path.join(FONTS, `Montserrat-${weight}.ttf`),
        rgba: true, dpi: 72,
      },
    }).raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      }
    }
    return { data, width: info.width, height: info.height, inkLeft: x0, inkRight: x1, inkBottom: y1 };
  };
  // « H » n'a pas de jambage : son bas d'encre donne la ligne de base (même police, même taille).
  const [line, ref] = await Promise.all([render(text), render('H')]);
  const result = { ...line, baseline: ref.inkBottom };
  lineCache.set(key, result);
  return result;
}

// Coupe un texte en lignes : sauts de ligne explicites, puis au mot si la ligne dépasse maxWidth.
async function wrapText(text, weight, size, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    let current = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      const m = await textLine(candidate, weight, size);
      if (current && m.inkRight - m.inkLeft > maxWidth) { lines.push(current); current = word; } else current = candidate;
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Ajoute des étiquettes « nom / dimensions / trait » sur une image RGBA.
 * label = { name, dims, side: 'left'|'right', x (bord du texte), lineY, dotX }
 */
async function drawLabels(img, labels) {
  const layers = [];
  for (const l of labels) {
    const place = (m, baseline) => ({
      input: m.data,
      raw: { width: m.width, height: m.height, channels: 4 },
      left: Math.round(l.side === 'left' ? l.x - m.inkLeft : l.x - m.inkRight),
      top: Math.round(baseline - m.baseline),
    });
    const dimsBaseline = l.lineY - LABEL.dimsToLine;
    layers.push(place(await textLine(l.dims, 'Regular', LABEL.dimsSize), dimsBaseline));
    // Le nom s'empile vers le haut à partir de la ligne des dimensions.
    const nameLines = await wrapText(l.name, 'Bold', LABEL.nameSize, LABEL.nameWrap);
    const lastBaseline = dimsBaseline - LABEL.nameToDims;
    for (const [i, text] of nameLines.entries()) {
      const baseline = lastBaseline - (nameLines.length - 1 - i) * LABEL.nameLeading;
      layers.push(place(await textLine(text, 'Bold', LABEL.nameSize), baseline));
    }
    const [x0, x1] = [Math.min(l.x, l.dotX), Math.max(l.x, l.dotX)];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
      <line x1="${x0}" y1="${l.lineY}" x2="${x1}" y2="${l.lineY}" stroke="${LABEL.color}" stroke-width="${LABEL.lineWidth}"/>
      <circle cx="${l.dotX}" cy="${l.lineY}" r="${LABEL.dotRadius}" fill="${LABEL.color}"/></svg>`;
    layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }
  const { data } = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .composite(layers).raw().toBuffer({ resolveWithObject: true });
  return { ...img, data };
}

// ---------------------------------------------------------------------------
// Pages mises en page sous InDesign (C) : on repart de la page exportée et on n'en change que la scène.

/**
 * Remplace, dans la page exportée du gabarit, la scène d'origine par une nouvelle.
 * page.json donne le placement de la scène dans la page (échelle, décalage). Les éléments de la page
 * (textes, traits, logos) sont conservés ; là où la scène change, les éléments noirs qui la
 * recouvrent (traits de légende) sont reconstitués par le rapport page / scène d'origine.
 */
async function composePage(templateDir, scene) {
  const page = JSON.parse(fs.readFileSync(path.join(templateDir, 'page.json'), 'utf8'));
  const place = async input => {
    const size = Math.round(scene.width * page.scale);
    const scaled = await sharp(input).resize(size, size).toBuffer();
    // Placement sur une page blanche 4000 px, en rognant ce qui dépasse.
    const { data } = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: '#ffffff' } })
      .composite([{ input: await cropToPage(scaled, size, page.left, page.top), left: Math.max(0, page.left), top: Math.max(0, page.top) }])
      .png().toBuffer()
      .then(b => sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })); // composite ajoute un canal alpha
    return data;
  };
  const sceneImg = sharp(scene.data, { raw: { width: scene.width, height: scene.height, channels: 4 } }).removeAlpha().png();
  const original = sharp(path.join(templateDir, 'reference-photoshop.png')).flatten({ background: '#ffffff' }).png();
  const [pageRaw, before, after] = await Promise.all([
    sharp(path.join(templateDir, page.file)).removeAlpha().raw().toBuffer(),
    original.toBuffer().then(place),
    sceneImg.toBuffer().then(place),
  ]);
  const out = Buffer.alloc(pageRaw.length);
  for (let i = 0; i < pageRaw.length; i += 3) {
    const changed = Math.abs(after[i] - before[i]) + Math.abs(after[i + 1] - before[i + 1]) + Math.abs(after[i + 2] - before[i + 2]) > 6;
    for (let c = 0; c < 3; c++) {
      if (!changed) { out[i + c] = pageRaw[i + c]; continue; }
      // Élément noir semi-transparent au-dessus de la scène : page = scène × (1 - alpha).
      const ratio = before[i + c] > 8 ? Math.min(1, pageRaw[i + c] / before[i + c]) : 1;
      out[i + c] = Math.round(after[i + c] * (ratio > 0.97 ? 1 : ratio));
    }
  }
  return { data: out, width: 4000, height: 4000, channels: 3 };
}

// Rogne une image carrée placée en (left, top) aux limites d'une page 4000 x 4000.
async function cropToPage(buf, size, left, top) {
  const x0 = Math.max(0, -left), y0 = Math.max(0, -top);
  const w = Math.min(size - x0, 4000 - Math.max(0, left)), h = Math.min(size - y0, 4000 - Math.max(0, top));
  return sharp(buf).extract({ left: x0, top: y0, width: w, height: h }).toBuffer();
}

/**
 * Page « formats disponibles » (II-01) : on repart de la page exportée et on remplace chaque vignette.
 * @param {string} templateDir dossier contenant page.jpg et vignettes.json
 * @param {(format: string) => string[]} motifsFor motifs à placer côte à côte pour un format (« 100x210 »)
 */
async function renderFormats(templateDir, motifsFor) {
  const spec = JSON.parse(fs.readFileSync(path.join(templateDir, 'vignettes.json'), 'utf8'));
  const layers = [];
  const strokes = [];
  for (const v of spec.vignettes) {
    const motifs = motifsFor(v.format);
    for (const [i, m] of motifs.entries()) {
      const x0 = Math.round(i * v.width / motifs.length), x1 = Math.round((i + 1) * v.width / motifs.length);
      layers.push({ input: await sharp(m).resize(x1 - x0, v.height, { fit: 'fill' }).toBuffer(), left: v.left + x0, top: v.top });
      // Trait de séparation entre panneaux gauche et droit.
      if (i > 0) strokes.push(`<line x1="${v.left + x0}" y1="${v.top}" x2="${v.left + x0}" y2="${v.top + v.height}"/>`);
    }
    // Contour noir fin de la vignette (cadre InDesign).
    strokes.push(`<rect x="${v.left + 0.5}" y="${v.top + 0.5}" width="${v.width - 1}" height="${v.height - 1}" fill="none"/>`);
  }
  const { width, height } = await sharp(path.join(templateDir, spec.page)).metadata();
  layers.push({ input: Buffer.from(strokeSvg(width, height, strokes)), left: 0, top: 0 });
  const { data, info } = await sharp(path.join(templateDir, spec.page)).composite(layers).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: 3 };
}

// ---------------------------------------------------------------------------

async function saveJpeg(img, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(img.data, { raw: { width: img.width, height: img.height, channels: img.channels || 4 } })
    .removeAlpha()
    .withMetadata({ density: 300 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
}

// Traits noirs fins des cadres InDesign (P, II-01), mesurés à environ 1,2 px.
const FRAME_STROKE = 1.2;
const strokeSvg = (width, height, elements) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g stroke="#000" stroke-width="${FRAME_STROKE}">${elements.join('')}</g></svg>`;

// Image produit « P » : motif à pleine hauteur, centré sur un carré blanc, bords gauche et droit filetés.
async function renderP(motifPath, file, size = 4000) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const meta = await sharp(motifPath).metadata();
  const w = Math.round(meta.width * size / meta.height);
  const left = Math.round((size - w) / 2);
  const lines = [left, left + w].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${size}"/>`);
  await sharp(motifPath)
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .composite([{ input: Buffer.from(strokeSvg(size, size, lines)), left: 0, top: 0 }])
    .withMetadata({ density: 300 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
}

module.exports = { setFontsDir, renderScene, drawLabels, composePage, renderFormats, saveJpeg, renderP };
