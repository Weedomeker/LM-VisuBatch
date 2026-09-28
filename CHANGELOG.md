# Changelog

Les versions suivent le [versionnage sémantique](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

## [0.7.0] — 2026-09-28

### Ajouté
- **Mises à jour** : au démarrage, un bandeau signale qu'une nouvelle version est disponible.
  « Télécharger » ouvre la page de la version ; « Ignorer cette version » ne la signale plus.
  Installer le nouvel installeur par-dessus l'ancien suffit, les réglages sont conservés.
  Les versions 0.6.0 et antérieures ne font pas cette vérification : il faut installer la 0.7.0 à la main une dernière fois.

## [0.6.0] — 2026-09-28

### Ajouté
- **Réglages client, onglet Références** : le format des références se déduit d'exemples. On saisit
  quelques références réelles du client ; ce qu'elles ont en commun au début devient obligatoire.
  L'expression régulière reste modifiable à la main.

### Corrigé
- Le bilan de fin de lot affiche bien la liste des images produites, avec leurs vignettes.

## [0.5.1] — 2026-09-28

### Corrigé
- **Qualité des images** : les visuels sont enregistrés en qualité JPEG maximale, sans sous-échantillonnage
  de la couleur, comme les exports Photoshop. Le grain et les détails fins des motifs sont conservés
  (fichiers plus lourds). Les images déjà générées sont recalculées une fois.
- Motifs des unis lus dans les PSD : extraits eux aussi en qualité maximale.
- Vignettes de la fiche déco et du bilan plus nettes : elles sont chargées à leur taille d'affichage.

## [0.5.0] — 2026-09-28

### Ajouté
- **Réglages client** : panneau à 5 onglets (Références, Finitions, Noms, Gabarits, Avancé) pour adapter
  l'app aux conventions de nommage d'un client, avec testeurs en direct ; modèle `config.example.json`.

### Modifié
- **Nouvelle interface** anthracite/orange (police IBM Plex Sans) en 4 écrans : accueil, liste des décos
  avec filtres, fiche déco avec vignettes des visuels produits, génération et bilan.

### Corrigé
- Finitions accentuées mieux reconnues dans les noms de fichiers.

## [0.4.0] — 2026-09-25

### Ajouté
- Bouton **?** dans la barre d'en-tête : aide sur le nommage des visuels sources (au 10ème)
  et les fichiers requis pour chacun des 7 types de visuels.
- Développement : les scripts npm se lancent depuis la racine du dépôt (`npm install`, `npm run dev`, `npm test`…).

## [0.3.5] — 2026-09-24

### Corrigé
- **macOS** : les dossiers de la GAMME aux noms accentués (ex. « CRÈME ») étaient ignorés lors de la recherche des unis.

### Modifié
- Renommage interne : `decors` → `deco` dans toute la base de code (variables, propriétés, HTML, CSS, CLI `--deco`).

## [0.3.4] — 2026-09-24

### Ajouté
- Icône de l'application (exécutable, installeur, fenêtre, Mac).

### Corrigé
- **macOS** : app signée ad hoc, sans quoi les Mac Apple Silicon la refusaient (« endommagée »).
- **macOS** : décors aux noms accentués reconnus même si macOS rend les accents sous forme décomposée.

### Modifié
- **macOS** : menu minimal (à propos, édition, fenêtre) à la place du menu d'Electron.
- Consignes d'ouverture sous macOS 15 (Réglages Système > Confidentialité et sécurité > « Ouvrir quand même »).

## [0.3.3] — 2026-09-24

### Corrigé
- L'interface affiche enfin la police Montserrat (elle retombait sur la police système).

### Modifié
- Installeurs allégés d'environ 11 Mo : images des gabarits recompressées sans perte (rendus identiques)
  et calque inutilisé retiré.
- À la première génération après la mise à jour, les images A-01, A-02 et C sont recalculées une fois.

## [0.3.2] — 2026-09-24

### Modifié
- Installeurs allégés d'un tiers (Windows : 350 → 236 Mo) : les images de référence Photoshop inutilisées
  et les traductions de Chromium autres que français et anglais ne sont plus livrées. Rendus inchangés.
- À la première génération après la mise à jour, les images A-01 et A-02 sont recalculées une fois.

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
