// Cloisonnement des profils de démonstration (colonne `demo` de piano_profiles).
// Par défaut l'application ignore strictement les fiches de démonstration ;
// elles ne deviennent lisibles que si le Mode démo de l'interface est actif.
// Lecture directe du stockage (pas d'import de demo-mode.ts) pour éviter
// tout cycle d'import avec current-piano.ts.

const DEMO_OFF_KEY = "ptw_demo_off";

/**
 * Règle unique, de session : le Mode démo est inactif par défaut à
 * l'ouverture de l'application et ne devient actif que si l'artisan
 * bascule explicitement l'interrupteur sur ON ("0" = ON).
 */
export function demoScopeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DEMO_OFF_KEY) === "0";
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
