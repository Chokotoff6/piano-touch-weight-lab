// Touches obligatoires : Do (4, 16, ... 88) et Do# (5, 17, ... 77)
export const REQUIRED_KEYS: number[] = [
  4, 5, 16, 17, 28, 29, 40, 41, 52, 53, 64, 65, 76, 77, 88,
];

export const REQUIRED_KEY_SET = new Set(REQUIRED_KEYS);

export const REQUIRED_KEYS_NOTICE =
  "Merci d'encoder au minimum toutes les touches Do et Do# (15 touches) pour obtenir une courbe représentative.";

export function missingRequiredKeys(rows: { wa: string; wd: string }[]): number[] {
  return REQUIRED_KEYS.filter((key) => {
    const row = rows[key - 1];
    return !row || row.wa.trim() === "" || row.wd.trim() === "";
  });
}

export function missingRequiredMessage(missing: number[]): string {
  return `Touches obligatoires manquantes (Do / Do#) : ${missing.join(", ")}.`;
}

// Permet à la navigation globale de vérifier l'état de la page Saisie.
export const requiredKeysGate: { getMissing: (() => number[]) | null } = {
  getMissing: null,
};
