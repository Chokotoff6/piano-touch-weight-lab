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

/** Moteur du pavé (Vue Octave et Vue Complète) : 1er appui après focus = remplace, sinon ajoute. */
export const keypadEntry = (current: string, digit: string, replace: boolean) =>
  cleanWeightEntry((replace || cleanWeightEntry(current).length >= 2 ? "" : current) + digit);
export const keypadErase = (current: string) => cleanWeightEntry(current).slice(0, -1);

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

// --- Messages de pesée : source unique pour la Vue Complète et la Vue Octave ---

/** Message hors plage, chiffres tirés de WEIGHT_RANGES. */
export const rangeMessage = (field: WeightField, en: boolean) => {
  const [min, max] = WEIGHT_RANGES[field];
  return field === "wd"
    ? en
      ? `⚠️ Out of shop range: Down weight (DW) must be between ${min}g and ${max}g.`
      : `⚠️ Valeur hors plage d'atelier : Le Poids Descendant (PD) doit être compris entre ${min}g et ${max}g.`
    : en
      ? `⚠️ Out of shop range: Up weight (UW) must be between ${min}g and ${max}g.`
      : `⚠️ Valeur hors plage d'atelier : Le Poids Remontant (PR) doit être compris entre ${min}g et ${max}g.`;
};
export const PEDAL_MESSAGE_FR =
  "⚠️ Attention : Valeur élevée détectée. Assurez-vous que la pédale de sustain (forte) est bien enfoncée à fond durant la mesure pour libérer les étouffoirs.";
export const PEDAL_MESSAGE_EN =
  "⚠️ Warning: high value detected. Make sure the sustain pedal is fully pressed during the measurement to release the dampers.";
export const COHERENCE_MESSAGE =
  "⚠️ Erreur mécanique : Le Poids Descendant (PD) doit être strictement supérieur au Poids Remontant (PR) pour calculer la Friction.";
export const COHERENCE_MESSAGE_EN =
  "⚠️ Mechanical error: Down weight (DW) must be strictly greater than Up weight (UW) to calculate Friction.";
export const INCOMPLETE_MESSAGE_FR =
  "⚠️ Saisie incomplète : Le Poids Descendant et le Poids Remontant doivent être tous les deux renseignés pour cette touche.";
export const INCOMPLETE_MESSAGE_EN =
  "⚠️ Incomplete entry: Down weight and Up weight must both be entered for this key.";

/** Filtres de navigation communs aux deux vues (Pesée Do-Do#, Touches). */
export type WeighingNavFilters = { rapid: boolean; viewFilter: "all" | "white" | "black" | string; rapidSet: Set<number>; blackKeys: Set<number> };

/** Une touche (index 0-87) est-elle navigable avec les filtres courants ? Même règle Vue Complète et Vue Octave. */
export const isWeighingKeyVisible = (index: number, f: WeighingNavFilters) => {
  if (f.rapid && !f.rapidSet.has(index)) return false;
  if (f.viewFilter === "white") return !f.blackKeys.has(index + 1);
  if (f.viewFilter === "black") return f.blackKeys.has(index + 1);
  return true;
};

/** Prochaine touche navigable dans la direction demandée (ou null). */
export const nextWeighingKey = (index: number, direction: 1 | -1, f: WeighingNavFilters): number | null => {
  for (let i = index + direction; i >= 0 && i <= 87; i += direction) if (isWeighingKeyVisible(i, f)) return i;
  return null;
};

/** Case suivante (PD → PR → touche suivante, filtre Poids respecté). Même parcours dans les deux vues. */
export const nextWeighingCell = (
  index: number, field: WeightField, direction: 1 | -1, weightFilter: "all" | WeightField, f: WeighingNavFilters,
): { index: number; field: WeightField } | null => {
  const fields: WeightField[] = weightFilter === "all" ? ["wd", "wa"] : [weightFilter];
  const pos = fields.indexOf(field);
  const nf = pos + direction;
  if (pos >= 0 && nf >= 0 && nf < fields.length && isWeighingKeyVisible(index, f)) return { index, field: fields[nf]! };
  const k = nextWeighingKey(index, direction, f);
  if (k === null) return null;
  return { index: k, field: direction === 1 ? fields[0]! : fields[fields.length - 1]! };
};

/** Repère mauve de la case active (Vue Complète) : posé explicitement, sans dépendre du :focus de Safari. */
export const markActiveWeightInput = (el: Element | null) => {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".weight-input[data-active]").forEach((n) => { if (n !== el) n.removeAttribute("data-active"); });
  if (el) el.setAttribute("data-active", "");
};
