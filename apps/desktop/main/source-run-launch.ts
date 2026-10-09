import type { SourceRunLaunchResult } from "../../../packages/contracts";
import type { VerifiedSavedRun } from "../../../packages/contracts";

export type SourceRunLaunch = { runId: string; resultSha256: string };

export function sourceRunLaunchArguments(argv: readonly string[]): SourceRunLaunch | null {
  const flags = argv.flatMap((arg, index) => arg === "--quantum-source-run" ? [index] : []);
  if (!flags.length) return null;
  if (flags.length !== 1) throw new Error("Only one source run can be opened at launch");
  const runId = argv[flags[0] + 1], resultSha256 = argv[flags[0] + 2];
  if (!runId || !/^[A-Za-z0-9_-]{1,100}$/.test(runId) ||
      !resultSha256 || !/^[a-f0-9]{64}$/.test(resultSha256))
    throw new Error("Invalid source-run launch identity");
  return { runId, resultSha256 };
}

export async function resolveSourceRunLaunch(
  store: { verifiedSource(runId: string, expectedResultHash: string): Promise<VerifiedSavedRun> },
  intent: SourceRunLaunch,
): Promise<SourceRunLaunchResult> {
  const saved = await store.verifiedSource(intent.runId, intent.resultSha256);
  if (saved.result.runId !== intent.runId) throw new Error("Verified source run ID changed");
  return { ok: true, runId: intent.runId, resultSha256: intent.resultSha256,
    saved };
}
