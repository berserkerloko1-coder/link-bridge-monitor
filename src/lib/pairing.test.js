import assert from "node:assert/strict";
import test from "node:test";
import { makePairingCode, normalizePairingCode, peerIdForCode } from "./pairing.js";

test("normalize strips junk and uppercases", () => {
  assert.equal(normalizePairingCode(" 7k3-m9p "), "7K3M9P");
});

test("peer id is stable for a code", () => {
  assert.equal(peerIdForCode("ab12cd"), peerIdForCode("AB12CD"));
  assert.match(peerIdForCode("AB12CD"), /^lbmon-AB12CD$/);
});

test("generated codes are 6 chars from the alphabet", () => {
  const code = makePairingCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[2-9A-HJ-NP-Z]+$/);
});
