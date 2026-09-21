# Comparer bloqué sur le K-500 en Mode démo — diagnostic et plan

Votre hypothèse est confirmée par le code. Elle explique le Cloud vide en Mode démo ; elle n'explique pas tout hors Mode démo (voir « Deuxième cause » plus bas).

## Cause confirmée : Comparer lit toujours la fiche tampon réelle

- `src/routes/comparer.tsx` charge le piano courant avec `loadCurrentPianoFromCloud()`.
- Dans `src/lib/current-piano.ts`, cette fonction lit **en dur** la ligne tampon `…0000`, c'est-à-dire le profil réel (KAWAI K-500). Le tampon de démonstration `…0001` (YAMAHA U3) porte un autre identifiant et n'est jamais lu.
- La fiche locale (`loadCurrentPiano()`) n'est utilisée qu'en secours, **si le cloud ne répond pas**. Or le Mode démo, lui, écrit bien le U3 dans le stockage local. Le cloud répondant toujours, le K-500 gagne systématiquement.
- Comparer n'écoute pas non plus l'évènement émis à l'activation du Mode démo : basculer ON pendant qu'on est sur la page ne déclenche aucun rechargement.

Conséquence : le bandeau et les courbes affichent un K-500, et la recherche de fiches communautaires porte sur « model = K-500 » alors que la base démo ne contient que des U3 → aucune moyenne, cadre vide.

## Plan théorique : une seule source de vérité, réévaluée dynamiquement

1. **Choisir le tampon selon l'état du Mode démo.** Là où Comparer lit aujourd'hui la ligne réelle, il lira la ligne `…0001` quand le Mode démo est ON, la ligne `…0000` quand il est OFF. Même règle que celle déjà utilisée par les pages Saisie et Résultats, pour que les trois pages ne puissent plus diverger.
2. **Repli local cohérent.** Si le tampon choisi est introuvable, on retombe sur la fiche du stockage local — qui contient déjà le bon piano dans les deux modes — au lieu de retomber silencieusement sur l'autre piano.
3. **Réaction à chaud.** Comparer s'abonnera à l'évènement de chargement du Mode démo, en plus des évènements déjà écoutés (focus, changement de stockage, retour d'onglet). Bascule ON/OFF → le bandeau, les courbes et la requête Cloud se rafraîchissent sans rechargement de page.
4. **Cohérence du filtre démo.** La règle « fiches de démo visibles seulement en Mode démo » reste inchangée ; elle s'appliquera simplement au bon modèle (U3 en démo, modèle réel sinon).

Aucun changement de base de données, aucune modification des règles d'accès ni du verrouillage des partages.

## Deuxième cause, indépendante : aucune fiche comparable hors Mode démo

Vérifié directement dans la base cloud (lecture anonyme, 115 fiches, accès normal) :

| Modèle | démo | tampon | nombre |
|---|---|---|---|
| U3 | oui | non | 108 |
| U3 | oui | oui | 1 |
| U3 | non | non | 1 |
| K-500 | non | non | 1 |
| K-500 | non | oui (tampon) | 1 |
| 200 / D-274 / A114 | non | non | 1 chacun |

Hors Mode démo il reste 6 fiches réelles, **toutes de modèles différents**. Pour un K-500, la seule autre fiche K-500 porte le même numéro de série et les mêmes 88 mesures que le piano courant : l'anti-doublon l'écarte, il reste 0 fiche → pas de moyenne. Ce n'est pas un bug de code, c'est le contenu actuel de la base.

À décider : afficher un message explicite « aucune fiche comparable pour ce modèle » plutôt qu'un cadre vide, et éventuellement élargir la recherche (même marque) quand le modèle exact n'a aucun voisin.

## Points annexes constatés

- La fonction stockée `get_model_averages` n'existe pas dans la base (réponse 404) et n'est appelée nulle part dans le code : les moyennes sont calculées dans l'application. Aucun conflit possible avec la colonne `climate_zone` ni avec les règles d'accès.
- Des fiches réelles portent encore des libellés français (`Modifications importantes`, `Entretien usuel uniquement`) alors que le filtre compare à l'anglais `Major modifications` : ce filtre ne peut jamais correspondre sur ces fiches. À uniformiser.
- L'import CSV suit un chemin totalement indépendant du Cloud. Rien d'anormal trouvé dans le lecteur de fichier ; si le K-500 importé ne s'affiche toujours pas après le correctif ci-dessus, il faudra le reproduire avec le fichier exact.

## Fichiers concernés par la correction

- `src/routes/comparer.tsx` — choix du tampon selon le mode, repli local, abonnement à l'évènement de démo.
- `src/lib/current-piano.ts` — paramétrage du tampon lu (si nécessaire pour éviter de dupliquer la règle).
