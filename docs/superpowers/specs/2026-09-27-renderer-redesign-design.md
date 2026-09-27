# Refonte du renderer LM VisuBatch

## Vue d'ensemble

Refonte complète de l'interface renderer (`app/src/renderer/`) pour adopter le design system LM VisuBatch anthracite/orange défini dans `design_handoff_visubatch_prototype/`. La logique métier (`app/src/core/` et IPC existant) reste intacte. Seuls les 4 fichiers du renderer changent.

**Fichiers cibles :**
- `app/src/renderer/index.html`
- `app/src/renderer/style.css`
- `app/src/renderer/app.js`
- `app/src/renderer/reglages-client.js`

**Fichiers à copier :**
- `app/resources/fonts/IBMPlexSans-Medium-latin.woff2` (depuis `design_handoff_visubatch_prototype/prototype/_ds/.../assets/fonts/`)

---

## Architecture & navigation

### Modèle d'écrans

`state.ecran` dans `app.js` prend les valeurs : `accueil | liste | generation | bilan`.

Rendu conditionnel via l'attribut `hidden` sur les conteneurs HTML — pas de router, pas de framework. Un seul `index.html` avec les 4 écrans en parallèle, dont 3 masqués à tout moment.

### Gammes récentes

Stockées dans `localStorage` sous la clé `vb-gammes-recentes` : tableau de `{ gamme: string, outDir: string }`.

- Mis à jour à chaque ouverture réussie d'une gamme via `api.chooseFolder('gamme')` ou drop.
- L'écran Accueil lit ce tableau au montage.
- Si vide : affiche uniquement le bouton « Parcourir… » et la zone de dépôt.

### Flow de navigation

```
Accueil
  └─ Parcourir… / Ouvrir → / Drop gamme
        └─ Liste
              ├─ Générer → Génération → Bilan → retour Liste
              └─ ‹ Gammes → Accueil
```

L'écran Accueil calcule les badges de statut des gammes récentes en appelant `api.analyse()` pour chacune — si l'API ne le permet pas (pas de multi-gamme), les badges restent vides et on affiche juste le nombre de décos depuis le cache localStorage.

---

## Design system (`style.css`)

### Tokens de couleur (remplacent entièrement les anciennes variables)

```css
--anthracite: #2b2f33
--encre: #1e2226
--doux: #5d646b
--gris-clair: #b9c0c7
--trait: #d6dadd
--gris-actif: #e9ecee
--fond: #f1f3f4
--surface-douce: #f8f9fa
--surface: #ffffff
--orange: #ff6b1a
--orange-fonce: #e85a0a
--bleu: #1f6fe0
--bleu-fonce: #1859b8
--bleu-clair: #e3edfc
--caramel: #8c5a1e
--caramel-clair: #f3ece3
--rouge: #a3303a
--rouge-clair: #f2e3e4
--voile: rgba(30,34,38,0.40)
--voile-fort: rgba(30,34,38,0.50)
--depot-voile: rgba(255,255,255,0.92)
```

Alias sémantiques : `--action: var(--orange)`, `--selection: var(--bleu)`, `--focus-ring: var(--bleu)`, `--progression: var(--orange)`, `--barre-fond: var(--anthracite)`, `--barre-accent: var(--orange)`.

### Typographie

- `@font-face` Montserrat Regular/Bold : `../../resources/fonts/Montserrat-Regular.ttf` / `Montserrat-Bold.ttf` (existants)
- `@font-face` IBM Plex Sans Medium : `../../resources/fonts/IBMPlexSans-Medium-latin.woff2` (à copier)
- Variable `--font-liste: 'IBM Plex Sans', Montserrat, system-ui, sans-serif` — utilisée **uniquement** sur `.nom` dans les rangées de la liste.

### Formes

**Rayons : 0 partout.** Exceptions : `.btn-aide` (cercle `border-radius: 50%`). Supprimer tous les `border-radius: 3px`, `4px`, `6px`, `10px` existants.

### Ombres

Uniquement sur les éléments flottants :
- Popover : `0 6px 20px rgba(0,0,0,.14)`
- Tiroir : `-4px 0 24px rgba(0,0,0,.12)`
- Modale : `0 12px 40px rgba(0,0,0,.18)`

