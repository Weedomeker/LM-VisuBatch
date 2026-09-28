const plural = (n, one, many = one + 's') => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;
const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

const TYPES = [
  ['A-01', 'Douche'],
  ['A-02', 'Deux panneaux'],
  ['P', 'Panneau seul'],
  ['C', 'Composition'],
  ['II-01', 'Formats'],
  ['II-02', 'Profilés'],
  ['II-03', 'Kit de pose'],
];
const GAMMES_KEY = 'vb-gammes-recentes';
const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');

window.addEventListener('error', e => api.log('error', `${e.message} (${e.filename}:${e.lineno})\n${e.error?.stack ?? ''}`));
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
  for (const id of ['ecran-accueil', 'ecran-liste', 'ecran-generation', 'ecran-bilan']) {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== 'ecran-' + nom;
  }
  state.ecran = nom;
  $('#btn-options').hidden = nom !== 'liste';
  $('#barre-gamme').hidden = nom === 'accueil';
  $('#barre-sortie').hidden = nom === 'accueil';
}

// --- Gammes récentes ---
function getGammesRecentes() {
  try {
    return JSON.parse(localStorage.getItem(GAMMES_KEY) || '[]');
  } catch {
    return [];
  }
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
  if (!d?.deco) {
    if (state.ecran !== 'accueil') renderAccueil();
    return;
  }
  const noms = new Set(d.deco.map(x => x.dossier));
  for (const c of state.coches) if (!noms.has(c)) state.coches.delete(c);
  if (!noms.has(state.courant)) state.courant = null;
  sauvegarderGamme(d.settings.gamme, d.settings.outDir);
  renderBarre();
  if (state.ecran === 'liste') {
    renderListe();
    renderFiche();
    renderLot();
  }
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

  $('#gammes-liste').innerHTML =
    gammes
      .map(
        g => `
    <li class="gamme-rangee" data-gamme="${esc(g.gamme)}">
      <span class="gamme-nom" title="${esc(g.gamme)}">${esc(g.gamme.split(/[\\/]/).pop())}</span>
      <span class="gamme-chemin" title="${esc(g.gamme)}">${esc(g.gamme)}</span>
      <span class="gamme-decos"></span>
      <span class="gamme-ouvrir">Ouvrir →</span>
    </li>`,
      )
      .join('') || '<li style="padding:20px 16px;color:var(--doux);font-size:var(--t-petit)">Aucune gamme récente.</li>';
}

$('#parcourir').addEventListener('click', async () => {
  if (await api.chooseFolder('gamme')) {
    await refresh();
    if (state.data?.deco) afficherEcran('liste');
  }
});

$('#gammes-liste').addEventListener('click', async e => {
  if (e.target.closest('.gamme-rangee')) {
    if (await api.chooseFolder('gamme')) {
      await refresh();
      if (state.data?.deco) afficherEcran('liste');
    }
  }
});

$('#retour-gammes').addEventListener('click', () => {
  closeTiroir();
  fermerOptions();
  renderAccueil();
});

document.addEventListener('click', async e => {
  const choisir = e.target.closest('[data-choisir]');
  if (choisir) {
    const kind = choisir.dataset.choisir;
    if (await api.chooseFolder(kind)) refresh();
  }
  const filtre = e.target.closest('[data-filtre]');
  if (filtre) {
    state.filtre = filtre.dataset.filtre;
    renderListe();
  }
});

// --- Liste des décos ---
const incomplet = d => d.impossibles.length > 0 || d.problems.length > 0;

