import { describe, it, expect } from "vitest";
import { computeHealthScore, badgeFor } from "../src/lib/score-sante";
const rows = (wd: number, wa: number) => Array.from({ length: 88 }, () => ({ wd: String(wd), wa: String(wa) }));
describe("score de santé", () => {
  it("friction ≤ 11,5 g et clavier régulier = 100", () => { expect(computeHealthScore(rows(60, 38))?.score).toBe(100); });
  it("friction moyenne 15 g = pénalité 21", () => { expect(computeHealthScore(rows(65, 35))?.score).toBe(79); });
  it("badges", () => { expect([badgeFor(85), badgeFor(84), badgeFor(50), badgeFor(49)]).toEqual(["A", "B", "C", "D"]); });
});
