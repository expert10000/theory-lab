import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fixture from "../packages/quantum-scene/fixtures/complex-field.json";
import { assertScene } from "../packages/quantum-scene";
import { writeSceneBundle } from "../packages/quantum-scene/bundle";
import {
  makeSceneStream,
  SceneChunkLoader,
} from "../packages/quantum-scene/stream";
import { writeStreamBundle } from "../packages/quantum-scene/stream-bundle";
import {
  readBrowserBundle,
  boundedResponse,
} from "../packages/quantum-scene/browser-bundle";
import { startGateway } from "../apps/gateway/server";
import { TOPOLOGY_DEFAULTS, topologyJob } from "../packages/models/topology";
const digest = async (b: Uint8Array) =>
  createHash("sha256").update(b).digest("hex");
test("browser imports bounded regular/stream folders and rejects paths, duplicate files and network overruns", async () => {
  const root = await mkdtemp(join(tmpdir(), "qvis-web-files-"));
  try {
    const scene: unknown = structuredClone(fixture.scene);
    assertScene(scene);
    const p = {
      scene,
      artifacts: Object.fromEntries(
        Object.entries(fixture.values).map(([path, v]) => {
          const b = Buffer.alloc(v.length * 8);
          v.forEach((n, i) => b.writeDoubleLE(n, i * 8));
          return [path, b];
        }),
      ),
    };
    for (const folder of [
      await writeSceneBundle(p, root),
      await writeStreamBundle(
        await makeSceneStream(
          [{ label: "Full supplied samples", payload: p }],
          digest,
        ),
        root,
      ),
    ]) {
      const files = await Promise.all(
        (await readdir(folder)).map(async (path) => {
          const bytes = await readFile(join(folder, path));
          return {
            path: `fixture.qscene/${path}`,
            size: bytes.length,
            read: async () => new Uint8Array(bytes),
          };
        }),
      );
      const importing = new AbortController();
      const result = await readBrowserBundle(files, digest, importing.signal);
      // Replacing an import must not poison the retained stream's future reads.
      importing.abort();
      if (result.kind === "regular")
        assert.deepEqual(result.payload.scene, p.scene);
      else {
        const l = new SceneChunkLoader(result.manifest, result.read, digest);
        assert.deepEqual(
          (await l.load(0, new AbortController().signal)).scene,
          p.scene,
        );
      }
      await assert.rejects(
        readBrowserBundle([...files, files[0]], digest),
        /Duplicate/,
      );
      await assert.rejects(
        readBrowserBundle(
          files.map((f, i) => (i ? f : { ...f, path: "../secret" })),
          digest,
        ),
        /unsafe/,
      );
      await assert.rejects(
        readBrowserBundle(
          files.map((f, i) => (i ? f : { ...f, path: f.path.split("/")[1] })),
          digest,
        ),
        /Mixed/,
      );
      const c = new AbortController();
      c.abort();
      await assert.rejects(
        readBrowserBundle(files, digest, c.signal),
        /abort/i,
      );
    }
    await assert.rejects(
      boundedResponse(new Response(new Uint8Array(33)), 32),
      /budget/,
    );
    await assert.rejects(
      boundedResponse(
        new Response(new Uint8Array(1), {
          headers: { "content-length": "100" },
        }),
        32,
      ),
      /budget/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("read-only scene HTTP routes preserve authentication, origin and binary boundaries", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "qvis-gateway-scenes-")),
    token = "qvis-scene-test-token-0123456789-abcdef",
    gateway = await startGateway({
      root: process.cwd(),
      dataDir,
      webDir: "dist/web",
      token,
      port: 0,
    }),
    headers = { Authorization: `Bearer ${token}` };
  try {
    const job = topologyJob("web-scene-test", TOPOLOGY_DEFAULTS),
      res = await fetch(`${gateway.origin}/api/jobs`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
    assert.equal(res.status, 200);
    const result = await res.json(),
      base = `${gateway.origin}/api/scenes/${result.runId}`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal(
      (
        await fetch(base, {
          headers: { ...headers, Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    assert.equal((await fetch(`${base}?view=bad`, { headers })).status, 400);
    assert.equal(
      (await fetch(`${base}?view=bands&path=secret`, { headers })).status,
      400,
    );
    const metadata = await fetch(`${base}?view=bands`, { headers });
    assert.equal(metadata.status, 200);
    const scene = await metadata.json();
    assertScene(scene);
    assert.equal(scene.provenance.runId, result.runId);
    for (const d of scene.datasets) {
      const response = await fetch(`${base}/datasets/${d.id}?view=bands`, {
        headers,
      });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("content-type"),
        "application/octet-stream",
      );
      const b = new Uint8Array(await response.arrayBuffer());
      assert.equal(b.length, d.bytes);
      assert.equal(await digest(b), d.sha256);
    }
    assert.equal(
      (await fetch(`${base}/datasets/missing?view=bands`, { headers })).status,
      404,
    );
    const stream = await fetch(`${base}/stream?view=bands`, { headers }).then(
        (r) => r.json(),
      ),
      loader = new SceneChunkLoader(
        stream,
        async (p) => {
          const response = await fetch(`${base}/chunks/${p}?view=bands`, {
            headers,
          });
          const bytes: ArrayBuffer = await response.arrayBuffer();
          return new Uint8Array(bytes);
        },
        digest,
      );
    assert.equal(
      (await loader.load(1, new AbortController().signal)).scene.provenance
        .runId,
      result.runId,
    );
    assert.equal(
      (
        await fetch(`${base}/chunks/chunk-${"0".repeat(64)}.f64?view=bands`, {
          headers,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${gateway.origin}/api/runs`, { headers }).then((r) =>
          r.json(),
        )
      ).length,
      1,
    );
    await gateway.worker.stop();
    assert.equal((await fetch(`${base}?view=bands`, { headers })).status, 200);
  } finally {
    await gateway.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
