// Aiguilleur central des écritures cloud.
// Centralise : chronomètre d'ouverture de fiche, comptage des touches éditées,
// ratio temps-par-touche et décision finale (blocked / needsConsent /
// silentUpsert / skip). Aucune écriture n'est faite ici : ce module décide.
import { isCsvOrigin, isHoneypotTripped } from "@/lib/anti-bot";
import { setCloudProfileSaved, setCompareUnlocked } from "@/lib/topbar-store";

/** Temps minimal humain pour remplir une fiche neuve en atelier. */
export const HUMAN_MIN_SHEET_MS = 45_000;
/** Temps minimal humain par touche corrigée (ratio évolutif). */
export const HUMAN_MIN_MS_PER_KEY = 1_200;

const SHEET_START_KEY = "ptw_sheet_started_at";
const LAST_SYNC_AT_KEY = "ptw_last_cloud_sync_at";
const SYNCED_ROWS_KEY = "ptw_last_synced_rows";

export type GateRow = { wa: string; wd: string };

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
}

/** Démarre (ou redémarre) le chronomètre d'ouverture de fiche. */
export function startSheetTimer(force = false) {
  if (typeof window === "undefined") return;
  if (!force && read(SHEET_START_KEY)) return;
  write(SHEET_START_KEY, String(Date.now()));
}

/** Temps écoulé depuis l'ouverture de la fiche (ms). */
export function sheetElapsedMs(now: number = Date.now()): number {
  const raw = read(SHEET_START_KEY);
  const start = Number(raw);
  if (!raw || !Number.isFinite(start)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - start);
}

/** Temps écoulé depuis la dernière écriture cloud réussie (ms). */
export function msSinceLastSync(now: number = Date.now()): number {
  const raw = read(LAST_SYNC_AT_KEY);
  const last = Number(raw);
  if (!raw || !Number.isFinite(last)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - last);
}

/** Mémorise une écriture cloud réussie et l'état des 88 touches envoyées. */
export function markCloudSync(rows: GateRow[]) {
  if (typeof window === "undefined") return;
  write(LAST_SYNC_AT_KEY, String(Date.now()));
  try {
    write(SYNCED_ROWS_KEY, JSON.stringify(rows.map((r) => ({ wa: r.wa, wd: r.wd }))));
  } catch {
    /* stockage indisponible */
  }
  // Chronomètre relancé : les corrections suivantes sont mesurées à partir d'ici.
  startSheetTimer(true);
}

/** Nombre de touches dont le poids a changé depuis le dernier envoi cloud. */
export function countModifiedKeys(rows: GateRow[]): number {
  let previous: GateRow[] | null = null;
  try {
    const raw = read(SYNCED_ROWS_KEY);
    const parsed = raw ? (JSON.parse(raw) as GateRow[]) : null;
    if (Array.isArray(parsed)) previous = parsed;
  } catch {
    previous = null;
  }
  if (!previous || previous.length !== rows.length) return rows.length;
  return rows.reduce((count, row, index) => {
    const before = previous?.[index];
    if (!before) return count + 1;
    const changed =
      String(row.wa ?? "").trim() !== String(before.wa ?? "").trim() ||
      String(row.wd ?? "").trim() !== String(before.wd ?? "").trim();
    return count + (changed ? 1 : 0);
  }, 0);
}

export type GateDecision =
  | { kind: "blocked"; reason: "honeypot" | "timing" | "ratio" }
  | { kind: "needsConsent" }
  | { kind: "silentUpsert"; modifiedKeys: number }
  | { kind: "skip" };

export type GateInput = {
  /** Valeur du champ leurre (honeypot). */
  honeypot?: string | null;
  /** Accord déjà donné pour ce piano (mémoire locale). */
  accepted: boolean;
  /** Les 88 lignes de pesée à l'écran. */
  rows: GateRow[];
};

/**
 * Étape 1 (anti-robot permanent) puis étape 2 (consentement / cohérence).
 * Les verrous de chronométrage sont désactivés quand les données viennent
 * d'un import CSV d'atelier.
 */
export function decideCloudAction(input: GateInput): GateDecision {
  const csv = isCsvOrigin();

  // --- Étape 1 : filtre anti-robot absolu -------------------------------------
  if (isHoneypotTripped(input.honeypot)) return { kind: "blocked", reason: "honeypot" };

  // --- Étape 2 : aiguillage ----------------------------------------------------
  if (!input.accepted) {
    if (!csv && sheetElapsedMs() < HUMAN_MIN_SHEET_MS) {
      return { kind: "blocked", reason: "timing" };
    }
    return { kind: "needsConsent" };
  }

  const modifiedKeys = countModifiedKeys(input.rows);
  if (modifiedKeys === 0 && !csv) return { kind: "skip" };
  if (!csv) {
    const ratio = sheetElapsedMs() / Math.max(1, modifiedKeys);
    if (ratio < HUMAN_MIN_MS_PER_KEY) return { kind: "blocked", reason: "ratio" };
  }
  return { kind: "silentUpsert", modifiedKeys };
}

/** Remet l'accord local à « non accepté » et reverrouille l'interface. */
export function resetConsent() {
  try {
    window.localStorage.removeItem(SYNCED_ROWS_KEY);
  } catch {
    /* stockage indisponible */
  }
  setCompareUnlocked(false);
  setCloudProfileSaved(false);
  startSheetTimer(true);
}
