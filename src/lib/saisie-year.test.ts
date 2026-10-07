import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// Exercise the actual form validator with a controlled device clock.
const source = readFileSync(new URL("../routes/saisie.tsx", import.meta.url), "utf8");
const body = source.match(/const validateYear = \(raw: string\) => \{([\s\S]*?)\n  \};/)?.[1];
if (!body) throw new Error("Manufacturing year validator not found");
const validate = new Function("raw", "Date", "setYearError", body);
const clock = (year: number) => class { getFullYear() { return year; } };

describe("manufacturing year bounds", () => {
  it("accepts 1700 but rejects 1699", () => {
    assert.equal(validate("1700", clock(2026), () => {}), true);
    assert.equal(validate("1699", clock(2026), () => {}), false);
  });
  it("uses the device year, including after 2026, and rejects the next year", () => {
    assert.equal(validate("2027", clock(2027), () => {}), true);
    assert.equal(validate("2028", clock(2027), () => {}), false);
    assert.equal(validate("2027", clock(2026), () => {}), false);
  });
});