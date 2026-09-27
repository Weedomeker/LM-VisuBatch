const plural = (n, one, many = one + 's') => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

const TYPES = [
  ['A-01','Douche'],['A-02','Deux panneaux'],['P','Panneau seul'],['C','Composition'],
  ['II-01','Formats'],['II-02','Profilés'],['II-03','Kit de pose'],
];
const PX_PAR_CM = 0.95;
const GAMMES_KEY = 'vb-gammes-recentes';

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
  for (const id of ['ecran-accueil','ecran-liste','ecran-generation','ecran-bilan'])
    document.getElementById(id).hidden = (id !== 'ecran-' + nom);
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
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
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
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
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
