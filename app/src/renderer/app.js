const plural = (n, one, many = one + 's') => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

const TYPES = [
  ['A-01','Douche'],['A-02','Deux panneaux'],['P','Panneau seul'],['C','Composition'],
  ['II-01','Formats'],['II-02','Profilés'],['II-03','Kit de pose'],
];
const PX_PAR_CM = 0.95;
const GAMMES_KEY = 'vb-gammes-recentes';
const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');

// Motifs requis par type (format|cote, '' = sans cote)
const MOTIFS_PAR_TYPE = {
  'A-01': ['100x210|'], 'A-02': ['120x250|GAUCHE','120x250|DROIT'],
  'P':    ['100x210|'], 'C':    ['120x250|GAUCHE','120x250|DROIT'],
  'II-01':['100x210|','120x250|GAUCHE'], 'II-02':[], 'II-03':[],
};

window.addEventListener('error', e => api.log('error', `${e.message} (${e.filename}:${e.lineno})\n${e.error?.stack??''}`));
window.addEventListener('unhandledrejection', e => api.log('error', e.reason?.stack ?? String(e.reason)));

const state = {
  ecran: 'accueil',
  data: null,
  courant: null,
  coches: new Set(),
  filtre: 'tous',
  recherche: '',
  enCours: false,
  analyse: false,
  optionsOuvert: false,
  depot: null,
  bilan: null,
};

// --- Navigation ---
function afficherEcran(nom) {
  for (const id of ['ecran-accueil','ecran-liste','ecran-generation','ecran-bilan']) {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== 'ecran-' + nom);
  }
  state.ecran = nom;
  $('#btn-options').hidden = (nom !== 'liste');
  $('#barre-gamme').hidden = (nom === 'accueil');
  $('#barre-sortie').hidden = (nom === 'accueil');
}

// --- Gammes récentes ---
function getGammesRecentes() {
  try { return JSON.parse(localStorage.getItem(GAMMES_KEY) || '[]'); } catch { return []; }
}
function sauvegarderGamme(gamme, outDir) {
  const lst = getGammesRecentes().filter(g => g.gamme !== gamme);
  lst.unshift({ gamme, outDir: outDir || '' });
  localStorage.setItem(GAMMES_KEY, JSON.stringify(lst.slice(0, 8)));
}

// --- Refresh ---
async function refresh() {
  state.analyse = true;
  if (state.ecran === 'liste') renderLot();
  try {
    state.data = await api.analyse();
    if (state.data?.needs === 'config') {
      state.analyse = false;
      if (state.data.settings?.gamme) renderBarre();
      window.ouvrirReglagesClient(true);
      if (state.ecran === 'liste') renderLot();
      return;
    }
  } catch (e) {
    message(`Analyse impossible : ${e.message}`, true);
  }
  state.analyse = false;
  const d = state.data;
  if (!d?.deco) { if (state.ecran !== 'accueil') renderAccueil(); return; }
  const noms = new Set(d.deco.map(x => x.dossier));
  for (const c of state.coches) if (!noms.has(c)) state.coches.delete(c);
  if (!noms.has(state.courant)) state.courant = null;
  sauvegarderGamme(d.settings.gamme, d.settings.outDir);
  renderBarre();
  if (state.ecran === 'liste') { renderListe(); renderFiche(); renderLot(); }
}

function message(text, erreur = false) {
  const el = document.createElement('div');
  el.className = `message${erreur ? ' erreur' : ''}`;
  el.textContent = text;
  $('#messages').append(el);
  setTimeout(() => el.remove(), erreur ? 9000 : 5000);
}

// --- En-tête ---
function renderBarre() {
  const s = state.data?.settings;
  if (!s) return;
  $('#chemin-gamme').textContent = court(s.gamme);
  $('#chemin-gamme').title = s.gamme ?? '';
  $('#chemin-sortie').textContent = court(s.outDir);
  $('#chemin-sortie').title = s.outDir ?? '';
}

// --- Écran Accueil ---
function renderAccueil() {
  afficherEcran('accueil');
  const gammes = getGammesRecentes();
  const s = state.data?.settings;
  const outDir = s?.outDir || '';
  $('#accueil-sortie-chemin').textContent = court(outDir);
  $('#accueil-sortie-chemin').title = outDir;

  $('#gammes-liste').innerHTML = gammes.map(g => `
    <li class="gamme-rangee" data-gamme="${esc(g.gamme)}">
      <span class="gamme-nom" title="${esc(g.gamme)}">${esc(g.gamme.split(/[\\/]/).pop())}</span>
      <span class="gamme-chemin" title="${esc(g.gamme)}">${esc(g.gamme)}</span>
      <span class="gamme-decos"></span>
      <span class="gamme-ouvrir">Ouvrir →</span>
    </li>`).join('') || '<li style="padding:20px 16px;color:var(--doux);font-size:var(--t-petit)">Aucune gamme récente.</li>';
}

