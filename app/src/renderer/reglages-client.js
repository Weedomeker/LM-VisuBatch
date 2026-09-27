const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

let catalogueMode = 'auto';
let ongletActif = 'refs';
let snapConfig = null;

// --- Onglets ---
function afficherOnglet(nom) {
  ongletActif = nom;
  for (const btn of document.querySelectorAll('#rc-nav button'))
    btn.setAttribute('aria-selected', btn.dataset.onglet === nom);
  renderContenu();
}

function renderContenu() {
  const el = $('#rc-contenu');
  if (!el) return;
  if (ongletActif === 'refs')      el.innerHTML = htmlRefs();
  if (ongletActif === 'finitions') el.innerHTML = htmlFinitions();
  if (ongletActif === 'noms')      el.innerHTML = htmlNoms();
  if (ongletActif === 'gabarits')  el.innerHTML = htmlGabarits();
  if (ongletActif === 'avance')    el.innerHTML = htmlAvance();
  bindOnglet();
}

// ---- Onglet Références ----
function htmlRefs() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Format des références</div>
    <div class="rc-champ">
      <label for="rc-ref-pattern">Motif (expression régulière)</label>
      <input type="text" id="rc-ref-pattern" class="mono">
      <p class="aide">Une référence compte 8 chiffres et commence par 9.</p>
    </div>
    <div class="rc-testeur">
      <label for="rc-ref-test">Tester avec un nom de fichier</label>
      <input type="text" id="rc-ref-test" placeholder="Tropical 91234567 MAT.jpg">
      <div class="rc-testeur-res" id="rc-ref-res"></div>
    </div>
  </div>
  <div class="rc-section" id="rc-sans-ref-section">
    <div class="rc-section-titre">Décos sans référence</div>
    <div id="rc-sans-ref-liste"><p class="aide">Toutes les décos ont une référence.</p></div>
  </div>`;
}

// ---- Onglet Finitions ----
function htmlFinitions() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Finitions</div>
    <div class="rc-tags" id="rc-finitions-tags"></div>
    <p class="aide">Telles qu'écrites dans les noms de fichiers (insensible à la casse).</p>
  </div>`;
}

