import test from "node:test";
import assert from "node:assert/strict";
import { resolveSourceRunLaunch, sourceRunLaunchArguments } from "../apps/desktop/main/source-run-launch";
import type { VerifiedSavedRun } from "../packages/contracts";

const hash = "a".repeat(64);
test("Math3D source-run intent accepts only one bounded run ID and result hash", () => {
  assert.equal(sourceRunLaunchArguments(["electron", "."]), null);
  assert.deepEqual(sourceRunLaunchArguments(["electron", ".", "--quantum-source-run", "run-123", hash]),
    { runId: "run-123", resultSha256: hash });
  assert.throws(() => sourceRunLaunchArguments(["--quantum-source-run", "../run", hash]), /Invalid/);
  assert.throws(() => sourceRunLaunchArguments(["--quantum-source-run", "run-123", "bad"]), /Invalid/);
  assert.throws(() => sourceRunLaunchArguments(["--quantum-source-run", "run-123", hash,
    "--quantum-source-run", "run-456", hash]), /Only one/);
});

test("source-run intent needs a hash-verified compatible saved run", async () => {
  const intent = { runId: "run-123", resultSha256: hash };
  const saved = { result: { runId: intent.runId, operation: "orbital", model: { type: "hydrogenic" } },
    job: {}, data: new Uint8Array([1, 2]) } as VerifiedSavedRun;
  let verifications = 0;
  const store = { verifiedSource: async (runId: string, expectedResultHash: string) => {
    verifications++;
    assert.equal(runId, intent.runId);
    if (expectedResultHash !== hash) throw new Error("Source result hash does not match the verified saved run");
    return saved;
  } };
  assert.deepEqual(await resolveSourceRunLaunch(store, intent),
    { ok: true, runId: intent.runId, resultSha256: hash, saved });
  assert.equal(verifications, 1);
  await assert.rejects(resolveSourceRunLaunch(store, { ...intent, resultSha256: "0".repeat(64) }), /does not match/);
  await assert.rejects(resolveSourceRunLaunch({ verifiedSource: async () => {
    throw new Error("Run metadata failed integrity check");
  } }, intent), /integrity/);
  await assert.rejects(resolveSourceRunLaunch({ verifiedSource: async () => ({
    ...saved, result: { ...saved.result, runId: "different" },
  }) }, intent), /ID changed/);
});
