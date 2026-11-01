import type { TargetRamp } from "@/lib/preferences";

/** Calculs purs des graphiques (hors fichiers de route pour préserver le rafraîchissement instantané). */
// Toutes les notes pesées portent une pastille : le tracé couvre les 88 touches.
export const SAMPLE_NOTES = Array.from({ length: 88 }, (_, index) => index + 1);
const BLACK_MODULOS = new Set([2, 5, 7, 10, 0]);
export const isBlackKey = (noteIndex: number) => BLACK_MODULOS.has(noteIndex % 12);

export type KeyFilter = "all" | "split" | "white" | "black";

export type RefProfile = {
  wd: number[];
  wa: number[];
  friction: number[];
  balance: number[];
};

export type ChartPoint = {
  key: number;
  isBlack: boolean;
  wdCur: number | undefined;
  wdCurW: number | undefined;
  wdCurB: number | undefined;
  sameWd: number | undefined;
  sameWdW: number | undefined;
  sameWdB: number | undefined;
  stdWd: number | undefined;
  waCur: number | undefined;
  waCurW: number | undefined;
  waCurB: number | undefined;
  sameWa: number | undefined;
  sameWaW: number | undefined;
  sameWaB: number | undefined;
  stdWa: number | undefined;
  balCur: number | undefined;
  balCurW: number | undefined;
  balCurB: number | undefined;
  sameBal: number | undefined;
  sameBalW: number | undefined;
  sameBalB: number | undefined;
  factoryBal: number | undefined;
  fricCur: number | undefined;
  fricCurW: number | undefined;
  fricCurB: number | undefined;
  sameFric: number | undefined;
  sameFricW: number | undefined;
  sameFricB: number | undefined;
  // Références de tolérance (Cible standard), toujours présentes même si la courbe verte est masquée.
  tolWd?: number | undefined;
  tolWa?: number | undefined;
  tolBal?: number | undefined;
  tolFric?: number | undefined;
  factoryFric: number | undefined;
  wdMid: number | undefined;
  waMid: number | undefined;
  balMid: number | undefined;
  fricMid: number | undefined;
};


export type SeriesKey = keyof Omit<ChartPoint, "key" | "isBlack">;
export const n1 = (value: number) => Number(value.toFixed(1));

function valueAt(values: number[] | undefined, noteIndex: number, sampleIndex: number) {
  const source = values ?? [];
  const raw = source.length >= 88
    ? source[noteIndex - 1]
    : source[Math.min(Math.max(sampleIndex - 1, 0), source.length - 1)];
  return typeof raw === "number" && Number.isFinite(raw) ? n1(raw) : undefined;
}

export function buildChartData(
  mine: RefProfile | null,
  cloud: RefProfile | null,
  standard: RefProfile | null,
): ChartPoint[] {
  const points: ChartPoint[] = SAMPLE_NOTES.map((noteIndex, sampleIndex) => {
    const black = isBlackKey(noteIndex);
    const wdCur = valueAt(mine?.wd, noteIndex, sampleIndex);
    const waCur = valueAt(mine?.wa, noteIndex, sampleIndex);
    const balCur = valueAt(mine?.balance, noteIndex, sampleIndex);
    const fricCur = valueAt(mine?.friction, noteIndex, sampleIndex);
    const sameWd = valueAt(cloud?.wd, noteIndex, sampleIndex);
    const sameWa = valueAt(cloud?.wa, noteIndex, sampleIndex);
    const sameBal = valueAt(cloud?.balance, noteIndex, sampleIndex);
    const sameFric = valueAt(cloud?.friction, noteIndex, sampleIndex);
    return {
      key: noteIndex,
      isBlack: black,
      wdCur,
      wdCurW: black ? undefined : wdCur,
      wdCurB: black ? wdCur : undefined,
      sameWd,
      sameWdW: black ? undefined : sameWd,
      sameWdB: black ? sameWd : undefined,
      stdWd: valueAt(standard?.wd, noteIndex, sampleIndex),
      waCur,
      waCurW: black ? undefined : waCur,
      waCurB: black ? waCur : undefined,
      sameWa,
      sameWaW: black ? undefined : sameWa,
      sameWaB: black ? sameWa : undefined,
      stdWa: valueAt(standard?.wa, noteIndex, sampleIndex),
      balCur,
      balCurW: black ? undefined : balCur,
      balCurB: black ? balCur : undefined,
      sameBal,
      sameBalW: black ? undefined : sameBal,
      sameBalB: black ? sameBal : undefined,
      factoryBal: valueAt(standard?.balance, noteIndex, sampleIndex),
      fricCur,
      fricCurW: black ? undefined : fricCur,
      fricCurB: black ? fricCur : undefined,
      sameFric,
      sameFricW: black ? undefined : sameFric,
      sameFricB: black ? sameFric : undefined,
      factoryFric: valueAt(standard?.friction, noteIndex, sampleIndex),
      tolWd: valueAt((standard ?? FACTORY_STANDARD).wd, noteIndex, sampleIndex),
      tolWa: valueAt((standard ?? FACTORY_STANDARD).wa, noteIndex, sampleIndex),
      tolBal: valueAt((standard ?? FACTORY_STANDARD).balance, noteIndex, sampleIndex),
      tolFric: valueAt((standard ?? FACTORY_STANDARD).friction, noteIndex, sampleIndex),
      wdMid: undefined,
      waMid: undefined,
      balMid: undefined,
      fricMid: undefined,
    };

  });
  // Ligne fantôme servant uniquement à ancrer l'étiquette "Mon piano" à mi-hauteur
  // entre la courbe des blanches et celle des noires en vue éclatée.
  const midOf = (whiteKey: SeriesKey, blackKey: SeriesKey) => {
    const firstOf = (key: SeriesKey) => points.find((point) => typeof point[key] === "number")?.[key] as number | undefined;
    const white = firstOf(whiteKey);
    const black = firstOf(blackKey);
    if (typeof white !== "number" || typeof black !== "number") return undefined;
    return n1((white + black) / 2);
  };
  const wdMid = midOf("wdCurW", "wdCurB");
  const waMid = midOf("waCurW", "waCurB");
  const balMid = midOf("balCurW", "balCurB");
  const fricMid = midOf("fricCurW", "fricCurB");
  return points.map((point) => ({ ...point, wdMid, waMid, balMid, fricMid }));
}

