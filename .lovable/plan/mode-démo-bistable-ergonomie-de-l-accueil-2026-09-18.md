# Mode Démo bistable + ergonomie de l'accueil

## Ce qui existe déjà (vérifié, aucun changement nécessaire)

- Le piano de démo local est déjà le jumeau de la fiche tampon démo (YAMAHA U3 Upright, 2020, climat Standard).
- La moyenne Cloud exclut déjà les deux lignes tampon (`is_buffer`) et le piano courant, et applique déjà le cloisonnement `demo` selon l'état du Mode démo.
- La ligne cible constructeur est déjà lue dans la table externe `piano_specs_usine`.

## Ce qui change

### 1. Bouton « Mode démo » : interrupteur permanent ON/OFF

- Le bouton reste **toujours affiché** (il ne disparaît plus au clic), sur toutes les pages sauf l'accueil, comme aujourd'hui.
- État ON (par défaut au premier chargement) : fond et bordure mauve pâle, texte foncé lisible.
- État OFF : fond gris clair et texte noir, exactement comme les autres boutons du menu.
- Clic ON → OFF :
  - purge des données de démo en mémoire locale (fiche, 88 pesées, piano courant) ;
  - remise à zéro de l'accord d'enregistrement (`ptw_cloud_profile_saved`), donc tous les champs Info Piano redeviennent modifiables ;
  - Comparer rebascule sur les seules fiches réelles ;
  - redirection immédiate vers la page **Saisie**, vide, prête pour un relevé réel.
- Clic OFF → ON : rechargement du jeu de démo et retour sur Saisie pré-remplie.

### 2. Texte explicatif quand le Mode démo est ON

Texte affiché (fenêtre d'aide du « i » et note d'accueil du mode démo), en deux lignes :

```text
Mode Démo pré-remplit l'application avec un jeu de données permettant de tester les différents modules.
La base de données CLOUD utilisée est également fictive.
```

Retour à la ligne forcé avant « La base de données… ». Taille de police augmentée d'un cran (de `text-sm` à `text-base`). Version anglaise équivalente conservée avec le même découpage.

### 3. Accueil (visibilité sur écrans Mac)

- Bloc de texte principal remonté de 50 px.
- Bouton « Commencer votre diagnostic » remonté de 100 px.

## Détails techniques

- `src/lib/demo-mode.ts` : la clé de session `demo_mode_destroyed` devient une clé d'état bistable (`ptw_demo_off`), lue par `isDemoActive()` ; ajout de `toggleDemoMode()` qui enchaîne purge/chargement + reset du drapeau `ptw_cloud_profile_saved` via `setCloudProfileSaved(false)` / `resetConsent()`.
- `src/lib/demo-scope.ts` : `demoScopeActive()` lit la même clé bistable.
- `src/routes/__root.tsx` : bouton toujours rendu, deux jeux de classes selon l'état, `onClick` = bascule + `navigate({ to: "/saisie" })` + rechargement de l'état local.
- `src/components/DemoIntro.tsx` : textes FR/EN scindés en deux lignes, rendu en `whitespace-pre-line`, classe de taille passée à `text-base`.
- `src/routes/index.tsx` : `mt-[116px]` → `mt-[66px]`, `mt-[124px]` → `mt-[24px]`.
- Aucune modification de `cloud-gate.ts`, de la structure Supabase ni des chemins d'écriture.
- Point de restauration créé avant modification, puis `tsgo --noEmit` + build.
