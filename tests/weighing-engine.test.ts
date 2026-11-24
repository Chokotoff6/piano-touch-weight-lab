import { describe, expect, it } from "vitest";
import { entryVerdict } from "../src/lib/weighing-engine";

describe("moteur de pesée", () => {
  it("1 chiffre : aucune décision", () => expect(entryVerdict("wd", "5", "")).toBe("partial"));
  it("55 en PD sans PR : saut autorisé", () => expect(entryVerdict("wd", "55", "")).toBe("ok"));
  it("PD doit être strictement supérieur à PR", () => expect(entryVerdict("wa", "45", "45")).toBe("mechanical"));
  it("PD hors plage 30-90 g", () => expect(entryVerdict("wd", "25", "")).toBe("range"));
  it("PR hors plage 10-40 g", () => expect(entryVerdict("wa", "41", "60")).toBe("range"));
  it("PD 70-90 g : alerte pédale", () => expect(entryVerdict("wd", "70", "")).toBe("pedal"));
});
