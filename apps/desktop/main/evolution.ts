import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertJob,
  isQuantumResult,
  type EvolutionJob,
  type EvolutionProgress,
  type EvolutionResult,
  type CavityJob,
  type CavityResult,
  type LindbladJob,
  type LindbladResult,
  type SweepJob,
  type SweepResult,
  type OrbitalJob,
  type OrbitalResult,
} from "../../../packages/contracts";
import { consistentOrbitalResult, checkOrbitalData } from "../../../packages/models/orbital";
import { WorkerSupervisor } from "./worker";

type Active = {
  job: EvolutionJob | CavityJob | LindbladJob | SweepJob | OrbitalJob;
  acknowledged: boolean;
  cancelRequested: boolean;
  resolve: (result: EvolutionResult | CavityResult | LindbladResult | SweepResult | OrbitalResult) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
export class EvolutionCoordinator {
  private active?: Active;
  private completed = new Map<string, EvolutionResult | CavityResult | LindbladResult | SweepResult | OrbitalResult>();
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
  run(job: EvolutionJob): Promise<EvolutionResult>;
  run(job: CavityJob): Promise<CavityResult>;
  run(job: LindbladJob): Promise<LindbladResult>;
  run(job: SweepJob): Promise<SweepResult>;
  run(job: OrbitalJob): Promise<OrbitalResult>;
  run(job: EvolutionJob | CavityJob | LindbladJob | SweepJob | OrbitalJob): Promise<EvolutionResult | CavityResult | LindbladResult | SweepResult | OrbitalResult> {
    assertJob(job);
    if (!["evolve", "cavity", "lindblad", "sweep", "orbital"].includes(job.operation)) throw new Error("Expected quantum data job");
    const timing = job.operation === "orbital" ? null : job.operation === "sweep" ? job.sweep : job.solver;
    if (timing && timing.tStop <= timing.tStart)
      throw new Error("tStop must exceed tStart");
    if (this.active) throw new Error("A quantum job is already running");
    if (
      this.worker.status.state !== "READY" ||
      !this.worker.status.capabilities?.operations.includes(job.operation) ||
      !this.worker.status.capabilities.engines[job.engine]?.available
    )
      throw new Error(`${job.engine} ${job.operation} engine is not ready`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        void this.worker
          .request("quantum.cancel", { jobId: job.jobId })
          .catch(() => {});
        this.reject(new Error("Quantum job timed out"));
      }, job.operation === "sweep" ? 1800000 : 600000);
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
            outputDir: this.worker.artifactDirectory(this.artifactDir),
          }),
        )
        .then((ack) => {
          if (
            !ack ||
            typeof ack !== "object" ||
            (ack as { jobId?: string }).jobId !== job.jobId ||
            (ack as { status?: string }).status !== "running"
          )
            throw new Error("Invalid quantum job start acknowledgement");
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
    if (!result) throw new Error("No completed quantum data for this job");
    if (result.data.path !== `${jobId}.f64`)
      throw new Error("Invalid artifact path");
    const data = await readFile(join(this.artifactDir, result.data.path));
    if (
      data.byteLength !== result.data.bytes ||
      createHash("sha256").update(data).digest("hex") !== result.data.sha256
    )
      throw new Error("Quantum artifact failed integrity check");
    return new Uint8Array(data);
  }
  private notification(method: string, value: unknown) {
    const active = this.active;
    if (!active || !value || typeof value !== "object") return;
    const params = value as Record<string, unknown>;
    if (params.jobId !== active.job.jobId) return;
    if (method === "job.progress") {
      const expectedTotal = active.job.operation === "orbital" ? active.job.model.parameters.grid : active.job.operation === "sweep"
        ? active.job.sweep.x.points * (active.job.sweep.y?.points ?? 1)
        : active.job.solver.samples;
      if (
        typeof params.completed !== "number" ||
        typeof params.total !== "number" ||
        !Number.isInteger(params.completed) ||
        params.total !== expectedTotal ||
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
        !("data" in value) ||
        value.operation !== active.job.operation ||
        value.data.path !== `${active.job.jobId}.f64` ||
        value.engine.name !== active.job.engine ||
        JSON.stringify(value.model) !== JSON.stringify(active.job.model)
      ) {
        this.reject(new Error("Worker returned an invalid quantum result"));
        return;
      }
      if (value.operation === "orbital" && active.job.operation === "orbital") {
        if (!consistentOrbitalResult(active.job,value)) {
          this.reject(new Error("Worker returned inconsistent orbital data")); return;
        }
      } else if (value.operation === "sweep" && active.job.operation === "sweep") {
        const expectedX = active.job.sweep.x.points;
        const expectedY = active.job.sweep.y?.points ?? 1;
        if (value.data.shape.x !== expectedX || value.data.shape.y !== expectedY ||
            value.data.bytes !== expectedX * expectedY * 8 ||
            value.cache.computedPoints + value.cache.reusedPoints !== expectedX * expectedY ||
            JSON.stringify(value.sweep) !== JSON.stringify(active.job.sweep)) {
          this.reject(new Error("Worker returned an invalid sweep result"));
          return;
        }
      } else if (value.operation !== "sweep" && active.job.operation !== "sweep" && value.operation !== "orbital" && active.job.operation !== "orbital") {
        if (value.data.rows !== active.job.solver.samples ||
            value.data.bytes !== value.data.rows * (value.operation === "cavity" ? 48 : value.operation === "lindblad" ? 56 : 80) ||
            JSON.stringify(value.solver) !== JSON.stringify(active.job.solver) ||
            JSON.stringify(value.initialState) !== JSON.stringify(active.job.initialState) ||
            (value.operation === "evolve" && active.job.operation === "evolve" &&
              JSON.stringify(value.observables) !== JSON.stringify(active.job.observables))) {
          this.reject(new Error("Worker returned an invalid quantum result"));
          return;
        }
      } else {
        this.reject(new Error("Worker returned a mismatched operation"));
        return;
      }
      if (value.operation === "cavity" && value.dressedSpectrum.length !== 2 * value.model.parameters.cutoff) {
        this.reject(new Error("Worker returned a mismatched cavity spectrum"));
        return;
      }
      if (value.operation === "evolve" && value.model.type === "strong_drive" && !value.analysis) {
        this.reject(new Error("Worker omitted Floquet analysis"));
        return;
      }
      void this.worker.fetchArtifact(value.jobId, value.data, this.artifactDir)
        .then(async () => {
          if (value.operation === "orbital") checkOrbitalData(value, await readFile(join(this.artifactDir, value.data.path)));
          this.completed.set(value.jobId, value); this.resolve(value);
        })
        .catch(error => this.reject(error instanceof Error ? error : new Error(String(error))));
    } else if (method === "job.cancelled")
      this.reject(new Error(active.job.operation === "orbital" ? "Orbital cancelled" : active.job.operation === "cavity" ? "Cavity cancelled" : active.job.operation === "lindblad" ? "Lindblad cancelled" : active.job.operation === "sweep" ? "Sweep cancelled" : "Evolution cancelled"));
    else if (method === "job.failed")
      this.reject(
        new Error(
          typeof params.message === "string"
            ? params.message
            : "Evolution failed",
        ),
      );
  }
  private resolve(result: EvolutionResult | CavityResult | LindbladResult | SweepResult | OrbitalResult) {
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
