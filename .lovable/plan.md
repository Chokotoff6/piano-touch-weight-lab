# Corrections visuelles de la grille piano

## Objectif
Appliquer les six ajustements demandés sans modifier la structure, les calculs ni la navigation au clavier.

## Modifications
- Limiter les séparations noires Si/Do et Mi/Fa à la zone supérieure (numéro, Wa, Wd) ; conserver des séparateurs fins uniformes dans Friction et Balance.
- Garantir un fond blanc propre sous chaque touche noire dans les rangées de résultats, avec seulement le trait central noir prévu.
- Donner à chaque champ Wa et Wd un rectangle blanc visible avec une fine bordure grise, sur touches blanches comme grises.
- Afficher et aligner les indicateurs Wa/Wd de façon identique au niveau de chaque champ.
- Retirer le libellé « Touche » de la colonne fixe.
- Mettre en graisse 900 les numéros des touches DO : 4, 16, 28, 40, 52, 64, 76 et 88.

## Vérification
Contrôler visuellement les deux sections, l’absence de débordement, les séparations, les fonds des résultats, les champs Wa/Wd et les huit repères DO.

## Détails techniques
- Ajouter un ensemble des touches DO dans le composant et une classe conditionnelle sur leur numéro.
- Ajuster les pseudo-éléments et bordures CSS existants sans changer les dimensions des colonnes.
