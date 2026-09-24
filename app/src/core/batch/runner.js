// Exécute un plan : recopies dans le processus principal, rendus sur un pool de workers.
// Une erreur n'arrête pas le lot ; le manifeste est enregistré au fil de l'eau (une annulation garde l'acquis).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const { copyTask, tmpName } = require('./execute');
const { log } = require('../utils/log');

// Un rendu 4000 px occupe plusieurs centaines de Mo : on plafonne aussi selon la mémoire.
const defaultJobs = () => Math.max(1, Math.min(os.cpus().length - 1, Math.floor(os.totalmem() / 2 ** 30 / 1.5), 8));

const describe = t => ({ key: t.key, type: t.type, ref: t.row.ref, dossier: t.row.dossier, outputs: t.outputs.map(f => path.basename(f)) });

/**
 * @param {object} ctx contexte du lot (transmis aux workers par ctx.toData())
 * @param {object} plan résultat de buildPlan
 * @param {object} options
 * @param {import('./manifest').Manifest} options.manifest
 * @param {number} [options.jobs] nombre de workers
 * @param {(event: object) => void} [options.onEvent] { type: 'start'|'done'|'error', task, done, total, error? }
 * @param {AbortSignal} [options.signal] annulation
 */
async function runPlan(ctx, plan, { manifest, jobs = defaultJobs(), onEvent = () => {}, signal } = {}) {
  const total = plan.renders.length + plan.copies.length;
  const tag = `${os.hostname()}-${process.pid}`;
  const errors = [];
  let done = 0;
  let lastSave = Date.now();

  // `stack` : pile d'appel de l'erreur, pour le diagnostic seulement.
  const finish = (task, error, stack) => {
    done++;
    if (error) {
      errors.push({ ...describe(task), error });
      log.error(`${task.row.dossier} ${task.row.ref} ${task.type} (${path.basename(task.outputs[0])}) : ${stack || error}`);
    } else for (const f of task.outputs) manifest.set(f, task.hash);
    onEvent({ type: error ? 'error' : 'done', task: describe(task), done, total, error });
    if (Date.now() - lastSave > 2000) { manifest.save(); lastSave = Date.now(); }
  };

  for (const task of plan.copies) {
    if (signal?.aborted) break;
    try { copyTask({ ...task, tag }); finish(task); } catch (e) { finish(task, e.message, e.stack); }
  }

  const queue = [...plan.renders];
  const workers = new Set();
  const interrupted = []; // tâches en cours au moment de l'annulation
  const abort = () => { for (const w of workers) w.terminate(); };
  signal?.addEventListener('abort', abort, { once: true });

  // Envoie une tâche au worker ; se résout ({ error?, stack? }) aussi si le worker meurt (plantage, annulation).
  const send = (w, task) => new Promise(resolve => {
    const onMessage = m => { cleanup(); resolve(m); };
    const onExit = code => { cleanup(); resolve({ error: signal?.aborted ? 'annulé' : `Le rendu s'est arrêté (code ${code})` }); };
    const onError = e => { cleanup(); resolve({ error: e.message, stack: e.stack }); };
    const cleanup = () => { w.off('message', onMessage); w.off('exit', onExit); w.off('error', onError); };
    w.on('message', onMessage); w.on('exit', onExit); w.on('error', onError);
    w.postMessage({ ...task, tag });
  });

  const spawn = () => {
    const w = new Worker(path.join(__dirname, 'worker.js'), { workerData: ctx.toData() });
    workers.add(w);
    w.once('exit', () => workers.delete(w));
    return w;
  };

  const lane = async () => {
    let w = spawn();
    try {
      while (queue.length && !signal?.aborted) {
        const task = queue.shift();
        onEvent({ type: 'start', task: describe(task), done, total });
        const { error, stack } = await send(w, task);
        if (signal?.aborted) { interrupted.push(task); break; }
        finish(task, error, stack);
        if (!workers.has(w)) w = spawn(); // worker mort (mémoire…) : on repart sur un neuf
      }
    } finally {
      await w.terminate();
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, lane));
  } finally {
    signal?.removeEventListener('abort', abort);
    // Les workers sont arrêtés : leurs fichiers temporaires ne sont plus verrouillés (Windows).
    for (const t of interrupted) {
      try { fs.rmSync(tmpName(t.outputs[0], tag), { force: true }); } catch { /* sera écrasé au prochain lot */ }
    }
    manifest.save();
  }
  return { done, total, errors, cancelled: !!signal?.aborted };
}

module.exports = { runPlan, defaultJobs };
