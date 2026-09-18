// Mode démonstration : jeu de données fictif (piano + 88 pesées cohérentes)
// écrit dans les mêmes clés locales que la page Saisie, afin que Résultats et
// Comparer affichent immédiatement des graphiques.
import {
  buildCurrentPiano,
  saveCurrentPiano,
  loadPianoProfileById,
  DEMO_PIANO_BUFFER_UUID,
  CURRENT_PIANO_KEY,
  normalizeTypePiano,
  normalizeWho,
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

/**
 * Charge le VRAI piano de démonstration depuis la base (ligne tampon
 * `00000000-0000-0000-0000-000000000001`). Aucune donnée locale de secours :
 * si la base est injoignable, l'erreur réseau est propagée.
 */
export async function enableDemoModeAsync() {
  if (!isBrowser()) return;
  const profile = await loadPianoProfileById(DEMO_PIANO_BUFFER_UUID, false);
  if (!profile) throw new Error("Fiche de démonstration introuvable en base.");
  try {
    window.sessionStorage.setItem(DEMO_SYNCED_KEY, "1");
  } catch {
    /* stockage indisponible */
  }
  const info: Record<string, string> = {
    marque: profile.brand ?? "",
    modele: profile.model ?? "",
    type_piano: normalizeTypePiano(profile.type_piano),
    sn_num: profile.serial_number ?? "",
    fabrication: profile.manufacture_year ? String(profile.manufacture_year) : "",
    measurement_date: profile.measurement_date ?? "",
    pays: profile.country ?? "",
    ville: profile.city ?? "",
    climate_zone: profile.climate_zone ?? "",
    entretien: profile.maintenance_type ?? "",
    usage_level: profile.usage_level ?? "",
    profil_saisie: normalizeWho(profile.who),
    remarques: profile.remarks ?? "",
  };
  const waValues = Array.isArray(profile.wa_values) ? profile.wa_values : [];
  // Filet de sécurité propre à la fiche démo : si la série est entièrement
  // inversée (remontée > descente sur chaque touche renseignée), on permute
  // wa/wd au chargement pour que Résultats puisse valider et tracer.
  const pairs = waValues.map((wa, i) => ({ wa, wd: profile.wd_values?.[i] }));
  const filled = pairs.filter(
    (p) => Number.isFinite(p.wa) && Number.isFinite(p.wd),
  );
  const inverted =
    filled.length > 0 && filled.every((p) => (p.wd as number) > (p.wa as number));
  const rows: DemoRows = pairs.map(({ wa, wd }) => {
    const a = Number.isFinite(wa) ? (wa as number) : null;
    const d = Number.isFinite(wd) ? (wd as number) : null;
    const down = inverted ? d : a;
    const up = inverted ? a : d;
    return {
      wa: down === null ? "" : String(down),
      wd: up === null ? "" : String(up),
    };
  });
  applyDemoData(info, rows);
}

/** Retire toutes les données de démonstration. */
export function disableDemoMode() {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DEMO_MODE_KEY, "0");
    window.localStorage.removeItem(DRAFT_ROWS_KEY);
    window.localStorage.removeItem(DRAFT_INFO_KEY);
    window.localStorage.removeItem(CURRENT_PIANO_KEY);
    window.sessionStorage.removeItem(DEMO_SYNCED_KEY);
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
      void enableDemoModeAsync().catch((e) => console.error("Mode démo : lecture Cloud impossible", e));
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
    try {
      window.sessionStorage.removeItem(DEMO_SYNCED_KEY);
    } catch {
      /* stockage indisponible */
    }
    void enableDemoModeAsync().catch((e) => console.error("Mode démo : lecture Cloud impossible", e));
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
