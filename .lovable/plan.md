# Comparer : « 1/5 » et moyennes Cloud identiques au piano actuel

## Ce que montre la vérification (faite en base, pas supposée)

Deux causes distinctes, aucune n'est un bug de calcul des moyennes.

**1. Les fiches de démonstration ne sont pas comptées parce que le Mode démo est désactivé dans votre navigateur.**
Le piano affiché est votre vrai piano (YAMAHA U3 2021, SN 6524444), pas le jumeau de démo. Mode démo éteint = toutes les fiches marquées « démo » sont masquées volontairement. En base il reste exactement **5 fiches réelles** (hors lignes de travail) — d'où le « 1/5 ». Les 109 U3 de démonstration existent bien, mais hors périmètre.

**2. La moyenne Cloud colle au piano actuel parce qu'il existe un vrai doublon en base.**
La fiche `85b53a2d…`, numéro de série **652444** (un chiffre de moins que 6524444), contient les **88 valeurs strictement identiques** à celles du piano affiché. L'exclusion se fait sur l'égalité exacte du numéro de série, donc ce doublon passe au travers et constitue à lui seul toute la moyenne Cloud.

## Sur votre proposition SQL (passer demo = false sur les DEMO-U3-%)

Déconseillé : cela ne corrige pas la cause n°2 (le doublon resterait dans la moyenne) et cela détruit définitivement l'étanchéité démo/réel que nous venons de construire — vos 109 fiches fictives se mélangeraient pour toujours à vos vrais pianos d'atelier, y compris dans les rapports. Le même résultat s'obtient sans risque en réactivant le Mode démo (bouton noir). Si le Mode démo n'apparaît plus, c'est qu'il a été quitté pour la session ; le plan prévoit un moyen de le réarmer.

## Corrections proposées

### A. Bannir les clones du piano actuel (code)
Dans `src/routes/comparer.tsx`, écarter côté client toute fiche dont les mesures sont identiques au piano actuel : comparaison des séries `wa_values` et `wd_values` ; en complément, exclusion des numéros « voisins » (comparaison sur les seuls chiffres, un numéro contenu dans l'autre = même piano). Les exclusions existantes (ligne tampon, `is_buffer`, numéro exact) restent inchangées.

### B. Rendre le périmètre lisible (affichage)
Le compteur « 1/5 pianos de modèle identique sur le Cloud » précise « hors fiches démo » / « démo incluses » selon l'état du Mode démo.

### C. Réarmer le Mode démo
Si le bouton noir a été quitté, prévoir un moyen simple de le réactiver (bouton réaffiché depuis la page Comparer, ou remise à zéro du drapeau de session) pour revoir l'échantillon de 109 U3 sans toucher à la base.

### D. Nettoyage base (à votre main, hors code)
Les fiches doublons `85b53a2d…` (SN 652444) et `f6db4bed…` (SN 6524444) sont des enregistrements parasites identiques à votre piano. Je peux fournir le `DELETE` ciblé sur ces deux identifiants si vous le voulez.

## Détails techniques

- Aucune modification de `cloud-gate.ts`, `demo-scope.ts`, ni du chemin d'écriture Supabase.
- Fichiers touchés : `src/routes/comparer.tsx` (filtre client après `result.data`, texte du compteur) et, pour le point C, le bouton du Mode démo.
- Contrôle de type et build lancés après modification.
