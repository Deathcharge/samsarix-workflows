import assert from "node:assert/strict";
import test from "node:test";

test("the Node workflow executes tests", () => {
  assert.equal("helix".toUpperCase(), "HELIX");
});
