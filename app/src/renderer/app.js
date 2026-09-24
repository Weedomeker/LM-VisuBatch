// Interface : liste des décors, fiche du décor (formats, références, réglages) et lancement du lot.
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, one, many = one + 's') => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

const TYPES = [
  ['A-01', 'Douche'], ['A-02', 'Deux panneaux'], ['P', 'Panneau seul'], ['C', 'Composition'],
  ['II-01', 'Formats'], ['II-02', 'Profilés'], ['II-03', 'Kit de pose'],
];
const PX_PAR_CM = 0.95; // échelle des panneaux dessinés

// Erreurs de l'interface : consignées dans le journal du poste.
window.addEventListener('error', e => api.log('error', `${e.message} (${e.filename}:${e.lineno})
${e.error?.stack ?? ''}`));
window.addEventListener('unhandledrejection', e => api.log('error', e.reason?.stack ?? String(e.reason)));

const state = { data: null, courant: null, coches: new Set(), filtre: 'tous', recherche: '', enCours: false, analyse: false };

// ---------------------------------------------------------------------------
// Chargement

async function refresh() {
  state.analyse = true;
  renderLot();
  try {
    state.data = await api.analyse();
  } catch (e) {
    message(`Analyse impossible : ${e.message}`, true);
  }
  state.analyse = false;
  const d = state.data;
  if (!d?.decors) return renderLot();
  const noms = new Set(d.decors.map(x => x.dossier));
  for (const c of state.coches) if (!noms.has(c)) state.coches.delete(c);
  if (!noms.has(state.courant)) state.courant = null;
  renderBarre();
  renderListe();
  renderFiche();
  renderLot();
}

function message(text, erreur = false) {
  const el = document.createElement('div');
  el.className = `message${erreur ? ' erreur' : ''}`;
  el.textContent = text;
  $('#messages').append(el);
  setTimeout(() => el.remove(), erreur ? 9000 : 5000);
}

// ---------------------------------------------------------------------------
// En-tête

function renderBarre() {
  const s = state.data.settings;
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
  $('#chemin-gamme').textContent = court(s.gamme);
  $('#chemin-gamme').title = s.gamme ?? '';
  $('#chemin-sortie').textContent = court(s.outDir);
  $('#chemin-sortie').title = s.outDir ?? '';
}

function renderOptions() {
  if (!state.data?.settings) return;
  renderTypes();
  for (const b of document.querySelectorAll('[data-rangement]'))
    b.setAttribute('aria-checked', b.dataset.rangement === state.data.settings.rangement);
}

// Popover ⚙ Options
$('#btn-options').addEventListener('click', e => {
  e.stopPropagation();
  const pop = $('#popover-options');
  pop.hidden = !pop.hidden;
  if (!pop.hidden) renderOptions();
});
$('#popover-options').addEventListener('click', async e => {
  e.stopPropagation();
  const rangement = e.target.closest('[data-rangement]');
  if (rangement) { await api.setOption('rangement', rangement.dataset.rangement); refresh(); }
  if (e.target.closest('#ouvrir-logs')) api.openLogs();
});
document.addEventListener('click', async e => {
  $('#popover-options').hidden = true;
  const choisir = e.target.closest('[data-choisir]');
  if (choisir) {
    const kind = choisir.dataset.choisir;
    if (await api.chooseFolder(kind)) refresh();
  }
  const filtre = e.target.closest('[data-filtre]');
  if (filtre) { state.filtre = filtre.dataset.filtre; renderListe(); }
});

// ---------------------------------------------------------------------------
// Liste des décors

const incomplet = d => d.impossibles.length > 0 || d.problems.length > 0;