/**
 * Lissage local (moyenne mobile glissante sur 3 notes) appliqué séparément à
 * chaque série. Les extrémités de chaque série (première et dernière valeur
 * définie) conservent leur valeur brute pour éviter tout effondrement.
 * Calcul 100 % client : aucune requête réseau.
 */
const SMOOTH_SKIP: ReadonlySet<string> = new Set(["key", "isBlack", "wdMid", "waMid", "balMid", "fricMid"]);

export function smoothChartData(points: ChartPoint[], windowSize: 3 | 5 = 3): ChartPoint[] {
  if (points.length === 0) return points;
  const output = points.map((point) => ({ ...point }));
  const keys = Object.keys(points[0] ?? {}).filter((key) => !SMOOTH_SKIP.has(key)) as SeriesKey[];
  keys.forEach((key) => {
    const defined: number[] = [];
    points.forEach((point, index) => {
      if (typeof point[key] === "number" && Number.isFinite(point[key])) defined.push(index);
    });
    if (windowSize === 3 && defined.length < 3) return;
    for (let position = 0; position < defined.length; position += 1) {
      // Le lissage historique garde ses deux extrémités brutes. Lissé+ utilise
      // les voisins disponibles aux bords, sans ajouter de zéros ni de NaN.
      if (windowSize === 3 && (position === 0 || position === defined.length - 1)) continue;
      const radius = (windowSize - 1) / 2;
      const neighbors = defined.slice(Math.max(0, position - radius), position + radius + 1);
      const values = neighbors.map((index) => points[index]?.[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const index = defined[position];
      const resultPoint = index === undefined ? undefined : output[index];
      if (resultPoint && values.length > 0) resultPoint[key] = n1(values.reduce((sum, value) => sum + value, 0) / values.length);
    }
  });
  return output;
}

// Abaque théorique d'usine calculé en local (aucun appel réseau).
export function makeFactoryStandard(target: TargetRamp = { wdStart: 68, wdEnd: 58, waStart: 56, waEnd: 48 }): RefProfile {
  const ramp = (start: number, end: number) =>
    Array.from({ length: 88 }, (_, index) => n1(start + ((end - start) * index) / 87));
  const wd = ramp(target.wdStart, target.wdEnd);
  const wa = ramp(target.waStart, target.waEnd);
  return {
    wd,
    wa,
    balance: wd.map((value, index) => {
      const returnWeight = wa[index];
      return returnWeight === undefined ? Number.NaN : n1((value + returnWeight) / 2);
    }),
    friction: wd.map((value, index) => {
      const returnWeight = wa[index];
      return returnWeight === undefined ? Number.NaN : n1((value - returnWeight) / 2);
    }),
  };
}
export const FACTORY_STANDARD: RefProfile = makeFactoryStandard();
