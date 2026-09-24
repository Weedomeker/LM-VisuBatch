// Worker de rendu : recrée le contexte du lot puis exécute les tâches qu'on lui envoie, une à la fois.
const path = require('path');
const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');
const { createContext } = require('../context');
const { setFontsDir } = require('../render/render');
const { renderTask } = require('./execute');

// Le parallélisme vient des workers : un seul thread libvips chacun pour ne pas sursouscrire le CPU.
sharp.concurrency(1);
sharp.cache(false);

const ctx = createContext(workerData);
setFontsDir(path.join(ctx.resources, 'fonts'));

parentPort.on('message', async task => {
  try {
    await renderTask(ctx, task);
    parentPort.postMessage({ key: task.key });
  } catch (e) {
    parentPort.postMessage({ key: task.key, error: e.message, stack: e.stack });
  }
});
