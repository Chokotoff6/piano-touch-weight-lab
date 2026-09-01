# Piano Touch Analyzer

Je souhaite créer une application web d'évaluation du touchweight statique pour piano. Je ne sais pas coder, tu dois générer tout le code proprement. Pour économiser mes tokens, applique directement cette structure chirurgicale sans fioritures :

1. TEXTE D'INTRODUCTION (Tout en haut, sobre et neutre) :

"Bienvenue sur l'outil d'évaluation du touchweight statique pour piano. Cet outil permet de consigner les mesures de poids ascendant (Wa) et descendant (Wd) afin de calculer la friction et la balance mécanique de chaque touche.

Mode d'emploi :

1. Placez le curseur sur la case 'Wa' de la première touche.

2. Saisissez la valeur en grammes, puis appuyez sur 'Entrée' : le curseur descend sur la case 'Wd' de la même touche.

3. Saisissez la valeur 'Wd', puis appuyez sur 'Entrée' : le curseur se déplace sur la case 'Wa' de la touche suivante."

2. BLOC INFORMATIONS GÉNÉRALES :

Ajoute des champs textuels simples pour : Date, Marque, Modèle, Numéro de série (SN), Date de fabrication, et Remarques. Ajoute un bouton 'RESET' pour vider la grille.

3. STRUCTURE DE LA GRILLE (Le Clavier de Piano Réaliste) :

- Sépare les 88 touches en deux sections horizontales avec défilement automatique : Section 1 (touches 1 à 51) et Section 2 (touches 52 à 88).

- Chaque touche (de 1 à 88) doit former une colonne verticale stricte (width: 40px). De haut en bas, cette colonne contient :

  * Le numéro de la touche (ex: 4)

  * Une case de saisie (input) épurée pour 'Wa'

  * Une case de saisie (input) épurée pour 'Wd'

  * Une zone d'affichage pour la Friction = (Wd - Wa) / 2

  * Une zone d'affichage pour la Balance = (Wd + Wa) / 2

  * Le dessin de la touche tout en bas :

    - Si la touche est BLANCHE : Un rectangle CSS blanc (width: 40px, height: 120px, bordure grise).

    - Si la touche est NOIRE : Un rectangle CSS noir (width: 24px, height: 80px, positionné en chevauchement z-index entre les blanches selon la vraie logique d'un clavier de piano).

4. ITINÉRAIRE AUTOMATIQUE DU CURSEUR (Navigation au clavier) :

Intercepte la touche 'Entrée' sur les cases de saisie :

- Si l'utilisateur valide 'Wa' de la touche X -> Déplace automatiquement le focus sur 'Wd' de la touche X.

- Si l'utilisateur valide 'Wd' de la touche X -> Déplace automatiquement le focus sur 'Wa' de la touche X+1.

Génère uniquement ce premier prototype d'affichage fonctionnel de manière ultra-légère.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://piano-touch-weight-lab.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4aaccbe3-034b-429f-b8ee-2a6de2ca3a15).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
