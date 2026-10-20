// Édition directe d'une pesée depuis le mode zoom (Option A).
// Écrit dans le brouillon local (ptw_draft_rows) et la boîte noire, puis
// prévient les pages ouvertes de relire leurs données.
import { SECURITY_BACKUP_KEY } from "@/lib/kw-file";

export const DRAFT_EDITED_EVENT = "ptw-draft-edited";
export const PD_RANGE = [30, 90] as const;
export const PR_RANGE = [10, 40] as const;

type DraftRow = { wd: string; wa: string } & Record<string, unknown>;

export function readDraftPair(note: number): { wd: string; wa: string } | null {
  try {
    const rows = JSON.parse(window.localStorage.getItem("ptw_draft_rows") ?? "null") as DraftRow[] | null;
    const row = Array.isArray(rows) ? rows[note - 1] : null;
    return row ? { wd: String(row.wd ?? ""), wa: String(row.wa ?? "") } : null;
  } catch {
    return null;
  }
}

/** Retourne un message d'erreur (FR/EN) ou null si la paire est valide. */
export function validatePair(wd: number, wa: number, en: boolean): string | null {
  if (!Number.isFinite(wd) || wd < PD_RANGE[0] || wd > PD_RANGE[1]) return en ? "Downweight must be 30–90 g" : "Poids descendant : 30–90 g";
  if (!Number.isFinite(wa) || wa < PR_RANGE[0] || wa > PR_RANGE[1]) return en ? "Upweight must be 10–40 g" : "Poids remontant : 10–40 g";
  if (wd <= wa) return en ? "Downweight must exceed upweight" : "Le poids descendant doit dépasser le poids remontant";
  return null;
}

export function writeDraftPair(note: number, wd: string, wa: string): boolean {
  try {
    const rows = JSON.parse(window.localStorage.getItem("ptw_draft_rows") ?? "null") as DraftRow[] | null;
    if (!Array.isArray(rows) || !rows[note - 1]) return false;
    rows[note - 1] = { ...rows[note - 1], wd, wa };
    window.localStorage.setItem("ptw_draft_rows", JSON.stringify(rows));
    const prev = JSON.parse(window.localStorage.getItem(SECURITY_BACKUP_KEY) ?? "null") as { info?: unknown } | null;
    let info: unknown = prev?.info ?? {};
    try { info = JSON.parse(window.localStorage.getItem("ptw_draft_info") ?? "null") ?? info; } catch { /* garde */ }
    window.localStorage.setItem(SECURITY_BACKUP_KEY, JSON.stringify({ info, rows, savedToFile: false, at: Date.now() }));
    window.dispatchEvent(new CustomEvent(DRAFT_EDITED_EVENT));
    return true;
  } catch {
    return false;
  }
}
