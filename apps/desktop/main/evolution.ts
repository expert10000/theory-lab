import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertJob,
  isQuantumResult,
  type EvolutionJob,
  type EvolutionProgress,
  type EvolutionResult,
} from "../../../packages/contracts";
import { WorkerSupervisor } from "./worker";

type Active = {
  job: EvolutionJob;
  acknowledged: boolean;
  cancelRequested: boolean;
  resolve: (result: EvolutionResult) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
export class EvolutionCoordinator {
  private active?: Active;
  private completed = new Map<string, EvolutionResult>();
  constructor(
    private worker: WorkerSupervisor,
    private artifactDir: string,
    private progress: (progress: EvolutionProgress) => void,
  ) {
    worker.on("notification", (method: string, params: unknown) =>
      this.notification(method, params),
    );
    worker.on("unavailable", (message: string) =>
      this.reject(new Error(message)),
    );
  }
  get isRunning() {
    return this.active !== undefined;
  }
  run(job: EvolutionJob): Promise<EvolutionResult> {
    assertJob(job);
    if (job.operation !== "evolve") throw new Error("Expected evolution job");
    if (job.solver.tStop <= job.solver.tStart)
      throw new Error("tStop must exceed tStart");
    if (this.active) throw new Error("An evolution job is already running");
    if (
      this.worker.status.state !== "READY" ||
      !this.worker.status.capabilities?.operations.includes("evolve") ||
      !this.worker.status.capabilities.engines[job.engine].available
    )
      throw new Error(`${job.engine} evolution engine is not ready`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        void this.worker
          .request("quantum.cancel", { jobId: job.jobId })
          .catch(() => {});
        this.reject(new Error("Evolution job timed out"));
      }, 600000);
      this.active = {
        job,
        resolve,
        reject,
        timer,
        acknowledged: false,
        cancelRequested: false,
      };
      void mkdir(this.artifactDir, { recursive: true })
        .then(() =>
          this.worker.request("quantum.start", {
            job,
            outputDir: this.artifactDir,
          }),
        )
        .then((ack) => {
          if (
            !ack ||
            typeof ack !== "object" ||
            (ack as { jobId?: string }).jobId !== job.jobId ||
            (ack as { status?: string }).status !== "running"
          )
            throw new Error("Invalid evolution start acknowledgement");
          if (this.active?.job === job) {
            this.active.acknowledged = true;
            if (this.active.cancelRequested)
              void this.sendCancel(job.jobId).catch((error) =>
                this.reject(error),
              );
          }
        })
        .catch((error) =>
          this.reject(
            error instanceof Error ? error : new Error(String(error)),
          ),
        );
    });
  }
  async cancel(jobId: string): Promise<boolean> {
    if (!this.active || this.active.job.jobId !== jobId) return false;
    if (!this.active.acknowledged) {
      this.active.cancelRequested = true;
      return true;
    }
    return this.sendCancel(jobId);
  }
  private async sendCancel(jobId: string): Promise<boolean> {
    const result = (await this.worker.request("quantum.cancel", { jobId })) as {
      accepted?: boolean;
      jobId?: string;
    };
    return result.jobId === jobId && result.accepted === true;
  }
  async readData(jobId: string): Promise<Uint8Array> {
    const result = this.completed.get(jobId);
    if (!result) throw new Error("No completed evolution data for this job");
    if (result.data.path !== `${jobId}.f64`)
      throw new Error("Invalid artifact path");
    const data = await readFile(join(this.artifactDir, result.data.path));
    if (
      data.byteLength !== result.data.bytes ||
      createHash("sha256").update(data).digest("hex") !== result.data.sha256
    )
      throw new Error("Evolution artifact failed integrity check");
    return new Uint8Array(data);
  }
  private notification(method: string, value: unknown) {
    const active = this.active;
    if (!active || !value || typeof value !== "object") return;
    const params = value as Record<string, unknown>;
    if (params.jobId !== active.job.jobId) return;
    if (method === "job.progress") {
      if (
        typeof params.completed !== "number" ||
        typeof params.total !== "number" ||
        !Number.isInteger(params.completed) ||
        params.total !== active.job.solver.samples ||
        params.completed < 0 ||
        params.completed > params.total ||
        typeof params.fraction !== "number" ||
        Math.abs(params.fraction - params.completed / params.total) > 1e-10
      )
        return;
      this.progress(params as unknown as EvolutionProgress);
    } else if (method === "job.completed") {
      if (
        !isQuantumResult(value) ||
        value.operation !== "evolve" ||
        value.data.path !== `${active.job.jobId}.f64` ||
        value.data.rows !== active.job.solver.samples ||
        value.data.bytes !== value.data.rows * 80 ||
        value.engine.name !== active.job.engine ||
        JSON.stringify(value.solver) !== JSON.stringify(active.job.solver) ||
        JSON.stringify(value.initialState) !==
          JSON.stringify(active.job.initialState) ||
        JSON.stringify(value.observables) !==
          JSON.stringify(active.job.observables) ||
        JSON.stringify(value.model) !== JSON.stringify(active.job.model)
      ) {
        this.reject(new Error("Worker returned an invalid evolution result"));
        return;
      }
      this.completed.set(value.jobId, value);
      this.resolve(value);
    } else if (method === "job.cancelled")
      this.reject(new Error("Evolution cancelled"));
    else if (method === "job.failed")
      this.reject(
        new Error(
          typeof params.message === "string"
            ? params.message
            : "Evolution failed",
        ),
      );
  }
  private resolve(result: EvolutionResult) {
    const active = this.active;
    if (!active) return;
    clearTimeout(active.timer);
    this.active = undefined;
    active.resolve(result);
  }
  private reject(error: Error) {
    const active = this.active;
    if (!active) return;
    clearTimeout(active.timer);
    this.active = undefined;
    active.reject(error);
  }
}
