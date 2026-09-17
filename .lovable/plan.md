# Diagnostic filtres Comparer + alignement 100 % anglais des fiches démo

## 1. Pourquoi la page affiche « aucune donnée Cloud »

La cause principale n'est **aucun** de vos cinq filtres manuels. La requête Cloud
applique toujours, avant tout filtre :

```
.eq("model", mine.model)          // modèle du piano en cours de saisie
.neq("serial_number", mine.serialNumber)
.neq("id", <ligne tampon>)
+ scopeDemo()                      // demo=true visible seulement en Mode démo
```

Les 108 fiches démo sont toutes `brand = YAMAHA`, `model = U3`. Elles ne
ressortent donc que si le piano saisi à l'écran a **exactement** `model = "U3"`
**et** que le Mode démo est encore actif (bouton noir non cliqué). Vos 3 fiches
réelles sont K-500, A114, D-274 : avec l'une d'elles à l'écran, l'échantillon est
vide quoi que fassent les filtres.

## 2. Valeurs du CSV réellement rejetées ou ignorées

| Colonne | Valeur CSV (demo=true) | Statut vis-à-vis du code |
|---|---|---|
| usage_level | Low / Medium / Intensive | OK (`.eq`, casse exacte) |
| maintenance_type | Standard maintenance only / Custom regulations / Major modifications | OK |
| climate_zone | Dry / Humid / Standard | OK ; `Standard` n'est filtré que si le piano courant est « Standard » |
| who | Pro / Particulier | Fonctionne (filtre côté client par sous-chaîne) mais « Particulier » est du français |
| manufacture_year | 2020 / 2024 | OK — le tri « moins de 5 ans » utilise **manufacture_year**, pas measurement_date |
| type_piano | Droit | Jamais utilisé par un filtre, mais français |
| country / city | Japon, Etats-Unis / — | Français, non filtré |
| remarks | « Données virtuelles d'étalonnage métrologique. » | Français, non filtré |

Aucune valeur n'est donc « coincée » au sens d'un rejet SQL : le blocage vient du
verrou `model`.

## 3. Critère d'âge

`youngOnly` fait `manufacture_year >= annéeCourante - 5`, soit `>= 2021` en 2026.
Les fiches démo 2024 passent, les 2020 sont exclues : le jeu de données est déjà
correct. `measurement_date` (2024-09-17 / 2020-09-17) n'intervient pas dans l'âge,
uniquement dans l'affichage ; elle reste cohérente, rien à corriger côté dates.

## 4. Ce que je propose de faire

**A. SQL (à exécuter par vous sur votre base de production, `demo = true` uniquement)**
— traduction intégrale : `type_piano` → `Upright`, `country` Japon → `Japan`,
Etats-Unis → `United States`, `who` Particulier → `Private owner` (Pro inchangé),
`remarks` → « Virtual metrological calibration data. ». Aucune ligne
`demo = false` touchée.

**B. Code (`src/routes/comparer.tsx`) — une seule modification**
Rendre l'échantillon Cloud atteignable en Mode démo : quand le Mode démo est
actif et que le piano courant n'a pas de modèle renseigné, ne pas appliquer le
verrou `.eq("model", …)`. Aucun autre filtre, aucun style, aucun texte modifié.
Le filtre QUI reconnaîtra `Private owner` comme particulier et `Pro` comme pro,
sans changement de code.

## 5. Script SQL chirurgical

```sql
update public.piano_profiles set type_piano = 'Upright' where demo = true;
update public.piano_profiles set country = 'Japan' where demo = true and country = 'Japon';
update public.piano_profiles set country = 'United States' where demo = true and country = 'Etats-Unis';
update public.piano_profiles set who = 'Private owner' where demo = true and who = 'Particulier';
update public.piano_profiles set remarks = 'Virtual metrological calibration data.' where demo = true;
```

(`usage_level`, `climate_zone`, `maintenance_type`, `city`, `manufacture_year`,
`measurement_date` sont déjà conformes — aucune requête nécessaire.)

## 6. Détails techniques

- `scopeDemo()` ajoute `or(demo.is.null,demo.eq.false)` hors Mode démo : une fois
  le bouton noir cliqué, les 108 fiches disparaissent — comportement voulu, inchangé.
- La ligne tampon (`is_buffer = true`, id `00000000-…`) porte encore
  `maintenance_type = 'Modifications importantes'` et `type_piano = 'Droit'` :
  c'est une fiche réelle (`demo = false`), je n'y touche pas.
