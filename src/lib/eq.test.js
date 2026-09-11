import assert from "node:assert/strict";
import test from "node:test";
import { computeEq, emptyToggles, FLAT_EQ } from "./eq.js";

test("flat when no toggles", () => {
  assert.deepEqual(computeEq(emptyToggles()), FLAT_EQ);
});

test("voice lifts midrange and speech highpass", () => {
  const eq = computeEq({ voice: true });
  assert.equal(eq.midFreq, 1800);
  assert.ok(eq.mid >= 6);
  assert.ok(eq.highpass >= 90);
});

test("toggles stack instead of replacing", () => {
  const eq = computeEq({ bass: true, treble: true, rumble: true });
  assert.equal(eq.highpass, 140);
  assert.equal(eq.low, 7);
  assert.equal(eq.high, 6);
});

test("night listen compresses and makes up gain", () => {
  const eq = computeEq({ night: true });
  assert.equal(eq.compressor, true);
  assert.ok(eq.makeup > 1);
});
