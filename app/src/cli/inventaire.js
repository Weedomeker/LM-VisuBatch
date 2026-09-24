// Écrit l'inventaire de la gamme (une ligne par référence) pour relecture ou correction dans Excel.
// Usage : node cli/inventaire.js "<dossier GAMME>" [inventaire.csv]
const { scanGamme, writeInventaire } = require('../core');

const [root, csvOut = 'inventaire.csv'] = process.argv.slice(2);
const { rows, problems, sansMotif } = scanGamme(root);
writeInventaire(csvOut, rows);
const ok = rows.filter(r => r.ref);
console.log(`${ok.length} motifs avec référence, dans ${new Set(ok.map(r => r.dossier)).size} décors → ${csvOut}`);
console.log(`Dossiers sans motif « au 10ème » : ${sansMotif.join(' | ')}`);
console.log(`${problems.length} motifs à vérifier :\n  ${problems.join('\n  ')}`);
