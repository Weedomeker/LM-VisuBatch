# Changelog

Les versions suivent le [versionnage sémantique](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

## [0.3.0] — 2026-09-24

### Ajouté
- Journal de diagnostic par poste (`%APPDATA%\Visuels web\logs\visuels.log`) : démarrage, analyses, lots,
  erreurs de rendu avec pile d'appel, plantages et erreurs de l'interface. `VISUELS_LOG=debug` pour plus de détails.
- Historique commun des lots dans le dossier de sortie (`.logs/lots.log`) : qui, quand, quelles décos, bilan, durée.
- Bouton « Ouvrir les logs » dans ⚙ Options.
- Développement : `npm run dev` recharge l'app à chaque modification du code.

### Modifié
- Les réglages livrés `decors.csv` sont renommés `gamme_deco.csv`.
- « décor » devient « déco » dans tous les textes visibles.

### Corrigé
- Les unis assortis ne sont plus embarqués dans l'app : leur motif est toujours lu dans la GAMME
  (extraction du PSD `LM WEB 2025`) au moment de la génération.

## [0.2.0]

### Modifié
- Interface simplifiée : liste des décos pleine largeur, fiche dans un tiroir, options regroupées dans ⚙ Options.
