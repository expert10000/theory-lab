import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startGateway } from "../apps/gateway/server";
import { spectrumJob, evolutionJob, defaultsFor } from "../packages/models";

const token = "gateway-test-token-0123456789-abcdef";

test("gateway enforces authentication and origin before running versioned jobs", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "qlab-gateway-"));
  const gateway = await startGateway({ root: process.cwd(), dataDir, webDir: join(process.cwd(), "dist", "web"), token, port: 0 });
  try {
    const url = `${gateway.origin}/api/status`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: "Bearer wrong" } })).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token}`, Origin: "https://evil.example" } })).status, 403);
    const status = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(status.status, 200);
    assert.equal((await status.json()).state, "READY");
    const resources = await fetch(`${gateway.origin}/api/resources`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(resources.status, 200);
    assert.equal((await resources.json()).schema, "worker-resources/v1");

    const job = spectrumJob("gateway-spectrum", defaultsFor("two_level"), "native");
    const resultResponse = await fetch(`${gateway.origin}/api/jobs`, { method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(job) });
    assert.equal(resultResponse.status, 200);
    const result = await resultResponse.json();
    assert.equal(result.schema, "quantum-result/v1");
    assert.equal(result.jobId, job.jobId);
    assert.equal(result.operation, "diagonalize");
    assert.ok(Math.abs(result.spectrum.eigenvalues[0] + Math.hypot(1, 0.8) / 2) < 1e-10);

    const invalid = await fetch(`${gateway.origin}/api/jobs`, { method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(invalid.status, 400);
    const runs = await fetch(`${gateway.origin}/api/runs`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(runs.status, 200);
    assert.equal((await runs.json())[0].jobId, job.jobId);
    const activity = await fetch(`${gateway.origin}/api/activity`, { headers: { Authorization: `Bearer ${token}` } });
    const calls = await activity.json();
    assert.equal(calls.schema, "gateway-activity/v1");
    assert.ok(calls.recent.some((call: { route: string; status: number }) => call.route === "/api/jobs" && call.status === 200));
  } finally {
    await gateway.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("gateway serves verified evolution artifacts and rejects invalid binding", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "qlab-gateway-data-"));
  await assert.rejects(startGateway({ root: process.cwd(), dataDir,
    webDir: "", token, host: "0.0.0.0", port: 0 }), /requires TLS/);
  await assert.rejects(startGateway({ root: process.cwd(), dataDir,
    webDir: "", token, port: 0, origin: "https://example.test" }), /matching TLS mode/);
  const gateway = await startGateway({ root: process.cwd(), dataDir,
    webDir: join(process.cwd(), "dist", "web"), token, port: 0 });
  try {
    const job = evolutionJob("driven_two_level", "gateway-evolution", defaultsFor("driven_two_level"), 0, 0, 1, 11, "native");
    const resultResponse = await fetch(`${gateway.origin}/api/jobs`, { method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(job) });
    assert.equal(resultResponse.status, 200);
    const result = await resultResponse.json();
    assert.equal(result.data.rows, 11);
    const artifactUrl = `${gateway.origin}/api/artifacts/${job.jobId}`;
    assert.equal((await fetch(artifactUrl)).status, 401);
    const artifactResponse = await fetch(artifactUrl, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(artifactResponse.status, 200);
    const artifact = await artifactResponse.arrayBuffer();
    assert.equal(artifact.byteLength, result.data.bytes);
    assert.equal(new DataView(artifact).getFloat64(8, true), 1);
    assert.equal((await fetch(`${gateway.origin}/api/artifacts/missing`,
      { headers: { Authorization: `Bearer ${token}` } })).status, 404);
  } finally {
    await gateway.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