function renderListe() {
  for (const b of document.querySelectorAll('[data-filtre]')) b.setAttribute('aria-checked', b.dataset.filtre === state.filtre);
  const q = state.recherche.trim().toLowerCase();
  const visibles = state.data.decors.filter(d =>
    (!q || d.dossier.toLowerCase().includes(q)) &&
    (state.filtre === 'tous' || (state.filtre === 'afaire' && d.stats.images > 0) || (state.filtre === 'incomplets' && incomplet(d))));
  $('#decors').innerHTML = visibles.map(d => {
    const badges = [];
    if (d.stats.images > 0) badges.push(`<span class="badge badge-afaire">${plural(d.stats.images, 'image')} à faire</span>`);
    if (d.stats.blocked > 0) badges.push(`<span class="badge badge-bloque">${plural(d.stats.blocked, 'impossible')}</span>`);
    if (!d.stats.images && !d.stats.blocked && d.stats.upToDate) badges.push(`<span class="badge badge-ok">à jour</span>`);
    if (d.depot) badges.push(`<span class="badge badge-depose">déposé</span>`);
    if (!d.refs && !d.depot) badges.push(`<span class="badge badge-ok">sans référence</span>`);
    return `<li data-dossier="${esc(d.dossier)}" aria-current="${d.dossier === state.courant}">
      <input type="checkbox" aria-label="Générer ${esc(d.dossier)}" ${state.coches.has(d.dossier) ? 'checked' : ''}>
      <span class="nom">${esc(d.dossier)}${badges.join('')}</span>
      <button class="detail-lien" data-detail aria-label="Voir la fiche de ${esc(d.dossier)}">Détail →</button>
    </li>`;
  }).join('') || '<li class="aide">Aucune déco</li>';
}

$('#decors').addEventListener('click', e => {
  const li = e.target.closest('li[data-dossier]');
  if (!li) return;
  if (e.target.matches('input[type="checkbox"]')) {
    e.target.checked ? state.coches.add(li.dataset.dossier) : state.coches.delete(li.dataset.dossier);
    renderLot();
    return;
  }
  if (e.target.matches('[data-detail]')) {
    openTiroir(li.dataset.dossier);
    return;
  }
});
$('#recherche').addEventListener('input', e => { state.recherche = e.target.value; renderListe(); });
$('#cocher-afaire').addEventListener('click', () => {
  for (const d of state.data?.decors ?? []) if (d.stats.images > 0) state.coches.add(d.dossier);
  renderListe(); renderLot();
});
$('#tout-decocher').addEventListener('click', () => { state.coches.clear(); renderListe(); renderLot(); });
$('#ajouter-source').addEventListener('click', async () => {
  const msgs = await api.addSource();
  for (const m of msgs) message(m);
  if (msgs.some(m => m.includes('ajouté'))) {
    await refresh();
    const nouveau = state.data?.decors?.find(d => d.depot && msgs.some(m => m.startsWith(`${d.dossier} ajouté`)));
    if (nouveau) openTiroir(nouveau.dossier);
  }
});

// Dépôt de dossiers décors ou de CSV de références
const depot = $('#depot');
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, e => { e.preventDefault(); depot.removeAttribute('hidden'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || !e.relatedTarget) depot.setAttribute('hidden', ''); });
document.addEventListener('drop', async e => {
  if (!e.dataTransfer.files.length) return;
  const messages = await api.drop(e.dataTransfer.files);
  for (const m of messages) message(m);
  await refresh();
  const nouveau = state.data?.decors?.find(d => d.depot && messages.some(m => m.startsWith(`${d.dossier} ajouté`)));
  if (nouveau) openTiroir(nouveau.dossier);
});

// ---------------------------------------------------------------------------
// Fiche du décor

const courant = () => state.data?.decors?.find(d => d.dossier === state.courant);

function openTiroir(dossier) {
  state.courant = dossier;
  $('#tiroir-fond').hidden = false;
  $('#tiroir').hidden = false;
  renderListe();
  renderFiche();
}

function closeTiroir() {
  $('#tiroir-fond').hidden = true;
  $('#tiroir').hidden = true;
  state.courant = null;
  renderListe();
}

$('#tiroir-fermer').addEventListener('click', closeTiroir);
$('#tiroir-fond').addEventListener('click', closeTiroir);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#tiroir').hidden) closeTiroir(); });

function renderFiche() {
  if (!state.courant) return;
  const d = courant();
  if (!d) { closeTiroir(); return; }
  $('#tiroir-titre').textContent = d.dossier;
  $('#tiroir-corps').innerHTML = `
    <p class="origine">${d.depot ? 'Déposé depuis ' : ''}${esc(d.chemin)}
      ${d.depot ? ' <button class="lien" id="retirer">Retirer de la liste</button>' : ''}</p>
    ${renderPanneaux(d)}
    ${renderProblemes(d)}
    <h2>Références</h2>
    ${renderRefs(d)}`;
  for (const img of $('#tiroir-corps').querySelectorAll('img[data-motif]')) {
    api.thumb(img.dataset.motif, Number(img.dataset.h) || 300).then(src => { if (src) img.src = src; });
  }
  bindFiche(d);
}

