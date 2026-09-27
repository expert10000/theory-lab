import { test } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { defaultsFor, evolutionJob } from "../packages/models";

test("SSH-style worker stream and separate binary copy preserve the verified job path", {
  skip: process.platform === "win32" || !process.cwd().startsWith("/"),
}, async () => {
  const root = process.cwd();
  const scratch = await mkdtemp(join(tmpdir(), "qlab-ssh-test-"));
  const bin = join(scratch, "bin"), remoteArtifacts = join(scratch, "remote"), localArtifacts = join(scratch, "local");
  await mkdir(bin);
  const ssh = join(bin, "ssh"), scp = join(bin, "scp");
  await writeFile(ssh, '#!/bin/sh\nexec "$QLAB_REMOTE_PYTHON" -u -m quantum_worker.main\n');
  await writeFile(scp, '#!/bin/sh\nfor item do previous="$last"; last="$item"; done\nsource="${previous#*:}"\ncp "$source" "$last"\n');
  await chmod(ssh, 0o755); await chmod(scp, 0o755);
  const keys = ["QLAB_REMOTE_SSH_TARGET", "QLAB_REMOTE_ROOT", "QLAB_REMOTE_PYTHON", "QLAB_REMOTE_ARTIFACTS", "PATH"] as const;
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.QLAB_REMOTE_SSH_TARGET = "test-host";
  process.env.QLAB_REMOTE_ROOT = root;
  process.env.QLAB_REMOTE_PYTHON = join(root, ".venv", "bin", "python");
  process.env.QLAB_REMOTE_ARTIFACTS = remoteArtifacts;
  process.env.PATH = `${bin}:${process.env.PATH}`;
  const supervisor = new WorkerSupervisor(root);
  try {
    const status = await supervisor.start();
    assert.equal(status.state, "READY", status.detail);
    assert.equal(status.transport, "ssh");
    const coordinator = new EvolutionCoordinator(supervisor, localArtifacts, () => {});
    const job = evolutionJob("driven_two_level", "remote-job", defaultsFor("driven_two_level"), 0, 0, 1, 11, "native");
    const result = await coordinator.run(job);
    assert.equal(result.operation, "evolve");
    const data = await coordinator.readData(job.jobId);
    assert.equal(data.byteLength, result.data.bytes);
    assert.ok(data.byteLength > 0);
  } finally {
    await supervisor.stop();
    for (const key of keys) {
      const value = prior[key];
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(scratch, { recursive: true, force: true });
  }
});
