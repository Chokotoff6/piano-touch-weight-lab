# Synchroniser le code vers GitHub

La synchronisation du code est une action de niveau workspace : elle ne peut pas être déclenchée depuis l'agent, elle se fait en quelques clics dans l'éditeur Lovable. Voici la marche à suivre exacte, puis ce que je peux vérifier ensuite.

## Étapes à faire de votre côté

1. Fermez le panneau « Plus » (croix en haut à droite).
2. Dans la barre de chat en bas, cliquez sur le bouton **+** (Plus) → **GitHub** → **Connect project**.
3. Autorisez l'application GitHub Lovable sur le compte **Chokotoff6** (fenêtre GitHub qui s'ouvre).
4. De retour dans Lovable, choisissez le compte/organisation **Chokotoff6** puis cliquez sur **Create Repository**.
5. Lovable crée le dépôt et pousse tout le code actuel. La synchro devient ensuite bidirectionnelle et automatique.

## Rendre le dépôt public (optionnel)

Le dépôt est créé en privé par défaut. Sur GitHub : dépôt → **Settings** → bas de page **Danger Zone** → **Change repository visibility** → **Make public**.

Audit sécurité déjà effectué : aucun secret en dur dans le code, `.env` ignoré et retiré du suivi git, sécurité de la base assurée par les politiques RLS. Le passage en public est sans danger.

## Ce que je fais après

- Vous me dites « c'est connecté » (ou vous collez le message d'erreur éventuel).
- Je vérifie l'état côté projet et je diagnostique tout blocage (échec OAuth, permissions d'organisation, nom de dépôt déjà pris).
- Si besoin, j'ajoute un `README.md` propre et une licence au dépôt avant que vous le rendiez public.

## Note technique

Aucun changement de code n'est nécessaire pour cette opération. Les remotes git visibles côté agent pointent toujours vers le stockage interne Lovable, y compris quand la synchro GitHub est active : ce n'est donc pas un indicateur fiable. Le statut « Connected » dans le menu Plus (+) → GitHub fait foi.
