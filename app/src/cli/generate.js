// Génère les visuels web des références de la gamme (incrémental : seules les images à refaire sont rendues).
// Usage : node cli/generate.js "<dossier GAMME>" [--out sortie] [--inventaire inventaire.csv] [--config gamme_deco.csv]
//           [--types A-01,A-02,P,C,II-01,II-02,II-03] [--deco "LEAF,PALMERAIE"] [--refs "94953622,…"]
//           [--force] [--jobs N] [--dry-run] [--par-decor] [--depot "<dossier décor>,…"]
// Sans --inventaire, la gamme est scannée directement ; sans --config, les réglages livrés avec l'app sont utilisés.
const { prepareBatch, runBatch } = require('../core');

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = name => args.includes(`--${name}`);
const list = name => opt(name)?.split(',').map(s => s.trim()).filter(Boolean);

const root = args[0];
if (!root || root.startsWith('--')) {
  console.error('Usage : node cli/generate.js "<dossier GAMME>" [--out sortie] [--inventaire …] [--config …] [--force] [--dry-run]');
  process.exit(1);
}

(async () => {
  const t0 = Date.now();
  const batch = prepareBatch({
    root,
    outDir: opt('out') || 'sortie',
    inventaire: opt('inventaire'),
    config: opt('config'),
    types: list('types'),
    deco: list('deco'),
    refs: list('refs'),
    force: flag('force'),
    rangement: flag('par-decor') ? 'decor' : 'plat',
    sources: list('depot'),
  });
  const { plan, scan } = batch;

  const { counts } = plan;
  console.log(`${counts.images} images à produire (${counts.renders} rendus), ${counts.upToDate} déjà à jour, ${counts.blocked} impossibles.`);
  for (const p of scan?.problems ?? []) console.log(`  ⚠ ${p}`);
  for (const b of plan.blocked) console.log(`  ✗ ${b.ref} ${b.type} : ${b.message}`);
  if (flag('dry-run') || !counts.images) return;

  const controller = new AbortController();
  process.on('SIGINT', () => { console.log('\nAnnulation…'); controller.abort(); });
  const jobs = Number(opt('jobs')) || undefined;
  const result = await runBatch(batch, {
    jobs,
    signal: controller.signal,
    onEvent: e => {
      if (e.type === 'done') console.log(`[${e.done}/${e.total}] ${e.task.outputs[0]}${e.task.outputs.length > 1 ? ` (+${e.task.outputs.length - 1})` : ''}`);
      if (e.type === 'error') console.log(`[${e.done}/${e.total}] ✗ ${e.task.ref} ${e.task.type} : ${e.error}`);
    },
  });
  console.log(`${result.done - result.errors.length}/${result.total} tâches terminées en ${((Date.now() - t0) / 1000).toFixed(1)} s` +
    `${result.errors.length ? `, ${result.errors.length} erreurs` : ''}${result.cancelled ? ' (annulé)' : ''}.`);
  if (result.errors.length || result.cancelled) process.exitCode = 1;
})();
