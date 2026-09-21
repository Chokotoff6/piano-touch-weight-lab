# Analyse : pourquoi la courbe Cloud reste vide sur Comparer

## 1. La fonction `get_model_averages` n'existe pas — et n'est pas utilisée

Vérifications faites :

- Aucune occurrence de `get_model_averages` ni d'aucun appel `rpc(...)` dans tout le dossier `src/`.
- L'appel REST `POST /rpc/get_model_averages` sur la base cloud répond **404** : la fonction stockée n'existe pas dans la base.

La moyenne communautaire est calculée **côté application** : une lecture directe de la table `piano_profiles`, filtrée puis moyennée en JavaScript dans `src/routes/comparer.tsx`. Il n'y a donc aucun conflit possible entre une fonction SQL et la colonne `climate_zone`.

## 2. Les règles d'accès (RLS) ne bloquent rien

Lecture anonyme de `piano_profiles` : **HTTP 200, 115 fiches renvoyées**, toutes colonnes lisibles (`climate_zone`, `demo`, `is_buffer`, `wa_values`…). L'accès en lecture fonctionne normalement.

## 3. Cause réelle : il ne reste aucune fiche comparable hors Mode démo

Contenu réel de la base (115 lignes) :

| Modèle | demo | tampon | nombre |
|---|---|---|---|
| U3 | true (démo) | non | 108 |
| U3 | true (démo) | oui | 1 |
| U3 | — | non | 1 |
| K-500 | — | non | 1 |
| K-500 | false | oui (tampon …0000) | 1 |
| 200, D-274, A114 | — | non | 1 chacun |

Hors Mode démo, l'application ne garde que `demo = false` ou nul : il reste **6 fiches réelles, toutes de modèles différents**.

La requête des moyennes exige `model = modèle du piano courant`, puis écarte :
- la ligne tampon …0000 et toute ligne `is_buffer = true` ;
- le numéro de série du piano courant et du piano local ;
- toute fiche dont les 88 valeurs wa **et** wd sont identiques au piano courant (anti-doublon).

Pour un K-500, la seule autre fiche K-500 de la base est `serial 2752801`, avec exactement les mêmes mesures que le tampon K-500 — donc reconnue comme le même piano et écartée. Résultat : **0 fiche retenue → aucune moyenne → courbe orange absente**. Même situation pour tous les autres modèles : il n'existe qu'un seul exemplaire réel de chacun.

Ce n'est pas une régression de code : c'est l'effet du cloisonnement démo/réel mis en place récemment (les 108 fiches U3 qui alimentaient les moyennes sont marquées `demo = true` et deviennent invisibles dès que le Mode démo est sur OFF).

## 4. Incohérence secondaire confirmée (à corriger séparément)

La charte impose un stockage 100 % anglais, mais des fiches réelles portent encore des libellés français : `maintenance_type = "Modifications importantes"`, `"Entretien usuel uniquement"`. Le filtre de la page compare à `"Major modifications"` : le filtre « modifications importantes » ne peut donc jamais correspondre sur ces fiches.

## 5. Point non confirmé : l'import CSV

Le tracé issu d'un fichier CSV suit un chemin totalement indépendant du cloud (aucune requête base). L'analyse du lecteur CSV n'a révélé aucune rupture liée aux renommages de colonnes. Le fait qu'un K-500 importé ne s'affiche pas n'est donc **pas expliqué à ce stade** et demande une reproduction dans le navigateur avec le fichier concerné avant tout correctif.

## Étapes proposées (à votre validation)

1. Reproduire l'import CSV du K-500 dans le navigateur et relever l'erreur exacte (fichier rejeté, ou courbe filtrée à l'affichage).
2. Choisir la règle de repli quand aucune fiche comparable n'existe : afficher un message explicite « aucune fiche comparable pour ce modèle » à la place d'un cadre vide silencieux.
3. Décider si la comparaison doit pouvoir s'élargir (même marque, ou tous modèles) quand le modèle exact n'a aucun voisin.
4. Uniformiser en anglais les valeurs `maintenance_type` encore en français dans la base.

Aucun fichier n'est modifié tant que ces points ne sont pas tranchés.
