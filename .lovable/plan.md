# Comparer : « 1/5 » et moyennes Cloud identiques au piano actuel

## Ce que montre la vérification (faite en base, pas supposée)

Deux causes distinctes, aucune n'est un bug de calcul des moyennes.

**1. Les fiches de démonstration ne sont pas comptées parce que le Mode démo est désactivé dans votre navigateur.**
Le piano affiché à l'écran est votre vrai piano (YAMAHA U3 2021, SN 6524444), pas le jumeau de démo. Quand le Mode démo est éteint, l'application masque volontairement toutes les fiches marquées « démo » : il ne reste que les fiches réelles. En base il y a exactement **5 fiches réelles** (hors lignes de travail) — d'où le « 1/5 ». Les 109 U3 de démonstration sont bien là, mais hors périmètre.

**2. La moyenne Cloud colle au piano actuel parce qu'il existe un vrai doublon en base.**
La fiche `85b53a2d…`, numéro de série **652444** (un chiffre de moins que 6524444), contient les **88 valeurs strictement identiques** à celles du piano affiché. C'est une copie de votre piano enregistrée avec un numéro tronqué. L'exclusion actuelle se fait sur l'égalité exacte du numéro de série, donc « 652444 » passe au travers et devient, à lui seul, toute la moyenne Cloud.

## Corrections proposées

### A. Bannir les clones du piano actuel (code)
Dans `src/routes/comparer.tsx`, après la requête Cloud, écarter côté client toute fiche dont les mesures sont identiques au piano actuel :
- comparaison des séries `wa_values` et `wd_values` avec celles du piano affiché ; si les deux sont identiques longueur et valeurs, la fiche est retirée de l'échantillon ;
- en complément, exclusion des numéros de série « voisins » : comparaison sur le numéro réduit à ses chiffres, un numéro contenu dans l'autre est considéré comme le même piano.
Les exclusions déjà en place (ligne tampon, `is_buffer`, numéro exact) restent inchangées.

### B. Rendre le périmètre lisible (code, affichage seulement)
Le compteur « 1/5 pianos de modèle identique sur le Cloud » gagne une mention de périmètre : « (hors fiches démo) » / « (démo incluses) » selon l'état du Mode démo, pour qu'on comprenne immédiatement pourquoi l'échantillon est petit.

### C. Nettoyage base (à votre main, hors code)
La fiche doublon `85b53a2d…` (SN 652444) et éventuellement `f6db4bed…` (SN 6524444, également identique au piano actuel) sont des enregistrements parasites de vos propres essais. Je peux vous fournir le `DELETE` ciblé sur ces deux identifiants si vous le souhaitez — je ne touche pas à votre base sans votre accord.

## Détails techniques

- Aucune modification de `cloud-gate.ts`, `demo-scope.ts`, ni du chemin d'écriture Supabase.
- Fichier touché : `src/routes/comparer.tsx` (filtre client après `result.data`, texte du compteur).
- Contrôle de type et build lancés après la modification.
