# Plan : Exclure le piano courant des moyennes Cloud (Comparer)

## Diagnostic confirmé

Les deux exclusions demandées sont **déjà dans le code** (`src/routes/comparer.tsx` lignes 1745 + 1748) :
- `.neq("is_buffer", true)` — présent
- `.neq("serial_number", mine.serialNumber)` — présent

La vraie cause du bug est une **fusion de doublons de données** dans la base externe. Trois lignes ont des wa_values **strictement identiques** (88/88 identiques) :

| Ligne | serial_number | is_buffer | demo | wa[:5] |
|-------|--------------|-----------|------|--------|
| Tampon réel (id `...0000`) | `6524444` | true | false | [62, 75, 67, 55, 81] |
| Fiche réelle #1 | `6524444` | false | null | [62, 75, 67, 55, 81] |
| Fiche réelle #2 | `652444` | false | null | [62, 75, 67, 55, 81] |

`mine.serialNumber` vient du tampon DB (`"6524444"` via `loadCurrentPianoFromCloud`). La requête exclut `"6524444"` (catche la fiche #1) mais **n'exclut pas** la fiche #2 (`"652444"`, un chiffre de moins). Quand le Mode démo est inactif, cette fiche #2 est la seule retournée → la moyenne Cloud = exactement ses valeurs = identiques au piano actuel.

En Mode démo actif, 108 fiches démo sont aussi retournées (wa ~25), donc la moyenne (~25.8) ne correspond pas — le bug n'est visible que hors démo.

## Correctif proposé

Dans `src/routes/comparer.tsx`, l'effet `loadCloudAverage` (ligne ~1730) :

1. Charger aussi le piano local via `loadCurrentPiano()` pour récupérer son `serial_number` (en Mode démo : `"652444"`, différent du tampon DB `"6524444"`).
2. Ajouter une seconde exclusion `.neq("serial_number", localSerial)` sur ce numéro local, en plus de `mine.serialNumber`.
3. Les deux `.neq("serial_number", ...)` se combinent en AND SQL → exclut `"6524444"` ET `"652444"` → la fiche doublon #2 est désormais bannie.

Aucune modification de la base de données. Aucun changement à `cloud-gate.ts`, `current-piano.ts` ou l'arborescence d'écriture Supabase.

## Détail technique

```typescript
// Dans loadCloudAverage, avant la construction de la query :
const localPiano = loadCurrentPiano();
const localSerial = localPiano?.serial_number ?? "";

let query = scopeDemo(
  externalSupabase
    .from("piano_profiles")
    .select(PROFILE_FIELDS)
    .eq("model", mine.model)
    .neq("serial_number", mine.serialNumber)
    .neq("id", CURRENT_PIANO_BUFFER_UUID)
    .neq("is_buffer", true),
);
// Exclusion supplémentaire du serial local (catche le doublon démo)
if (localSerial && localSerial !== mine.serialNumber) {
  query = query.neq("serial_number", localSerial);
}
```

Import `loadCurrentPiano` déjà présent (ligne 15). Aucun nouveau fichier.

## Fichiers modifiés

- `src/routes/comparer.tsx` — effet `loadCloudAverage` (1 import déjà présent + ~4 lignes)

## Validation

- `bunx tsgo --noEmit` + build OK
- Vérification REST : la requête avec `serial_number=neq.6524444&serial_number=neq.652444` ne retourne plus la fiche doublon
