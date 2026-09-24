# Changelog

Les versions suivent le [versionnage sémantique](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

## [0.3.1] — 2026-09-24

### Modifié
- L'app s'appelle désormais **LM VisuBatch** : installeurs `LM-VisuBatch-<version>-…`, raccourci, fenêtre,
  dossier des réglages et logs `%APPDATA%\LM VisuBatch`. Les réglages de « Visuels web » sont repris au premier lancement.
- **Windows** : l'identifiant de l'app change, la 0.3.1 ne remplace pas « Visuels web » 0.3.0 mais s'installe à côté.
  Désinstaller « Visuels web » depuis Paramètres > Applications.

### Corrigé
- Construction des installeurs par GitHub Actions (workflow déplacé à la racine du dépôt).

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