$('#parcourir').addEventListener('click', async () => {
  if (await api.chooseFolder('gamme')) { await refresh(); if (state.data?.deco) afficherEcran('liste'); }
});

$('#gammes-liste').addEventListener('click', async e => {
  if (e.target.closest('.gamme-rangee')) {
    if (await api.chooseFolder('gamme')) { await refresh(); if (state.data?.deco) afficherEcran('liste'); }
  }
});

$('#retour-gammes').addEventListener('click', () => {
  closeTiroir(); fermerOptions(); renderAccueil();
});

document.addEventListener('click', async e => {
  const choisir = e.target.closest('[data-choisir]');
  if (choisir) {
    const kind = choisir.dataset.choisir;
    if (await api.chooseFolder(kind)) refresh();
  }
  const filtre = e.target.closest('[data-filtre]');
  if (filtre) { state.filtre = filtre.dataset.filtre; renderListe(); }
});

// --- Liste des décos ---
const incomplet = d => d.impossibles.length > 0 || d.problems.length > 0;

function renderListe() {
  if (!state.data?.deco) return;
  for (const b of document.querySelectorAll('[data-filtre]'))
    b.setAttribute('aria-checked', b.dataset.filtre === state.filtre);
  const q = state.recherche.trim().toLowerCase();
  const visibles = state.data.deco.filter(d =>
    (!q || d.dossier.toLowerCase().includes(q)) &&
    (state.filtre === 'tous' ||
     (state.filtre === 'afaire' && d.stats.images > 0) ||
     (state.filtre === 'incomplets' && incomplet(d))));

  const actifs = new Set(state.data.settings?.types ?? TYPES.map(t => t[0]));
  // codes impossibles extraits des chaînes d.impossibles
  const codesImpossibles = d => {
    const out = new Set();
    for (const p of d.impossibles) for (const [code] of TYPES) if (p.includes(code)) out.add(code);
    return out;
  };

  $('#deco').innerHTML = visibles.map(d => {
    const bloque = !d.refs && !d.depot;
    const imp = codesImpossibles(d);
    // filet gauche coloré
    const filet = bloque ? 'box-shadow:inset 3px 0 0 var(--rouge)'
      : imp.size ? 'box-shadow:inset 3px 0 0 var(--caramel)'
      : d.dossier === state.courant ? 'box-shadow:inset 3px 0 0 var(--bleu)' : '';

    // badges types par code
    const badgesTypes = bloque ? '' : [...actifs].map(code => {
      const cls = imp.has(code) ? 'depose' : (d.stats.images > 0 ? 'afaire' : 'ok');
      return `<span class="badge ${cls}">${esc(code)}</span>`;
    }).join('');

    // badges statut
    const badgesStatut = [];
    if (bloque) badgesStatut.push(`<span class="badge bloque">sans référence</span>`);
    else {
      if (d.stats.images > 0) badgesStatut.push(`<span class="badge afaire">${plural(d.stats.images,'image')} à faire</span>`);
      if (imp.size) badgesStatut.push(`<span class="badge depose">motif manquant</span>`);
      if (!d.stats.images && !imp.size && d.stats.upToDate) badgesStatut.push(`<span class="badge ok">à jour</span>`);
    }

    const coche = state.coches.has(d.dossier) && !bloque;
    return `<li class="rangee" data-dossier="${esc(d.dossier)}" aria-current="${d.dossier === state.courant}" style="${filet}">
      <input type="checkbox" aria-label="Générer ${esc(d.dossier)}" ${coche ? 'checked' : ''} ${bloque ? 'disabled' : ''}>
      <span class="nom" title="${esc(d.dossier)}">${esc(d.dossier)}</span>
      <span class="badges-types">${badgesTypes}</span>
      <span class="badges-statut">${badgesStatut.join('')}</span>
      <button class="detail-lien" data-detail aria-label="Voir la fiche de ${esc(d.dossier)}">Détail →</button>
    </li>`;
  }).join('') || '<li style="list-style:none;padding:32px 16px;color:var(--doux)">Aucune déco ne correspond.</li>';
}

