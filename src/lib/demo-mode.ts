// Mode démonstration : jeu de données fictif (piano + 88 pesées cohérentes)
// écrit dans les mêmes clés locales que la page Saisie, afin que Résultats et
// Comparer affichent immédiatement des graphiques.
import {
  buildCurrentPiano,
  saveCurrentPiano,
  loadPianoProfileById,
  DEMO_PIANO_BUFFER_UUID,
  CURRENT_PIANO_KEY,
} from "@/lib/current-piano";
import { setCompareUnlocked, setGateReady, setResultsVisited } from "@/lib/topbar-store";
import { resetConsent } from "@/lib/cloud-gate";

const DRAFT_ROWS_KEY = "ptw_draft_rows";
const DRAFT_INFO_KEY = "ptw_draft_info";
export const DEMO_MODE_KEY = "ptw_demo_mode";
/** Interrupteur bistable : "1" = Mode démo sur OFF (sinon ON par défaut). */
export const DEMO_OFF_KEY = "ptw_demo_off";

/** Vrai si l'interrupteur « Mode démo » est sur OFF. */
export function isDemoOff(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.sessionStorage.getItem(DEMO_OFF_KEY) === "1";
  } catch {
    return false;
  }
}

/** Positionne l'interrupteur bistable. */
export function setDemoOff(off: boolean) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(DEMO_OFF_KEY, off ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
}


// Jumeau exact de la fiche tampon de démonstration en base (YAMAHA U3 Upright,
// 2020, climat Standard) : indispensable pour que la requête Cloud de la page
// Comparer (.eq("model", …), climat, année) trouve l'échantillon de démo.
export const DEMO_INFO: Record<string, string> = {
  marque: "YAMAHA",
  modele: "U3",
  type_piano: "Upright",
  sn_num: "652444",
  fabrication: "2020",
  measurement_date: "2020-09-17",
  pays: "Belgium",
  ville: "Brussels",
  entretien: "Standard maintenance only",
  usage_level: "Medium",
  remarques: "Virtual demonstration piano profile.",
};


/** Courbes douces et plausibles : Wa décroît des graves vers les aigus. */
export function buildDemoRows(): Array<{ wa: string; wd: string }> {
  return Array.from({ length: 88 }, (_, i) => {
    const t = i / 87;
    const wave = Math.sin(i / 6) * 0.8 + Math.sin(i / 2.3) * 0.4;
    const friction = 14 - 3 * t + wave * 0.25;
    const balance = 41.5 - 3.5 * t + wave * 0.5;
    const wa = balance + friction;
    const wd = balance - friction;
    return { wa: wa.toFixed(1), wd: wd.toFixed(1) };
  });
}

function isBrowser() {
  return typeof window !== "undefined";
}

/** Actif tant que l'interrupteur n'est pas sur OFF. */
export function isDemoActive(): boolean {
  if (!isBrowser()) return false;
  return !isDemoOff();
}


/** Évènement émis quand le jeu de démonstration est (re)chargé. */
export const DEMO_LOADED_EVENT = "ptw-demo-loaded";

type DemoRows = Array<{ wa: string; wd: string }>;

/** Écrit le jeu de démonstration (fiche + pesées) dans le stockage local. */
function applyDemoData(info: Record<string, string>, rows: DemoRows) {
  try {
    window.localStorage.setItem(DEMO_MODE_KEY, "1");
    window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(rows));
    window.localStorage.setItem(DRAFT_INFO_KEY, JSON.stringify(info));
  } catch {
    /* stockage indisponible */
  }
  try {
    saveCurrentPiano(
      buildCurrentPiano({
        brand: info["marque"] ?? "",
        model: info["modele"] ?? "",
        serial_number: info["sn_num"] ?? "",
        type_piano: info["type_piano"] ?? "",
        manufacture_year: Number(info["fabrication"]) || null,
        climate_zone: info["climate_zone"] || "Standard",
        maintenance_type: info["entretien"] ?? "",
        usage_level: info["usage_level"] ?? "",
        city: info["ville"] ?? "",
        country: info["pays"] ?? "",
        remarks: info["remarques"] ?? "",
        mesureDateRaw: info["measurement_date"] ?? "",
        wa: rows.map((r) => r.wa),
        wd: rows.map((r) => r.wd),
      }),
    );
  } catch {
    /* construction indisponible */
  }
  try {
    setGateReady(true);
    setResultsVisited(true);
    setCompareUnlocked(true);
  } catch {
    /* store indisponible */
  }
  try {
    window.dispatchEvent(new CustomEvent(DEMO_LOADED_EVENT));
  } catch {
    /* évènement indisponible */
  }
}