// ---- Onglet Noms des images ----
function htmlNoms() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Noms des images</div>
    <div class="rc-champ">
      <label for="rc-nom-pattern">Modèle</label>
      <input type="text" id="rc-nom-pattern" class="mono">
      <p class="aide">Variables : <code>{ref}</code> <code>{type}</code> <code>{deco}</code> <code>{finition}</code></p>
    </div>
    <div class="rc-testeur">
      <label>Exemple</label>
      <span id="rc-nom-exemple" style="font-family:monospace;font-size:var(--t-petit)"></span>
    </div>
  </div>`;
}

// ---- Onglet Gabarits ----
function htmlGabarits() {
  const types = [['A-01','Douche'],['A-02','Deux panneaux'],['P','Panneau seul'],['C','Composition'],['II-01','Formats'],['II-02','Profilés'],['II-03','Kit de pose']];
  const rows = types.map(([code, nom]) =>
    `<tr><td class="format">${code}</td><td>${nom}</td><td><span class="rc-puce ok"></span> présent</td></tr>`).join('');
  return `<div class="rc-section">
    <div class="rc-section-titre">Gabarits de rendu</div>
    <table><tbody>${rows}</tbody></table>
  </div>`;
}

// ---- Onglet Avancé ----
function htmlAvance() {
  return `<div class="rc-section">
    <div class="rc-section-titre">Identité</div>
    <div class="rc-champ"><label for="rc-client">Nom du client</label><input type="text" id="rc-client"></div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Catalogue décors</div>
    <div class="rc-champ">
      <label>Source du catalogue</label>
      <div class="rc-bascule" role="radiogroup" id="rc-cat-bascule">
        <button role="radio" data-mode="auto">Auto</button>
        <button role="radio" data-mode="perso">Fichier personnalisé</button>
      </div>
      <div class="rc-cat-statut" id="rc-cat-auto-statut">
        <span class="rc-puce ok" id="rc-cat-puce"></span>
        <span id="rc-cat-label"></span>
      </div>
      <div id="rc-cat-perso-wrap" hidden>
        <div class="rc-cat-perso">
          <input type="text" id="rc-cat-chemin" placeholder="Chemin vers le fichier CSV…">
          <button class="secondaire" id="rc-cat-parcourir">Parcourir…</button>
        </div>
      </div>
    </div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Reconnaissance des fichiers</div>
    <div class="rc-champ">
      <label for="rc-motif-pattern">Pattern — Motif source</label>
      <input type="text" id="rc-motif-pattern" class="mono">
      <p class="aide">Identifie un fichier image comme visuel source. Ex : <code>au\\s*10\\s*[èée]m</code></p>
    </div>
    <div class="rc-testeur">
      <label for="rc-motif-test">Tester avec un nom de fichier</label>
      <input type="text" id="rc-motif-test" placeholder="BLANC 100x210 au 10ème.jpg">
      <div class="rc-testeur-res" id="rc-motif-res"></div>
    </div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Génération</div>
    <div class="rc-grille2">
      <div class="rc-champ"><label for="rc-output">Dossier WEB (source des unis)</label><input type="text" id="rc-output"><p class="aide">Nom du sous-dossier contenant les PSD.</p></div>
      <div class="rc-champ"><label for="rc-prefix">Préfixe couleurs unies</label><input type="text" id="rc-prefix"><p class="aide">Affiché sous forme « ULM 620 ».</p></div>
    </div>
  </div>
  <div class="rc-section">
    <div class="rc-section-titre">Formats produit</div>
    <div class="rc-tags" id="rc-formats-tags"></div>
    <p class="aide">Format « largeurxhauteur » en cm. Ex : 100x210</p>
  </div>`;
}

// --- Chargement config dans les onglets ---
let currentConfig = {};

function remplirOnglet() {
  const c = currentConfig;
  if (ongletActif === 'refs') {
    if ($('#rc-ref-pattern')) $('#rc-ref-pattern').value = c.refPattern ?? '9\\d{7}';
    testerRef();
    renderSansRef();
  }
  if (ongletActif === 'finitions') {
    if ($('#rc-finitions-tags')) renderTags('finitions', c.finitions ?? []);
  }
  if (ongletActif === 'noms') {
    if ($('#rc-nom-pattern')) { $('#rc-nom-pattern').value = c.nomPattern ?? '{ref}_{type}.jpg'; majExempleNom(); }
  }
  if (ongletActif === 'avance') {
    if ($('#rc-client')) $('#rc-client').value = c.client ?? '';
    if ($('#rc-motif-pattern')) $('#rc-motif-pattern').value = c.motifPattern ?? '';
    if ($('#rc-output')) $('#rc-output').value = c.outputFolder ?? '';
    if ($('#rc-prefix')) $('#rc-prefix').value = c.uniPrefix ?? '';
    setCatalogueMode(c.catalogue ? 'perso' : 'auto');
    if (c.catalogue && $('#rc-cat-chemin')) $('#rc-cat-chemin').value = c.catalogue;
    if ($('#rc-formats-tags')) renderTags('formats', c.formats ?? []);
    testerMotif();
  }
}

function renderSansRef() {
  const el = $('#rc-sans-ref-liste');
  if (!el) return;
  el.innerHTML = '<p class="aide">Toutes les décos ont une référence.</p>';
}

function majExempleNom() {
  const pat = $('#rc-nom-pattern')?.value ?? '{ref}_{type}.jpg';
  const ex = pat.replace('{ref}','91234567').replace('{type}','A-01').replace('{deco}','Tropical').replace('{finition}','MAT');
  if ($('#rc-nom-exemple')) $('#rc-nom-exemple').textContent = ex;
}

function bindOnglet() {
  remplirOnglet();
  if ($('#rc-ref-pattern')) { $('#rc-ref-pattern').addEventListener('input', testerRef); }
  if ($('#rc-ref-test')) { $('#rc-ref-test').addEventListener('input', testerRef); }
  if ($('#rc-motif-pattern')) { $('#rc-motif-pattern').addEventListener('input', testerMotif); }
  if ($('#rc-motif-test')) { $('#rc-motif-test').addEventListener('input', testerMotif); }
  if ($('#rc-nom-pattern')) { $('#rc-nom-pattern').addEventListener('input', majExempleNom); }
  if ($('#rc-cat-bascule')) {
    $('#rc-cat-bascule').addEventListener('click', e => {
      const btn = e.target.closest('[data-mode]');
      if (btn) setCatalogueMode(btn.dataset.mode);
    });
  }
  if ($('#rc-cat-parcourir')) {
    $('#rc-cat-parcourir').addEventListener('click', async () => {
      const p = await api.browseCatalogue();
      if (p && $('#rc-cat-chemin')) $('#rc-cat-chemin').value = p;
    });
  }
}

// --- Testeurs ---
function testerRef() {
  const pattern = $('#rc-ref-pattern')?.value ?? '';
  const texte = $('#rc-ref-test')?.value ?? '';
  const el = $('#rc-ref-res');
  if (!el) return;
  if (!texte) { el.textContent = ''; el.className = 'rc-testeur-res'; return; }
  try {
    const m = texte.match(new RegExp(`\\b(${pattern})\\b`));
    el.className = `rc-testeur-res ${m ? 'ok' : 'err'}`;
    el.textContent = m ? `✓ Référence trouvée : ${m[1]}` : '✗ Aucune référence trouvée';
  } catch { el.className = 'rc-testeur-res err'; el.textContent = '✗ Pattern invalide'; }
}

function testerMotif() {
  const pattern = $('#rc-motif-pattern')?.value ?? '';
  const texte = $('#rc-motif-test')?.value ?? '';
  const el = $('#rc-motif-res');
  if (!el) return;
  if (!texte) { el.textContent = ''; el.className = 'rc-testeur-res'; return; }
  try {
    const re = new RegExp(pattern, 'i');
    const estJpeg = /\.jpe?g$/i.test(texte);
    const match = re.test(texte);
    el.className = `rc-testeur-res ${match && estJpeg ? 'ok' : 'err'}`;
    el.textContent = match && estJpeg ? '✓ Reconnu comme motif source'
      : match ? '✗ Pattern trouvé mais fichier non JPEG'
      : '✗ Non reconnu comme motif source';
  } catch { el.className = 'rc-testeur-res err'; el.textContent = '✗ Pattern invalide'; }
}

// --- Tags ---
function renderTags(type, values) {
  const container = $(`#rc-${type}-tags`);
  if (!container) return;
  const inputId = `rc-${type}-input`;
  container.innerHTML = values.map(v =>
    `<span class="rc-tag">${esc(v)} <button data-suppr="${esc(v)}" data-type="${type}" aria-label="Supprimer ${esc(v)}">✕</button></span>`
  ).join('') +
  `<div class="rc-tag-ajout"><input id="${inputId}" type="text" placeholder="${type==='formats'?'125x300':'SATINÉ'}"><button data-ajouter="${type}">+ Ajouter</button></div>`;
}

