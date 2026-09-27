import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import {
  isWorkerCapabilities,
  type WorkerStatus,
} from "../../../packages/contracts";
import { fetchRemoteArtifact, remoteConfig, sshLaunch, type RemoteConfig } from "./remote";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
export class WorkerSupervisor extends EventEmitter {
  status: WorkerStatus = {
    state: "STOPPED",
    detail: "Worker has not started",
    capabilities: null,
  };
  private child?: ChildProcessWithoutNullStreams;
  private pending = new Map<string, Pending>();
  private sequence = 0;
  private heartbeat?: NodeJS.Timeout;
  private starting?: Promise<WorkerStatus>;
  private stopping = false;
  private stderr = "";
  private remote: RemoteConfig | null = null;
  constructor(private root: string) {
    super();
  }

  private fail(message: string) {
    this.status = { state: "ERROR", detail: message, capabilities: null,
      transport: process.env.QLAB_REMOTE_SSH_TARGET ? "ssh" : "local" };
    this.emit("unavailable", message);
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
    this.child?.kill();
  }
  start(): Promise<WorkerStatus> {
    if (this.starting) return this.starting;
    if (this.status.state === "READY") return Promise.resolve(this.status);
    this.starting = this.launch().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }
  private async launch(): Promise<WorkerStatus> {
    await this.stop();
    this.stopping = false;
    this.stderr = "";
    this.status = {
      state: "STARTING",
      detail: "Connecting to Python",
      capabilities: null,
      transport: process.env.QLAB_REMOTE_SSH_TARGET ? "ssh" : "local",
    };
    try { this.remote = remoteConfig(process.env); }
    catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
      return this.status;
    }
    const executable =
      process.env.QLAB_PYTHON ||
      join(
        this.root,
        ".venv",
        process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
      );
    const launch = this.remote ? sshLaunch(this.remote) :
      { command: executable, args: ["-u", "-m", "quantum_worker.main"] };
    const child = spawn(launch.command, launch.args, {
      cwd: this.root,
      windowsHide: true,
      stdio: "pipe",
      env: {
        ...process.env,
        PYTHONPATH: join(this.root, "workers/quantum-python"),
        PYTHONIOENCODING: "utf-8",
      },
    });
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (text) => {
      this.stderr = (this.stderr + text).slice(-4000);
    });
    child.on("error", (error) => {
      if (this.child === child)
        this.fail(this.remote ? `SSH worker: ${error.message}. Check OpenSSH and remote settings.` :
          `Python worker: ${error.message}. Run npm run setup:python.`);
    });
    child.stdin.on("error", (error) => {
      if (this.child === child && !this.stopping) this.fail(error.message);
    });
    child.on("exit", (code, signal) => {
      if (this.child !== child) return;
      this.child = undefined;
      if (!this.stopping && this.status.state !== "ERROR")
        this.fail(`Worker exited (${code ?? signal}). ${this.stderr}`);
    });
    let buffer = "";
    child.stdout.on("data", (chunk: string) => {
      if (this.child !== child) return;
      buffer += chunk;
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        if (line.length > 65536) {
          this.fail("Worker response exceeded 64 KiB");
          return;
        }
        try {
          const message = JSON.parse(line);
          if (
            message.jsonrpc === "2.0" &&
            typeof message.method === "string" &&
            !("id" in message)
          ) {
            this.emit("notification", message.method, message.params);
            continue;
          }
          if (
            message.jsonrpc !== "2.0" ||
            typeof message.id !== "string" ||
            "result" in message === "error" in message
          )
            throw new Error("Malformed worker response");
          const request = this.pending.get(message.id);
          if (!request) continue;
          clearTimeout(request.timer);
          this.pending.delete(message.id);
          if (message.error)
            request.reject(new Error(String(message.error.message)));
          else request.resolve(message.result);
        } catch {
          this.fail("Invalid worker protocol response");
          return;
        }
      }
      if (buffer.length > 65536) this.fail("Worker response exceeded 64 KiB");
    });
    try {
      const hello = (await this.request("hello")) as { protocol: number };
      if (hello.protocol !== 1) throw new Error("Incompatible worker protocol");
      const capabilities = await this.request("capabilities");
      if (!isWorkerCapabilities(capabilities))
        throw new Error("Invalid worker capabilities");
      await this.checkHealth();
      this.status = {
        state: "READY",
        detail: this.remote ? `Remote SSH worker connected: ${this.remote.target}` : "Worker connected",
        capabilities,
        transport: this.remote ? "ssh" : "local",
      };
      this.heartbeat = setInterval(() => {
        if (!this.pending.size)
          void this.checkHealth().catch((error) => this.fail(String(error)));
      }, 10000);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
    return this.status;
  }
  private async checkHealth() {
    const health = (await this.request("health", {}, 5000)) as {
      status: string;
    };
    if (health.status !== "ok") throw new Error("Worker health check failed");
  }
  artifactDirectory(localDir: string): string {
    return this.remote?.artifacts ?? localDir;
  }
  async fetchArtifact(jobId: string, data: { path: string; bytes: number; sha256: string }, localDir: string): Promise<void> {
    if (this.remote) await fetchRemoteArtifact(this.remote, jobId, data, localDir);
  }
  request(
    method: string,
    params: unknown = {},
    timeout = 30000,
  ): Promise<unknown> {
    if (!this.child || this.child.killed)
      return Promise.reject(new Error("Python worker is unavailable"));
    const id = `rpc-${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(`Worker request timed out: ${method}`),
        timeout,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
      );
    });
  }
  async restart(): Promise<WorkerStatus> {
    if (this.starting) return this.starting;
    await this.stop();
    return this.start();
  }
  async stop(): Promise<void> {
    this.stopping = true;
    this.emit("unavailable", "Worker stopped");
    if (this.heartbeat) clearInterval(this.heartbeat);
    const child = this.child;
    if (child && child.exitCode === null && !child.killed) {
      try {
        await this.request("shutdown", {}, 2000);
      } catch {
        /* forced termination below */
      }
      if (child.exitCode === null) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            child.kill();
            resolve();
          }, 1500);
          child.once("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
    }
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Worker stopped"));
    }
    this.pending.clear();
    this.child = undefined;
    this.status = {
      state: "STOPPED",
      detail: "Worker stopped",
      capabilities: null,
      transport: process.env.QLAB_REMOTE_SSH_TARGET ? "ssh" : "local",
    };
  }
}
