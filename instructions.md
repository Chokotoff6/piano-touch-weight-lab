# Instructions du projet

1. **ARCHITECTURE PROPRE** : Le site est une application React organisée en 3 pages distinctes gérées par un routeur. Ne crée aucune page, section ou onglet supplémentaire non demandé.

2. **CONSERVATION DE L'EXISTANT** : Ne modifie, ne déplace et ne supprime JAMAIS le design Tailwind, la logique de calcul ou les composants des étapes précédentes à moins que je ne te le demande explicitement.

3. **CODE MINIMALISTE ET EXÉCUTION DIRECTE** : Écris un code concis, robuste et performant. Refuse toute initiative esthétique superflue. Reste concentré à 100% sur le prompt fourni.

4. **GESTION DES ERREURS** : Gère proprement l'absence de données (tiret "-" discret) sans jamais générer de crash JavaScript ou d'écran blanc.

5. **RALENTISSEMENTS** : Détecte-les et suggère-moi la création d'un nouveau chat si la base de code devient trop lourde.

## Contexte global du projet

Le site comportera 3 pages (Accueil, Saisie, Résultats), un moteur de classification climatique, un moteur de datation par numéro de série éclaté et de détection de profil d'usine, une base Supabase collaborative, un graphique de comparaison avec filtres adaptatifs, un feature flipping premium, et une option française.

## Note technique

Le routeur du projet est TanStack Router (routes dans `src/routes/`), imposé par la stack ; il remplit le même rôle que react-router-dom.
