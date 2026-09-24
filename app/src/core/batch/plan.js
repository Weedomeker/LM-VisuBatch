// Planification d'un lot : de la sélection (réfs, décors, types) aux tâches à exécuter.
//  - une tâche = un rendu unique (clé) et les fichiers de sortie qui en sont des copies ;
//  - les images déjà à jour (manifeste) sont écartées ; si une copie à jour existe, on la recopie au lieu de rendre ;
//  - les entrées manquantes sont relevées ici, avant tout rendu (rapport de validation).
const path = require('path');
const { TYPES, RENDERERS, outputName } = require('../render/renderers');
const { fingerprint } = require('../utils/manifest');

/**
 * @param {object} ctx contexte (context.js)
 * @param {object} options
 * @param {string} options.outDir
 * @param {import('./manifest').Manifest} options.manifest
 * @param {string[]} [options.types]
 * @param {string[]} [options.deco] dossiers ou noms de décor (insensible à la casse)
 * @param {string[]} [options.refs]
 * @param {boolean} [options.force] ignore le manifeste
 * @param {'plat'|'decor'} [options.rangement] images toutes dans outDir, ou un sous-dossier par décor
 */
function buildPlan(ctx, { outDir, manifest, types = TYPES, deco, refs, force = false, rangement = 'plat' }) {
  const onlyDeco = deco?.map(s => s.toUpperCase());
  const byKey = new Map();
  const blocked = [];
  const sansRef = [];
  const memo = new Map();
  const bases = { gamme: ctx.root, resources: ctx.resources, cache: ctx.cacheDir };
  let upToDate = 0;
  const byDossier = {}; // images à faire / à jour / impossibles, par décor

  for (const r of ctx.rows) {
    if (refs && !refs.includes(r.ref)) continue;
    if (onlyDeco && !onlyDeco.includes(r.dossier.toUpperCase()) && !onlyDeco.includes(r.decor.toUpperCase())) continue;
    if (!r.ref) { sansRef.push(r.motif); continue; }
    for (const type of types) {
      const def = RENDERERS[type];
      if (!def) throw new Error(`Type de visuel inconnu : ${type}`);
      const key = def.key(r);
      let task = byKey.get(key);
      if (!task) {
        task = { key, type, row: r, outputs: [], fresh: [] };
        try {
          task.hash = fingerprint(type, def.inputs(ctx, r), memo, bases);
        } catch (e) {
          task.error = e.code === 'ENOENT' ? `Fichier introuvable : ${e.path}` : e.message;
        }
        byKey.set(key, task);
      }
      const file = path.join(outDir, rangement === 'decor' ? r.dossier : '', outputName(r, type));
      const stats = byDossier[r.dossier] ??= { images: 0, upToDate: 0, blocked: 0 };
      if (task.error) { blocked.push({ ref: r.ref, type, dossier: r.dossier, file, message: task.error }); stats.blocked++; continue; }
      if (!force && manifest.isFresh(file, task.hash)) { task.fresh.push(file); upToDate++; stats.upToDate++; } else { task.outputs.push(file); stats.images++; }
    }
  }

  const tasks = [...byKey.values()].filter(t => !t.error && t.outputs.length);
  const renders = tasks.filter(t => !t.fresh.length);
  const copies = tasks.filter(t => t.fresh.length);
  return {
    renders, // à rendre : outputs[0] est rendu, les autres en sont des copies
    copies, // recopies d'une image à jour (fresh[0]) vers outputs
    blocked, // images impossibles, avec la raison
    sansRef, // motifs sans référence produit
    byDossier,
    counts: {
      images: tasks.reduce((n, t) => n + t.outputs.length, 0),
      renders: renders.length,
      upToDate,
      blocked: blocked.length,
    },
  };
}

module.exports = { buildPlan };
