import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { startGateway } from "../apps/gateway/server";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { RunStore } from "../apps/desktop/main/runs";
import { orbitalJob, ORBITAL_DEFAULTS } from "../packages/models/orbital";
import { writeSceneBundle } from "../packages/quantum-scene/bundle";
import { writeStreamBundle } from "../packages/quantum-scene/stream-bundle";
import { makeSceneStream } from "../packages/quantum-scene/stream";
import { scenePreview } from "../packages/quantum-scene/lod";
import { createHash } from "node:crypto";
import fieldFixture from "../packages/quantum-scene/fixtures/complex-field.json";
import latticeFixture from "../packages/quantum-scene/fixtures/lattice-honeycomb.json";
import { assertScene, type ScenePayload } from "../packages/quantum-scene";

const root = process.cwd();
const token = "web-smoke-token-0123456789-abcdef";
const dataDir = await mkdtemp(join(tmpdir(), "qlab-web-"));
const gateway = await startGateway({
  root,
  dataDir,
  webDir: join(root, "dist", "web"),
  token,
  port: 0,
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (
      /Content Security Policy|Refused to (apply|execute|load)/i.test(
        msg.text(),
      )
    )
      errors.push(msg.text());
  });
  const initial = await page.goto(gateway.origin);
  assert.equal(
    initial?.status(),
    200,
    `Gateway served HTTP ${initial?.status()}`,
  );
  await page
    .getByLabel("Gateway access token")
    .waitFor({ timeout: 5000 })
    .catch(async () => {
      throw new Error(
        `Web app did not render: ${await page.locator("body").innerText()} | ${errors.join("; ")}`,
      );
    });
  await page.getByRole("button", { name: /Hamiltonian Atlas/ }).click();
  await page.getByTestId("web-atlas").waitFor();
  assert.match(
    await page.getByTestId("web-atlas").innerText(),
    /68 Hamiltonians/,
  );
  for (const [id, kind] of [
    ["surface_code_planar", "reference_lab"],
    ["dispersive_jc", "direct"],
    ["hofstadter", "not declared"],
    ["coulomb_one_body", "not declared"],
  ]) {
    await page.getByLabel("Search Atlas").fill(id);
    await page.getByRole("button", { name: new RegExp(id) }).click();
    assert.match(
      await page.getByTestId("atlas-capability-status").innerText(),
      new RegExp(`Theory example: ${kind}.*Lab executable binding: none`),
    );
    assert.equal(await page.getByTestId("web-atlas-load").count(), 0);
  }
  await page.screenshot({
    path: join(root, "artifacts", "web-atlas-r1.png"),
    fullPage: true,
  });
  await page.getByLabel("Search Atlas").fill("Su-Schrieffer-Heeger");
  await page
    .getByRole("button", { name: /Su-Schrieffer-Heeger model/ })
    .click();
  assert.match(
    await page.getByTestId("web-atlas-detail").innerText(),
    /reference/i,
  );
  assert.ok(
    (await page
      .getByRole("link", { name: /View pinned source/ })
      .getAttribute("href"))!.includes(
      "48e2036ba7c7dd5c79d54749341a79d41770cbb7",
    ),
  );
  assert.ok(await page.getByTestId("web-atlas-load").isVisible());
  await page.getByRole("button", { name: /Two-level spectrum/ }).click();
  await page.getByLabel("Gateway access token").fill(token);
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByText(/worker ready/).waitFor();
  await page.getByRole("button", { name: "Run calculation" }).click();
  await page.getByText("Eigenenergy spectrum").waitFor();
  assert.match(await page.locator(".energy-list").innerText(), /0\.640312/);
  await page.getByRole("button", { name: /Rabi dynamics/ }).click();
  await page.getByRole("button", { name: "Run calculation" }).click();
  await page.getByText("Population dynamics").waitFor();
  assert.ok(
    (await page.locator(".chart polyline").getAttribute("points"))!.length >
      100,
  );
  await page.getByRole("button", { name: /Hamiltonian Atlas/ }).click();
  await page.getByLabel("Search Atlas").fill("two_level_pauli");
  await page
    .getByRole("button", { name: /Generic two-level Pauli Hamiltonian/ })
    .click();
  await page.getByTestId("web-atlas-load").click();
  assert.equal(await page.locator("#delta").inputValue(), "2");
  assert.equal(await page.locator("#omega").inputValue(), "0");
  await page.getByRole("button", { name: /Hamiltonian Atlas/ }).click();
  await page.getByLabel("Search Atlas").fill("Su-Schrieffer-Heeger");
  await page
    .getByRole("button", { name: /Su-Schrieffer-Heeger model/ })
    .click();
  await page.getByTestId("web-atlas-load").click();
  await page.getByTestId("web-topology").waitFor();
  assert.equal(await page.locator("#ssh-t1").inputValue(), "0.6");
  await page.getByTestId("run-web-topology").click();
  await page.getByTestId("web-ssh-winding").filter({ hasText: "1" }).waitFor();
  await page
    .getByRole("combobox", { name: "Topology model" })
    .selectOption("qwz");
  await page.getByTestId("run-web-topology").click();
  await page.getByTestId("web-qwz-chern").filter({ hasText: "-1" }).waitFor();
  await mkdir(join(root, "artifacts"), { recursive: true });
  await page.screenshot({
    path: join(root, "artifacts", "web-topology.png"),
    fullPage: true,
  });
  await page.locator("#qwz-mass").fill("0");
  await page.getByTestId("run-web-topology").click();
  await page
    .getByTestId("web-qwz-chern")
    .filter({ hasText: "undefined" })
    .waitFor();
  await page.locator("#qwz-mass").fill("0.01");
  await page.locator("#qwz-grid").fill("11");
  await page.getByTestId("run-web-topology").click();
  await page
    .getByTestId("web-qwz-chern")
    .filter({ hasText: "unresolved" })
    .waitFor();
  await page.getByText(/Mesh unresolved: raw lattice Chern/).waitFor();
  await page.locator("#qwz-grid").fill("31");
  await page.getByTestId("run-web-topology").click();
  await page.getByTestId("web-qwz-chern").filter({ hasText: "1" }).waitFor();
  const saved = await fetch(`${gateway.origin}/api/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  await page.getByRole("button", { name: /Portable scenes/ }).click();
  await page.getByTestId("web-scenes").waitFor();
  const ssh = saved.find((r: any) => r.model === "ssh"),
    qwz = saved.find((r: any) => r.model === "qwz");
  await page.getByLabel("Web scene saved run").selectOption(qwz.runId);
  await page
    .getByRole("button", { name: "Load saved scene", exact: true })
    .click();
  await page.getByTestId("topology-inspection").waitFor();
  assert.match(
    await page.getByTestId("topology-invariant").innerText(),
    /reported verified/,
  );
  await page.getByLabel("Web scene saved run").selectOption(ssh.runId);
  await page.getByLabel("Web scene view").selectOption("bands");
  await page
    .getByRole("button", { name: "Load saved scene", exact: true })
    .click();
  await page.getByTestId("band-inspection").waitFor();
  await page.getByLabel("Band", { exact: true }).selectOption("band-1");
  await page.getByLabel("Scene sample").focus();
  await page.getByLabel("Scene sample").press("End");
  assert.match(await page.getByTestId("band-sample").innerText(), /Upper band/);
  await page
    .getByRole("button", { name: "Load chunked preview", exact: true })
    .click();
  await page
    .getByTestId("stream-status")
    .filter({ hasText: "displayed: Coarse display subset" })
    .waitFor();
  await page.getByTestId("refine-scene").click();
  await page
    .getByTestId("stream-status")
    .filter({ hasText: "displayed: Full supplied samples" })
    .waitFor();
  await page.getByTestId("band-inspection").waitFor();
  const digest = async (b: Uint8Array) =>
    createHash("sha256").update(b).digest("hex");
  function fixturePayload(f: {
    scene: unknown;
    values: Record<string, number[]>;
  }): ScenePayload {
    const scene = structuredClone(f.scene);
    assertScene(scene);
    return {
      scene,
      artifacts: Object.fromEntries(
        Object.entries(f.values).map(([p, v]) => {
          const b = Buffer.alloc(v.length * 8);
          v.forEach((n, i) => b.writeDoubleLE(n, i * 8));
          return [p, b];
        }),
      ),
    };
  }
  const latticeFolder = await writeSceneBundle(
      fixturePayload(latticeFixture),
      dataDir,
    ),
    field = fixturePayload(fieldFixture),
    fieldFolder = await writeSceneBundle(field, dataDir),
    streamFolder = await writeStreamBundle(
      await makeSceneStream(
        [
          {
            label: "Coarse display subset",
            payload: await scenePreview(field, digest),
          },
          { label: "Full supplied samples", payload: field },
        ],
        digest,
      ),
      dataDir,
    );
  await page.getByLabel("Open scene folder").setInputFiles(latticeFolder);
  await page.getByTestId("lattice-site-inspection").waitFor();
  assert.match(
    await page.getByTestId("web-scene-source").innerText(),
    /IMPORTED BUNDLE/,
  );
  await page.getByLabel("Open scene folder").setInputFiles(fieldFolder);
  await page
    .getByTestId("field-verification")
    .filter({ hasText: "SHA-256 VERIFIED" })
    .waitFor();
  await page.getByLabel("Open scene folder").setInputFiles(streamFolder);
  await page
    .getByTestId("stream-status")
    .filter({ hasText: "displayed: Coarse display subset" })
    .waitFor();
  await page.getByTestId("refine-scene").click();
  await page
    .getByTestId("stream-status")
    .filter({ hasText: "displayed: Full supplied samples" })
    .waitFor();
  const orbitalArtifacts = join(dataDir, "offline-orbital-artifacts"),
    orbitalStore = new RunStore(
      join(dataDir, "offline-orbital-runs"),
      orbitalArtifacts,
    ),
    orbitalCoordinator = new EvolutionCoordinator(
      gateway.worker,
      orbitalArtifacts,
      () => {},
    );
  const orbital = orbitalJob("web-import-orbital", {
      ...ORBITAL_DEFAULTS,
      n: "2",
      l: "1",
      m: "1",
      grid: "21",
      radius: "16",
    }),
    orbitalResult = await orbitalCoordinator.run(orbital);
  await orbitalStore.record(orbital, orbitalResult);
  const orbitalFolder = await orbitalStore.exportScene(
    orbitalResult.runId,
    dataDir,
  );
  await page.getByLabel("Open scene folder").setInputFiles(orbitalFolder);
  await page
    .getByTestId("field-verification")
    .filter({ hasText: "SHA-256 VERIFIED" })
    .waitFor();
  await page.getByLabel("Field quantity").selectOption("phase");
  await page
    .getByRole("option", { name: /Density surface \/ phase color/ })
    .waitFor({ state: "attached" });
  await page
    .getByTestId("scene-verification")
    .filter({ hasText: "SHA-256 VERIFIED" })
    .waitFor();
  await page.getByTestId("field-slice").click();
  assert.match(
    await page.getByTestId("web-scenes").innerText(),
    new RegExp(orbitalResult.runId),
  );
  await page.screenshot({
    path: join(root, "artifacts", "web-orbital.png"),
    fullPage: true,
  });
  const streamMetadata = JSON.parse(
    await readFile(join(streamFolder, "stream.json"), "utf8"),
  );
  await writeFile(
    join(streamFolder, streamMetadata.chunks[0].path),
    Buffer.alloc(streamMetadata.chunks[0].bytes),
  );
  await page.getByLabel("Open scene folder").setInputFiles(latticeFolder);
  await page.getByTestId("lattice-site-inspection").waitFor();
  await page.getByLabel("Open scene folder").setInputFiles(streamFolder);
  await page.getByRole("alert").filter({ hasText: "integrity" }).waitFor();
  assert.ok(await page.getByTestId("lattice-site-inspection").isVisible());
  const damaged = latticeFixture.scene.datasets[0];
  await writeFile(
    join(latticeFolder, damaged.path),
    Buffer.alloc(damaged.bytes),
  );
  await page.getByLabel("Open scene folder").setInputFiles(latticeFolder);
  await page.getByRole("alert").filter({ hasText: "integrity" }).waitFor();
  assert.ok(await page.getByTestId("lattice-site-inspection").isVisible());
  assert.equal(
    (
      await fetch(`${gateway.origin}/api/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json())
    ).length,
    saved.length,
  );
  await page.screenshot({
    path: join(root, "artifacts", "web-scenes.png"),
    fullPage: true,
  });
  const offline = await browser.newPage();
  await offline.goto(gateway.origin);
  await offline.getByRole("button", { name: /Portable scenes/ }).click();
  await offline.getByLabel("Open scene folder").setInputFiles(orbitalFolder);
  await offline
    .getByTestId("field-verification")
    .filter({ hasText: "SHA-256 VERIFIED" })
    .waitFor();
  assert.ok(
    await offline
      .getByRole("button", { name: "Load saved scene", exact: true })
      .isDisabled(),
  );
  await offline.close();
  await page.getByRole("button", { name: /Worker & API/ }).click();
  await page.getByTestId("worker-dashboard").waitFor();
  await page.getByText("worker-resources/v1").waitFor();
  await page.getByText("Installed engines").waitFor();
  assert.match(
    await page.locator(".worker-dashboard").innerText(),
    /GET \/api\/resources/,
  );
  assert.match(
    await page.locator(".worker-dashboard").innerText(),
    /POST \/api\/jobs/,
  );
  await page
    .locator(".worker-dashboard h2")
    .filter({ hasText: /Activity\s+[1-9]\d* authenticated calls/ })
    .waitFor();
  const callCount = /Activity\s+(\d+) authenticated calls/.exec(
    await page.locator(".worker-dashboard").innerText(),
  );
  assert.ok(callCount && Number(callCount[1]) >= 2);
  if (process.env.QLAB_REMOTE_SSH_TARGET)
    assert.ok(
      (await page.locator(".worker-dashboard").innerText()).includes(
        process.env.QLAB_REMOTE_SSH_TARGET,
      ),
    );
  assert.equal(errors.length, 0, errors.join("\n"));
  await mkdir(join(root, "artifacts"), { recursive: true });
  await page.screenshot({
    path: join(root, "artifacts", "web-smoke.png"),
    fullPage: true,
  });
  await gateway.worker.stop();
  await page.getByRole("button", { name: "Refresh snapshot" }).click();
  await page
    .locator(".metric")
    .first()
    .getByText("STOPPED", { exact: true })
    .waitFor();
  console.log(
    "Web smoke passed: authenticated React → gateway → worker → verified result → UI",
  );
} finally {
  await browser?.close();
  await gateway.close();
  await rm(dataDir, { recursive: true, force: true });
}
