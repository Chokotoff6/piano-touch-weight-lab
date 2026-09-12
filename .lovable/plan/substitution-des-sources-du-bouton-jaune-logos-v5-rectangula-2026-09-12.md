# Substitution des sources du bouton jaune (logos v5 rectangulaires)

## Contexte vérifié

Images uploadées (`LOGO_SOUTENIR_05_def.png`, `LOGO_SUSTAIN_05_def.png`) :
rectangulaires 1852×677 px, ratio ≈ 2,73:1, **sans** marge transparente latérale.
À `height: 40px`, le navigateur calculera `width ≈ 109 px`.

État actuel (`src/routes/__root.tsx` lignes 39-40, 541-561) :
- imports : `image_N48Ks9.png` (FR) / `image_DVGujN.png` (EN) — versions carrées précédentes.
- bouton ET image bloqués à `width: 95px` / `height: 40px`.
- `overflow-visible`, `rounded-none`, `p-0`, classe `liked-breathing`.
- conteneur : `translate-y-[16px]`, fondu `duration-[2000ms]`, délai 5 s via `likedFadeTimer`.

## Étapes

1. **Créer deux pointeurs CDN** depuis `/mnt/user-uploads/` :
   - FR → `src/assets/image_soutien_v5.png.asset.json` (depuis `LOGO_SOUTENIR_05_def.png`)
   - EN → `src/assets/image_sustain_v5.png.asset.json` (depuis `LOGO_SUSTAIN_05_def.png`)
   via `lovable-assets create --file ... --filename ...`.

2. **Mettre à jour les imports** (lignes 39-40) vers les nouveaux pointeurs.

3. **Forcer la largeur automatique** sur le bouton et l'image (lignes 548-559) :
   - Bouton `style` : `height: 40px` seul (supprimer `width: 95px`).
   - Bouton `className` : retirer `w-[95px]`, garder `w-auto shrink-0`.
   - Image `style` : `height: 40px`, `width: "auto"`, `maxWidth: "none"`.
   - Garder `object-contain liked-breathing`, `overflow-visible`, `rounded-none`, `p-0`.

4. **Ne pas toucher** au reste :
   - `translate-y-[16px]` (position verticale actuelle conservée — le brief mentionne « 2px » mais la valeur réelle en code est 16 px ; on conserve strictement la position existante).
   - `translate-x-[50px]` du sélecteur FR/EN.
   - délai 5 s (`likedFadeTimer`), fondu 2 s (`duration-[2000ms]`).
   - animation `liked-breathing` + `transform-origin: center center` (déjà dans `src/styles.css`).
   - visibilité limitée à `/resultats` et `/comparer`.

5. **Valider** : typecheck + build + contrôle visuel que le rectangle jaune affiche son texte complet sans rognage latéral.

## Risque / note

Si le brief « décalage vertical de 2px » signifie réellement remplacer 16 px par 2 px (et non « conserver l'existant »), préciser avant exécution — le plan conserve la valeur actuelle 16 px par défaut.
