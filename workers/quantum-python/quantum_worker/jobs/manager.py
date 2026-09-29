import json
import sys
import threading
import traceback
from quantum_worker.contracts import validate
from quantum_worker.engines.evolution import evolve
from quantum_worker.engines.cavity import cavity
from quantum_worker.engines.lindblad import lindblad
from quantum_worker.engines.sweep import sweep
from quantum_worker.engines.orbital import orbital
from quantum_worker.engines.oscillator_dynamics import oscillator_evolve
from quantum_worker.engines.oscillator_drive import oscillator_drive
from quantum_worker.engines.oscillator_pulse import oscillator_pulse

class JobManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._write_lock = threading.Lock()
        self._active = None

    def notify(self, method, params):
        message = {"jsonrpc": "2.0", "method": method, "params": params}
        with self._write_lock:
            print(json.dumps(message, allow_nan=False, separators=(",", ":")), flush=True)

    def write_response(self, response):
        with self._write_lock:
            print(json.dumps(response, allow_nan=False, separators=(",", ":")), flush=True)

    def start(self, job, output_dir):
        validate("quantum-job", job)
        if job["operation"] not in ("evolve", "cavity", "lindblad", "sweep", "orbital", "oscillator_evolve", "oscillator_drive", "oscillator_pulse"):
            raise ValueError("Expected evolution, cavity, Lindblad, sweep, or orbital job")
        if job["operation"] != "orbital":
            settings = job["sweep"] if job["operation"] == "sweep" else job["solver"]
            if settings["tStop"] <= settings["tStart"]:
                raise ValueError("tStop must exceed tStart")
        if not isinstance(output_dir, str) or not output_dir:
            raise ValueError("outputDir is required")
        with self._lock:
            if self._active is not None:
                raise ValueError("Worker already has an active job")
            cancel = threading.Event()
            thread = threading.Thread(target=self._run, args=(job, output_dir, cancel), daemon=True)
            self._active = (job["jobId"], cancel, thread)
            thread.start()
        return {"jobId": job["jobId"], "status": "running"}

    def cancel(self, job_id):
        with self._lock:
            if self._active is None or self._active[0] != job_id:
                return {"jobId": job_id, "accepted": False}
            self._active[1].set()
            return {"jobId": job_id, "accepted": True}

    def active_job_id(self):
        with self._lock:
            return self._active[0] if self._active is not None else None

    def shutdown(self):
        with self._lock:
            active = self._active
            if active is not None:
                active[1].set()
        if active is not None:
            active[2].join(timeout=2)

    def _run(self, job, output_dir, cancel):
        method, payload = None, None
        try:
            computation = {"evolve": evolve, "cavity": cavity, "lindblad": lindblad, "sweep": sweep, "orbital": orbital, "oscillator_evolve": oscillator_evolve, "oscillator_drive": oscillator_drive, "oscillator_pulse": oscillator_pulse}[job["operation"]]
            result = computation(job, output_dir, cancel, lambda completed, total: self.notify(
                "job.progress", {"jobId": job["jobId"], "completed": completed,
                                 "total": total, "fraction": completed / total}))
            if result is None:
                method, payload = "job.cancelled", {"jobId": job["jobId"]}
            else:
                method, payload = "job.completed", result
        except Exception:
            traceback.print_exc(file=sys.stderr)
            method, payload = "job.failed", {"jobId": job["jobId"], "message": "Quantum job failed; inspect worker diagnostics"}
        finally:
            with self._lock:
                if self._active is not None and self._active[0] == job["jobId"]:
                    self._active = None
        self.notify(method, payload)
