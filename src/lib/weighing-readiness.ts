import { OCTAVE_RANGES } from "@/lib/required-keys";

type Measurement = { wd: string; wa: string };
const RAPID_KEYS = [3, 4, 15, 16, 27, 28, 39, 40, 51, 52, 63, 64, 75, 76, 87];
export const OCTAVE_ADVANCE_MS = 500;

/** Read only the current measurements; UI error caches never decide access. */
export function weighingReadiness(rows: Measurement[], rapid: boolean) {
  let issue: "incomplete" | "mechanical" | "range" | null = null;
  const complete = new Set<number>();
  rows.forEach((row, index) => {
    const d = row.wd.trim(); const a = row.wa.trim();
    if (!d && !a) return;
    if (!d || !a) { issue ??= "incomplete"; return; }
    const wd = Number(d.replace(",", ".")); const wa = Number(a.replace(",", "."));
    if (!Number.isFinite(wd) || !Number.isFinite(wa) || wd < 30 || wd > 90 || wa < 10 || wa > 40) {
      issue ??= "range"; return;
    }
    if (wd <= wa) { issue ??= "mechanical"; return; }
    complete.add(index);
  });
  const quota = rapid
    ? RAPID_KEYS.every((i) => complete.has(i))
    : OCTAVE_RANGES.every(([start, end]) => [...complete].filter((i) => i + 1 >= start && i + 1 <= end).length >= 2);
  return { ready: issue === null && quota, issue, quota };
}

export function weighingLockMessage(issue: ReturnType<typeof weighingReadiness>["issue"], rapid: boolean, en: boolean) {
  if (issue === "incomplete") return en ? "Incomplete entry: enter both Down weight and Up weight for every measured key." : "Saisie incomplète : renseignez le Poids descendant et le Poids remontant de chaque touche mesurée.";
  if (issue === "mechanical") return en ? "Mechanical error: Down weight must be strictly greater than Up weight." : "Erreur mécanique : le Poids descendant doit être strictement supérieur au Poids remontant.";
  if (issue === "range") return en ? "Out of shop range: Down weight 30–90 g; Up weight 10–40 g." : "Valeur hors plage d’atelier : Poids descendant 30–90 g ; Poids remontant 10–40 g.";
  return rapid
    ? en ? "Weigh every C and C# to generate a Dashboard." : "Pesez tous les Do et Do# pour générer un Bilan."
    : en ? "Weigh at least 2 notes per octave (octaves 1 to 7) to generate a Dashboard." : "Pesez au moins 2 notes par octave (octaves 1 à 7) pour générer un Bilan.";
}