$('#deco').addEventListener('click', e => {
  const li = e.target.closest('li[data-dossier]');
  if (!li) return;
  if (e.target.matches('input[type="checkbox"]')) {
    e.target.checked ? state.coches.add(li.dataset.dossier) : state.coches.delete(li.dataset.dossier);
    renderLot(); return;
  }
  if (e.target.matches('[data-detail]')) { openTiroir(li.dataset.dossier); return; }
});

$('#recherche').addEventListener('input', e => { state.recherche = e.target.value; renderListe(); });
$('#cocher-afaire').addEventListener('click', () => {
  for (const d of state.data?.deco ?? []) if (d.stats.images > 0) state.coches.add(d.dossier);
  renderListe(); renderLot();
});
$('#tout-decocher').addEventListener('click', () => { state.coches.clear(); renderListe(); renderLot(); });

// --- Types (lot) ---
function renderTypes() {
  const actifs = new Set(state.data?.settings?.types ?? TYPES.map(t => t[0]));
  $('#types').innerHTML = TYPES.map(([t, nom]) =>
    `<label class="types-label" title="${esc(nom)}"><input type="checkbox" value="${t}" ${actifs.has(t) ? 'checked' : ''}> ${t}</label>`).join('');
}
$('#types').addEventListener('change', async () => {
  const types = [...document.querySelectorAll('#types input:checked')].map(i => i.value);
  await api.setOption('types', types); refresh();
});
$('#tout-refaire').addEventListener('change', renderLot);

// --- Lot ---
function renderLot() {
  const resume = $('#resume');
  const bouton = $('#generer');
  if (state.enCours) return;
  const d = state.data;
  if (state.analyse) { resume.textContent = 'Analyse de la gamme…'; bouton.disabled = true; return; }
  if (!d?.deco) { resume.textContent = ''; bouton.disabled = true; return; }
  if (!d.settings.outDir) { resume.innerHTML = 'Choisissez un <strong>dossier de sortie</strong> pour générer.'; bouton.disabled = true; return; }
  if (d.lock) { resume.innerHTML = `Lot en cours dans ce dossier par <strong>${esc(d.lock.user)}</strong> (${esc(d.lock.host)})`; }
  const choisis = d.deco.filter(x => state.coches.has(x.dossier));
  const refaire = $('#tout-refaire').checked;
  const images = choisis.reduce((n, x) => n + x.stats.images + (refaire ? x.stats.upToDate : 0), 0);
  const impossibles = choisis.reduce((n, x) => n + x.stats.blocked, 0);
  if (!d.lock) {
    resume.innerHTML = !choisis.length ? 'Cochez les décos à générer'
      : `${plural(choisis.length,'déco')} : <strong>${plural(images,'image')} à produire</strong>`
        + (impossibles ? `, ${plural(impossibles,'impossible')}` : '')
        + (!images && !refaire ? ', tout est à jour' : '');
  }
  bouton.disabled = !images || !!d.lock;
}

// --- Génération ---
async function lancer() {
  if (state.enCours) return;
  const dossiers = [...state.coches];
  state.enCours = true;
  afficherEcran('generation');
  $('#gen-titre').textContent = 'Génération en cours…';
  $('#gen-barre-globale').style.width = '0%';
  $('#gen-texte-globale').textContent = 'Préparation…';
  $('#gen-reste').textContent = '';
  $('#gen-annuler').disabled = false;

  const genItems = {};
  for (const dos of dossiers) genItems[dos] = { fait: 0, total: 0 };
  renderLignesGen(dossiers, genItems);

  $('#gen-annuler').addEventListener('click', () => {
    api.cancel();
    $('#gen-titre').textContent = 'Annulation…';
    $('#gen-reste').textContent = 'Les images déjà produites sont conservées.';
    $('#gen-annuler').disabled = true;
  }, { once: true });

  const result = await api.generate({ dossiers, force: $('#tout-refaire').checked });
  try {
    state.enCours = false;
    state.bilan = result;
    $('#tout-refaire').checked = false;
    if (result.error) {
      message(result.error, true);
      afficherEcran('liste'); renderListe(); renderLot();
    } else {
      afficherEcran('bilan'); renderBilan();
    }
    refresh();
  } finally {
    state.enCours = false;
  }
}

