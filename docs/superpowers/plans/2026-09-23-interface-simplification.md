# Interface simplification — LM VisuBatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le layout 2-colonnes par une liste pleine largeur avec tiroir fiche et popover ⚙ Options.

**Architecture:** Même logique métier et IPC — seuls le DOM, le CSS et les fonctions de rendu `app.js` changent. Un nouveau handler IPC `add-source` remplace le drag-and-drop comme point d'entrée principal pour ajouter un dossier.

**Tech Stack:** Electron 44, Vanilla JS/HTML/CSS, IPC contextBridge — pas de framework, pas de bundler.

---

## Fichiers modifiés

| Fichier | Rôle dans ce plan |
|---|---|
| `app/src/main/preload.js` | Expose `api.addSource()` |
| `app/src/main/main.js` | Handler IPC `add-source` |
| `app/src/renderer/index.html` | Nouveau DOM : liste pleine largeur, tiroir, popover |
| `app/src/renderer/style.css` | Styles tiroir, popover, badges rangées, suppression anciens styles |
| `app/src/renderer/app.js` | renderBarre, renderListe, popover, tiroir, addSource |

---

## Task 1 : IPC `add-source`

**Fichiers :**
- Modifier : `app/src/main/preload.js`
- Modifier : `app/src/main/main.js`

- [ ] **Étape 1 : Ajouter `addSource` dans preload.js**

Ouvrir `app/src/main/preload.js`. Ajouter après la ligne `openOutput`:

```js
// avant :
  openOutput: () => ipcRenderer.invoke('open-output'),

// après :
  openOutput: () => ipcRenderer.invoke('open-output'),
  addSource: () => ipcRenderer.invoke('add-source'),
```

- [ ] **Étape 2 : Ajouter le handler dans main.js**

Dans `app/src/main/main.js`, à l'intérieur de `createWindow()`, ajouter après la ligne `ipcMain.handle('drop', ...)` (ligne 208) :

```js
  ipcMain.handle('add-source', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Ajouter un dossier décor',
      defaultPath: settings.gamme || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled || !r.filePaths.length) return [];
    return drop(r.filePaths);
  });
```

- [ ] **Étape 3 : Vérifier dans l'app**

Lancer `npm start`. Ouvrir les DevTools (Ctrl+Shift+I). Dans la console :
```js
await api.addSource()
```
Un sélecteur de dossier s'ouvre. Choisir un dossier test → la console doit afficher un tableau avec un message du type `["NomDossier ajouté"]`.

---

## Task 2 : Restructurer index.html

**Fichier :** `app/src/renderer/index.html`

- [ ] **Étape 1 : Réécrire index.html**

Remplacer intégralement le contenu du fichier par :

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'">
  <title>Visuels web</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="barre">
    <strong class="marque">Visuels web</strong>
    <div class="dossier">
      <span class="dossier-nom">GAMME</span>
      <span class="dossier-chemin" id="chemin-gamme">non choisi</span>
      <button class="lien" data-choisir="gamme">Changer</button>
    </div>
    <div class="dossier">
      <span class="dossier-nom">Sortie</span>
      <span class="dossier-chemin" id="chemin-sortie">non choisi</span>
      <button class="lien" data-choisir="sortie">Changer</button>
    </div>
    <div class="options-wrap">
      <button class="secondaire" id="btn-options">⚙ Options</button>
      <div class="popover-options" id="popover-options" hidden>
        <span class="popover-label">Types de visuels</span>
        <div id="types"></div>
        <span class="popover-label" style="margin-top:14px">Rangement des images</span>
        <div class="bascule" role="radiogroup" aria-label="Rangement des images">
          <button role="radio" data-rangement="plat">Tout à plat</button>
          <button role="radio" data-rangement="decor">Un dossier par décor</button>
        </div>
      </div>
    </div>
  </header>

  <main id="principal">
    <div class="barre-outils">
      <input type="search" id="recherche" placeholder="Chercher un décor" aria-label="Chercher un décor">
      <div class="filtres" role="radiogroup" aria-label="Filtrer les décors">
        <button role="radio" data-filtre="tous">Tous</button>
        <button role="radio" data-filtre="afaire">À faire</button>
        <button role="radio" data-filtre="incomplets">Incomplets</button>
      </div>
      <button class="lien" id="cocher-afaire">Cocher les À faire</button>
      <button class="lien" id="tout-decocher">Tout décocher</button>
      <button class="lien" id="ajouter-source">+ Ajouter un dossier</button>
    </div>
    <div class="depot" id="depot" tabindex="0">
      <p><strong>Déposez un dossier décor</strong> ou un CSV de références</p>
    </div>
    <ul id="decors" class="decors" aria-label="Décors"></ul>
  </main>

  <footer class="lot" id="lot">
    <label class="refaire"><input type="checkbox" id="tout-refaire"> Tout refaire</label>
    <div class="resume" id="resume"></div>
    <div class="actions" id="actions">
      <button class="principal" id="generer">Générer</button>
    </div>
  </footer>

  <!-- Tiroir fiche -->
  <div class="tiroir-fond" id="tiroir-fond" hidden></div>
  <aside class="tiroir" id="tiroir" hidden>
    <div class="tiroir-entete">
      <strong class="tiroir-titre" id="tiroir-titre"></strong>
      <button class="tiroir-fermer" id="tiroir-fermer" aria-label="Fermer la fiche">✕</button>
    </div>
    <div class="tiroir-corps" id="tiroir-corps"></div>
  </aside>

  <div class="messages" id="messages" role="status"></div>
  <script src="app.js"></script>
