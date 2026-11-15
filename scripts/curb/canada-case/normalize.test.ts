import assert from "node:assert/strict";
import test from "node:test";
import { classifyMaximum, normalizeMeasurement, normalizeUsd } from "./normalize.ts";

test("preserves raw units, exact values and intervals without midpoint imputation", () => {
  assert.deepEqual(normalizeMeasurement("9.8%", "%"), { raw: "9.8%", unit: "%", lower: 9.8, upper: 9.8 });
  assert.deepEqual(normalizeMeasurement("1.5% - 3.2%", "%"), { raw: "1.5% - 3.2%", unit: "%", lower: 1.5, upper: 3.2 });
  assert.deepEqual(normalizeMeasurement('1–2"', "in"), { raw: '1–2"', unit: "in", lower: 1, upper: 2 });
  assert.equal(normalizeMeasurement("under construction", "%").lower, null);
  assert.throws(() => normalizeMeasurement("9.8%", "ft"));
  assert.throws(() => normalizeMeasurement("3-2", "%"));
  assert.throws(() => normalizeMeasurement("-1", "%"));
  assert.throws(() => normalizeMeasurement("<2", "%"));
});

test("threshold crossing is unresolved, and endpoints are inclusive", () => {
  assert.equal(classifyMaximum(normalizeMeasurement("1.5-2.5%", "%"), 2), "unresolved");
  assert.equal(classifyMaximum(normalizeMeasurement("1-2%", "%"), 2), "within");
  assert.equal(classifyMaximum(normalizeMeasurement("2.4%", "%"), 2), "exceeds");
  assert.equal(classifyMaximum(normalizeMeasurement("", "%"), 2), "unresolved");
  assert.throws(() => classifyMaximum({ lower: 3, upper: 1 }, 2));
  assert.throws(() => classifyMaximum({ lower: 1, upper: 1 }, NaN));
});

test("USD parsing preserves individual versus subtotal and unknown versus zero", () => {
  assert.equal(normalizeUsd("$7,000.00"), 700000);
  assert.equal(normalizeUsd("$20,000"), 2000000);
  assert.equal(normalizeUsd("$0"), 0);
  assert.equal(normalizeUsd("REF"), null);
  assert.equal(normalizeUsd(""), null);
  assert.equal(normalizeUsd("$1.01"), 101);
  assert.equal(normalizeUsd("$90071992547409.91"), Number.MAX_SAFE_INTEGER);
  for (const malformed of ["$90071992547409.92", "-1", "NaN", "1e5", "$1,00", "1.001", "$7,000 + $3,500"]) {
    assert.throws(() => normalizeUsd(malformed));
  }
});
