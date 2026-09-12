// Mode démonstration : jeu de données fictif (piano + 88 pesées cohérentes)
// écrit dans les mêmes clés locales que la page Saisie, afin que Résultats et
// Comparer affichent immédiatement des graphiques.
import { buildCurrentPiano, saveCurrentPiano, CURRENT_PIANO_KEY } from "@/lib/current-piano";
import { setCompareUnlocked, setGateReady, setResultsVisited } from "@/lib/topbar-store";

const DRAFT_ROWS_KEY = "ptw_draft_rows";
const DRAFT_INFO_KEY = "ptw_draft_info";
export const DEMO_MODE_KEY = "ptw_demo_mode";

export const DEMO_INFO: Record<string, string> = {
  marque: "YAMAHA",
  modele: "C3 (démo)",
  type_piano: "Queue",
  sn_num: "6543210",
  fabrication: "1998",
  pays: "Belgique",
  ville: "Bruxelles",
  entretien: "Entretien régulier",
  usage_level: "Usage domestique",
  remarques: "Jeu de données de démonstration (piano fictif).",
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

/** Vrai si le mode démo est actif (actif par défaut tant qu'aucun choix). */
export function isDemoActive(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(DEMO_MODE_KEY) !== "0";
  } catch {
    return false;
  }
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
        climate_zone: "EU",
        maintenance_type: DEMO_INFO["entretien"] ?? "",
        usage_level: DEMO_INFO["usage_level"] ?? "",
        ville: DEMO_INFO["ville"] ?? "",
        pays: DEMO_INFO["pays"] ?? "",
        remarques: DEMO_INFO["remarques"] ?? "",
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

/** Applique le mode démo par défaut au premier chargement du navigateur. */
export function ensureDemoDefault() {
  if (!isBrowser()) return;
  let flag: string | null = null;
  try {
    flag = window.localStorage.getItem(DEMO_MODE_KEY);
  } catch {
    return;
  }
  if (flag === null) enableDemoMode();
}
