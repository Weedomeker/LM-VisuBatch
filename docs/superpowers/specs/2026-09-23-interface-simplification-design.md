# Interface simplification — LM VisuBatch

**Date :** 2026-09-23  
**Statut :** approuvé

## Contexte

L'interface actuelle est fonctionnelle mais sous-optimale pour un usage rapide : le panneau de droite (fiche du décor) occupe la moitié de l'écran alors qu'il est rarement consulté, la zone de dépôt prend de la place en permanence, et les types de visuels encombrent le pied de page malgré n'être configurés qu'une fois.

**Workflow type de l'utilisateur :** vérifier l'état de la gamme → sélectionner les décors à traiter → générer.

**Constats du cadrage :**
- La fiche détaillée (formats, références) est utilisée rarement — uniquement pour investiguer un problème.
- Les types de visuels sont réglés une fois pour toutes.
- La sélection précise de décors est le cœur du flux.

## Ce qui change

### Layout général

Le layout 2 colonnes (`liste 330 px | fiche`) est remplacé par une **liste pleine largeur** avec toolbar intégrée.

```
┌─────────────────────────────────────────────────┐
│ En-tête : titre | GAMME | Sortie | ⚙ Options    │
├─────────────────────────────────────────────────┤
│ Toolbar : recherche | filtres | cocher | + doss. │
├─────────────────────────────────────────────────┤
│ Liste des décors (pleine largeur)                │
│  ☑ ARDOISE-GRIP-90   [14 images à faire] Détail→│
│  ☑ BETON-CIRE-GRIS  [2 imp.][8 à faire] Détail→│
│  ☐ CALCAIRE-BLANC    [à jour]            Détail→│
│  …                                               │
├─────────────────────────────────────────────────┤
│ Footer : résumé | ☐ Tout refaire | [Générer]    │
└─────────────────────────────────────────────────┘
```

### En-tête

- Titre « Visuels web »
- GAMME : `nom tronqué` + lien Changer
- Sortie : `nom tronqué` + lien Changer
- Bouton **⚙ Options** (ouvre un popover — voir ci-dessous)

Le toggle de rangement disparaît de l'en-tête et est déplacé dans le popover ⚙ Options.

### Toolbar (sous l'en-tête)

- Champ recherche (texte libre)
- Bascule filtre : Tous | À faire | Incomplets
- Lien « Cocher les À faire »
- Lien « Tout décocher »
- Lien **« + Ajouter un dossier »** — ouvre un sélecteur système (dossier ou CSV) via un nouvel appel IPC `api.addSource()` à créer dans `main.js`. Remplace visuellement la zone de dépôt. Le drag-and-drop document-wide reste fonctionnel ; le div `.depot` reste en DOM mais invisible par défaut, et réapparaît uniquement pendant un drag (comportement existant inchangé).

### Rangées de la liste

Chaque rangée : `[checkbox] [nom] [badges statut] [Détail →]`

Badges :
- **vert** `X images à faire` — si `stats.images > 0`
- **caramel** `X impossibles` — si `stats.blocked > 0`
- **gris** `à jour` — si tout est à jour
- **pastille** `déposé` — si `d.depot === true`

Le bouton **« Détail → »** ouvre le tiroir pour ce décor.

### Footer

- Résumé : `N décors cochés · X images à produire` (ou messages d'état existants)
- Case à cocher « Tout refaire »
- Bouton **Générer** (principal)

La barre de progression pendant la génération reste dans la zone actions du footer, inchangée.

### Popover ⚙ Options

Popover flottant sous le bouton, fermé par clic extérieur ou Échap.

Contenu :
1. **Types de visuels** — les 7 checkboxes existantes (A-01, A-02, P, C, II-01, II-02, II-03), avec libellé court à côté
2. **Rangement des images** — bascule « Tout à plat | Un dossier par décor »

Les changements s'appliquent immédiatement (appel `api.setOption` existant), identique au comportement actuel.

### Tiroir de fiche

Overlay latéral (côté droit) qui se superpose à la liste sans la redimensionner.

- **Ouverture :** clic sur « Détail → » sur n'importe quelle rangée
- **Fermeture :** bouton ✕, touche Échap, clic sur le fond semi-transparent
- **Contenu :** identique au panneau fiche actuel — titre, chemin, miniatures des formats à l'échelle, section « À vérifier », tableau des références avec ajout/suppression

Aucun changement fonctionnel à la fiche elle-même — seul le conteneur change.

## Ce qui ne change pas

- Toute la logique métier (`api.*`, IPC, workers)
- Le comportement du drag-and-drop (zone activée pendant un drag)
- La barre de progression pendant la génération
- Les messages toast (`.messages`)
- Le calcul du résumé dans le footer
- Les raccourcis clavier existants (Entrée pour ajouter une ref, etc.)
- La palette de couleurs et la typographie (Montserrat, variables CSS)

## Fichiers concernés

- `app/src/renderer/index.html` — restructuration du DOM
- `app/src/renderer/style.css` — nouveaux styles (tiroir, popover, rangées), suppression des styles inutilisés
- `app/src/renderer/app.js` — gestion du tiroir (open/close), déplacement de la logique fiche, popover options
- `app/src/main/main.js` — nouvel handler IPC `add-source` pour le bouton « + Ajouter un dossier »
- `app/src/main/preload.js` — exposition de `api.addSource()`

## Critères de succès

- La liste occupe toute la largeur disponible
- Le tiroir s'ouvre et se ferme sans rechargement ni perte d'état
- Les 7 types et le rangement restent configurables via ⚙ Options
- Le workflow principal (vérifier → sélectionner → générer) ne nécessite pas d'ouvrir le tiroir
- Le drag-and-drop continue de fonctionner
