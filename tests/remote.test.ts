import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchRemoteArtifact, remoteConfig, sshLaunch, verifyRemoteBytes } from "../apps/desktop/main/remote";

test("SSH transport is opt-in, bounded and command-injection resistant", () => {
  assert.equal(remoteConfig({}), null);
  assert.throws(() => remoteConfig({ QLAB_REMOTE_SSH_TARGET: "host" }), /QLAB_REMOTE_ROOT/);
  assert.throws(() => remoteConfig({ QLAB_REMOTE_SSH_TARGET: "-oProxyCommand=bad", QLAB_REMOTE_ROOT: "/work/lab" }));
  assert.throws(() => remoteConfig({ QLAB_REMOTE_SSH_TARGET: "host;touch", QLAB_REMOTE_ROOT: "/work/lab" }));
  assert.throws(() => remoteConfig({ QLAB_REMOTE_SSH_TARGET: "host", QLAB_REMOTE_ROOT: "/work/../lab" }));
  assert.throws(() => remoteConfig({ QLAB_REMOTE_SSH_TARGET: "host", QLAB_REMOTE_ROOT: "/work/lab name" }));
  const config = remoteConfig({ QLAB_REMOTE_SSH_TARGET: "alice@compute.example", QLAB_REMOTE_ROOT: "/srv/quantum-lab" });
  assert.ok(config);
  assert.equal(config.artifacts, "/srv/quantum-lab/.qlab-remote-artifacts");
  const launch = sshLaunch(config);
  assert.equal(launch.command, "ssh");
  assert.ok(launch.args.includes("StrictHostKeyChecking=yes"));
  assert.ok(launch.args.includes("BatchMode=yes"));
  assert.match(launch.args.at(-1)!, /exec env PYTHONPATH=/);
});

test("remote artifact metadata and binary integrity are verified before use", async () => {
  const config = remoteConfig({ QLAB_REMOTE_SSH_TARGET: "compute", QLAB_REMOTE_ROOT: "/srv/quantum-lab" })!;
  const bytes = Buffer.from("0123456789abcdef");
  const expected = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  verifyRemoteBytes(bytes, expected);
  assert.throws(() => verifyRemoteBytes(bytes, { ...expected, sha256: "0".repeat(64) }), /integrity/);
  assert.throws(() => verifyRemoteBytes(bytes, { ...expected, bytes: bytes.length + 1 }), /integrity/);
  await assert.rejects(fetchRemoteArtifact(config, "../escape", { ...expected, path: "../escape.f64" }, "unused"), /Invalid remote artifact metadata/);
  await assert.rejects(fetchRemoteArtifact(config, "job-1", { ...expected, path: "other.f64" }, "unused"), /Invalid remote artifact metadata/);
  const root = await mkdtemp(join(tmpdir(), "qlab-remote-"));
  try {
    await fetchRemoteArtifact(config, "job-1", { ...expected, path: "job-1.f64" }, root, 1000,
      async (_config, _jobId, target) => { await writeFile(target, bytes); });
    assert.deepEqual(await readFile(join(root, "job-1.f64")), bytes);
    await assert.rejects(fetchRemoteArtifact(config, "job-2", { ...expected, path: "job-2.f64" }, root, 1000,
      async (_config, _jobId, target) => { await writeFile(target, Buffer.alloc(bytes.length)); }), /integrity/);
    assert.equal((await readdir(root)).some(name => name.endsWith(".part")), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