</body>
</html>
```

---

## Task 3 : Mettre à jour style.css

**Fichier :** `app/src/renderer/style.css`

- [ ] **Étape 1 : Remplacer les styles de layout main + liste + fiche**

Trouver et remplacer le bloc `/* Colonne des décors */` (lignes 67-90) :

```css
/* Remplacer ce bloc entier : */
/* Colonne des décors */
main { display: grid; grid-template-columns: 330px minmax(0, 1fr); min-height: 0; }
.liste { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--trait); }
.depot {
  margin: 16px 16px 8px; padding: 14px 16px; border: 2px dashed var(--trait); border-radius: 4px;
  text-align: center; background: var(--surface);
}
.depot p { margin: 0; }
.depot.survol { border-color: var(--vdg); background: var(--vdg-clair); }
.outils-liste { display: grid; gap: 8px; padding: 8px 16px 10px; border-bottom: 1px solid var(--trait); }
.outils-liste input[type="search"] { padding: 7px 10px; border: 1px solid var(--trait); border-radius: 3px; background: var(--surface); }
.filtres { justify-self: start; }
.selection-rapide { display: flex; gap: 16px; font-size: var(--t-petit); }
```

Par :

```css
/* Zone principale */
main { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

/* Barre d'outils */
.barre-outils { display: flex; align-items: center; gap: 10px; padding: 8px 16px; background: #f3f5f4; border-bottom: 1px solid var(--trait); flex: none; flex-wrap: wrap; }
.barre-outils input[type="search"] { padding: 6px 10px; border: 1px solid var(--trait); border-radius: 3px; background: var(--surface); width: 200px; }
.filtres { justify-self: start; }

/* Dépôt : overlay plein écran pendant un drag */
.depot {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(219, 232, 229, 0.92);
  border: 3px dashed var(--vdg);
  pointer-events: none;
  text-align: center;
}
.depot p { margin: 0; font-size: var(--t-titre); }
```

- [ ] **Étape 2 : Remplacer le bloc `/* Fiche d'un décor */`**

Trouver et remplacer le bloc `/* Fiche d'un décor */` (lignes 92-97) :

```css
/* Remplacer : */
/* Fiche d'un décor */
.fiche { overflow-y: auto; padding: 28px 36px 40px; }
.fiche h1 { font-size: var(--t-grand); line-height: 1.15; margin: 0; }
.fiche h2 { font-size: var(--t-titre); margin: 36px 0 12px; }
.fiche .origine { color: var(--doux); margin: 6px 0 0; word-break: break-all; }
.vide { color: var(--doux); padding-top: 80px; text-align: center; }
```

Par :

```css
/* Tiroir fiche */
.tiroir-fond { position: fixed; inset: 0; background: rgba(31,43,42,0.25); z-index: 99; }
.tiroir {
  position: fixed; top: 0; right: 0; bottom: 0; width: 480px;
  background: var(--surface); border-left: 1px solid var(--trait);
  box-shadow: -4px 0 24px rgba(0,0,0,0.12);
  display: flex; flex-direction: column; z-index: 100; overflow: hidden;
}
.tiroir-entete {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--trait); flex: none;
}
.tiroir-titre { font-size: var(--t-grand); line-height: 1.15; }
.tiroir-fermer { background: none; border: 0; font-size: 20px; color: var(--doux); cursor: pointer; padding: 4px 8px; line-height: 1; }
.tiroir-fermer:hover { color: var(--encre); }
.tiroir-corps { overflow-y: auto; padding: 20px 24px 32px; flex: 1; }
.tiroir-corps h1 { font-size: var(--t-grand); line-height: 1.15; margin: 0; }
.tiroir-corps h2 { font-size: var(--t-titre); margin: 28px 0 10px; }
.tiroir-corps .origine { color: var(--doux); margin: 6px 0 0; word-break: break-all; }
```

- [ ] **Étape 3 : Ajouter les styles popover ⚙ Options et badges rangées**

Ajouter à la fin du fichier, avant `@media (prefers-reduced-motion...)` :

```css
/* Popover ⚙ Options */
.options-wrap { position: relative; flex: none; }
.popover-options {
  position: absolute; top: calc(100% + 6px); right: 0; min-width: 280px;
  background: var(--surface); border: 1px solid var(--trait); border-radius: 4px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.14); padding: 14px 16px; z-index: 50;
}
.popover-label {
  display: block; font-size: var(--t-petit); font-weight: 700;
  color: var(--doux); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;
}

