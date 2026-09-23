// Compare deux dossiers d'images (mêmes noms) : écart max et moyen par pixel. Sort en erreur si un écart dépasse le seuil.
// Usage : node test/compare-dossiers.js <dossier A> <dossier B> [seuil max = 0] [seuil moyen]
// Avec un seuil moyen, seul l'écart moyen compte (autre système : lissage des textes et JPEG légèrement différents).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const [a, b, seuil = '0', seuilMoyen] = process.argv.slice(2);
(async () => {
  const names = fs.readdirSync(a).filter(f => /\.jpg$/i.test(f)).sort();
  const missing = fs.readdirSync(b).filter(f => /\.jpg$/i.test(f) && !names.includes(f));
  let bad = missing.length;
  for (const f of missing) console.log(`${f} : absent de ${a}`);
  for (const f of names) {
    if (!fs.existsSync(path.join(b, f))) { console.log(`${f} : absent de ${b}`); bad++; continue; }
    const [x, y] = await Promise.all([a, b].map(d => sharp(path.join(d, f)).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
    if (x.info.width !== y.info.width || x.info.height !== y.info.height) { console.log(`${f} : tailles différentes`); bad++; continue; }
    let max = 0, sum = 0;
    for (let i = 0; i < x.data.length; i++) { const d = Math.abs(x.data[i] - y.data[i]); sum += d; if (d > max) max = d; }
    const moyen = sum / x.data.length;
    if (seuilMoyen ? moyen > Number(seuilMoyen) : max > Number(seuil)) { bad++; console.log(`${f} : écart max ${max}, moyen ${moyen.toFixed(3)}`); }
  }
  console.log(`${names.length} images comparées, ${bad} différentes.`);
  process.exitCode = bad ? 1 : 0;
})();
