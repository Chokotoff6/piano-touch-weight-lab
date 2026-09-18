# Type de piano et Utilisateur vides au chargement du Mode démo

## Diagnostic (vérifié dans le code)

Deux causes distinctes, aucune n'est un problème de base de données.

### 1. Type de piano : conflit de vocabulaire FR / EN

Les boutons radio de la page Saisie ne se cochent que si la valeur vaut
**exactement** `Droit` ou `Queue` (`src/routes/saisie.tsx`, ligne 2474 :
`checked={info["type_piano"] === t}`, avec `t` parmi `["Droit", "Queue"]`).

La fiche démo en base contient `Upright` (charte anglaise appliquée
précédemment). La chaîne reçue ne correspond à aucune des deux options, donc
aucun bouton ne s'allume. C'est bien un conflit de dictionnaire : l'affichage
anglais est calculé à la volée (`t === "Droit" ? "Upright" : "Grand"`) alors
que la valeur stockée reste française.

### 2. Utilisateur : la colonne `who` n'est jamais lue

Le menu déroulant est branché sur la clé interne `profil_saisie`
(`src/routes/saisie.tsx`, ligne 2681), avec deux valeurs littérales longues :
`Pianiste / Particulier` et `Technicien / Facteur de pianos`.

Or la colonne `who` n'apparaît **nulle part** dans `src/lib/current-piano.ts`
ni dans `src/lib/demo-mode.ts` : le type `CurrentPiano` ne la contient pas, la
lecture `loadPianoProfileById` ne la sélectionne pas, et l'objet `info`
construit pour le Mode démo ne renseigne pas `profil_saisie`. Le champ est donc
vide par construction, quelle que soit la valeur en base.

## Correctifs proposés

### A. Normalisation du type de piano

Ajouter une petite fonction de conversion (dans `src/lib/current-piano.ts`,
exportée) qui ramène toute valeur reçue vers le vocabulaire interne attendu par
le formulaire :

```text
Upright, Droit, droit, UPRIGHT   -> Droit
Grand, Queue, à Queue, GRAND     -> Queue
autre / vide                     -> ""
```

Appliquer cette conversion à l'endroit où l'objet `info` du Mode démo est
construit (`enableDemoModeAsync` dans `src/lib/demo-mode.ts`), ainsi que dans
`loadPianoProfileById` pour que toute fiche relue de la base alimente
correctement les boutons radio.

### B. Raccordement de la colonne `who`

1. `src/lib/current-piano.ts` : ajouter `who: string` au type `CurrentPiano`,
   le lire dans `loadPianoProfileById` (`String(row["who"] ?? "")`) et le
   transmettre dans les fonctions de construction/sauvegarde déjà existantes,
   sans modifier le chemin d'écriture Cloud.
2. Ajouter une conversion symétrique de la valeur base vers l'option du menu :

```text
contient techni / facteur / pro  -> Technicien / Facteur de pianos
private / particulier / pianiste -> Pianiste / Particulier
autre / vide                     -> ""
```

   (même règle de reconnaissance que le filtre QUI de la page Comparer, pour
   rester cohérent).
3. `src/lib/demo-mode.ts` : renseigner `profil_saisie` dans l'objet `info` à
   partir de la valeur convertie.

## Ce qui n'est pas touché

- Aucune modification de la structure de la base ni des valeurs stockées : la
  base reste 100 % anglaise, la conversion est purement côté affichage.
- `cloud-gate.ts`, `upsertCurrentPianoBuffer`, `findHistoryProfileId`,
  `saveCurrentPianoToCloud` et le filtrage démo/réel restent inchangés.
- Les libellés affichés FR/EN du formulaire ne changent pas.

## Vérification

Point de restauration avant modification, puis `tsgo --noEmit` et build, et
contrôle à l'écran : au chargement du Mode démo, le bouton « Droit » est coché
et le menu Utilisateur affiche « Pianiste / Particulier ».
