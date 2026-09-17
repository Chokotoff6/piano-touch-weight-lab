# Débloquer l'échantillon Cloud en Mode démo (aligné sur l'export CSV du 17/09)

## Ce que montre le nouvel export

- 109 fiches `demo = true`, toutes **YAMAHA / U3 / Upright**, années 2020 et 2024,
  `usage_level` Low·Medium·Intensive, `climate_zone` Dry·Humid·Standard,
  `maintenance_type` Standard maintenance only · Custom regulations · Major modifications,
  `who` Private owner · Pro. Tout est conforme au code de filtrage : aucune valeur n'est rejetée.
- Ligne tampon démo `…0001` (is_buffer, demo = true) bien présente.
- Ligne tampon réelle `…0000` : YAMAHA U3 mais encore `type_piano = Droit`,
  `climate_zone = 1`, `maintenance_type = Entretien usuel uniquement`, `demo` vide.

## Le vrai blocage restant

Le « piano courant » de la page Comparer n'est **pas** lu en base : il vient du
stockage local du navigateur, alimenté par le Mode démo. Or le piano de démo de
l'application est encore un **YAMAHA « C3 (démo) », Queue, 1998, climat « EU »**.
La requête Cloud fait `.eq("model", mine.model)` → `model = 'C3 (démo)'` → 0 fiche,
et si le filtre Climat est coché → `climate_zone = 'EU'` → 0 fiche. D'où le message
d'absence de données quels que soient les filtres.

## Modifications

### 1. `src/lib/demo-mode.ts` — piano de démo aligné sur la base
`DEMO_INFO` devient le jumeau exact de la ligne tampon démo `…0001` :

| champ | valeur |
|---|---|
| marque | YAMAHA |
| modèle | U3 |
| type_piano | Upright |
| sn_num | 652444 |
| fabrication | 2020 |
| pays / ville | Belgium / Brussels |
| entretien | Standard maintenance only |
| usage_level | Medium |
| climat (buildCurrentPiano) | Standard |
| remarques | Virtual demonstration piano profile. |

Ainsi `model = 'U3'`, `climate_zone = 'Standard'` et `manufacture_year = 2020`
matchent l'échantillon démo, et les cinq filtres manuels réagissent :
Usage (Low/Medium/Intensive), Modifications importantes (Major modifications),
QUI (Pro / Private owner), Climat (Standard), Âge (< 5 ans → ne garde que les 2024).

### 2. `src/routes/comparer.tsx` — exclusion de toutes les lignes tampon
Remplacer `.neq("id", CURRENT_PIANO_BUFFER_UUID)` par une exclusion des lignes
tampon (`.neq("is_buffer", true)` + exclusion de l'id tampon), pour que la
nouvelle ligne `…0001` ne soit jamais comptée dans la moyenne Cloud ni dans le
compteur global.

Aucune autre ligne de filtre n'est touchée : le code envoie déjà exclusivement
les termes anglais (`Low`/`Medium`/`Intensive`, `Dry`/`Humid`,
`Major modifications`) et l'âge repose sur `manufacture_year >= 2021`.

### 3. Étanchéité — inchangée
`scopeDemo()` continue d'ajouter `or(demo.is.null,demo.eq.false)` hors Mode démo :
dès le clic sur le bouton noir, les 109 fiches disparaissent et seules vos fiches
d'atelier restent (dont le KAWAI `…0000`).

## Complément SQL facultatif (à exécuter de votre côté)

Pour aligner aussi la ligne tampon réelle sur la charte anglaise :

```sql
update public.piano_profiles
set type_piano = 'Upright',
    climate_zone = 'Standard',
    maintenance_type = 'Standard maintenance only'
where id = '00000000-0000-0000-0000-000000000000';
```

## Validation
Build vérifié après modification (`tsgo --noEmit` + build), puis contrôle à
l'écran : Mode démo actif → l'échantillon Cloud affiche un nombre de fiches non nul
et réagit à chacun des cinq filtres.