function renderLignesGen(dossiers, items) {
  $('#gen-liste').innerHTML = dossiers.map(dos => {
    const it = items[dos] || { fait: 0, total: 0 };
    const pct = it.total ? Math.round(it.fait / it.total * 100) : 0;
    const texte = it.total ? `${it.fait} / ${it.total}` : (it.rien ? 'rien à faire' : '');
    return `<li class="gen-rangee" data-dossier="${esc(dos)}">
      <strong class="gen-nom">${esc(dos)}</strong>
      <span class="gen-barre-wrap"><div class="progression-barre"><div style="width:${pct}%"></div></div></span>
      <span class="gen-texte">${texte}</span>
      <span class="gen-alerte" id="gen-alerte-${esc(dos)}"></span>
    </li>`;
  }).join('');
}

$('#generer').addEventListener('click', lancer);

api.onProgress(e => {
  if (!state.enCours || state.ecran !== 'generation') return;
  const barre = $('#gen-barre-globale'), texte = $('#gen-texte-globale');
  if (!barre || !texte) return;
  if (e.type === 'begin') { texte.textContent = `${plural(e.images,'image')} à produire…`; return; }
  barre.style.width = `${(e.done / Math.max(1, e.total)) * 100}%`;
  if (e.type === 'start') {
    texte.textContent = `${e.done} / ${e.total} · ${e.task.dossier} ${e.task.type}`;
    const resteSec = Math.ceil((e.total - e.done) * 350 / 1000);
    $('#gen-reste').textContent = resteSec > 0 ? `environ ${plural(resteSec,'seconde restante')}` : '';
    const li = document.querySelector(`[data-dossier="${CSS.escape(e.task.dossier)}"] .gen-barre-wrap .progression-barre div`);
    if (li) li.style.width = `${(e.done / Math.max(1,e.total))*100}%`;
  }
});

// --- Bilan ---
function renderBilan() {
  const r = state.bilan;
  if (!r) return;
  const ok = (r.done ?? 0) - (r.errors?.length ?? 0);
  $('#bilan-titre').textContent = plural(r.images ?? ok, 'image produite', 'images produites');

  const badges = [];
  if (r.cancelled) badges.push(`<span class="badge afaire">lot annulé · ${plural((r.done??0) - ok,'non produite','non produites')}</span>`);
  if (r.errors?.length) badges.push(`<span class="badge depose">${plural(r.errors.length,'impossible')}</span>`);
  $('#bilan-badges').innerHTML = badges.join('');

  const problemes = r.errors?.slice(0, 20).map(e =>
    `<li class="probleme"><strong>${esc(e.dossier)}</strong> · ${esc(e.ref)} ${esc(e.type)} : ${esc(e.error)}</li>`
  ) ?? [];
  if (problemes.length) {
    $('#bilan-corriger').hidden = false;
    $('#bilan-problemes').innerHTML = problemes.join('');
  } else {
    $('#bilan-corriger').hidden = true;
  }

  const par = {};
  for (const item of (r.produced ?? [])) {
    (par[item.dossier] = par[item.dossier] || []).push(item);
  }
  $('#bilan-produites').innerHTML = Object.keys(par).map(dos => {
    const items = par[dos];
    const vignettes = items.map(it =>
      `<span class="bilan-vignette">
        <img class="bilan-vignette-img" alt="${esc(it.type)}" data-src="${esc(it.path??'')}">
        <span class="bilan-vignette-code">${esc(it.type)}</span>
      </span>`).join('');
    return `<li class="bilan-produite-rangee">
      <strong class="bilan-produite-nom">${esc(dos)}</strong>
      <span class="bilan-vignettes">${vignettes}</span>
      <span class="bilan-produite-count">${plural(items.length,'image')}</span>
    </li>`;
  }).join('') || `<li style="list-style:none;padding:20px 16px;color:var(--doux)">
    ${r.cancelled ? 'Lot annulé avant toute production.' : 'Aucune image produite.'}</li>`;

  for (const img of document.querySelectorAll('#bilan-produites img[data-src]')) {
    if (img.dataset.src) api.thumb(img.dataset.src, 128).then(src => { if (src) img.src = src; });
  }
}

$('#retour-liste').addEventListener('click', () => {
  if ($('#bilan-corriger') && !$('#bilan-corriger').hidden) state.filtre = 'incomplets';
  afficherEcran('liste'); renderListe(); renderLot();
});
$('#ouvrir-sortie-bilan').addEventListener('click', () => api.openOutput());
