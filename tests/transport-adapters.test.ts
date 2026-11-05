import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fetchTransportArtifact, transportConfig, transportLaunch } from "../apps/desktop/main/transport-adapters";

test("WSL and Docker transport identities and commands are explicit and bounded", () => {
  assert.equal(transportConfig({}), null);
  assert.throws(() => transportConfig({ QLAB_WSL_DISTRO: "Ubuntu", QLAB_DOCKER_CONTAINER: "worker" }), /only one/);
  assert.throws(() => transportConfig({ QLAB_WSL_DISTRO: "-bad", QLAB_WSL_ROOT: "/opt/lab" }), /Invalid/);
  assert.throws(() => transportConfig({ QLAB_DOCKER_CONTAINER: "worker;touch", QLAB_DOCKER_ROOT: "/opt/lab" }), /Invalid/);
  assert.throws(() => transportConfig({ QLAB_WSL_DISTRO: "Ubuntu", QLAB_WSL_ROOT: "/opt/../lab" }), /absolute POSIX/);
  const wsl = transportConfig({ QLAB_WSL_DISTRO: "Ubuntu-24.04", QLAB_WSL_ROOT: "/opt/lab" })!;
  const docker = transportConfig({ QLAB_DOCKER_CONTAINER: "qlab-worker", QLAB_DOCKER_ROOT: "/srv/lab" })!;
  assert.equal(transportLaunch(wsl).command, "wsl.exe");
  assert.deepEqual(transportLaunch(wsl).args.slice(0, 3), ["--distribution", "Ubuntu-24.04", "--exec"]);
  assert.equal(transportLaunch(docker).command, "docker");
  assert.ok(transportLaunch(docker).args.includes("--workdir"));
  assert.equal(docker.artifacts, "/srv/lab/.qlab-artifacts");
});

test("container artifacts remain behind the same hash and size gate", async () => {
  const config = transportConfig({ QLAB_DOCKER_CONTAINER: "qlab", QLAB_DOCKER_ROOT: "/srv/lab" })!;
  const root = await mkdtemp(join(tmpdir(), "qlab-adapter-"));
  const bytes = Buffer.from("0123456789abcdef");
  const expected = { path: "job-1.f64", bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex") };
  try {
    await fetchTransportArtifact(config, "job-1", expected, root, 1000,
      async (_config, _job, target) => { await writeFile(target, bytes); });
    assert.deepEqual(await readFile(join(root, expected.path)), bytes);
    await assert.rejects(fetchTransportArtifact(config, "job-2", { ...expected, path: "job-2.f64" }, root, 1000,
      async (_config, _job, target) => { await writeFile(target, Buffer.alloc(bytes.length)); }), /integrity/);
    assert.equal((await readdir(root)).some(name => name.endsWith(".part")), false);
    await assert.rejects(fetchTransportArtifact(config, "../escape", expected, root), /Invalid remote artifact metadata/);
  } finally {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep)) throw new Error("Unsafe adapter cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});
