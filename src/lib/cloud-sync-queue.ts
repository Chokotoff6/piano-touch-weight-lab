// Synchronisation Cloud conditionnelle déclenchée après un enregistrement .kw
// ou un export PDF. Priorité locale absolue : ce module n'est appelé qu'APRÈS
// l'action locale et ne bloque jamais l'utilisateur. Hors ligne, le profil est
// mis en attente (ptw_pending_cloud_sync) puis rejoué à l'événement `online`.
import { toast } from "sonner";
import { readDraftProfile } from "@/lib/kw-file";
import { countModifiedKeys, markCloudSync } from "@/lib/cloud-gate";
import {
  buildCurrentPiano,
  findHistoryProfileId,
  loadCurrentPiano,
  saveCurrentPiano,
  saveCurrentPianoToCloud,
  upsertCurrentPianoBuffer,
  type CurrentPiano,
} from "@/lib/current-piano";
import { isDemoActive } from "@/lib/demo-mode";
import { getTopbarState } from "@/lib/topbar-store";

const PENDING_KEY = "ptw_pending_cloud_sync";
const SESSION_STATE_KEY = "ptw_cloud_session_state";
/** Seuil au-delà duquel le choix « Mettre à jour / Nouvel historique » est requis. */
const SILENT_MAX_KEYS = 5;

type Pending = { piano: CurrentPiano; rows: Array<{ wd: string; wa: string }>; at: number };

function isEn() {
  try { return window.localStorage.getItem("ptw_lang") === "en"; } catch { return false; }
}

function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function draftRows() {
  return readDraftProfile().rows.map((r) => ({ wd: String(r.wd ?? ""), wa: String(r.wa ?? "") }));
}

/** Vrai si le profil Cloud correspond déjà exactement aux pesées locales. */
export function isCloudUpToDate(): boolean {
  if (typeof window === "undefined") return false;
  return countModifiedKeys(draftRows()) === 0;
}

function buildFromDraft(): CurrentPiano | null {
  const { info, rows } = readDraftProfile();
  const serial = `${info["sn_prefix"] ?? ""}${info["sn_num"] ?? ""}${info["sn_suffix"] ?? ""}`.trim();
  // Validation minimale : identité complète et au moins une pesée.
  if (!info["marque"]?.trim() || !info["modele"]?.trim() || !info["sn_num"]?.trim() || !info["type_piano"]?.trim()) return null;
  if (!rows.some((r) => String(r.wd ?? "").trim() !== "" && String(r.wa ?? "").trim() !== "")) return null;
  const saved = loadCurrentPiano();
  return buildCurrentPiano({
    brand: info["marque"] ?? "",
    model: info["modele"] ?? "",
    serial_number: serial,
    type_piano: info["type_piano"] ?? "",
    manufacture_year: Number(info["fabrication"]) || null,
    climate_zone: saved?.climate_zone ?? "",
    maintenance_type: info["entretien"] ?? "",
    usage_level: info["usage_level"] ?? "",
    city: saved?.city ?? "",
    country: saved?.country ?? "",
    remarks: info["remarques"] ?? "",
    wd: rows.map((r) => r.wd),
    wa: rows.map((r) => r.wa),
  });
}

async function push(piano: CurrentPiano, rows: Pending["rows"]): Promise<boolean> {
  const buffer = await upsertCurrentPianoBuffer(piano);
  if (!buffer.ok) return false;
  const historyId = await findHistoryProfileId(piano.serial_number);
  const history = await saveCurrentPianoToCloud(piano, historyId);
  if (!history.ok) return false;
  saveCurrentPiano(piano);
  markCloudSync(rows);
  try {
    window.sessionStorage.setItem(
      SESSION_STATE_KEY,
      JSON.stringify({ id: history.id ?? "", serial: piano.serial_number, date: piano.measurement_date, rows }),
    );
  } catch { /* stockage indisponible */ }
  return true;
}

function enqueue(piano: CurrentPiano, rows: Pending["rows"]) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ piano, rows, at: Date.now() } satisfies Pending));
  } catch { /* stockage indisponible */ }
  toast.info(isEn()
    ? "Profile saved locally. Cloud update pending (offline)."
    : "Profil enregistré en local. Mise à jour Cloud mise en attente (hors ligne).");
}

/**
 * Vérification Cloud après une action locale (.kw ou PDF). Ne pousse que le
 * cas « mise à jour silencieuse » (même jour, < 5 touches) d'un profil déjà
 * partagé ; les autres cas restent tranchés par le dialogue de la Pesée.
 */
export async function syncAfterLocalAction(): Promise<void> {
  if (typeof window === "undefined" || isDemoActive()) return;
  if (!getTopbarState().compareUnlocked) return; // pas encore de consentement / profil Cloud
  const rows = draftRows();
  const modified = countModifiedKeys(rows);
  if (modified === 0) return;
  let sessionDate = "";
  try {
    sessionDate = JSON.parse(window.sessionStorage.getItem(SESSION_STATE_KEY) ?? "null")?.date ?? "";
  } catch { /* ignoré */ }
  if (modified >= SILENT_MAX_KEYS || (sessionDate && sessionDate !== today())) return;
  const piano = buildFromDraft();
  if (!piano) return;
  if (!navigator.onLine) { enqueue(piano, rows); return; }
  const ok = await push(piano, rows).catch(() => false);
  if (!ok) enqueue(piano, rows);
}

/** Rejoue la mise à jour en attente (au démarrage et au retour du réseau). */
export async function processPendingCloudSync(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  let pending: Pending | null = null;
  try { pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "null"); } catch { pending = null; }
  if (!pending?.piano) return;
  const ok = await push(pending.piano, pending.rows).catch(() => false);
  if (!ok) return;
  try { window.localStorage.removeItem(PENDING_KEY); } catch { /* ignoré */ }
  toast.success(isEn() ? "Profile synchronised with the Cloud." : "Profil synchronisé avec le Cloud.");
}

/** Installe l'écouteur réseau une seule fois ; renvoie la fonction de retrait. */
export function installCloudSyncListener(): () => void {
  const onOnline = () => { void processPendingCloudSync(); };
  window.addEventListener("online", onOnline);
  void processPendingCloudSync();
  return () => window.removeEventListener("online", onOnline);
}
