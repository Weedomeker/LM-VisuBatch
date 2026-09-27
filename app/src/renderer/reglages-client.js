// Panneau de configuration client (modal).
const $ = sel => document.querySelector(sel);

const rcFond = $('#rc-fond');
const rcModale = $('#rc-modale');
let catalogueMode = 'auto';

function ouvrirPanel(premierLancement = false) {
  $('#rc-alerte').hidden = !premierLancement;
  $('#rc-annuler').textContent = premierLancement ? 'Continuer avec les valeurs par défaut' : 'Annuler';
  rcFond.hidden = false;
  rcModale.hidden = false;
  chargerConfig();
}

function fermerPanel() {
  rcFond.hidden = true;
  rcModale.hidden = true;
}

async function chargerConfig() {
  const { config, catalogueStatus, autoName } = await api.loadClientConfig();
  $('#rc-client').value = config.client;
  $('#rc-ref-pattern').value = config.refPattern;
  $('#rc-motif-pattern').value = config.motifPattern;
  $('#rc-output').value = config.outputFolder;
  $('#rc-prefix').value = config.uniPrefix;
  setCatalogueMode(config.catalogue ? 'perso' : 'auto');
  if (config.catalogue) $('#rc-cat-chemin').value = config.catalogue;
  majStatutCatalogue(catalogueStatus, autoName);
  renderTags('formats', config.formats);
  renderTags('finitions', config.finitions);
  testerRef();
  testerMotif();
}

function setCatalogueMode(mode) {
  catalogueMode = mode;
  for (const btn of document.querySelectorAll('#rc-cat-bascule button'))
    btn.setAttribute('aria-checked', btn.dataset.mode === mode);
  $('#rc-cat-auto-statut').hidden = mode !== 'auto';
  $('#rc-cat-perso-wrap').hidden = mode !== 'perso';
}

function majStatutCatalogue(status, autoName) {
  const puce = $('#rc-cat-puce');
  const label = $('#rc-cat-label');
  if (status === 'auto') {
    puce.className = 'rc-puce ok';
    label.innerHTML = `<code style="font-family:monospace;font-size:11px;background:var(--fond);padding:1px 5px;border-radius:2px">${autoName}</code> trouvé dans le dossier GAMME`;
  } else if (status === 'fallback') {
    puce.className = 'rc-puce fallback';
    label.textContent = `${autoName} absent — fallback sur le catalogue intégré`;
  } else {
    puce.className = 'rc-puce ok';
    label.textContent = 'Fichier personnalisé utilisé';
  }
}

function testerRef() {
  const pattern = $('#rc-ref-pattern').value;
  const texte = $('#rc-ref-test').value;
  const el = $('#rc-ref-res');
  if (!texte) { el.textContent = ''; el.className = 'rc-testeur-res'; return; }
  try {
    const m = texte.match(new RegExp(`\\b(${pattern})\\b`));
    el.className = `rc-testeur-res ${m ? 'ok' : 'err'}`;
    el.textContent = m ? `✓ Référence trouvée : ${m[1]}` : '✗ Aucune référence trouvée';
  } catch { el.className = 'rc-testeur-res err'; el.textContent = '✗ Pattern invalide'; }
}

function testerMotif() {
  const pattern = $('#rc-motif-pattern').value;
  const texte = $('#rc-motif-test').value;
  const el = $('#rc-motif-res');
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

function renderTags(type, values) {
  const container = $(`#rc-${type}-tags`);
  const inputId = type === 'formats' ? 'rc-format-input' : 'rc-finition-input';
  container.innerHTML = values.map(v =>
    `<span class="rc-tag">${v} <button data-suppr="${v}" data-type="${type}" aria-label="Supprimer ${v}">✕</button></span>`
  ).join('') +
  `<div class="rc-tag-ajout"><input id="${inputId}" type="text" placeholder="${type === 'formats' ? '125x300' : 'SATINÉ'}"><button data-ajouter="${type}">+ Ajouter</button></div>`;
}

function getValues(type) {
  return [...document.querySelectorAll(`#rc-${type}-tags .rc-tag`)].map(el => el.childNodes[0].textContent.trim());
}

async function enregistrer() {
  const config = {
    client: $('#rc-client').value.trim(),
    catalogue: catalogueMode === 'perso' ? ($('#rc-cat-chemin').value || '').trim() : '',
    refPattern: $('#rc-ref-pattern').value.trim(),
    outputFolder: $('#rc-output').value,
    formats: getValues('formats'),
    finitions: getValues('finitions'),
    motifPattern: $('#rc-motif-pattern').value.trim(),
    uniPrefix: $('#rc-prefix').value.trim(),
  };
  try {
    await api.saveClientConfig(config);
    fermerPanel();
    window.dispatchEvent(new Event('rc:saved'));
  } catch (e) {
    alert(`Erreur lors de l'enregistrement : ${e.message}`);
  }
}

$('#btn-reglages-client').addEventListener('click', () => ouvrirPanel(false));
$('#rc-fermer').addEventListener('click', fermerPanel);
$('#rc-annuler').addEventListener('click', fermerPanel);
$('#rc-enregistrer').addEventListener('click', enregistrer);
$('#rc-fond').addEventListener('click', fermerPanel);

$('#rc-cat-bascule').addEventListener('click', e => {
  const btn = e.target.closest('[data-mode]');
  if (btn) setCatalogueMode(btn.dataset.mode);
});

$('#rc-cat-parcourir').addEventListener('click', async () => {
  const p = await api.browseCatalogue();
  if (p) $('#rc-cat-chemin').value = p;
});

$('#rc-ref-pattern').addEventListener('input', testerRef);
$('#rc-ref-test').addEventListener('input', testerRef);
$('#rc-motif-pattern').addEventListener('input', testerMotif);
$('#rc-motif-test').addEventListener('input', testerMotif);

document.addEventListener('click', e => {
  const suppr = e.target.closest('[data-suppr]');
  if (suppr) { suppr.closest('.rc-tag').remove(); return; }
  const ajouter = e.target.closest('[data-ajouter]');
  if (ajouter) {
    const type = ajouter.dataset.ajouter;
    const inputId = type === 'formats' ? 'rc-format-input' : 'rc-finition-input';
    const input = $(`#${inputId}`);
    const val = input.value.trim();
    if (!val) return;
    const container = $(`#rc-${type}-tags`);
    const ajoutEl = container.querySelector('.rc-tag-ajout');
    const tag = document.createElement('span');
    tag.className = 'rc-tag';
    tag.innerHTML = `${val} <button data-suppr="${val}" data-type="${type}" aria-label="Supprimer ${val}">✕</button>`;
    container.insertBefore(tag, ajoutEl);
    input.value = '';
    input.focus();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = e.target.closest('[id$="-input"]');
    if (input) input.nextElementSibling?.click();
  }
});

window.ouvrirReglagesClient = ouvrirPanel;