/* Badges statut dans les rangées */
.badge {
  display: inline-block; font-size: 11px; font-weight: 700;
  padding: 1px 8px; border-radius: 10px; margin-left: 8px; vertical-align: 1px;
}
.badge-afaire { background: var(--vdg-clair); color: var(--vdg-fonce); }
.badge-bloque { background: var(--caramel-clair); color: var(--caramel); }
.badge-ok { background: var(--fond); color: var(--doux); font-weight: 400; }
.badge-depose { background: var(--caramel-clair); color: var(--caramel); }
```

- [ ] **Étape 4 : Mettre à jour les rangées .decors li**

Trouver la ligne `.decors li { display: grid; grid-template-columns: auto 1fr; ... }` et la remplacer par :

```css
.decors li { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid var(--trait); }
.decors li:hover { background: #f3f5f4; }
.decors .nom { font-weight: 700; flex: 1; min-width: 0; }
.decors .detail-lien { background: none; border: 0; padding: 0; color: var(--doux); font-size: var(--t-petit); cursor: pointer; white-space: nowrap; flex: none; }
.decors .detail-lien:hover { color: var(--vdg); }
```

Supprimer les lignes suivantes qui ne sont plus utilisées :
```css
.decors .etat { font-size: var(--t-petit); color: var(--doux); }
.etat .afaire { color: var(--vdg-fonce); font-weight: 700; }
.etat .manque { color: var(--caramel); font-weight: 700; }
.pastille { display: inline-block; ... }
```

- [ ] **Étape 5 : Supprimer les styles du fieldset .types dans le footer**

Trouver et supprimer :
```css
.types { border: 0; margin: 0; padding: 0; display: flex; align-items: center; gap: 10px; }
.types legend { float: left; font-weight: 700; margin-right: 10px; padding: 0; }
.types #types { display: flex; gap: 4px; flex-wrap: wrap; }
```

Remplacer par (le fieldset n'est plus dans le footer, mais `#types` est dans le popover) :
```css
#types { display: flex; gap: 4px; flex-wrap: wrap; }
```

---

## Task 4 : app.js — renderBarre + popover ⚙ Options

**Fichier :** `app/src/renderer/app.js`

- [ ] **Étape 1 : Mettre à jour renderBarre()**

Trouver `function renderBarre()` et remplacer :

```js
function renderBarre() {
  const s = state.data.settings;
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
  $('#chemin-gamme').textContent = court(s.gamme);
  $('#chemin-gamme').title = s.gamme;
  $('#chemin-sortie').textContent = court(s.outDir);
  $('#chemin-sortie').title = s.outDir;
  for (const b of document.querySelectorAll('[data-rangement]')) b.setAttribute('aria-checked', b.dataset.rangement === s.rangement);
}
```

Par :

```js
function renderBarre() {
  const s = state.data.settings;
  const court = p => (p ? p.split(/[\\/]/).filter(Boolean).slice(-2).join(' › ') : 'non choisi');
  $('#chemin-gamme').textContent = court(s.gamme);
  $('#chemin-gamme').title = s.gamme ?? '';
  $('#chemin-sortie').textContent = court(s.outDir);
  $('#chemin-sortie').title = s.outDir ?? '';
}
```

- [ ] **Étape 2 : Ajouter renderOptions() et la gestion du popover**

Après `renderBarre`, ajouter :

```js
function renderOptions() {
  if (!state.data) return;
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
});
document.addEventListener('click', () => { $('#popover-options').hidden = true; });
```

- [ ] **Étape 3 : Retirer [data-rangement] du gestionnaire de clic global**

Trouver le gestionnaire document click existant :

```js
document.addEventListener('click', async e => {
  const choisir = e.target.closest('[data-choisir]');
  if (choisir) {
    const kind = choisir.dataset.choisir;
    if (await api.chooseFolder(kind)) refresh();
  }
  const rangement = e.target.closest('[data-rangement]');
  if (rangement) { await api.setOption('rangement', rangement.dataset.rangement); refresh(); }
  const filtre = e.target.closest('[data-filtre]');
  if (filtre) { state.filtre = filtre.dataset.filtre; renderListe(); }
});
```

Remplacer par (supprimer le bloc rangement, il est géré dans le popover) :

```js
document.addEventListener('click', async e => {
  const choisir = e.target.closest('[data-choisir]');
  if (choisir) {
    const kind = choisir.dataset.choisir;
    if (await api.chooseFolder(kind)) refresh();
  }
  const filtre = e.target.closest('[data-filtre]');
  if (filtre) { state.filtre = filtre.dataset.filtre; renderListe(); }
});
```

---

## Task 5 : app.js — renderListe (nouvelles rangées avec badges)

**Fichier :** `app/src/renderer/app.js`

- [ ] **Étape 1 : Remplacer renderListe()**

Trouver `function renderListe()` et remplacer entièrement :

```js
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
  }).join('') || '<li class="aide">Aucun décor</li>';
}
```

- [ ] **Étape 2 : Mettre à jour le gestionnaire de clic sur la liste**

Trouver et remplacer `$('#decors').addEventListener('click', ...)` :

```js
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
```

---

## Task 6 : app.js — Tiroir fiche

**Fichier :** `app/src/renderer/app.js`

- [ ] **Étape 1 : Ajouter openTiroir() et closeTiroir()**

Juste avant `function renderFiche()`, ajouter :

```js
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
```

- [ ] **Étape 2 : Adapter renderFiche() pour le tiroir**

Trouver `function renderFiche()` et remplacer :

```js
function renderFiche() {
  const d = courant();
  const fiche = $('#fiche');
  if (!d) {
    fiche.innerHTML = `<p class="vide">Choisissez un décor dans la liste pour voir ses formats, ses références et ses réglages.</p>`;
    return;
  }
  fiche.innerHTML = `
    <h1>${esc(d.dossier)}</h1>
    <p class="origine">${d.depot ? 'Déposé depuis ' : ''}${esc(d.chemin)}
      ${d.depot ? ' <button class="lien" id="retirer">Retirer de la liste</button>' : ''}</p>
    ${renderPanneaux(d)}
    ${renderProblemes(d)}
    <h2>Références</h2>
    ${renderRefs(d)}`;
  for (const img of fiche.querySelectorAll('img[data-motif]')) {
    api.thumb(img.dataset.motif, Number(img.dataset.h) || 300).then(src => { if (src) img.src = src; });
  }
  bindFiche(d);
}
```

Par :

```js
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
```

- [ ] **Étape 3 : Mettre à jour bindFiche() pour cibler le tiroir**

Trouver dans `bindFiche(d)` les deux références à `$('#fiche')` :

```js
// Avant :
$('#retirer')?.addEventListener('click', async () => { await api.removeSource(d.chemin); refresh(); });
$('#fiche').querySelector('table')?.addEventListener('click', async e => {
...
$('#fiche').querySelector('table')?.addEventListener('keydown', e => {
```

Remplacer `$('#fiche')` par `$('#tiroir-corps')` dans les deux occurrences de `bindFiche` :

```js
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
```

- [ ] **Étape 4 : Ajouter les gestionnaires de fermeture du tiroir**

Ajouter juste après les définitions de `openTiroir` et `closeTiroir` :

```js
$('#tiroir-fermer').addEventListener('click', closeTiroir);
$('#tiroir-fond').addEventListener('click', closeTiroir);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#tiroir').hidden) closeTiroir(); });
```

---

## Task 7 : app.js — drag-and-drop + bouton addSource

**Fichier :** `app/src/renderer/app.js`

- [ ] **Étape 1 : Mettre à jour les gestionnaires drag-and-drop**

Trouver le bloc drag-and-drop existant :

```js
const depot = $('#depot');
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, e => { e.preventDefault(); depot.classList.add('survol'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || !e.relatedTarget) depot.classList.remove('survol'); });
```

Remplacer par (le depot est maintenant un overlay fixe, hidden par défaut) :

```js
const depot = $('#depot');
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, e => { e.preventDefault(); depot.removeAttribute('hidden'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || !e.relatedTarget) depot.setAttribute('hidden', ''); });
```

- [ ] **Étape 2 : Ajouter le gestionnaire du bouton "+ Ajouter un dossier"**

Après la liaison du bouton `#tout-decocher`, ajouter :

```js
$('#ajouter-source').addEventListener('click', async () => {
  const msgs = await api.addSource();
  for (const m of msgs) message(m);
  if (msgs.some(m => m.includes('ajouté'))) {
    await refresh();
    const nouveau = state.data?.decors?.find(d => d.depot && msgs.some(m => m.startsWith(`${d.dossier} ajouté`)));
    if (nouveau) openTiroir(nouveau.dossier);
  }
});
```

---

## Task 8 : app.js — nettoyage renderLot + renderTypes

**Fichier :** `app/src/renderer/app.js`

- [ ] **Étape 1 : Retirer renderTypes() de renderLot()**

Trouver dans `function renderLot()` :

```js
function renderLot() {
  if (!state.enCours) renderTypes();
  ...
```

Supprimer la ligne `if (!state.enCours) renderTypes();` :

```js
function renderLot() {
  const resume = $('#resume');
  const bouton = $('#generer');
  ...
```

- [ ] **Étape 2 : Vérifier que #types change listener est toujours lié**

Chercher dans app.js :
```js
$('#types').addEventListener('change', async () => {
  const types = [...document.querySelectorAll('#types input:checked')].map(i => i.value);
  await api.setOption('types', types);
  refresh();
});
```

Ce listener est lié au chargement. `#types` est maintenant dans le popover (toujours dans le DOM) — aucun changement nécessaire.

- [ ] **Étape 3 : Supprimer l'appel renderFiche() de refresh() si le tiroir est fermé**

Trouver dans `async function refresh()` :

```js
  renderBarre();
  renderListe();
  renderFiche();
  renderLot();
```

`renderFiche()` est déjà gardée par `if (!state.courant) return;` donc aucun changement nécessaire — confirmer que c'est bien le cas.

- [ ] **Étape 4 : Test final dans l'app**

Lancer `npm start`. Vérifier la checklist complète :

- [ ] Layout pleine largeur — la liste occupe toute la fenêtre
- [ ] Badges colorés sur chaque décor (vert / caramel / gris)
- [ ] Bouton "Détail →" → tiroir s'ouvre depuis la droite
- [ ] Tiroir : ✕, Échap, clic fond → fermeture
- [ ] Tiroir : miniatures, problèmes, tableau des refs avec ajout/suppression fonctionnels
- [ ] ⚙ Options → popover avec types cochables et rangement
- [ ] Changement de type → refresh immédiat
- [ ] Changement de rangement → refresh immédiat
- [ ] Clic en dehors du popover → fermeture
- [ ] "+ Ajouter un dossier" → dialogue système → dossier apparaît dans la liste
- [ ] Drag-and-drop d'un dossier → overlay dépôt s'affiche, dossier ajouté après drop
- [ ] Génération : barre de progression, messages toast — inchangés
- [ ] "Changer" GAMME / Sortie → inchangé
- [ ] Filtre "À faire" / "Incomplets" → inchangé
- [ ] "Cocher les À faire" / "Tout décocher" → inchangé
