/**
 * Moteur de pesée unique, partagé par la Vue Complète et la Vue Octave.
 * Règles pures (aucun affichage) : une règle modifiée ici s'applique aux deux vues.
 */
export type WeightField = "wd" | "wa";

/** Plages atelier : PD (wd) 30-90 g, PR (wa) 10-40 g. */
export const WEIGHT_RANGES = { wd: [30, 90], wa: [10, 40] } as const;

/** Bridage strict à 2 chiffres, aucune décimale. */
export const cleanWeightEntry = (value: string) => value.replace(/[^0-9]/g, "").slice(0, 2);

export const parseWeightEntry = (value: string): number | null => {
  const cleaned = cleanWeightEntry(value);
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

export const isOutOfRange = (field: WeightField, n: number) =>
  n < WEIGHT_RANGES[field][0] || n > WEIGHT_RANGES[field][1];

/** Alerte pédale : PD uniquement, strictement 70-90 g. */
export const isPedalValue = (field: WeightField, n: number | null) =>
  field === "wd" && n !== null && n >= 70 && n <= 90;

export type EntryVerdict = "partial" | "mechanical" | "range" | "pedal" | "ok";

/**
 * Décision à la frappe : 1 chiffre = rien ; 2 chiffres = contrôles dans l'ordre
 * mécanique (PD > PR), fourchette, pédale. « ok » autorise le saut immédiat.
 */
export function entryVerdict(field: WeightField, value: string, otherValue: string): EntryVerdict {
  const cleaned = cleanWeightEntry(value);
  if (cleaned.length < 2) return "partial";
  const n = Number(cleaned);
  const other = parseWeightEntry(otherValue);
  const wd = field === "wd" ? n : other;
  const wa = field === "wa" ? n : other;
  if (wd !== null && wa !== null && wd <= wa) return "mechanical";
  if (isOutOfRange(field, n)) return "range";
  if (isPedalValue(field, n)) return "pedal";
  return "ok";
}
