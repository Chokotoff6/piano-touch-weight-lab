# Corriger l’accès à Résultats après la cascade du Mode Démo

## Diagnostic confirmé
- Il n’existe pas de `src/routes/mesures.tsx` : l’écran Mesures est géré dans `src/routes/saisie.tsx`.
- Les 88 touches sont bien prises en compte. À la fin de la cascade, `rows` contient les 88 binômes ; `keyboardValid`, puis `badgeVisible` et `gateReady`, sont recalculés normalement.
- `ptw_cloud_profile_saved` n’est pas la cause : ce drapeau sert uniquement à verrouiller l’identité après un véritable enregistrement accepté.
- Le blocage vient du contrôle anti-robot destiné aux saisies réelles : la cascade remplit 88 touches en environ 7,5 secondes, puis `decideCloudAction()` exige soit 45 secondes pour une nouvelle fiche, soit au moins 1,2 seconde par touche modifiée.
- Le bouton du bas reçoit donc `blocked`, appelle `resetConsent()` et ne navigue pas. Ce reset retire aussi `compareUnlocked` et redémarre le chronomètre ; le clic suivant sur « Résultats » ouvre alors la page, qui reproduit immédiatement le blocage temporel et affiche l’alerte observée.

## Correctif
- Dans `src/routes/saisie.tsx`, lorsque le Mode Démo est actif et que la saisie est conforme, contourner uniquement la décision d’écriture Cloud et naviguer directement vers Résultats.
- Dans `src/routes/resultats.tsx`, reconnaître explicitement le Mode Démo : ne lancer ni le contrôle temporel ni la demande de partage, conserver les graphiques visibles et rétablir l’accès à Comparer si un ancien clic bloqué avait effacé ce jalon.
- Ne pas modifier `cloud-gate.ts` : ses protections restent intégralement actives pour les vrais pianos et les saisies d’atelier.
- Ne pas marquer `ptw_cloud_profile_saved` en Mode Démo et ne déclencher aucune écriture Cloud.

## Validation
- Tester une session Mode Démo neuve jusqu’à la fin de la cascade, puis les deux accès à Résultats.
- Vérifier que les 88 touches, les moyennes et les courbes sont présentes, sans alerte de partage.
- Vérifier les types TypeScript et le build.
