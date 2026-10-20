/**
 * Fichier physique « .kw » (KeyWeight) — format local souverain, JSON versionné.
 * L'identité du piano repose sur une empreinte locale (Marque + Modèle + N° de série),
 * jamais sur un identifiant du Cloud.
 */

export type KwRow = { wd: string; wa: string };

export type KwJalon = {
  id: string;
  /** Horodatage ISO de création du jalon. */
  date: string;
  info: Record<string, string>;
  rows: KwRow[];
};

export type KwDocument = {
  format: "keyweight";
  version: 1;
  piano_uuid: string;
  updated_at: string;
  info: Record<string, string>;
  rows: KwRow[];
  historique_jalons: KwJalon[];
};

export const SECURITY_BACKUP_KEY = "ptw_security_backup";
const SESSION_DOCUMENT_KEY = "ptw_kw_document";

/** Session copy of the last opened/saved local file, never a Cloud read. */
export function readSessionKwDocument(): KwDocument | null {
  try {
    const text = window.sessionStorage.getItem(SESSION_DOCUMENT_KEY);
    return text ? parseKwDocument(text) : null;
  } catch { return null; }
}

export function rememberKwDocument(doc: KwDocument | null): void {
  try {
    if (doc) window.sessionStorage.setItem(SESSION_DOCUMENT_KEY, JSON.stringify(doc));
    else window.sessionStorage.removeItem(SESSION_DOCUMENT_KEY);
  } catch { /* session storage unavailable */ }
}

export function kwSerial(info: Record<string, string>): string {
  return `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`.trim();
}

export function differentSerial(current: string, incoming: string): boolean {
  return Boolean(norm(current) && norm(incoming) && norm(current) !== norm(incoming));
}
export const DAY_MS = 24 * 3600 * 1000;
/** Au-delà de ce nombre de touches modifiées le même jour, un nouveau jalon est proposé. */
export const SAME_DAY_KEY_THRESHOLD = 5;

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/** Empreinte locale déterministe (hash FNV-1a 64 bits formaté en UUID). */
export function pianoUuid(info: Record<string, string>): string {
  const serial = `${norm(info["sn_prefix"])}${norm(info["sn_num"])}${norm(info["sn_suffix"])}`;
  const key = `${norm(info["marque"])}|${norm(info["modele"])}|${serial}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 2246822519) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(2);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const safe = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Nom standardisé : Marque_Modele_SN_Date.kw, sans caractère spécial. */
export function kwFileName(info: Record<string, string>, now = new Date()): string {
  const sn = safe(`${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}h${p(now.getMinutes())}`;
  const parts = [safe(info["marque"]), safe(info["modele"]), sn, date].filter(Boolean);
  return `${parts.join("_") || "piano"}.kw`;
}

export function countChangedKeys(a: KwRow[], b: KwRow[]): number {
  let n = 0;
  for (let i = 0; i < 88; i++) {
    if ((a[i]?.wd ?? "") !== (b[i]?.wd ?? "") || (a[i]?.wa ?? "") !== (b[i]?.wa ?? "")) n++;
  }
  return n;
}

/**
 * Règle d'historique : nouveau jalon proposé si > 24 h depuis le dernier jalon
 * OU > 5 touches modifiées le même jour. Sinon écrasement silencieux.
 */
export function shouldProposeJalon(doc: KwDocument, rows: KwRow[], nowMs = Date.now()): boolean {
  const changed = countChangedKeys(doc.rows, rows);
  if (changed === 0) return false;
  const last = doc.historique_jalons[doc.historique_jalons.length - 1];
  const ref = Date.parse(last?.date ?? doc.updated_at);
  if (Number.isFinite(ref) && nowMs - ref > DAY_MS) return true;
  return changed > SAME_DAY_KEY_THRESHOLD;
}

export function buildKwDocument(
  info: Record<string, string>,
  rows: KwRow[],
  previous: KwDocument | null,
  addJalon: boolean,
  now = new Date(),
): KwDocument {
  const iso = now.toISOString();
  const history = previous ? [...previous.historique_jalons] : [];
  if (!previous || addJalon) {
    history.push({ id: `jalon_${history.length + 1}`, date: iso, info: { ...info }, rows: rows.map((r) => ({ ...r })) });
  } else if (history.length > 0) {
    // Écrasement silencieux du jalon en cours, sans doublon.
    history[history.length - 1] = { ...(history[history.length - 1] as KwJalon), info: { ...info }, rows: rows.map((r) => ({ ...r })) };
  }
  return {
    format: "keyweight",
    version: 1,
    piano_uuid: pianoUuid(info),
    updated_at: iso,
    info: { ...info },
    rows: rows.map((r) => ({ ...r })),
    historique_jalons: history,
  };
}

export function parseKwDocument(text: string): KwDocument | null {
  try {
    const d = JSON.parse(text) as Partial<KwDocument>;
    if (d?.format !== "keyweight" || d.version !== 1 || !Array.isArray(d.rows)) return null;
    const fix = (r: unknown[]): KwRow[] =>
      Array.from({ length: 88 }, (_, i) => {
        const x = (r[i] ?? {}) as Partial<KwRow>;
        return { wd: String(x.wd ?? ""), wa: String(x.wa ?? "") };
      });
    return {
      format: "keyweight",
      version: 1,
      piano_uuid: String(d.piano_uuid ?? ""),
      updated_at: String(d.updated_at ?? new Date().toISOString()),
      info: (d.info ?? {}) as Record<string, string>,
      rows: fix(d.rows),
      historique_jalons: (Array.isArray(d.historique_jalons) ? d.historique_jalons : []).map((j) => ({
        id: String(j.id),
        date: String(j.date),
        info: (j.info ?? {}) as Record<string, string>,
        rows: fix(Array.isArray(j.rows) ? j.rows : []),
      })),
    };
  } catch {
    return null;
  }
}

type FileHandleLike = {
  createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }>;
};

/**
 * Écrit le document : réécriture directe dans le même fichier si un handle existe,
 * sinon sélecteur natif (showSaveFilePicker), sinon téléchargement direct (Safari / iPadOS).
 * Retourne le handle à conserver, null si fallback, ou "cancelled".
 */
export async function writeKwFile(
  doc: KwDocument,
  handle: FileHandleLike | null,
): Promise<FileHandleLike | null | "cancelled"> {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const w = window as unknown as {
    showSaveFilePicker?: (o: unknown) => Promise<FileHandleLike>;
  };
  if (handle || typeof w.showSaveFilePicker === "function") {
    try {
      const pick = w.showSaveFilePicker;
      if (!handle && !pick) return "cancelled";
      const h =
        handle ??
        (await pick?.({
          suggestedName: kwFileName(doc.info),
          types: [{ description: "KeyWeight", accept: { "application/json": [".kw"] } }],
        }));
      if (!h) return "cancelled";
      const writable = await h.createWritable();
      await writable.write(blob);
      await writable.close();
      return h;
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return "cancelled";
      // Autre échec : bascule sur le téléchargement direct.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = kwFileName(doc.info);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return null;
}