// Les formats à l'échelle, posés sur une même ligne de sol ; un motif absent est hachuré.
function renderPanneaux(d) {
  const groupes = new Map();
  for (const f of d.formats) (groupes.get(f.format) || groupes.set(f.format, []).get(f.format)).push(f);
  const items = [...groupes].map(([format, faces]) => {
    const [l, h] = format.split('x').map(Number);
    const w = Math.round(l * PX_PAR_CM), ht = Math.round(h * PX_PAR_CM);
    const images = faces.map(f => f.chemin
      ? `<div class="panneau-image" style="width:${w}px;height:${ht}px" title="${esc(f.motif)}"><img alt="" data-motif="${esc(f.chemin)}" data-h="${ht * 2}"></div>`
      : `<div class="panneau-image absent" style="width:${w}px;height:${ht}px" title="Motif « au 10ème » manquant"><span>${f.cote ? esc(f.cote.toLowerCase()) + ' ' : ''}manquant</span></div>`).join('');
    const refs = faces.flatMap(f => f.refs.map(r => r.ref));
    return `<div class="panneau">
      <div class="panneau-paire">${images}</div>
      <div class="panneau-legende"><strong>${l} × ${h}</strong>${refs.length ? esc(refs.join(' · ')) : '<span class="sans-ref">sans référence</span>'}</div>
    </div>`;
  });
  return `<div class="panneaux" aria-label="Formats du décor à l'échelle">${items.join('')}</div>`;
}

function renderProblemes(d) {
  if (!d.impossibles.length && !d.problems.length) return '';
  return `<h2>À vérifier</h2><ul class="problemes">
    ${d.impossibles.map(p => `<li class="bloquant">Image impossible, ${esc(p)}</li>`).join('')}
    ${d.problems.map(p => `<li>${esc(p.replace(`${d.dossier} : `, ''))}</li>`).join('')}
  </ul>`;
}

function renderRefs(d) {
  const rows = d.formats.map(f => `
    <tr data-key="${esc(f.key)}">
      <td class="format">${esc(f.format.replace('x', ' × '))}${f.cote ? ' ' + esc(f.cote.toLowerCase()) : ''}</td>
      <td>${f.motif ? '<span class="motif-ok">présent</span>' : '<span class="motif-absent">manquant</span>'}</td>
      <td><div class="refs">
        ${f.refs.map(r => `<span class="ref ${r.origine}" title="${r.origine === 'saisie' ? 'Saisie dans l\'application' : 'Lue dans le nom d\'un fichier'}">
          ${esc(r.ref)} <small>${esc(r.finition ? r.finition.toLowerCase() : 'sans finition')}</small>
          ${r.origine === 'saisie' ? `<button data-retirer-ref="${esc(r.ref)}" aria-label="Retirer ${esc(r.ref)}">×</button>` : ''}
        </span>`).join('')}
        <span class="ajout-ref">
          <input inputmode="numeric" maxlength="8" placeholder="94xxxxxx" aria-label="Nouvelle référence">
          <select aria-label="Finition"><option value="MAT">mat</option><option value="BRILLANT">brillant</option><option value="">sans</option></select>
          <button class="secondaire" data-ajouter-ref>Ajouter</button>
        </span>
      </div></td>
    </tr>`).join('');
  return `<table><thead><tr><th>Format</th><th>Motif au 10ème</th><th>Références</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="aide legende-refs">Les références en vert sont saisies ici ; les autres sont lues dans les noms de fichiers du dossier.</p>`;
}


function bindFiche(d) {
  $('#retirer')?.addEventListener('click', async () => { await api.removeSource(d.chemin); refresh(); });

  $('#tiroir-corps').querySelector('table')?.addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-key]');
    if (!tr) return;
    const f = d.formats.find(x => x.key === tr.dataset.key);
    const saisies = f.refs.filter(r => r.origine === 'saisie').map(({ ref, finition }) => ({ ref, finition }));
    if (e.target.matches('[data-retirer-ref]')) {
      await api.setRefs(d.chemin, f.key, saisies.filter(r => r.ref !== e.target.dataset.retirerRef));
      return refresh();
    }
    if (e.target.matches('[data-ajouter-ref]')) {
      const ref = tr.querySelector('.ajout-ref input').value.trim();
      if (!/^9\d{7}$/.test(ref)) return message('Une référence compte 8 chiffres et commence par 9.', true);
      const finition = tr.querySelector('.ajout-ref select').value;
      await api.setRefs(d.chemin, f.key, [...saisies.filter(r => r.ref !== ref), { ref, finition }]);
      message(`Référence ${ref} ajoutée au ${f.format.replace('x', ' × ')}`);
      refresh();
    }
  });
  $('#tiroir-corps').querySelector('table')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('.ajout-ref input')) e.target.closest('tr').querySelector('[data-ajouter-ref]').click();
  });

}