### En-tête `.barre`

Fond `--anthracite`, texte blanc, filet bas `3px solid --orange` (via `box-shadow: inset 0 -3px 0 var(--orange)`).

Marque : `<strong class="marque"><b class="marque-lm">LM</b> <span class="marque-nom">VisuBatch</span></strong>` — 13px, capitales, interlettrage 0.28em. « LM » en orange, « VisuBatch » en blanc.

Boutons et liens dans l'en-tête : couleur blanche, hover fond blanc/texte anthracite.

### Bouton principal

Fond `--orange`, texte `--encre` gras (pas blanc). Hover `--orange-fonce`. Disabled `--trait / --doux`.

---

## Écrans

### Accueil

```
[En-tête anthracite]
[Zone scrollable]
  max-width 960px, padding 48px 64px, gap 20px
  — Titre "Gammes récentes" (28px gras) + bouton "Parcourir…"
  — Liste rangées blanches : nom (gras 160px) · chemin mono · nb décos · badge · "Ouvrir →"
  — Zone dépôt pointillés 1px : "ou déposez un dossier GAMME ici"
[Footer blanc]
  "SORTIE" · chemin mono · lien "Changer" · aide "La sortie est mémorisée pour chaque gamme."
```

**Badge de gamme** : `depose` si déco bloquée ou motif manquant ; `afaire` si déco à faire ; `ok` si tout à jour. Calculé depuis le cache local si l'analyse multi-gamme n'est pas disponible.

**Interactions** :
- Clic « Ouvrir → » / clic rangée / clic « Parcourir… » → `api.chooseFolder('gamme')` (dialogue natif). La liste des gammes récentes est **informative** (historique + statut) ; l'IPC ne peut pas recevoir un chemin pour ouvrir sans dialogue.
- Si succès → aller en Liste, mettre à jour localStorage.
- Drop dossier → `api.drop()` → aller en Liste.
- Clic « Changer » (sortie) → `api.chooseFolder('sortie')`.

### Liste des décos

```
[En-tête]
[Barre d'outils surface-douce]
  "‹ Gammes" · Recherche 200px · Bascule Tous/À faire/Incomplets
  · "Cocher les À faire" · "Tout décocher" · [flex:1] · légende badges
[Liste ul défilante]
  rangées .vb-rangee avec filet gauche 3px : rouge=bloquée, ocre=motif manquant, bleu=fiche ouverte
[Footer blanc]
  case "Tout refaire" · [flex:1] · résumé · bouton "Générer"
```

**Rangée** : case à cocher (désactivée si bloquée) · nom IBM Plex 14px casse phrase 160px · badges types par code (ok gris / afaire anthracite / depose ocre) · badges statut déco · « Détail → ».

**Filtres** : « À faire » = `stats.images > 0` ; « Incomplets » = `impossibles.length > 0 || problems.length > 0`.

### Génération

Lancé au clic « Générer » depuis la Liste. L'écran remplace la liste.

```
[En-tête]
[Zone scrollable, max-width 960px]
  — Titre "Génération en cours…" (28px) / "Annulation…"
  — Bloc blanc : progression globale i/n · DÉCO TYPE (ou "Préparation…")
  — Liste décos cochées : nom · barre 8px · "x / y" ou "rien à faire" · badge alerte
[Footer blanc]
  aide temps restant · [flex:1] · bouton "Annuler"
```

**Progression par déco** : calculée depuis les événements `onProgress` filtrés par `e.task.dossier`.

**Annuler** : appel `api.cancel()`, bouton devient disabled, titre → « Annulation… ». Le footer indique « Les images déjà produites sont conservées. »

**Fin** : quand `api.generate()` résout → transition vers Bilan.

### Bilan

```
[En-tête]
[Zone scrollable, max-width 960px]
  — Titre "N images produites" + badges lot annulé / impossibles / décos bloquées
  — Section "À CORRIGER" (si problèmes) : liste Probleme ocre/rouge avec liens action
  — Section "PRODUITES" : rangées décos, vignettes 48×64 + code 10px, "N images"
[Footer blanc]
  lien "Ouvrir le dossier de sortie" · [flex:1] · bouton "Retour à la liste"
```

