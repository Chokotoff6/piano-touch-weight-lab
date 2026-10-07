import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

// Exercise the actual form validator with a controlled device clock.
const source = readFileSync(new URL("../routes/saisie.tsx", import.meta.url), "utf8");
const body = source.match(/const validateYear = \(raw: string\) => \{([\s\S]*?)\n  \};/)?.[1];
if (!body) throw new Error("Manufacturing year validator not found");
const validate = new Function("raw", "Date", "setYearError", body);
const clock = (year: number) => class { getFullYear() { return year; } };

describe("manufacturing year bounds", () => {
  it("accepts 1700 but rejects 1699", () => {
    expect(validate("1700", clock(2026), () => {})).toBe(true);
    expect(validate("1699", clock(2026), () => {})).toBe(false);
  });
  it("uses the device year, including after 2026, and rejects the next year", () => {
    expect(validate("2027", clock(2027), () => {})).toBe(true);
    expect(validate("2028", clock(2027), () => {})).toBe(false);
    expect(validate("2027", clock(2026), () => {})).toBe(false);
  });
});