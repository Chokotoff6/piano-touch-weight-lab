// Cloisonnement des profils de démonstration (colonne `demo` de piano_profiles).
// Par défaut l'application ignore strictement les fiches de démonstration ;
// elles ne deviennent lisibles que si le Mode démo de l'interface est actif.
// Lecture directe du stockage (pas d'import de demo-mode.ts) pour éviter
// tout cycle d'import avec current-piano.ts.

const DEMO_DESTROYED_KEY = "demo_mode_destroyed";

/**
 * Règle unique, de session : le Mode démo est actif dès l'ouverture de
 * l'application et le reste tant que le bouton noir n'a pas été cliqué.
 */
export function demoScopeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DEMO_DESTROYED_KEY) !== "true";
  } catch {
    return false;
  }
}

/**
 * Applique le filtre `demo` à une requête PostgREST :
 * - Mode démo inactif → uniquement demo = false (ou NULL, fiches héritées) ;
 * - Mode démo actif → aucune restriction (vraies fiches + fiches de démo).
 */
export function scopeDemo<T extends { or: (filter: string) => T }>(query: T): T {
  if (demoScopeActive()) return query;
  return query.or("demo.is.null,demo.eq.false");
}