function getTagValues(type) {
  return [...document.querySelectorAll(`#rc-${type}-tags .rc-tag`)].map(el => el.childNodes[0].textContent.trim());
}

// --- Mode catalogue ---
function setCatalogueMode(mode) {
  catalogueMode = mode;
  for (const btn of document.querySelectorAll('#rc-cat-bascule button'))
    btn.setAttribute('aria-checked', btn.dataset.mode === mode);
  const auto = $('#rc-cat-auto-statut'), perso = $('#rc-cat-perso-wrap');
  if (auto) auto.hidden = mode !== 'auto';
  if (perso) perso.hidden = mode !== 'perso';
}

function majStatutCatalogue(status, autoName) {
  const puce = $('#rc-cat-puce'), label = $('#rc-cat-label');
  if (!puce || !label) return;
  if (status === 'auto') {
    puce.className = 'rc-puce ok';
    label.innerHTML = `<code style="font-family:monospace;font-size:11px;background:var(--fond);padding:1px 5px">${esc(autoName)}</code> trouvé dans le dossier GAMME`;
  } else if (status === 'fallback') {
    puce.className = 'rc-puce fallback';
    label.textContent = `${autoName} absent — fallback sur le catalogue intégré`;
  } else {
    puce.className = 'rc-puce ok';
    label.textContent = 'Fichier personnalisé utilisé';
  }
}

