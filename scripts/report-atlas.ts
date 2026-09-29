import { readFileSync, writeFileSync } from "node:fs";
import { atlasReconciliationReport } from "../packages/atlas/report";
const path = "docs/ATLAS_RECONCILIATION_R1.md",
  report = atlasReconciliationReport();
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8").replaceAll("\r\n", "\n") !== report)
    throw new Error("R1 report differs from current capability map");
  console.log("R1 report matches all 68 entries and existing Lab capabilities");
} else if (process.argv.includes("--write")) {
  writeFileSync(path, report);
  console.log(`Generated ${path}`);
} else process.stdout.write(report);