function renderListe() {
  if (!state.data?.deco) return;
  for (const b of document.querySelectorAll('[data-filtre]')) b.setAttribute('aria-checked', b.dataset.filtre === state.filtre);
  const q = state.recherche.trim().toLowerCase();
  const visibles = state.data.deco.filter(
    d =>
      (!q || d.dossier.toLowerCase().includes(q)) &&
      (state.filtre === 'tous' || (state.filtre === 'afaire' && d.stats.images > 0) || (state.filtre === 'incomplets' && incomplet(d))),
  );

  const actifs = new Set(state.data.settings?.types ?? TYPES.map(t => t[0]));
  // codes impossibles extraits des chaînes d.impossibles
  const codesImpossibles = d => {
    const out = new Set();
    for (const p of d.impossibles) for (const [code] of TYPES) if (p.includes(code)) out.add(code);
    return out;
  };

  $('#deco').innerHTML =
    visibles
      .map(d => {
        const bloque = !d.refs && !d.depot;
        const imp = codesImpossibles(d);
        // filet gauche coloré
        const filet = bloque
          ? 'box-shadow:inset 3px 0 0 var(--rouge)'
          : imp.size
            ? 'box-shadow:inset 3px 0 0 var(--caramel)'
            : d.dossier === state.courant
              ? 'box-shadow:inset 3px 0 0 var(--bleu)'
              : '';

        // badges types par code
        const badgesTypes = bloque
          ? ''
          : [...actifs]
              .map(code => {
                const cls = imp.has(code) ? 'depose' : d.stats.images > 0 ? 'afaire' : 'ok';
                return `<span class="badge ${cls}">${esc(code)}</span>`;
              })
              .join('');

        // badges statut
        const badgesStatut = [];
        if (bloque) badgesStatut.push(`<span class="badge bloque">sans référence</span>`);
        else {
          if (d.stats.images > 0) badgesStatut.push(`<span class="badge afaire">${plural(d.stats.images, 'image')} à faire</span>`);
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
      })
      .join('') || '<li style="list-style:none;padding:32px 16px;color:var(--doux)">Aucune déco ne correspond.</li>';
}

$('#deco').addEventListener('click', e => {
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

$('#recherche').addEventListener('input', e => {
  state.recherche = e.target.value;
  renderListe();
});
$('#cocher-afaire').addEventListener('click', () => {
  for (const d of state.data?.deco ?? []) if (d.stats.images > 0) state.coches.add(d.dossier);
  renderListe();
  renderLot();
});
$('#tout-decocher').addEventListener('click', () => {
  state.coches.clear();
  renderListe();
  renderLot();
});

// --- Types (lot) ---
function renderTypes() {
  const actifs = new Set(state.data?.settings?.types ?? TYPES.map(t => t[0]));
  $('#types').innerHTML = TYPES.map(
    ([t, nom]) =>
      `<label class="types-label" title="${esc(nom)}"><input type="checkbox" value="${t}" ${actifs.has(t) ? 'checked' : ''}> ${t}</label>`,
  ).join('');
}
$('#types').addEventListener('change', async () => {
  const types = [...document.querySelectorAll('#types input:checked')].map(i => i.value);
  await api.setOption('types', types);
  refresh();
});
$('#tout-refaire').addEventListener('change', renderLot);

// --- Lot ---
function renderLot() {
  const resume = $('#resume');
  const bouton = $('#generer');
  if (state.enCours) return;
  const d = state.data;
  if (state.analyse) {
    resume.textContent = 'Analyse de la gamme…';
    bouton.disabled = true;
    return;
  }
  if (!d?.deco) {
    resume.textContent = '';
    bouton.disabled = true;
    return;
  }
  if (!d.settings.outDir) {
    resume.innerHTML = 'Choisissez un <strong>dossier de sortie</strong> pour générer.';
    bouton.disabled = true;
    return;
  }
  if (d.lock) {
    resume.innerHTML = `Lot en cours dans ce dossier par <strong>${esc(d.lock.user)}</strong> (${esc(d.lock.host)})`;
  }
  const choisis = d.deco.filter(x => state.coches.has(x.dossier));
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

  $('#gen-annuler').addEventListener(
    'click',
    () => {
      api.cancel();
      $('#gen-titre').textContent = 'Annulation…';
      $('#gen-reste').textContent = 'Les images déjà produites sont conservées.';
      $('#gen-annuler').disabled = true;
    },
    { once: true },
  );

  const result = await api.generate({ dossiers, force: $('#tout-refaire').checked });
  try {
    state.enCours = false;
    state.bilan = result;
    $('#tout-refaire').checked = false;
    if (result.error) {
      message(result.error, true);
      afficherEcran('liste');
      renderListe();
      renderLot();
    } else {
      afficherEcran('bilan');
      renderBilan();
    }
    refresh();
  } finally {
    state.enCours = false;
  }
}

function renderLignesGen(dossiers, items) {
  $('#gen-liste').innerHTML = dossiers
    .map(dos => {
      const it = items[dos] || { fait: 0, total: 0 };
      const pct = it.total ? Math.round((it.fait / it.total) * 100) : 0;
      const texte = it.total ? `${it.fait} / ${it.total}` : it.rien ? 'rien à faire' : '';
      return `<li class="gen-rangee" data-dossier="${esc(dos)}">
      <strong class="gen-nom">${esc(dos)}</strong>
      <span class="gen-barre-wrap"><div class="progression-barre"><div style="width:${pct}%"></div></div></span>
      <span class="gen-texte">${texte}</span>
      <span class="gen-alerte" id="gen-alerte-${esc(dos)}"></span>
    </li>`;
    })
    .join('');
}

$('#generer').addEventListener('click', lancer);

api.onProgress(e => {
  if (!state.enCours || state.ecran !== 'generation') return;
  const barre = $('#gen-barre-globale'),
    texte = $('#gen-texte-globale');
  if (!barre || !texte) return;
  if (e.type === 'begin') {
    texte.textContent = `${plural(e.images, 'image')} à produire…`;
    return;
  }
  barre.style.width = `${(e.done / Math.max(1, e.total)) * 100}%`;
  if (e.type === 'start') {
    texte.textContent = `${e.done} / ${e.total} · ${e.task.dossier} ${e.task.type}`;
    const resteSec = Math.ceil(((e.total - e.done) * 350) / 1000);
    $('#gen-reste').textContent = resteSec > 0 ? `environ ${plural(resteSec, 'seconde restante')}` : '';
    const li = document.querySelector(`[data-dossier="${CSS.escape(e.task.dossier)}"] .gen-barre-wrap .progression-barre div`);
    if (li) li.style.width = `${(e.done / Math.max(1, e.total)) * 100}%`;
  }
});

// --- Bilan ---
function renderBilan() {
  const r = state.bilan;
  if (!r) return;
  const ok = (r.done ?? 0) - (r.errors?.length ?? 0);
  $('#bilan-titre').textContent = plural(r.images ?? ok, 'image produite', 'images produites');

  const badges = [];
  if (r.cancelled)
    badges.push(`<span class="badge afaire">lot annulé · ${plural((r.done ?? 0) - ok, 'non produite', 'non produites')}</span>`);
  if (r.errors?.length) badges.push(`<span class="badge depose">${plural(r.errors.length, 'impossible')}</span>`);
  $('#bilan-badges').innerHTML = badges.join('');

  const problemes =
    r.errors
      ?.slice(0, 20)
      .map(e => `<li class="probleme"><strong>${esc(e.dossier)}</strong> · ${esc(e.ref)} ${esc(e.type)} : ${esc(e.error)}</li>`) ?? [];
  if (problemes.length) {
    $('#bilan-corriger').hidden = false;
    $('#bilan-problemes').innerHTML = problemes.join('');
  } else {
    $('#bilan-corriger').hidden = true;
  }

  const par = {};
  for (const item of r.produced ?? []) {
    (par[item.dossier] = par[item.dossier] || []).push(item);
  }
  $('#bilan-produites').innerHTML =
    Object.keys(par)
      .map(dos => {
        const items = par[dos];
        const vignettes = items
          .map(
            it =>
              `<span class="bilan-vignette">
        <img class="bilan-vignette-img" alt="${esc(it.type)}" data-src="${esc(it.path ?? '')}">
        <span class="bilan-vignette-code">${esc(it.type)}</span>
      </span>`,
          )
          .join('');
        return `<li class="bilan-produite-rangee">
      <strong class="bilan-produite-nom">${esc(dos)}</strong>
      <span class="bilan-vignettes">${vignettes}</span>
      <span class="bilan-produite-count">${plural(items.length, 'image')}</span>
    </li>`;
      })
      .join('') ||
    `<li style="list-style:none;padding:20px 16px;color:var(--doux)">
    ${r.cancelled ? 'Lot annulé avant toute production.' : 'Aucune image produite.'}</li>`;

  for (const img of document.querySelectorAll('#bilan-produites img[data-src]')) {
    if (img.dataset.src)
      api.thumb(img.dataset.src, hauteurVignette(img, 64)).then(src => {
        if (src) img.src = src;
      });
  }
}

$('#retour-liste').addEventListener('click', () => {
  if ($('#bilan-corriger') && !$('#bilan-corriger').hidden) state.filtre = 'incomplets';
  afficherEcran('liste');
  renderListe();
  renderLot();
});
$('#ouvrir-sortie-bilan').addEventListener('click', () => api.openOutput());

// --- Fiche déco ---
const courant = () => state.data?.deco?.find(d => d.dossier === state.courant);

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
  if (state.ecran === 'liste') renderListe();
}

$('#tiroir-fermer').addEventListener('click', closeTiroir);
$('#tiroir-fond').addEventListener('click', closeTiroir);

function renderFiche() {
  if (!state.courant) return;
  const d = courant();
  if (!d) {
    closeTiroir();
    return;
  }
  const bloque = !d.refs && !d.depot;
  $('#tiroir-titre').textContent = d.dossier.toUpperCase();

  const statuts = [];
  if (bloque) statuts.push(`<span class="badge bloque" style="margin:0">sans référence</span>`);
  else {
    if (d.stats.images > 0) statuts.push(`<span class="badge afaire" style="margin:0">${plural(d.stats.images, 'image')} à faire</span>`);
    if (d.stats.blocked > 0) statuts.push(`<span class="badge depose" style="margin:0">${plural(d.stats.blocked, 'impossible')}</span>`);
    if (!d.stats.images && !d.stats.blocked && d.stats.upToDate) statuts.push(`<span class="badge ok" style="margin:0">à jour</span>`);
  }

  $('#tiroir-corps').innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">${statuts.join('')}</div>
    <h2>Références</h2>
    ${renderRefs(d)}
    <h2>Motifs au 10ème</h2>
    ${renderMotifs(d)}
    <h2>Visuels</h2>
    ${renderVisuels(d)}
    <div class="tiroir-pied" style="margin:28px -24px -32px;padding:14px 20px;border-top:1px solid var(--trait);display:flex;align-items:center;gap:16px">
      <span class="aide" style="flex:1">${esc(resumerFiche(d))}</span>
      <button class="principal" id="fiche-generer" ${bloque ? 'disabled' : ''}>Générer cette déco</button>
    </div>`;

  for (const img of $('#tiroir-corps').querySelectorAll('img[data-motif]'))
    api.thumb(img.dataset.motif, Number(img.dataset.h) || 300).then(src => {
      if (src) img.src = src;
    });
  for (const wrap of $('#tiroir-corps').querySelectorAll('[data-visuel-type]'))
    loadVisuelThumb(wrap, computeVisuelPaths(d, wrap.dataset.visuelType));
}

function renderRefs(d) {
  const sansRef = !d.refs && !d.depot;
  const uniqueRefs = [...new Map(d.formats.flatMap(f => f.refs).map(r => [`${r.ref}|${r.finition}`, r])).values()];
  const puces = uniqueRefs
    .map(
      r =>
        `<span class="ref ${r.origine}">
      ${esc(r.ref)} <small>${esc(r.finition ? r.finition.toLowerCase() : 'sans finition')}</small>
      ${r.origine === 'saisie' ? `<button data-retirer-ref-global="${esc(r.ref)}" aria-label="Retirer ${esc(r.ref)}">×</button>` : ''}
    </span>`,
    )
    .join('');

  return `<div class="refs">
    ${puces || (sansRef ? `<span style="color:var(--rouge);font-weight:700;font-size:var(--t-petit)">sans référence</span>` : '')}
    <span class="ajout-ref">
      <input inputmode="numeric" maxlength="8" placeholder="9xxxxxxx" aria-label="Nouvelle référence">
      <select aria-label="Finition"><option value="MAT">mat</option><option value="BRILLANT">brillant</option><option value="">sans</option></select>
      <button class="secondaire" data-ajouter-ref>+ Ajouter</button>
    </span>
  </div>
  <p class="aide legende-refs">Les références en bleu sont saisies ici ; les autres sont lues dans les noms de fichiers du dossier.</p>`;
}

function renderMotifs(d) {
  const rows = d.formats
    .map(f => {
      const nomAttendu = `${d.dossier} ${f.format.replace('x', ' × ')}${f.cote ? ' ' + f.cote : ''} au 10ème.jpg`;
      const statut = f.motif
        ? `<span class="motif-ok">présent</span>`
        : `<span style="display:grid;gap:2px;justify-items:end"><span class="motif-absent">manquant</span><button class="lien" data-deposer="${esc(f.key)}" style="font-size:var(--t-petit)">Déposer le motif…</button></span>`;
      return `<tr data-key="${esc(f.key)}">
      <td class="format">${esc(f.format.replace('x', ' × '))}${f.cote ? ' ' + esc(f.cote.toLowerCase()) : ''}</td>
      <td style="font-family:monospace;font-size:var(--t-petit);color:var(--doux)">${esc(nomAttendu)}</td>
      <td style="text-align:right">${statut}</td>
    </tr>`;
    })
    .join('');
  return `<table><thead><tr><th>Format</th><th>Fichier attendu</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderVisuels(d) {
  const actifs = state.data?.settings?.types ?? TYPES.map(t => t[0]);
  const bloque = !d.refs && !d.depot;
  const impCodes = new Set();
  for (const p of d.impossibles) for (const [code] of TYPES) if (p.includes(code)) impCodes.add(code);

  const tuiles = actifs.map(code => {
    let tuileHtml, labelCls, labelTxt;
    if (bloque) {
      tuileHtml = `<div class="visuel-afaire" style="border-color:var(--rouge);opacity:.4"></div>`;
      labelCls = 'bloque';
      labelTxt = 'bloqué';
    } else if (impCodes.has(code)) {
      tuileHtml = `<div class="visuel-manquant"></div>`;
      labelCls = 'manquant';
      labelTxt = 'motif manquant';
    } else if (d.stats.upToDate > 0) {
      tuileHtml = `<div class="visuel-img" data-visuel-type="${esc(code)}"><img style="display:none" alt="${esc(code)}"></div>`;
      labelCls = 'ok';
      labelTxt = d.stats.images === 0 ? 'à jour' : 'à faire';
    } else if (d.stats.images === 0) {
      tuileHtml = `<div class="visuel-afaire" style="opacity:.35"></div>`;
      labelCls = 'ok';
      labelTxt = 'à jour';
    } else {
      tuileHtml = `<div class="visuel-afaire"></div>`;
      labelCls = 'afaire';
      labelTxt = 'à faire';
    }
    return `<div class="visuel-tuile">
      ${tuileHtml}
      <span class="visuel-legende"><strong>${esc(code)}</strong> <span class="${labelCls}">${labelTxt}</span></span>
    </div>`;
  });
  return `<div class="visuels-grille">${tuiles.join('')}</div>`;
}

function computeVisuelPaths(d, code) {
  const outDir = state.data?.settings?.outDir;
  const rangement = state.data?.settings?.rangement ?? 'decor';
  if (!outDir || !d.formats?.length) return [];
  const sep = outDir.includes('\\') ? '\\' : '/';
  const paths = [];
  for (const f of d.formats) {
    if (!f.refs?.length) continue;
    const [largeur, hauteur] = f.format.split('x');
    for (const r of f.refs) {
      const nom = [d.decor.toUpperCase(), f.cote, r.finition && capitalize(r.finition), `${largeur}x${hauteur}`].filter(Boolean).join(' ');
      const filename = `${r.ref}-${code}-${nom}.jpg`;
      const full = rangement === 'decor' ? `${outDir}${sep}${d.dossier}${sep}${filename}` : `${outDir}${sep}${filename}`;
      paths.push(full);
    }
  }
  return paths;
}

// Hauteur de miniature à demander pour un élément : sa hauteur affichée × densité de l'écran,
// arrondie au multiple de 64 supérieur (limite le nombre de variantes mises en cache).
function hauteurVignette(el, defaut = 400) {
  const h = (el?.clientHeight || defaut) * (window.devicePixelRatio || 1);
  return Math.ceil(h / 64) * 64;
}

function loadVisuelThumb(wrap, paths, idx = 0) {
  if (idx >= paths.length) return;
  api.thumb(paths[idx], hauteurVignette(wrap)).then(src => {
    if (src) {
      const img = wrap.querySelector('img');
      const lbl = wrap.closest('.visuel-tuile')?.querySelector('.visuel-legende span:last-child');
      if (img) {
        img.src = src;
        img.style.display = 'block';
      }
      if (lbl) {
        lbl.textContent = 'produit';
        lbl.className = 'ok';
      }
    } else {
      loadVisuelThumb(wrap, paths, idx + 1);
    }
  });
}

function resumerFiche(d) {
  const bloque = !d.refs && !d.depot;
  if (bloque) return 'Déco bloquée — référence manquante ou invalide.';
  const images = d.stats.images,
    imp = d.stats.blocked;
  if (!images && !imp) return 'Toutes les images sont à jour.';
  return [images ? plural(images, 'image') + ' à produire' : '', imp ? plural(imp, 'impossible') : ''].filter(Boolean).join(' · ');
}

// Délégation unique pour la fiche (pas de rebinding à chaque renderFiche)
$('#tiroir-corps').addEventListener('click', async e => {
  const d = courant();
  if (!d) return;
  const retirerG = e.target.closest('[data-retirer-ref-global]');
  if (retirerG) {
    const ref = retirerG.dataset.retirerRefGlobal;
    for (const f of d.formats) {
      const saisies = f.refs.filter(r => r.origine === 'saisie' && r.ref !== ref).map(({ ref, finition }) => ({ ref, finition }));
      if (f.refs.some(r => r.ref === ref && r.origine === 'saisie')) await api.setRefs(d.chemin, f.key, saisies);
    }
    return refresh();
  }
  if (e.target.matches('[data-ajouter-ref]')) {
    const input = $('#tiroir-corps').querySelector('.ajout-ref input');
    const sel = $('#tiroir-corps').querySelector('.ajout-ref select');
    const ref = input.value.trim();
    const regex = state.data?.settings?.refPattern || '9\\d{7}';
    try {
      if (!new RegExp('^(?:' + regex + ')$').test(ref)) {
        message('Référence invalide selon le pattern configuré.', true);
        return;
      }
    } catch {
      message('Pattern de référence invalide.', true);
      return;
    }
    const finition = sel.value;
    for (const f of d.formats) {
      const saisies = f.refs.filter(r => r.origine === 'saisie').map(({ ref: r, finition: fin }) => ({ ref: r, finition: fin }));
      if (!saisies.find(s => s.ref === ref)) await api.setRefs(d.chemin, f.key, [...saisies, { ref, finition }]);
    }
    message(`Référence ${ref} ajoutée.`);
    refresh();
    return;
  }
  const deposer = e.target.closest('[data-deposer]');
  if (deposer) {
    message('Glissez le fichier motif sur la fenêtre pour le déposer.');
    return;
  }
  if (e.target.matches('#fiche-generer')) {
    state.coches.clear();
    state.coches.add(d.dossier);
    closeTiroir();
    lancer();
    return;
  }
});

// --- Options tiroir ---
function ouvrirOptions() {
  state.optionsOuvert = true;
  $('#opt-fond').hidden = false;
  $('#opt-tiroir').hidden = false;
  renderOptions();
}
function fermerOptions() {
  state.optionsOuvert = false;
  $('#opt-fond').hidden = true;
  $('#opt-tiroir').hidden = true;
}
function renderOptions() {
  if (!state.data?.settings) return;
  renderTypes();
  for (const b of document.querySelectorAll('[data-rangement]'))
    b.setAttribute('aria-checked', b.dataset.rangement === state.data.settings.rangement);
  const actifs = state.data.settings.types ?? TYPES.map(t => t[0]);
  $('#opt-types-resume').textContent =
    actifs.length === TYPES.length ? `${actifs.length} types actifs — tous` : `${actifs.length} / ${TYPES.length} types actifs`;
  const outDir = state.data.settings.outDir || '…';
  const rang = state.data.settings.rangement;
  const ligne = rang === 'decor' ? `${outDir}\n  DÉCO\n    REF_TYPE.jpg` : `${outDir}\n  REF_TYPE.jpg`;
  $('#opt-apercu').textContent = ligne;
}

$('#btn-options').addEventListener('click', e => {
  e.stopPropagation();
  state.optionsOuvert ? fermerOptions() : ouvrirOptions();
});
$('#opt-fermer').addEventListener('click', fermerOptions);
$('#opt-fond').addEventListener('click', fermerOptions);

$('#opt-corps').addEventListener('click', async e => {
  e.stopPropagation();
  const rangement = e.target.closest('[data-rangement]');
  if (rangement) {
    await api.setOption('rangement', rangement.dataset.rangement);
    refresh();
    renderOptions();
  }
  if (e.target.closest('#ouvrir-logs')) api.openLogs();
});

// --- Dépôt de fichiers ---
let dragCpt = 0;

function cibleDepot() {
  if (state.ecran === 'accueil') return { titre: 'Déposez le dossier GAMME', aide: "La gamme s'ouvre avec sa sortie mémorisée." };
  if (state.courant) {
    const d = courant();
    const manquants = d?.formats.filter(f => !f.motif) ?? [];
    if (manquants.length)
      return {
        titre: 'Déposez le motif au 10ème',
        aide: manquants.map(f => `${f.format.replace('x', ' × ')}${f.cote ? ' ' + f.cote : ''}`).join(', '),
      };
  }
  return { titre: 'Dépôt impossible ici', aide: "Ouvrez la fiche d'une déco dont un motif manque." };
}

document.addEventListener('dragenter', e => {
  if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
  e.preventDefault();
  dragCpt++;
  const c = cibleDepot();
  $('#depot-titre').textContent = c.titre;
  $('#depot-aide').textContent = c.aide;
  $('#depot').hidden = false;
});
document.addEventListener('dragover', e => {
  if (!$('#depot').hidden) e.preventDefault();
});
document.addEventListener('dragleave', () => {
  if (--dragCpt <= 0) {
    dragCpt = 0;
    $('#depot').hidden = true;
  }
});
document.addEventListener('drop', async e => {
  e.preventDefault();
  dragCpt = 0;
  $('#depot').hidden = true;
  if (!e.dataTransfer.files.length) return;
  const msgs = await api.drop(e.dataTransfer.files);
  for (const m of msgs) message(m);
  await refresh();
  if (state.data?.deco) afficherEcran('liste');
  const nouveau = state.data?.deco?.find(d => d.depot && msgs.some(m => m.startsWith(`${d.dossier} ajouté`)));
  if (nouveau) openTiroir(nouveau.dossier);
});

// --- Aide ---
$('#btn-aide').addEventListener('click', () => {
  $('#aide-fond').hidden = false;
  $('#aide-modale').setAttribute('open', '');
});
$('#aide-fermer').addEventListener('click', fermerAide);
$('#aide-fond').addEventListener('click', fermerAide);
function fermerAide() {
  $('#aide-fond').hidden = true;
  $('#aide-modale').removeAttribute('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#tiroir').hidden) {
      closeTiroir();
      return;
    }
    if (!$('#opt-tiroir').hidden) {
      fermerOptions();
      return;
    }
    if ($('#aide-modale').hasAttribute('open')) {
      fermerAide();
      return;
    }
  }
});

// --- Mise à jour ---
const MAJ_IGNOREE_KEY = 'vb-maj-ignoree';

async function verifierMaj() {
  const maj = await api.verifierMaj();
  if (!maj || localStorage.getItem(MAJ_IGNOREE_KEY) === maj.version) return;
  $('#maj-version').textContent = `Nouvelle version ${maj.version} disponible`;
  $('#maj-actuelle').textContent = `(vous avez la ${maj.actuelle}).`;
  $('#maj-telecharger').onclick = () => api.ouvrirMaj(maj.url);
  $('#maj-ignorer').onclick = () => {
    localStorage.setItem(MAJ_IGNOREE_KEY, maj.version);
    $('#bandeau-maj').hidden = true;
  };
  $('#bandeau-maj').hidden = false;
}
$('#maj-fermer').onclick = () => ($('#bandeau-maj').hidden = true);

// --- Init ---
async function init() {
  renderAccueil();
  await refresh();
  if (state.data?.deco) {
    afficherEcran('liste');
    renderListe();
    renderLot();
  }
}

init();
verifierMaj();
window.addEventListener('rc:saved', () => refresh());
