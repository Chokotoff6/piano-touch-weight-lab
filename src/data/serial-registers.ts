/**
 * Registre de datation post-1950 par numéro de série.
 * Rempli à l'étape 2 (dictionnaire JSON fourni par l'atelier).
 * Chaque table : paliers [seuil_sn, annee], évalués du plus grand au plus petit.
 */
export type SerialRegister = {
  /** Préfixe exact ("" = sans préfixe). Absent = tout préfixe. */
  prefix?: string;
  /** Usine (ex. "THOMASTON") — informatif / règles spécifiques. */
  factory?: string;
  /** Période d'une série remise à zéro (1, 2…), évaluée dans l'ordre. */
  period?: number;
  table: Array<[number, number]>;
};

/** Clé = marque normalisée (majuscules, sans espaces). */
export const PRODUCTION_YEAR_CHART: Record<string, SerialRegister[]> = {};
