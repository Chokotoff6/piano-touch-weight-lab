/**
 * Fichier physique « .kw » (KeyWeight) — carnet local souverain du piano, JSON versionné.
 * Sur disque : clés anglaises canoniques (version 2). En mémoire : clés de la fiche UI.
 * L'identité du piano est stockée une seule fois (racine `info`) ; chaque point
 * d'historique ne contient que son libellé, ses dates et ses 88 pesées.
 * Lecture rétrocompatible des anciens fichiers version 1 (clés françaises).
 */

export type KwRow = { wd: string; wa: string };

export type KwHistoryPoint = {
  id: string;
  /** Libellé(s) d'intervention, joints par « + ». */
  name: string;
  created_at: string;
  updated_at: string;
  rows: KwRow[];
};

export type KwDocument = {
  format: "keyweight";
  version: 2;
  piano_uuid: string;
  created_at: string;
  updated_at: string;
  active_point_id: string;
  /** Identité du piano (clés de la fiche UI en mémoire). */
  info: Record<string, string>;
  rows: KwRow[];
  history_points: KwHistoryPoint[];
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
    if (doc) window.sessionStorage.setItem(SESSION_DOCUMENT_KEY, serializeKwDocument(doc));
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
/** Au-delà de ce nombre de touches modifiées le même jour, un nouveau point d'historique est proposé. */
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

/** Nom stable par piano : Marque_Modele_SN.kw (sans date), sans caractère spécial. */
export function kwFileName(info: Record<string, string>): string {
  const sn = safe(`${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`);
  const parts = [safe(info["marque"]), safe(info["modele"]), sn].filter(Boolean);
  return `${parts.join("_") || "piano"}.kw`;
}

export function countChangedKeys(a: KwRow[], b: KwRow[]): number {
  let n = 0;
  for (let i = 0; i < 88; i++) {
    if ((a[i]?.wd ?? "") !== (b[i]?.wd ?? "") || (a[i]?.wa ?? "") !== (b[i]?.wa ?? "")) n++;
  }
  return n;
}

export function activePoint(doc: KwDocument | null): KwHistoryPoint | null {
  if (!doc) return null;
  return doc.history_points.find((p) => p.id === doc.active_point_id) ?? doc.history_points[doc.history_points.length - 1] ?? null;
}

/**
 * Règle d'historique : nouveau point proposé si > 24 h depuis le dernier point
 * OU > 5 touches modifiées le même jour. Sinon mise à jour silencieuse du point actif.
 */
export function shouldProposeHistoryPoint(doc: KwDocument, rows: KwRow[], nowMs = Date.now()): boolean {
  const changed = countChangedKeys(doc.rows, rows);
  if (changed === 0) return false;
  const last = activePoint(doc);
  const ref = Date.parse(last?.created_at ?? doc.updated_at);
  if (Number.isFinite(ref) && nowMs - ref > DAY_MS) return true;
  return changed > SAME_DAY_KEY_THRESHOLD;
}

/**
 * Construit le document. `newPointName` non nul => création d'un nouveau point d'historique
 * (ou premier point d'un nouveau dossier). Sinon, mise à jour du point actif.
 */
export function buildKwDocument(
  info: Record<string, string>,
  rows: KwRow[],
  previous: KwDocument | null,
  newPointName: string | null,
  now = new Date(),
): KwDocument {
  const iso = now.toISOString();
  const copy = rows.map((r) => ({ ...r }));
  const history = previous ? previous.history_points.map((p) => ({ ...p })) : [];
  let activeId = previous?.active_point_id ?? "";
  if (!previous || newPointName !== null || history.length === 0) {
    activeId = `point_${history.length + 1}`;
    history.push({ id: activeId, name: (newPointName ?? "").trim(), created_at: iso, updated_at: iso, rows: copy });
  } else {
    const idx = Math.max(0, history.findIndex((p) => p.id === activeId));
    const cur = history[idx]!;
    activeId = cur.id;
    history[idx] = { ...cur, updated_at: iso, rows: copy };
  }
  return {
    format: "keyweight",
    version: 2,
    piano_uuid: pianoUuid(info),
    created_at: previous?.created_at ?? iso,
    updated_at: iso,
    active_point_id: activeId,
    info: { ...info },
    rows: copy.map((r) => ({ ...r })),
    history_points: history,
  };
}

// --- Correspondance clés UI (françaises historiques) <-> clés fichier anglaises ---
const UI_TO_FILE: Record<string, string> = {
  marque: "brand",
  modele: "model",
  type_piano: "piano_type",
  fabrication: "year",
  entretien: "maintenance",
  remarques: "notes",
  ville: "city",
  pays: "country",
};
const FILE_TO_UI: Record<string, string> = Object.fromEntries(Object.entries(UI_TO_FILE).map(([a, b]) => [b, a]));

const typeToFile = (v: string) => (/queue|grand/i.test(v) ? "Grand" : /droit|upright/i.test(v) ? "Upright" : v);
const typeToUi = (v: string) => (/grand|queue/i.test(v) ? "Queue" : /upright|droit/i.test(v) ? "Droit" : v);

function infoToFile(info: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(info)) {
    const key = UI_TO_FILE[k] ?? k;
    out[key] = key === "piano_type" ? typeToFile(String(v ?? "")) : String(v ?? "");
  }
  return out;
}
function infoToUi(info: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(info ?? {})) {
    const key = FILE_TO_UI[k] ?? k;
    out[key] = key === "type_piano" ? typeToUi(String(v ?? "")) : String(v ?? "");
  }
  return out;
}