/** Mémorise que la fiche de démo a bien été lue en base pour cette session. */
const DEMO_SYNCED_KEY = "ptw_demo_synced";

/** Charge le piano de secours (objet local) : affichage immédiat, sans réseau. */
export function enableDemoMode() {
  if (!isBrowser()) return;
  applyDemoData(DEMO_INFO, buildDemoRows());
}

/**
 * Charge le VRAI piano de démonstration depuis la base (ligne tampon
 * `00000000-0000-0000-0000-000000000001`). L'objet local reste un filet de
 * sécurité si la base est injoignable.
 */
export async function enableDemoModeAsync() {
  if (!isBrowser()) return;
  enableDemoMode();
  try {
    const profile = await loadPianoProfileById(DEMO_PIANO_BUFFER_UUID, false);
    if (!profile) return;
    try {
      window.sessionStorage.setItem(DEMO_SYNCED_KEY, "1");
    } catch {
      /* stockage indisponible */
    }
    const info: Record<string, string> = {
      marque: profile.brand ?? "",
      modele: profile.model ?? "",
      type_piano: profile.type_piano ?? "",
      sn_num: profile.serial_number ?? "",
      fabrication: profile.manufacture_year ? String(profile.manufacture_year) : "",
      measurement_date: profile.measurement_date ?? "",
      pays: profile.country ?? "",
      ville: profile.city ?? "",
      climate_zone: profile.climate_zone ?? "",
      entretien: profile.maintenance_type ?? "",
      usage_level: profile.usage_level ?? "",
      remarques: profile.remarks ?? "",
    };
    const hasMeasures =
      Array.isArray(profile.wa_values) && profile.wa_values.length === 88;
    const rows: DemoRows = hasMeasures
      ? profile.wa_values.map((wa, i) => ({
          wa: Number.isFinite(wa) ? String(wa) : "",
          wd: Number.isFinite(profile.wd_values?.[i]) ? String(profile.wd_values[i]) : "",
        }))
      : buildDemoRows();
    applyDemoData(info, rows);
  } catch {
    /* base injoignable : on garde le jeu local */
  }
}

/** Retire toutes les données de démonstration. */
export function disableDemoMode() {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DEMO_MODE_KEY, "0");
    window.localStorage.removeItem(DRAFT_ROWS_KEY);
    window.localStorage.removeItem(DRAFT_INFO_KEY);
    window.localStorage.removeItem(CURRENT_PIANO_KEY);
  } catch {
    /* stockage indisponible */
  }
  try {
    setGateReady(false);
    setResultsVisited(false);
    setCompareUnlocked(false);
  } catch {
    /* store indisponible */
  }
}

/**
 * Le mode démo est actif par défaut tant que l'interrupteur n'est pas sur OFF.
 */
export function ensureDemoDefault() {
  if (!isBrowser()) return;
  try {
    if (isDemoOff()) return;
    const synced = window.sessionStorage.getItem(DEMO_SYNCED_KEY) === "1";
    if (!synced || window.localStorage.getItem(DEMO_MODE_KEY) !== "1") {
      void enableDemoModeAsync();
    }
  } catch {
    /* stockage indisponible */
  }
}

/**
 * Bascule l'interrupteur bistable.
 * - ON → OFF : purge des données de démo, accord d'enregistrement remis à
 *   « non accepté » (tous les champs Info Piano redeviennent modifiables) ;
 * - OFF → ON : rechargement du jeu de démonstration.
 * Retourne le nouvel état (true = Mode démo actif).
 */
export function toggleDemoMode(): boolean {
  if (!isBrowser()) return false;
  const nextActive = isDemoOff();
  setDemoOff(!nextActive);
  if (nextActive) {
    void enableDemoModeAsync();
  } else {
    disableDemoMode();
    try {
      resetConsent();
    } catch {
      /* store indisponible */
    }
  }
  return nextActive;
}
