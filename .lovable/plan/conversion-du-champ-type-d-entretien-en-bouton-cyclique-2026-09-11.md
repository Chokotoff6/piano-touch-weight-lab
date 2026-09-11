# Conversion du champ « Type d'entretien » en bouton cyclique

## Contexte

Sur la page Saisie (`src/routes/saisie.tsx`), le champ « Type d'entretien » est actuellement un groupe de trois boutons radio (lignes 2444-2467). Les valeurs stockées sont les chaînes FR définies dans `MAINTENANCE_OPTIONS` (lignes 189-193) :

```
"Entretien usuel uniquement"
"Réglages personnalisés"
"Modifications importantes"
```

Les libellés EN sont dans `MAINTENANCE_LABELS_EN` (lignes 198-202). `RefreshCw` est déjà importé (ligne 3) et utilisé par le bouton cyclique « Touches » (ligne 2740), qui sert de modèle visuel.

## Changement

Remplacer le groupe de radio (lignes 2444-2467) par un bouton cyclique unique, sur le même modèle que le bouton « Touches : Toutes/Blanches/Noires » :

- Icône `RefreshCw size={14} strokeWidth={2.5}` puis texte de l'option active.
- Classes identiques au bouton Touches : `flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 !text-[0.84rem] font-bold text-muted-foreground transition-colors hover:bg-accent`.
- `type="button"`, `data-pdf-hide` pour ne pas apparaître dans le PDF.

### Logique de cycle au clic

Calculer l'index courant dans `MAINTENANCE_OPTIONS` à partir de `info["entretien"]`, puis passer au suivant (modulo 3). Au 3ᵉ clic (Option 3), retour à l'Option 1.

```ts
const nextMaintenance = () => {
  const current = MAINTENANCE_OPTIONS.indexOf(info["entretien"] ?? MAINTENANCE_OPTIONS[0]);
  const next = MAINTENANCE_OPTIONS[(current + 1) % MAINTENANCE_OPTIONS.length];
  updateInfo("entretien", next);
  if (next === "Modifications importantes") {
    setTimeout(() => remarquesRef.current?.focus(), 0);
  }
};
```

### Affichage bilingue

- FR : `Type d'entretien : <option FR>`
- EN : `Maintenance type: <option EN>`

L'option affichée se lit via `MAINTENANCE_LABELS_EN` en mode anglais.

### Sécurité des données

`updateInfo("entretien", next)` alimente exactement la même clé `info["entretien"]` qu'avant. Le payload d'export (`type_entretien: info["entretien"]`, ligne 1531) et le CSV (`"Type d'entretien": info["entretien"]`, ligne 1553) restent inchangés. La condition `remarquesRequired` (ligne 787) continue à se déclencher sur `"Modifications importantes"`, et le focus automatique sur `remarquesRef` est préservé.

### Libellé de cadre

Le `<span>` « Type d'entretien » / « Maintenance type » reste à gauche du bouton, dans le conteneur `FIELD_LABEL_CLASS` existant.

## Validation

- `bunx tsgo --noEmit`
- `curl -sf -o /dev/null http://localhost:8080/saisie && echo OK`
- Build global (`build OK` dans `/tmp/observability/build-errors.log`)

## Point d'historique

Création d'un backup `.lovable/backup/<timestamp>` avant application (convention projet).