// --- Ouvrir / Fermer ---
function ouvrirPanel(premierLancement = false) {
  $('#rc-alerte').hidden = !premierLancement;
  $('#rc-annuler').textContent = premierLancement ? 'Continuer avec les valeurs par défaut' : 'Annuler';
  $('#rc-fond').hidden = false;
  $('#rc-modale').hidden = false;
  chargerConfig();
}

function fermerPanel() {
  $('#rc-fond').hidden = true;
  $('#rc-modale').hidden = true;
}

async function chargerConfig() {
  const { config, catalogueStatus, autoName } = await api.loadClientConfig();
  currentConfig = { ...config };
  snapConfig = { ...config };
  afficherOnglet(ongletActif || 'refs');
  if (ongletActif === 'avance') majStatutCatalogue(catalogueStatus, autoName);
}

// --- Lire config depuis DOM ---
function lireConfig() {
  return {
    client: $('#rc-client')?.value.trim() ?? currentConfig.client,
    catalogue: catalogueMode === 'perso' ? (($('#rc-cat-chemin')?.value || '').trim()) : '',
    refPattern: $('#rc-ref-pattern')?.value.trim() ?? currentConfig.refPattern,
    motifPattern: $('#rc-motif-pattern')?.value.trim() ?? currentConfig.motifPattern,
    outputFolder: $('#rc-output')?.value ?? currentConfig.outputFolder,
    uniPrefix: $('#rc-prefix')?.value.trim() ?? currentConfig.uniPrefix,
    nomPattern: $('#rc-nom-pattern')?.value ?? currentConfig.nomPattern,
    formats: $('#rc-formats-tags') ? getTagValues('formats') : currentConfig.formats,
    finitions: $('#rc-finitions-tags') ? getTagValues('finitions') : currentConfig.finitions,
  };
}

async function enregistrer() {
  const config = { ...currentConfig, ...lireConfig() };
  try {
    await api.saveClientConfig(config);
    fermerPanel();
    window.dispatchEvent(new Event('rc:saved'));
  } catch (e) {
    alert(`Erreur lors de l'enregistrement : ${e.message}`);
  }
}

// --- Listeners ---
$('#btn-reglages-client').addEventListener('click', () => ouvrirPanel(false));
$('#rc-fermer').addEventListener('click', fermerPanel);
$('#rc-annuler').addEventListener('click', fermerPanel);
$('#rc-enregistrer').addEventListener('click', enregistrer);
$('#rc-fond').addEventListener('click', fermerPanel);

$('#rc-nav').addEventListener('click', e => {
  const btn = e.target.closest('[data-onglet]');
  if (btn) { currentConfig = { ...currentConfig, ...lireConfig() }; afficherOnglet(btn.dataset.onglet); }
});

// Délégation tags (suppr + ajouter)
document.addEventListener('click', e => {
  const suppr = e.target.closest('[data-suppr]');
  if (suppr && suppr.closest('#rc-contenu')) { suppr.closest('.rc-tag').remove(); return; }
  const ajouter = e.target.closest('[data-ajouter]');
  if (ajouter && ajouter.closest('#rc-contenu')) {
    const type = ajouter.dataset.ajouter;
    const input = $(`#rc-${type}-input`);
    const val = input?.value.trim();
    if (!val) return;
    const container = $(`#rc-${type}-tags`);
    const ajoutEl = container?.querySelector('.rc-tag-ajout');
    if (!container || !ajoutEl) return;
    const tag = document.createElement('span');
    tag.className = 'rc-tag';
    tag.innerHTML = `${esc(val)} <button data-suppr="${esc(val)}" data-type="${type}" aria-label="Supprimer ${esc(val)}">✕</button>`;
    container.insertBefore(tag, ajoutEl);
    if (input) { input.value = ''; input.focus(); }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = e.target.closest('[id$="-input"]');
    if (input && input.closest('#rc-contenu')) input.nextElementSibling?.click();
  }
});

window.ouvrirReglagesClient = ouvrirPanel;
