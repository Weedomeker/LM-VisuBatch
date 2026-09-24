# LM VisuBatch

Application de bureau pour générer automatiquement les **visuels web** de panneaux de douche à partir d'un dossier de décors.

---

## À quoi ça sert

Pour chaque référence produit d'une gamme, l'app produit jusqu'à 7 images prêtes pour le web : panneaux en situation, miniatures, compositions, etc.

**Sans l'app :** créer chaque image à la main dans Photoshop, référence par référence.  
**Avec l'app :** sélectionner la gamme, choisir les types d'images, cliquer sur Générer. C'est tout.

La gamme source n'est jamais modifiée. Les images générées vont dans un dossier de sortie choisi séparément.

---

## Les 7 types de visuels

| Code | Description |
|------|-------------|
| A-01 | Panneau seul en situation dans une douche |
| A-02 | 2 panneaux côte à côte (gauche / droite) |
| P | Miniature du panneau seul |
| C | Composition carrée (format brochure) |
| II-01 | Grille des 6 formats disponibles |
| II-02 | Visuel statique (copié tel quel) |
| II-03 | Visuel statique (copié tel quel) |

---

## Utilisation

1. Lancer l'app
2. Choisir le dossier **GAMME** (là où se trouvent les décors)
3. Choisir le dossier de **Sortie** (là où iront les images)
4. Sélectionner les décors à traiter dans la liste
5. Choisir les types de visuels via **⚙ Options**
6. Cliquer sur **Générer**

Les images déjà à jour ne sont pas recalculées — seul ce qui a changé est régénéré.

---

## Installation

Les installeurs ne sont pas signés (pas de certificat éditeur) : une alerte s'affiche la première fois.

**Windows** — lancer `LM-VisuBatch-…-win-x64.exe`.  
Si « Windows a protégé votre ordinateur » s'affiche : cliquer sur « Informations complémentaires » puis « Exécuter quand même ». L'app s'installe sans droits administrateur.

**macOS** — ouvrir le `.dmg` (`arm64` pour Mac M1/M2/M3, `x64` pour Mac Intel) et glisser l'app dans Applications.  
Au premier lancement : Réglages Système > Confidentialité et sécurité > « Ouvrir quand même » (avant macOS 15 : clic droit > Ouvrir).  
Si macOS indique que l'app « est endommagée » : `xattr -cr "/Applications/LM VisuBatch.app"` dans le Terminal.

---

## Développement

```bash
cd app
npm install
npm start              # lancer l'app
npm run dev            # lancer l'app avec rechargement automatique à chaque modification
npm run dist:win       # compiler l'installeur Windows (dans app/dist/)
```

L'installeur macOS se compile sur un Mac (`npm run dist:mac`) ou via GitHub Actions (onglet Actions > Installeurs > Run workflow).

**Test de non-régression :**
```bash
node app/src/cli/generate.js "test/exemple/GAMME" --config test/exemple/gamme_deco.csv --out <sortie>
node app/test/compare-dossiers.js <sortie> test/exemple/sortie
# doit afficher 0 image différente
```
