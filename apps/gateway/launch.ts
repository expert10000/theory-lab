import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startGateway } from "./server";

async function main() {
  const root = resolve(__dirname, "..");
  const keyPath = process.env.QLAB_GATEWAY_TLS_KEY;
  const certPath = process.env.QLAB_GATEWAY_TLS_CERT;
  if (!!keyPath !== !!certPath) throw new Error("Provide both QLAB_GATEWAY_TLS_KEY and QLAB_GATEWAY_TLS_CERT");
  const tls = keyPath && certPath ? { key: await readFile(keyPath), cert: await readFile(certPath) } : undefined;
  const gateway = await startGateway({ root,
    dataDir: resolve(process.env.QLAB_GATEWAY_DATA_DIR || "gateway-data"),
    webDir: resolve(root, "dist", "web"),
    token: process.env.QLAB_GATEWAY_TOKEN || "",
    host: process.env.QLAB_GATEWAY_HOST || "127.0.0.1",
    port: Number(process.env.QLAB_GATEWAY_PORT || "8765"),
    origin: process.env.QLAB_GATEWAY_ORIGIN,
    tls,
  });
  console.log(`Quantum Lab web gateway ready at ${gateway.origin}`);
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
    if (closing) return;
    closing = true;
    void gateway.close().finally(() => process.exit());
  });
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
