# Écriture cloud bloquée : « record "new" has no field "ville" »

## Ce que dit ce message

Ce texte n'est pas produit par l'application : c'est un message renvoyé par
votre base de données de production elle-même. Une automatisation interne
(déclencheur) attachée à la table des profils de pianos utilise encore les
anciens noms de colonnes (`ville`, et probablement `pays`, `remarques`,
`mesure_date`). Depuis votre renommage manuel, cette automatisation cherche un
champ qui n'existe plus et fait échouer tout enregistrement.

## Vérification déjà faite côté application

Le code de l'application a été entièrement réaligné : plus aucun envoi ne
contient `ville`, `pays`, `remarques` ni `mesure_date`. Lecture, écriture,
graphiques de la page Comparer et import CSV utilisent uniquement
`city`, `country`, `remarks`, `measurement_date`, plus `who` pour le filtre
« QUI ». Le blocage ne vient donc plus du code.

## Ce que je propose

1. Identifier l'automatisation fautive sur la table des profils de pianos
   (liste des déclencheurs et du code des fonctions associées).
2. Réécrire cette fonction avec les nouveaux noms de colonnes, sans rien
   changer d'autre à son comportement.
3. Refaire un essai d'enregistrement depuis la page Résultats pour confirmer
   que l'écriture passe.

## Point important : je n'ai pas la main sur cette base

Les profils de pianos sont hébergés sur votre projet de production externe.
Mes outils de base de données ne s'appliquent qu'au backend interne de
l'application, pas à ce projet-là. Je peux donc préparer la commande SQL
exacte à coller dans l'éditeur SQL de votre projet externe, mais je ne peux
pas l'exécuter moi-même.

Pour préparer cette commande correctement, j'ai besoin du contenu actuel du
déclencheur. Deux options :

- Vous me collez le résultat de cette requête, exécutée dans votre projet
  externe :

```sql
select t.tgname, pg_get_functiondef(t.tgfoid)
from pg_trigger t
where t.tgrelid = 'public.piano_profiles'::regclass
  and not t.tgisinternal;
```

- Ou vous me donnez un accès en lecture au schéma de ce projet.

## Détails techniques

- Aucun changement de code applicatif n'est nécessaire : le renommage est déjà
  complet et le build est validé.
- Correctif attendu : un `CREATE OR REPLACE FUNCTION` remplaçant les
  références `NEW.ville` / `NEW.pays` / `NEW.remarques` / `NEW.mesure_date`
  par `NEW.city` / `NEW.country` / `NEW.remarks` / `NEW.measurement_date`.
- Si le déclencheur s'avère obsolète, une suppression pure et simple est
  également envisageable, à décider après lecture de son contenu.
