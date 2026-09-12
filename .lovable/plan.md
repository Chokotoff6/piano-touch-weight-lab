# Accueil, mode démo, FAQ flottante et mentions légales

Point de restauration créé avant toute modification.

## 1. Overlay unifié et lumineux

L'arrière-plan grisé de la fenêtre d'accord RGPD passe du gris foncé actuel à
un voile très léger `rgba(0,0,0,0.15)`. Les futures fenêtres flottantes FAQ
utilisent exactement le même voile.

## 2. Page d'accueil visible

La redirection automatique vers Saisie est supprimée : l'accueil redevient la
première page du site.

Contenu :
- Logo KeyWeight en filigrane plein écran, centré, couvrant, opacité 0.07,
  sans animation, texte parfaitement lisible par-dessus.
- Texte de présentation remplacé mot à mot par le texte fourni
  (« Bienvenue sur KeyWeight ! … Des FAQ dédiées à chaque module répondent à
  toutes les questions pratiques et techniques. »), en mise en page aérée :
  accroche, « Mon piano est-il trop dur ? », « 2 MODULES DE DIAGNOSTIC »,
  « FLEXIBILITÉ », puis la question finale.
- Bouton d'accès à la Saisie conservé.
- En bas au centre : lien discret « Mentions Légales » ouvrant une fenêtre
  avec le texte officiel intégral fourni (Édition, Hébergement, Propriété
  intellectuelle, Responsabilité).

Le long bloc FAQ actuellement en bas de l'accueil est déplacé dans la fenêtre
flottante FAQ (point 4).

## 3. Bouton MODE DÉMO

- Placé en haut de l'accueil, juste à droite du logo KEYWEIGHT, très visible.
- Bascule activable/désactivable, **activée par défaut** au premier
  chargement.
- Activé : un piano fictif complet (marque, modèle, année, numéro de série,
  ville, usage) et 88 pesées factices cohérentes sont chargés dans l'outil, de
  sorte que Résultats et Comparer affichent immédiatement des graphiques.
- Désactivé : les données de démonstration sont retirées et l'outil revient
  vierge.
- L'utilisateur reste sur l'accueil et navigue lui-même.

## 4. Bouton FAQ dans le Header

- Présent sur toutes les pages, placé à gauche de « EN | FR ».
- Ouvre une fenêtre flottante dont le contenu dépend de la page en cours :
  FAQ Accueil, Saisie, Résultats ou Comparer.
- Contenus : répartition des questions déjà écrites (grand bloc de l'accueil
  et encart Comparer) par page, plus un nouvel accordéon « Protection des
  données (RGPD) » avec le texte fourni dans la FAQ d'Accueil.

## 5. Design de la fenêtre flottante

- Fond blanc pur `#FFFFFF`, exactement 80 % de la largeur et 80 % de la
  hauteur de la page, contenu défilant en accordéons dépliables.
- Voile de fond `rgba(0,0,0,0.15)`, identique à l'accord RGPD.

## Détails techniques

- `src/routes/__root.tsx` : overlay RGPD `bg-black/15`, bouton FAQ à gauche du
  sélecteur de langue, montage de la fenêtre flottante FAQ via portail,
  détection de la page courante par `pathname`.
- `src/routes/index.tsx` : suppression du `redirect`, filigrane en
  `position: fixed` derrière le contenu, contenu FAQ extrait, footer
  « Mentions Légales » en modale.
- Nouveau `src/components/FaqDialog.tsx` : fenêtre flottante générique +
  contenus par page (accueil/saisie/resultats/comparer), FR/EN.
- Nouveau `src/lib/demo-mode.ts` : jeu de données fictif 88 touches, écriture
  dans les clés de brouillon déjà utilisées par Saisie
  (`DRAFT_ROWS_KEY`/`DRAFT_INFO_KEY`), drapeau d'activation persistant, actif
  par défaut.
- Le reste (exports PDF/CSV, Comparer, Cloud, logo de soutien) n'est pas
  touché. Typecheck et build vérifiés en fin d'exécution.

## Point à confirmer

Le texte exact de présentation de l'accueil n'a pas encore été fourni : le
texte existant est conservé provisoirement.
