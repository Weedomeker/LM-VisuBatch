# LM VisuBatch

Application de bureau (Windows, macOS) qui génère les 7 visuels web de chaque référence de panneau
à partir du dossier GAMME. La GAMME est seulement lue ; les images vont dans le dossier de sortie choisi.

## Installer

Les installeurs ne sont pas signés (pas de certificat éditeur) : le système affiche un avertissement la première fois.

- **Windows** : lancer `LM-VisuBatch-…-win-x64.exe`. Si « Windows a protégé votre ordinateur » s'affiche :
  « Informations complémentaires » puis « Exécuter quand même ». L'app s'installe pour l'utilisateur, sans droits administrateur.
- **macOS** : ouvrir le `.dmg` (`arm64` pour les Mac M1/M2/M3…, `x64` pour les Mac Intel) et glisser l'app
  dans Applications. Au premier lancement, macOS refuse de l'ouvrir (développeur non identifié) :
  Réglages Système > Confidentialité et sécurité > « Ouvrir quand même » (avant macOS 15 : clic droit sur l'app > Ouvrir).
  Si macOS indique que l'app « est endommagée », lancer dans le Terminal :
  `xattr -cr "/Applications/LM VisuBatch.app"`

## Développer

```
npm install
npm start                    # l'application
npm run dev                  # l'application, rechargée à chaque modification du code
npm run generate -- "<GAMME>" --out sortie [--dry-run]   # le moteur en ligne de commande
npm run dist:win             # installeur Windows (dans dist/)
```

L'installeur macOS se construit sur un Mac (`npm run dist:mac`) ou par GitHub Actions
(`.github/workflows/installeurs.yml` à la racine du dépôt : onglet Actions > Installeurs > Run workflow).

Non-régression : `node test/compare-dossiers.js <sortie> test/exemple/sortie` doit indiquer 0 image différente
pour `node cli/generate.js test/exemple/GAMME --config test/exemple/gamme_deco.csv --out <sortie>`.
