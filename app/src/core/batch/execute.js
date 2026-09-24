// Exécution d'une tâche du plan : rendu dans outputs[0], puis copies vers les autres sorties.
// Chaque fichier est écrit à côté puis renommé : jamais de JPEG à moitié écrit, même en cas d'annulation.
const fs = require('fs');
const path = require('path');
const { RENDERERS } = require('../render/renderers');

// Le nom temporaire porte la marque du lot (poste + processus) : deux lots sur le même dossier ne se marchent pas dessus.
const tmpName = (file, tag) => `${file}.${tag}.tmp`;

function copyAtomic(src, dest, tag) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, tmpName(dest, tag));
  fs.renameSync(tmpName(dest, tag), dest);
}

async function renderTask(ctx, task) {
  const [first, ...others] = task.outputs;
  const tmp = tmpName(first, task.tag);
  fs.mkdirSync(path.dirname(first), { recursive: true });
  try {
    await RENDERERS[task.type].render(ctx, task.row, tmp);
    fs.renameSync(tmp, first);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  for (const f of others) copyAtomic(first, f, task.tag);
}

function copyTask(task) {
  for (const f of task.outputs) copyAtomic(task.fresh[0], f, task.tag);
}

module.exports = { renderTask, copyTask, tmpName };
