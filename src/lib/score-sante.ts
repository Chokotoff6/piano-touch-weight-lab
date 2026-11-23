/** Score de Santé /100 du toucher (formule du document « bilansanté »). */
export type ScoreRow = { wd: string; wa: string };
export type ScoreBadge = "A" | "B" | "C" | "D";
export type ScoreAlert = "heavySharps" | "heavyNaturals" | "sharpFriction" | "hardSpot";
export type HealthScore = {
  score: number; badge: ScoreBadge;
  penalties: { friction: number; regularity: number; balance: number };
  alerts: ScoreAlert[]; hardSpots: number[]; measured: number;
};
const BLACK = new Set([2,5,7,10,12,14,17,19,22,24,26,29,31,34,36,38,41,43,46,48,50,53,55,58,60,62,65,67,70,72,74,77,79,82,84,86]);
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v: number[]) => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };

export function badgeFor(score: number): ScoreBadge {
  return score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";
}

export function computeHealthScore(rows: ScoreRow[]): HealthScore | null {
  const keys: { n: number; f: number; pb: number; black: boolean }[] = [];
  rows.forEach((r, i) => {
    const wd = Number(r.wd), wa = Number(r.wa);
    if (!r.wd || !r.wa || !Number.isFinite(wd) || !Number.isFinite(wa) || wd <= wa) return;
    keys.push({ n: i + 1, f: (wd - wa) / 2, pb: (wd + wa) / 2, black: BLACK.has(i + 1) });
  });
  if (keys.length < 2) return null;
  const F = keys.map((k) => k.f), PB = keys.map((k) => k.pb);
  const white = keys.filter((k) => !k.black), black = keys.filter((k) => k.black);
  const fMean = mean(F);
  const pFriction = fMean <= 11.5 ? 0 : Math.min(45, (fMean - 11.5) * 6);
  const pRegularity = Math.min(35, Math.max(0, sd(F) - 1.5) * 8 + Math.max(0, sd(PB) - 2.0) * 5);
  const pbW = white.length ? mean(white.map((k) => k.pb)) : NaN;
  const pbB = black.length ? mean(black.map((k) => k.pb)) : NaN;
  const dPB = Number.isFinite(pbW) && Number.isFinite(pbB) ? Math.abs(pbB - pbW) : 0;
  const pBalance = dPB <= 2.5 ? 0 : Math.min(20, (dPB - 2.5) * 4);
  const score = Math.max(0, Math.round(100 - (pFriction + pRegularity + pBalance)));
  const alerts: ScoreAlert[] = [];
  if (Number.isFinite(pbW) && Number.isFinite(pbB)) {
    if (pbB - pbW > 3.5) alerts.push("heavySharps");
    if (pbW - pbB > 3.5) alerts.push("heavyNaturals");
    if (mean(black.map((k) => k.f)) - mean(white.map((k) => k.f)) > 3.0) alerts.push("sharpFriction");
  }
  const hardSpots = keys.filter((k, i) => {
    const nb = [keys[i - 1], keys[i + 1]].filter((x): x is typeof k => !!x);
    return nb.length > 0 && k.f - mean(nb.map((x) => x.f)) > 5.0;
  }).map((k) => k.n);
  if (hardSpots.length) alerts.push("hardSpot");
  return { score, badge: badgeFor(score), penalties: { friction: pFriction, regularity: pRegularity, balance: pBalance }, alerts, hardSpots, measured: keys.length };
}

export const ALERT_LABELS: Record<ScoreAlert, { fr: string; en: string }> = {
  heavySharps: { fr: "Dièses lourds (> 3,5 g vs blanches)", en: "Heavy sharps (> 3.5 g vs naturals)" },
  heavyNaturals: { fr: "Blanches lourdes (> 3,5 g vs noires)", en: "Heavy naturals (> 3.5 g vs sharps)" },
  sharpFriction: { fr: "Friction dièses élevée (> 3 g)", en: "High sharp friction (> 3 g)" },
  hardSpot: { fr: "Point dur isolé (> 5 g)", en: "Isolated hard spot (> 5 g)" },
};
export const BADGE_LABELS: Record<ScoreBadge, { fr: string; en: string }> = {
  A: { fr: "Excellent", en: "Excellent" }, B: { fr: "Bon", en: "Good" }, C: { fr: "Moyen", en: "Fair" }, D: { fr: "Critique", en: "Critical" },
};
