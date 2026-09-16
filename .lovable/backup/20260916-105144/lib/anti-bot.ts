// Anti-robot: honeypot + limitation de fréquence (échec silencieux).
export const HONEYPOT_NAME = "additional_notes_backup";

const RATE_LIMIT_KEY = "ptw_last_submit_at";
export const RATE_LIMIT_MS = 15_000;

/** Vrai si le champ piège a été rempli (robot). */
export function isHoneypotTripped(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Vrai si moins de 15 s se sont écoulées depuis le dernier enregistrement réussi. */
export function isRateLimited(now: number = Date.now()): boolean {
  try {
    const raw = window.localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return now - last < RATE_LIMIT_MS;
  } catch {
    return false;
  }
}

/** Horodate un enregistrement réussi. */
export function markSubmission(now: number = Date.now()): void {
  try {
    window.localStorage.setItem(RATE_LIMIT_KEY, String(now));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/**
 * Contrôle d'intégrité à appeler AVANT tout export local ou envoi cloud.
 * Retourne false en cas de blocage (échec silencieux, aucun message).
 */
export function passesBotChecks(honeypotValue: string | undefined | null): boolean {
  if (isHoneypotTripped(honeypotValue)) return false;
  if (isRateLimited()) return false;
  return true;
}