// ---------------------------------------------------------------------------
// Lot

function renderTypes() {
  const actifs = new Set(state.data?.settings?.types ?? TYPES.map(t => t[0]));
  $('#types').innerHTML = TYPES.map(([t, nom]) =>
    `<label class="types-label" title="${esc(nom)}"><input type="checkbox" value="${t}" ${actifs.has(t) ? 'checked' : ''}> ${t}</label>`).join('');
}
$('#types').addEventListener('change', async () => {
  const types = [...document.querySelectorAll('#types input:checked')].map(i => i.value);
  await api.setOption('types', types);
  refresh();
});
$('#tout-refaire').addEventListener('change', renderLot);

function renderLot() {
  const resume = $('#resume');
  const bouton = $('#generer');
  if (state.enCours) return;
  const d = state.data;
  if (state.analyse) { resume.textContent = 'Analyse de la gamme…'; bouton.disabled = true; return; }
  if (!d?.decors) { resume.textContent = ''; bouton.disabled = true; return; }
  if (!d.settings.outDir) { resume.innerHTML = 'Choisissez un <strong>dossier de sortie</strong> pour générer.'; bouton.disabled = true; return; }
  if (d.lock) {
    resume.innerHTML = `Lot en cours dans ce dossier par <strong>${esc(d.lock.user)}</strong> (${esc(d.lock.host)})`;
  }
  const choisis = d.decors.filter(x => state.coches.has(x.dossier));
  const refaire = $('#tout-refaire').checked;
  const images = choisis.reduce((n, x) => n + x.stats.images + (refaire ? x.stats.upToDate : 0), 0);
  const impossibles = choisis.reduce((n, x) => n + x.stats.blocked, 0);
  if (!d.lock) {
    resume.innerHTML = !choisis.length
      ? 'Cochez les décos à générer'
      : `${plural(choisis.length, 'déco')} : <strong>${plural(images, 'image')} à produire</strong>` +
        (impossibles ? `, ${plural(impossibles, 'impossible')}` : '') +
        (!images && !refaire ? ', tout est à jour' : '');
  }
  bouton.disabled = !images || !!d.lock;
}

async function lancer() {
  const dossiers = [...state.coches];
  state.enCours = true;
  $('#actions').innerHTML = `
    <div class="progression"><div class="progression-barre"><div id="barre"></div></div><div class="progression-texte" id="avance">Préparation…</div></div>
    <button class="secondaire" id="annuler">Annuler</button>`;
  $('#resume').textContent = '';
  $('#annuler').addEventListener('click', () => { api.cancel(); $('#avance').textContent = 'Annulation…'; });
  const result = await api.generate({ dossiers, force: $('#tout-refaire').checked });
  state.enCours = false;
  $('#actions').innerHTML = '<button class="principal" id="generer">Générer</button>';
  $('#generer').addEventListener('click', lancer);
  if (result.error) message(result.error, true);
  else {
    const ok = result.done - result.errors.length;
    message(result.cancelled ? `Lot annulé : ${plural(ok, 'rendu terminé', 'rendus terminés')}, ils sont conservés.` : `${plural(result.images, 'image générée', 'images générées')}.`);
    for (const e of result.errors.slice(0, 5)) message(`${e.dossier} ${e.ref} ${e.type} : ${e.error}`, true);
    if (result.errors.length > 5) message(`… et ${result.errors.length - 5} autres erreurs`, true);
    if (!result.cancelled) {
      const ouvrir = document.createElement('button');
      ouvrir.className = 'lien';
      ouvrir.textContent = 'Ouvrir le dossier de sortie';
      ouvrir.addEventListener('click', () => api.openOutput());
      $('#actions').prepend(ouvrir);
    }
  }
  $('#tout-refaire').checked = false;
  refresh();
}
$('#generer').addEventListener('click', lancer);

api.onProgress(e => {
  if (!state.enCours) return;
  const barre = $('#barre'), avance = $('#avance');
  if (!barre) return;
  if (e.type === 'begin') { avance.textContent = `${plural(e.images, 'image')} à produire…`; return; }
  barre.style.width = `${(e.done / Math.max(1, e.total)) * 100}%`;
  if (e.type === 'start') avance.textContent = `${e.done} / ${e.total} · ${e.task.dossier} ${e.task.type}`;
});

refresh();
