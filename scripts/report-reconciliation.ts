import { readFileSync, writeFileSync } from "node:fs";
import { reconciliationReviewReport } from "../packages/atlas/review-report";
const path = "docs/ATLAS_RECONCILIATION_R2_R5.md",
  report = reconciliationReviewReport();
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8").replaceAll("\r\n", "\n") !== report)
    throw new Error("Reconciliation report drift");
  console.log("R2–R5 report matches maintained review data");
} else if (process.argv.includes("--write")) writeFileSync(path, report);
else process.stdout.write(report);
