# Bannière Saisie à usage unique — diagnostic et correction du verrou

## Diagnostic (vérifié dans le navigateur, navigateur propre)

- **Aucune écriture parasite de la clé** `ptw_demo_banner_forever_dismissed` : au premier chargement propre, la clé est absente, la bannière **s'ouvre bien** (vérifié par test automatisé : `dialogs: 1`, clé écrite uniquement à l'ouverture). Le seul autre point d'écriture est la bascule Mode Démo ON (`demo-mode.ts`), conforme au cahier des charges.
- Le premier échec de reproduction venait d'un module périmé côté serveur de prévisualisation ; après rechargement, le comportement est correct.
- **Écart réel par rapport au cahier des charges** : `InfoDot.tsx` écrit le verrou `'true'` **au moment de l'ouverture** de la bannière, pas à sa fermeture. Conséquence : si la bannière s'ouvre sans que l'artisan la voie (navigation rapide, onglet en arrière-plan), elle ne réapparaîtra jamais. Le cahier des charges exige que le verrou ne soit posé **que** sur clic extérieur (fermeture volontaire) ou bascule du Mode Démo sur ON.

## Correction

1. **`src/components/InfoDot.tsx`** — pour `autoOpenForeverKey` uniquement :
   - À l'ouverture : vérifier le verrou, ouvrir si absent, **sans écrire** le verrou.
   - Écrire `localStorage.setItem(clé, "true")` **au moment de la fermeture** (clic extérieur, croix, ou fondu automatique), via le chemin `requestClose`.
   - Le comportement `autoOpenSessionKey` (autres pages) reste inchangé.
2. **`src/lib/demo-mode.ts`** — inchangé : l'écriture du verrou lors de la bascule ON est déjà en place et conforme.
3. **`src/routes/saisie.tsx`** — inchangé : aucune écriture de la clé n'y existe.

## Résultat attendu

- Premier chargement propre : clé absente → bannière affichée.
- Tant que l'artisan n'a pas fermé la bannière ni activé le Mode Démo, elle se représente à chaque visite de Saisie.
- Après une fermeture volontaire ou une bascule ON : verrou `'true'` → bannière jamais réaffichée ; le bouton MODE DÉMO et son « i » permanent prennent le relais.

## Vérifications

- Test automatisé navigateur propre : clé absente au landing, bannière visible ; fermeture → verrou écrit ; rechargement → bannière absente.
- Test sans fermeture : rechargement → bannière réaffichée (verrou non posé).
- Types TypeScript + build.
- Point de restauration `.lovable/backup/` avant modification.

## Détails techniques

- Fichier modifié : `src/components/InfoDot.tsx` (déplacement du `setItem` dans `requestClose` pour le mode `autoOpenForeverKey`).
- Aucune modification de `demo-mode.ts`, `saisie.tsx`, `__root.tsx`.