/** Sérialisation disque : JSON lisible, clés anglaises. */
export function serializeKwDocument(doc: KwDocument): string {
  return JSON.stringify({ ...doc, info: infoToFile(doc.info) }, null, 2);
}

const fixRows = (r: unknown): KwRow[] => {
  const arr = Array.isArray(r) ? r : [];
  return Array.from({ length: 88 }, (_, i) => {
    const x = (arr[i] ?? {}) as Partial<KwRow>;
    return { wd: String(x.wd ?? ""), wa: String(x.wa ?? "") };
  });
};

export function parseKwDocument(text: string): KwDocument | null {
  try {
    const d = JSON.parse(text) as Record<string, unknown>;
    if (d?.format !== "keyweight" || !Array.isArray(d.rows)) return null;
    const rows = fixRows(d.rows);
    const updated = String(d.updated_at ?? new Date().toISOString());
    if (d.version === 2) {
      const pts = (Array.isArray(d.history_points) ? d.history_points : []) as Record<string, unknown>[];
      const history = pts.map((p, i) => ({
        id: String(p.id ?? `point_${i + 1}`),
        name: String(p.name ?? ""),
        created_at: String(p.created_at ?? updated),
        updated_at: String(p.updated_at ?? p.created_at ?? updated),
        rows: fixRows(p.rows),
      }));
      const info = infoToUi((d.info ?? {}) as Record<string, unknown>);
      return {
        format: "keyweight",
        version: 2,
        piano_uuid: String(d.piano_uuid ?? pianoUuid(info)),
        created_at: String(d.created_at ?? history[0]?.created_at ?? updated),
        updated_at: updated,
        active_point_id: String(d.active_point_id ?? history[history.length - 1]?.id ?? ""),
        info,
        rows,
        history_points: history,
      };
    }
    if (d.version === 1) {
      // Ancien format : historique_jalons avec identité dupliquée dans chaque entrée.
      const old = (Array.isArray(d.historique_jalons) ? d.historique_jalons : []) as Record<string, unknown>[];
      const history = old.map((j, i) => ({
        id: `point_${i + 1}`,
        name: "",
        created_at: String(j.date ?? updated),
        updated_at: String(j.date ?? updated),
        rows: fixRows(j.rows),
      }));
      if (history.length) history[history.length - 1]!.updated_at = updated;
      const info = infoToUi((d.info ?? {}) as Record<string, unknown>);
      return {
        format: "keyweight",
        version: 2,
        piano_uuid: String(d.piano_uuid ?? pianoUuid(info)),
        created_at: history[0]?.created_at ?? updated,
        updated_at: updated,
        active_point_id: history[history.length - 1]?.id ?? "",
        info,
        rows,
        history_points: history,
      };
    }
    return null;
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
  const blob = new Blob([serializeKwDocument(doc)], { type: "application/json" });
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

/** Lit le brouillon courant (fiche + 88 pesées) depuis l'autosauvegarde navigateur. */
export function readDraftProfile(): { info: Record<string, string>; rows: KwRow[] } {
  let info: Record<string, string> = {};
  let rows: KwRow[] = Array.from({ length: 88 }, () => ({ wd: "", wa: "" }) as KwRow);
  try {
    const i = JSON.parse(window.localStorage.getItem("ptw_draft_info") ?? "null");
    if (i && typeof i === "object") info = i;
    const r = JSON.parse(window.localStorage.getItem("ptw_draft_rows") ?? "null");
    if (Array.isArray(r) && r.length === 88) rows = r;
  } catch { /* stockage indisponible */ }
  return { info, rows };
}

/** Enregistre le brouillon courant dans un fichier .kw (appel direct depuis un clic). */
export async function saveDraftToKw(): Promise<boolean> {
  const { info, rows } = readDraftProfile();
  const doc = buildKwDocument(info, rows, readSessionKwDocument(), null);
  const res = await writeKwFile(doc, null);
  if (res === "cancelled") return false;
  rememberKwDocument(doc);
  try {
    window.localStorage.setItem(SECURITY_BACKUP_KEY, JSON.stringify({ info, rows, savedToFile: true, at: Date.now() }));
  } catch { /* stockage indisponible */ }
  return true;
}

/** Nom de PDF : MARQUE_MODELE_SERIE_AAAA-MM-JJ_HHMM_SUFFIXE.pdf (INCONNU si vide). */
export function pianoPdfName(suffix: string, info?: Record<string, string>): string {
  const src = info ?? readDraftProfile().info;
  const seg = (v: string | undefined) =>
    (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "INCONNU";
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  return `${seg(src["marque"])}_${seg(src["modele"])}_${seg(kwSerial(src))}_${stamp}_${suffix}.pdf`;
}
