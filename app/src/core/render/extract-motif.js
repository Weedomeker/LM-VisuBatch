// Extrait le contenu (le motif à plat) de l'objet dynamique d'un panneau d'un PSD.
// Sert notamment pour les unis, qui n'ont pas d'image « au 10ème ».
// Usage : node extract-motif.js "<fichier.psd>" <sortie.jpg> [gauche|droit|unique]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const agPsd = require('ag-psd');

agPsd.initializeCanvas(
  () => {
    throw new Error('canvas non disponible');
  },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
);

async function extractMotif(psdPath, outFile, position = 'unique') {
  const opts = { useImageData: true, skipThumbnail: true };
  const psd = agPsd.readPsd(fs.readFileSync(psdPath), { ...opts, skipLayerImageData: true, skipCompositeImageData: true });
  const panels = psd.children.filter(l => l.placedLayer && /panneau|impression/i.test(l.name) && !/effet/i.test(l.name));
  const panel = panels.find(l => position === 'unique' || new RegExp(position, 'i').test(l.name));
  if (!panel) throw new Error(`Panneau « ${position} » introuvable dans ${psdPath}`);
  const linked = psd.linkedFiles.find(f => f.id === panel.placedLayer.id);
  if (!linked?.data) throw new Error(`Contenu de « ${panel.name} » non embarqué (objet dynamique lié ?)`);

  const inner = agPsd.readPsd(linked.data, opts);
  const { width, height } = inner;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  // Image fusionnée du PSB si elle a un contenu (sans « compatibilité maximale »,
  // Photoshop écrit à la place une image uniforme, blanche ou transparente)…
  const merged = inner.imageData;
  let uniform = true;
  for (let i = 4 * 97; merged && uniform && i < merged.data.length; i += 4 * 97) {
    for (let c = 0; c < 4; c++) if (merged.data[i + c] !== merged.data[c]) uniform = false;
  }
  if (merged && !uniform) {
    await sharp(Buffer.from(merged.data.buffer), { raw: { width, height, channels: 4 } })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toFile(outFile);
    return { name: panel.name, source: linked.name, width, height };
  }
  // … sinon (enregistré sans « compatibilité maximale ») on superpose ses calques visibles,
  // rognés aux limites du document.
  const composites = [];
  for (const l of (inner.children || []).filter(l => !l.hidden && l.imageData && l.imageData.width)) {
    const left = l.left || 0,
      top = l.top || 0;
    const x0 = Math.max(0, left),
      y0 = Math.max(0, top);
    const x1 = Math.min(width, left + l.imageData.width),
      y1 = Math.min(height, top + l.imageData.height);
    if (x1 <= x0 || y1 <= y0) continue;
    const input = await sharp(Buffer.from(l.imageData.data.buffer), {
      raw: { width: l.imageData.width, height: l.imageData.height, channels: 4 },
    })
      .extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 })
      .png()
      .toBuffer();
    composites.push({ input, left: x0, top: y0 });
  }
  await sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
    .composite(composites)
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toFile(outFile);
  return { name: panel.name, source: linked.name, width, height };
}

module.exports = { extractMotif };

if (require.main === module) {
  const [psdPath, outFile, position] = process.argv.slice(2);
  if (!psdPath || !outFile) {
    console.error('Usage : node extract-motif.js "<fichier.psd>" <sortie.jpg> [gauche|droit|unique]');
    process.exit(1);
  }
  extractMotif(psdPath, outFile, position).then(r => console.log(`${outFile} ← ${r.name} (${r.source}, ${r.width}x${r.height})`));
}