**Retour à la liste** : si problèmes restants → activer filtre « Incomplets ».

---

## Surfaces

### Fiche déco (tiroir droit 480px, voile `.40`)

- Titre : nom en **CAPITALES** (28px gras)
- Badges statut déco
- Section **Références** : puces `.ref` (numéro + finition + ×) ; fond bleu clair si saisie. Si aucune valide : texte rouge + lien « + Ajouter une référence » → ouvre Réglages client onglet Références.
- Section **Motifs au 10ème** : tableau format · fichier attendu mono · présent/manquant + lien « Déposer le motif… ».
- Section **Visuels** : grille 4 colonnes tuiles `aspect-ratio: 3/4`. États : image produite / pointillés anthracite (à faire) / hachuré ocre (motif manquant). Légende code gras + état coloré.
- Pied : résumé + bouton « Générer cette déco » (lance génération pour cette déco seule).

### Options (tiroir droit 480px, voile `.40`)

Remplacement du popover actuel. Sections :
1. **Types de visuels** — cases à cocher `CaseType` + résumé
2. **Rangement des images** — bascule Tout à plat / Un dossier par déco
3. **Aperçu de la sortie** — arborescence mono fond `--fond`, mise à jour en direct
4. **Journaux** — lien « Ouvrir les logs »

### Réglages client (modale 760px, voile `.50`)

Navigation verticale 170px à gauche. Onglet actif : fond `--gris-actif`, filet bleu 3px inset, gras.

**Onglet Références** :
- Champ regex mono (défaut `9\d{7}`) + aide
- Testeur avec nom de fichier
- Section « Décos sans référence » : pour chaque déco bloquée, champ `9xxxxxxx` + bascule finition + bouton « + Ajouter »

**Onglet Finitions** : `ListeTags` (MAT, BRILLANT + ajout/suppression)

**Onglet Noms des images** : champ modèle (défaut `{ref}_{type}.jpg`, variables `{ref} {type} {deco} {finition}`) + exemple en direct

**Onglet Gabarits** : tableau code · nom · puce « présent » pour les 7 types

**Onglet Avancé** *(sections existantes conservées)* :
- Identité client (nom du client)
- Catalogue décors (auto/personnalisé)
- Reconnaissance des fichiers (pattern motif source)
- Génération (dossier WEB, préfixe couleurs unies)
- Formats produit (tags)

Pied modale : « Annuler » (restaure l'état d'ouverture) · « Enregistrer ».

### Dépôt de fichiers

Voile `.vb-depot` (blanc `.92`, pointillés bleus 3px) sur `dragenter` avec fichiers.
- Accueil : « Déposez le dossier GAMME »
- Fiche ouverte avec motif manquant : « Déposez le motif au 10ème » + formats manquants
- Ailleurs : « Dépôt impossible ici »

---

## État (`app.js`)

```js
state = {
  ecran: 'accueil',          // accueil | liste | generation | bilan
  data: null,                // résultat api.analyse()
  courant: null,             // déco ouverte dans la fiche
  coches: new Set(),
  filtre: 'tous',
  recherche: '',
  enCours: false,
  analyse: false,
  optionsOuvert: false,      // nouveau : tiroir Options
  depot: null,               // { texte, aide } | null
  bilan: null,               // résultat api.generate()
}
```

---

## IPC conservé (aucune modification du core)

`api.analyse()`, `api.chooseFolder(kind)`, `api.setOption(key, val)`, `api.generate({ dossiers, force })`, `api.cancel()`, `api.addSource()`, `api.drop(files)`, `api.setRefs(chemin, key, saisies)`, `api.thumb(chemin, h)`, `api.openLogs()`, `api.openOutput()`, `api.loadClientConfig()`, `api.saveClientConfig(config)`, `api.browseCatalogue()`, `api.onProgress(cb)`.

---

## Contraintes

- Vanilla HTML/CSS/JS, pas de framework, pas de bundler.
- CSP existante conservée : `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'`.
- Polices locales uniquement.
- Aucun emoji dans l'UI (pictos Unicode : ⚙ ✕ × → ‹ +).
