# LM VisuBatch

Application Electron (Windows + macOS) qui génère par lot les visuels web des panneaux de douche
à partir d'un dossier **GAMME** de décos. 7 types de visuels : A-01, A-02, P, C, II-01, II-02, II-03
(voir le README).

## Structure

- `package.json` (racine) : relaie les scripts vers `app/` — tout se lance depuis la racine.
- `app/src/core/` : moteur, sans dépendance à Electron, partagé par le CLI et l'app.
  - `inventaire.js` : scan de la GAMME ; `context.js` : contexte d'un lot (sérialisable pour les workers).
  - `batch/` : plan → exécution en workers ; `utils/manifest.js` évite de recalculer les images à jour.
  - `render/` : `renderers.js` (un renderer par type de visuel), `render.js` (sharp), `extract-motif.js` (motif des unis lu dans les PSD `LM WEB 2025` via ag-psd).
- `app/src/main/` : processus principal Electron ; `app/src/renderer/` : interface (HTML/CSS/JS sans framework).
- `app/src/cli/` : `generate.js`, `inventaire.js`.
- `app/resources/` : gabarits, statiques, polices, `gamme_deco.csv` (réglages par déco).
- `docs/superpowers/` : specs et plans des évolutions.

## Commandes (depuis la racine)

```bash
npm install        # dépendances de app/
npm run dev        # app avec rechargement automatique
npm test           # non-régression sur test/exemple → doit afficher « 0 différentes »
npm run lint       # ESLint 8 (.eslintrc.json)
npm run format     # Prettier (.prettierrc.json) ; format:check pour vérifier sans écrire
npm run generate -- <GAMME> --config <csv> --out <sortie>
```

## Règles

- **Langue** : code, commentaires, messages de commit, CHANGELOG et interface en français.
  Vocabulaire : « déco » (pas « décor »), identifiants `deco`.
- **La GAMME est en lecture seule** : on n'y écrit jamais rien, les images vont dans le dossier de sortie.
- **Rendus** : toute modification du moteur doit garder la non-régression à 0 image différente,
  sauf changement voulu (alors le signaler dans le CHANGELOG : « recalculées une fois »).
- **Accents** : les noms de dossiers/fichiers peuvent arriver en NFD sur macOS — comparer en NFC.
- **Avant de commiter** : `npm run lint` et `npm run format:check` doivent passer.
- **Multiplateforme** : penser Windows et macOS (chemins, accents, sharp construit par plateforme).

## Git et versioning

- On travaille sur `dev` ; `main` est la branche principale.
- Commits conventionnels en français : `feat:`, `fix:`, `refactor:`, `chore:`, `ci:`, `docs:`.
- À chaque commit de code, versionner :
  1. `npm --prefix app version X --no-git-tag-version` (semver ; en 0.x : feat → mineur, fix ou packaging → correctif ; ci/docs seuls → pas de bump) ;
  2. entrée dans `CHANGELOG.md` (sections Ajouté / Modifié / Corrigé, rédigée pour les utilisateurs) ;
  3. commit `chore: version X` puis tag annoté local `vX`.
- Ne jamais pousser de tag sans demande : un tag `v*` déclenche `.github/workflows/installeurs.yml`,
  qui construit les installeurs et publie la release GitHub.
- Ne pas télécharger les installeurs en local (disque C: presque plein).
