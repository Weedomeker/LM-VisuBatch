# Configuration par client — Design Spec

**Date :** 2026-09-27  
**Statut :** Approuvé

---

## Objectif

Rendre VisuBatch universel : chaque client dispose de son propre fichier `config.json` dans son dossier GAMME, éliminant les valeurs Leroy Merlin hardcodées dans le code. L'utilisateur configure ces paramètres directement via un panneau dans l'app.

---

## 1. Structure du `config.json`

Le fichier vit à la racine du dossier GAMME du client.

```json
{
  "client": "Leroy Merlin",
  "catalogue": "",
  "refPattern": "9\\d{7}",
  "outputFolder": " LM WEB 2025",
  "formats": ["100x210", "100x255", "125x210", "125x255", "150x210", "150x255"],
  "finitions": ["MAT", "BRILLANT"],
  "motifPattern": "au\\s*10\\s*[èée]m",
  "uniPrefix": "ULM"
}
```

### Champs

| Champ | Type | Description | Valeur LM par défaut |
|---|---|---|---|
| `client` | string | Nom du client, affiché dans l'UI | `"Leroy Merlin"` |
| `catalogue` | string | Chemin (absolu ou relatif au dossier GAMME) vers un CSV partagé. Vide = mode auto. | `""` |
| `refPattern` | regex string | Extrait la référence produit du nom de fichier | `"9\\d{7}"` |
| `outputFolder` | string | Nom du sous-dossier WEB source des unis PSD | `" LM WEB 2025"` |
| `formats` | string[] | Dimensions produit `"LxH"` en cm | `["100x210", ...]` |
| `finitions` | string[] | Valeurs de finition lues dans les noms de fichiers | `["MAT", "BRILLANT"]` |
| `motifPattern` | regex string | Identifie un fichier image comme visuel source | `"au\\s*10\\s*[èée]m"` |
| `uniPrefix` | string | Préfixe affiché pour les couleurs unies | `"ULM"` |

Un fichier `config.json` exemple pré-rempli avec les valeurs LM est livré avec l'app comme modèle de référence.

---

## 2. Catalogue décors (`gamme_*.csv`)

### Convention de nommage

Le catalogue CSV est nommé d'après le client, avec normalisation :

- Espaces et caractères non-alphanumériques → `_`
- Tirets multiples fusionnés
- Exemples : `"Leroy Merlin"` → `gamme_Leroy_Merlin.csv`, `"Villeroy & Boch"` → `gamme_Villeroy_Boch.csv`

### Priorité de résolution

1. **Chemin absolu ou relatif au dossier GAMME** dans `config.json → "catalogue"` (fichier partagé entre plusieurs GAMMEs)
2. **`gamme_{Client}.csv`** auto-détecté dans le dossier GAMME
3. **Catalogue LM embarqué** dans l'app (`resources/gamme_deco.csv`) — fallback silencieux

---

## 3. Flux de données

### Chargement au démarrage

```
Ouverture dossier GAMME
  → lecture config.json
      ├── absent → panneau config auto-ouvert (pré-rempli valeurs LM)
      └── présent → résolution catalogue → createContext(clientConfig)
                        → inventaire.js utilise refPattern / finitions / motifPattern / formats
                        → renderers.js utilise outputFolder / uniPrefix
```

### Modifications via le panneau

```
Utilisateur modifie un champ → validation live
  → clic "Enregistrer"
      → écriture config.json dans le dossier GAMME
      → re-analyse automatique (scanGamme)
```

### Points de contact dans le code

| Fichier | Modification |
|---|---|
| `core/inventaire.js` | `FORMATS`, regex ref, regex finition, regex motif → reçus du contexte |
| `core/render/renderers.js` | `" LM WEB 2025"` et `"ULM"` → lus depuis `ctx.clientConfig` |
| `core/context.js` | `createContext()` accepte et expose `clientConfig` |
| `main/main.js` | Lit `config.json` à chaque changement de GAMME, passe à `prepareBatch()` |
| `core/index.js` | `prepareBatch()` reçoit `clientConfig` optionnel — fallback valeurs LM pour rétrocompatibilité CLI |

---

## 4. Interface utilisateur

### Point d'entrée

- **Bouton "⚙ Réglages client"** dans la barre principale, toujours visible
- **Auto-ouverture** si aucun `config.json` trouvé à l'ouverture d'une GAMME

### Structure du panneau (modal centré)

**En-tête**
- Titre : "Réglages client"
- Bouton fermer (✕)

**Bandeau alerte** (premier lancement uniquement)
- Message : "Aucune configuration trouvée — complétez les réglages pour activer l'analyse."

**Section Identité**
- Champ texte : Nom du client

**Section Catalogue décors**
- Toggle Auto / Fichier personnalisé
  - Mode Auto : indicateur vert/rouge + nom du fichier attendu (`gamme_{Client}.csv`)
  - Mode Fichier personnalisé : champ chemin + bouton "Parcourir…"
- Mention du fallback si fichier absent

**Section Reconnaissance des fichiers**
- Champ : Pattern référence produit (monospace) + testeur live
- Champ : Pattern motif source (monospace) + testeur live

**Testeur live** : l'utilisateur saisit un vrai nom de fichier → résultat immédiat :
- `✓ Référence trouvée : 94953622` (vert)
- `✗ Aucune référence trouvée` (caramel)
- `✗ Pattern invalide : ...` (caramel)

**Section Génération**
- Champ : Dossier WEB (source des unis)
- Champ : Préfixe couleurs unies

**Section Formats produit**
- Tags cliquables avec `[×]` pour supprimer
- Champ + bouton "Ajouter" (validation sur Entrée)

**Section Finitions**
- Même composant tags que Formats

**Pied**
- Bouton "Annuler" (remplacé par "Continuer avec les valeurs LM par défaut" en cas d'auto-ouverture sans config existante)
- Bouton "Enregistrer" → écrit `config.json`, ferme le panneau, relance l'analyse

---

## 5. Rétrocompatibilité

- **CLI** (`node cli/generate.js`) : si pas de `config.json`, toutes les valeurs LM restent en vigueur comme defaults — rien ne casse.
- **App existante** : à la première ouverture après mise à jour, le panneau s'ouvre automatiquement. L'utilisateur valide ou ajuste, puis le fichier est créé.

---

## 6. Améliorations futures (hors scope v1)

- **`refPattern` assisté** : l'utilisateur saisit un exemple de référence réelle (`94953622`) → l'app en déduit le pattern automatiquement (`9\d{7}`), sans avoir à écrire de regex.
- **`motifPattern` assisté** : même principe — saisie d'un exemple de nom de fichier source, déduction du pattern.

---

## 7. Fichiers et dossiers créés/modifiés

### Nouveaux fichiers
- `app/resources/config.example.json` — template livré avec l'app
- `app/src/core/utils/clientConfig.js` — chargement, validation et résolution du config + catalogue
- `app/src/renderer/reglages-client.js` — logique du panneau UI
- `app/src/renderer/reglages-client.css` — styles du panneau (variables partagées avec `style.css`)

### Fichiers modifiés
- `app/src/core/context.js` — expose `clientConfig`
- `app/src/core/inventaire.js` — dépendances hardcodées → paramètres
- `app/src/core/render/renderers.js` — `LM WEB 2025` et `ULM` → `ctx.clientConfig`
- `app/src/core/index.js` — `prepareBatch()` accepte `clientConfig`
- `app/src/main/main.js` — lecture config.json au changement de GAMME
- `app/src/renderer/index.html` — bouton "Réglages client" + inclusion du panneau
