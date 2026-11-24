<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep manufacturing-year regression checks outside the route directory and exercise the form validator with a controlled device clock, so test files never become application routes.

Les rendus Réel, Lissé (3 points) et Lissé+ (5 points) sont calculés localement dans `ComparisonChart`, partagé par Résultats et Comparer ; garder les données brutes intactes pour permettre le cycle et le mode rapide.
Le panneau de visibilité du zoom dépend explicitement des trois sources piano actuel, Cloud et Cible standard d'usine ; une comparaison CSV ne remplace pas Cloud dans cette règle.
Les étiquettes de fin des graphiques Recharts sont placées à partir des échelles réelles par d3-force, car Recharts 2 ne propose pas de moteur natif d'évitement des chevauchements.

- Convention Stanwood dans le code : wd = Poids descendant (lourd), wa = Poids remontant ; les colonnes base historiques wa_values/wd_values sont inversées et ne sont pontées qu'à la lecture/écriture (current-piano, demo-mode) — pour ne pas migrer la base.
- La cascade démo conserve les 88 pesées séparément du brouillon animé : le mode rapide efface ce brouillon et n'y réinjecte que les Do/Do#, il ne peut donc pas servir de source au retour en mode normal.
- Local .kw file is the source of truth for piano identity/history (src/lib/kw-file.ts); Cloud is an upload-only mirror — keeps the app usable offline.
- Cloud sync after .kw save / PDF export lives in src/lib/cloud-sync-queue.ts: local action first, silent push only for already-shared profiles (same day, <5 keys), offline payload queued in localStorage and replayed on the 'online' event — keeps the app usable offline.
- .kw files are written as version 2 with English canonical keys (brand, model, piano_type, year…), identity stored once at root and history_points holding only id/name/dates/rows; parseKwDocument converts v1 files and maps keys back to the UI form keys, so the rest of the app keeps using the existing form fields.
- Piano model catalog customizations (learned/added/removed models per brand and type) and the intervention-type list live in localStorage overlays (pianoModels.ts, interventions.ts) on top of factory lists — works offline and allows factory reset.

- Pure chart calculations (buildChartData, smoothing, factory ramp, chart types) live in src/lib/chart-data.ts, never exported from route files — keeps Vite Fast Refresh working.

- Tablet weighing layout lives in its own route (src/routes/saisie-tablette.tsx) sharing only the localStorage draft with /saisie; reuses keyboard CSS classes at native size scaled uniformly — keeps the desktop page untouched and the feature removable by deleting the file and its header link.
- Tablet physical and tactile entry use one local validation pipeline, with post-render focus requests and viewport-anchored feedback; desktop handlers remain untouched to avoid cross-page regressions.
- Tablet control dimensions use container-relative CSS with minimum touch sizes and horizontal toolbar overflow, so resizing changes actual controls without shrinking text below readable sizes.
- Tablet .kw import consumes the existing file-menu event and shared parser, retaining the parsed session document and updating the local draft without navigating, so partial measurements and instrument history remain intact.
- Keypad buttons retain the shared Button component with explicit full-row height utilities, so the default button height cannot constrain the tablet grid.
- Both weighing routes derive Dashboard access from the pure current-measurement validator in weighing-readiness; never use UI error caches or badge timers, so desktop, tablet and header stay consistent.
- Weighing feedback uses a browser-only lazy Web Audio context and session-scoped active-cell handoff, so offline audio and view changes require neither network calls nor screen detours.

- Automatic weighing views share the existing desktop session in place, with the desktop PDF engine off-screen and an explicit override reset only at the screen breakpoint — avoids navigation flashes and preserves offline history/export listeners.
- Weighing focus handoff stores an explicit null on deselection — prevents a cleared selection from being recreated on view changes.
- Analysis comparison buttons stay inline under Averages while Cloud filters open in a draggable non-modal FloatingPanel, with a permanently painted off-screen full settings mirror for PDF capture — keeps charts visible and exported settings complete.
- Octave labels use intrinsic text width outside the scaled keyboard, and Do-number size is compensated for the keyboard scale — keeps real visible margins balanced and the two marker lines equally readable.
- Client JS/CSS compile to Safari 15 / es2020 via vite.config.ts, because the target iPad Air 2 runs iOS 15.8 and rejects newer syntax such as class static blocks.
- Animations preference toggles an html 'no-anim' class plus JS checks (demo typing/cascade, home logo) via getPreferences().animations; default OFF on coarse-pointer devices so old tablets stay responsive.
- Full-view weighing columns render through MemoCell with a data signature and handlers read the latest state via a live ref; a pure check moves focus inside the input event, the state commit runs after paint and the blur skips re-validating that cell — keeps 2-digit entry and auto-advance instant on iPad Air 2.
- Octave view scale is solved from the fixed row width including the keypad width, never from a sibling-dependent measurement — prevents resize feedback loops.
- Weight-entry rules and their user messages (2-digit cleaning, ranges, PD > PR, pedal band, entry verdict, range/pedal/mechanical/incomplete texts) live only in src/lib/weighing-engine.ts and are imported by both weighing views — one change applies to Full and Octave views alike.
- setTopbarState emits only when a value actually changes, Saisie subscribes to single values via useTopbarValue and calls setGateReady only when the gate flips, and resets the bar only on unmount — store emits force synchronous re-renders of the whole page on every weight commit.
- Full-view pair-exit guards read displayed weights, cancel pointerdown before native focus, and reject other focus synchronously without filter remapping; remember only accepted focus — prevents deferred commits and Safari timers from releasing an incoherent pair.
- Full-view tablet entry uses inputMode none plus the bottom CompactKeypad; both keypads compute values with keypadEntry/keypadErase from weighing-engine and the Full view writes the active cell directly (no synthetic input events), keypad shown only while a weight cell is selected — same engine as the Octave pad, Safari keeps focus moves.
