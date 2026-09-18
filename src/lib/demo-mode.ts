// Mode démonstration : jeu de données fictif (piano + 88 pesées cohérentes)
// écrit dans les mêmes clés locales que la page Saisie, afin que Résultats et
// Comparer affichent immédiatement des graphiques.
import { buildCurrentPiano, saveCurrentPiano, CURRENT_PIANO_KEY } from "@/lib/current-piano";
import { setCompareUnlocked, setGateReady, setResultsVisited } from "@/lib/topbar-store";

const DRAFT_ROWS_KEY = "ptw_draft_rows";
const DRAFT_INFO_KEY = "ptw_draft_info";
export const DEMO_MODE_KEY = "ptw_demo_mode";
/** Mémorise la sortie du mode démo : le bouton disparaît pour la session. */
export const DEMO_CLICKED_KEY = "demo_mode_destroyed";

/** Vrai si l'utilisateur a déjà cliqué sur le bouton « Mode démo ». */
export function isDemoClicked(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.sessionStorage.getItem(DEMO_CLICKED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Enregistre le clic sur « Mode démo ». */
export function markDemoClicked() {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(DEMO_CLICKED_KEY, "true");
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

/** Actif tant que le bouton noir n'a pas été cliqué dans la session. */
export function isDemoActive(): boolean {
  if (!isBrowser()) return false;
  return !isDemoClicked();
}

/** Charge le piano fictif et les 88 pesées dans le stockage local. */
export function enableDemoMode() {
  if (!isBrowser()) return;
  const rows = buildDemoRows();
  try {
    window.localStorage.setItem(DEMO_MODE_KEY, "1");
    window.localStorage.setItem(DRAFT_ROWS_KEY, JSON.stringify(rows));
    window.localStorage.setItem(DRAFT_INFO_KEY, JSON.stringify(DEMO_INFO));
  } catch {
    /* stockage indisponible */
  }
  try {
    saveCurrentPiano(
      buildCurrentPiano({
        brand: DEMO_INFO["marque"] ?? "",
        model: DEMO_INFO["modele"] ?? "",
        serial_number: DEMO_INFO["sn_num"] ?? "",
        type_piano: DEMO_INFO["type_piano"] ?? "",
        manufacture_year: Number(DEMO_INFO["fabrication"]) || null,
        climate_zone: "Standard",
        maintenance_type: DEMO_INFO["entretien"] ?? "",
        usage_level: DEMO_INFO["usage_level"] ?? "",
        city: DEMO_INFO["ville"] ?? "",
        country: DEMO_INFO["pays"] ?? "",
        remarks: DEMO_INFO["remarques"] ?? "",
        mesureDateRaw: DEMO_INFO["measurement_date"] ?? "",
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

/** Le mode démo est actif par défaut (bouton vert) tant qu'il n'a pas été quitté. */
export function ensureDemoDefault() {
  if (!isBrowser()) return;
  try {
    if (isDemoClicked()) return;
    if (window.localStorage.getItem(DEMO_MODE_KEY) === null) {
      enableDemoMode();
    }
  } catch {
    /* stockage indisponible */
  }
}
