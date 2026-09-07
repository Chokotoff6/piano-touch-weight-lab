// Règle de remplissage minimale : au moins une touche blanche ET une touche noire
// mesurée par octave du piano.

const BLACK_KEYS = new Set([
  2, 5, 7, 10, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 46, 48, 50, 53, 55, 58, 60,
  62, 65, 67, 70, 72, 74, 77, 79, 82, 84, 86,
]);

/** Découpage du clavier en octaves (bornes incluses), à partir des Do.
 *  L'octave 0 (touches 1-3, La0-Si0) et l'octave 8 (touche 88, Do8) sont
 *  exclues de la règle : la validation s'applique des octaves 1 à 7. */
export const OCTAVE_RANGES: [number, number][] = [
  [4, 15],
  [16, 27],
  [28, 39],
  [40, 51],
  [52, 63],
  [64, 75],
  [76, 87],
];

type Row = { wa: string; wd: string };

const filled = (row: Row | undefined) =>
  !!row && (row.wa.trim() !== "" || row.wd.trim() !== "");

export function hasAnyMeasurement(rows: Row[]): boolean {
  return rows.some((r) => filled(r));
}

/** Retourne les octaves (index 1-based) incomplètes. */
export function incompleteOctaves(rows: Row[]): number[] {
  const out: number[] = [];
  OCTAVE_RANGES.forEach(([start, end], i) => {
    let white = false;
    let black = false;
    for (let key = start; key <= end; key += 1) {
      if (!filled(rows[key - 1])) continue;
      if (BLACK_KEYS.has(key)) black = true;
      else white = true;
    }
    if (!white || !black) out.push(i + 1);
  });
  return out;
}

/** CONDITION 1 : tous les Do et tous les Do# doivent être saisis.
 *  Tolérance : la touche 88 (Do 8) peut rester vide. */
export const C_SAMPLING_KEYS = [4, 5, 16, 17, 28, 29, 40, 41, 52, 53, 64, 65, 76, 77];

/** Retourne les numéros de touche Do/Do# encore non saisis. */
export function missingSamplingKeys(rows: Row[]): number[] {
  return C_SAMPLING_KEYS.filter((key) => !filled(rows[key - 1]));
}

export const OCTAVE_RULE_MESSAGE =
  "⚠️ Saisie conforme = minimum tous les Do et tous les Do# du clavier.";

export const OCTAVE_RULE_MESSAGE_EN =
  "⚠️ Compliant input = minimum all C and all C# of the keyboard.";

export const EMPTY_DATA_MESSAGE = "⚠️ Veuillez d'abord saisir les données de votre piano.";


// Permet à la navigation globale de vérifier l'état de la page Saisie.
export const saisieGate: {
  hasData: (() => boolean) | null;
} = {
  hasData: null,
};
