"""QWZ quantum-result/v2 sidecar mapped from exact saved v1 result bytes."""

from hashlib import sha256
import json
import math
from struct import pack

from .contracts import SCHEMA_DIR, FiniteValidator, validate


SCHEMA_PATH = SCHEMA_DIR / "quantum-result.v2.json"
SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
VALIDATOR = FiniteValidator(SCHEMA)
SPECS = (
    ("band-k", "bandKValues", "coordinate", ["kx"], "rad / lattice constant"),
    ("lower-band", "lowerBand", "energy", ["kx", "ky"], "normalized energy (hbar=1)"),
    ("upper-band", "upperBand", "energy", ["kx", "ky"], "normalized energy (hbar=1)"),
    ("berry-curvature", "berryCurvature", "berry-curvature", ["kx", "ky"], "dimensionless (a=1)"),
)


def _numeric_hash(values):
    if not all(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
               for value in values):
        raise ValueError("Non-finite or non-numeric QWZ dataset")
    return sha256(b"".join(pack("<d", value) for value in values)).hexdigest()


def qwz_result_v2(source_bytes: bytes) -> dict:
    source = json.loads(source_bytes)
    validate("quantum-result", source)
    if (source.get("schema") != "quantum-result/v1" or source.get("operation") != "topology"
            or source.get("status") != "completed" or source.get("model", {}).get("type") != "qwz"
            or source.get("analysis", {}).get("kind") != "qwz"):
        raise ValueError("Expected a completed QWZ quantum-result/v1")
    grid = source["model"]["parameters"]["grid"]
    analysis = source["analysis"]
    datasets = []
    for dataset_id, key, role, axes, unit in SPECS:
        shape = [grid] if len(axes) == 1 else [grid, grid]
        values = analysis.get(key)
        if not isinstance(values, list) or len(values) != grid ** len(axes):
            raise ValueError(f"Missing or wrong-shaped QWZ {key}")
        datasets.append({
            "id": dataset_id, "role": role, "axes": axes, "shape": shape, "unit": unit,
            "storage": {"kind": "source-json-pointer", "pointer": f"/analysis/{key}",
                        "encoding": "f64le", "sha256": _numeric_hash(values)},
        })
    value = {
        "schema": "quantum-result/v2", "runId": source["runId"], "jobId": source["jobId"],
        "operation": "topology", "model": {"type": "qwz", "parameters": source["model"]["parameters"]},
        "source": {"schema": "quantum-result/v1", "resultSha256": sha256(source_bytes).hexdigest(),
                   "bytes": len(source_bytes)},
        "datasets": datasets,
        "facts": {key: analysis[key] for key in ("bulkGap", "sampledGap", "chern", "meshResolved")},
        "unavailable": [{"role": role, "reason": "not supplied by quantum-result/v1 QWZ worker"}
                        for role in ("eigenstates", "berry-connection")],
    }
    VALIDATOR.validate(value)
    return value


def validate_qwz_result_v2(value: dict, source_bytes: bytes) -> None:
    VALIDATOR.validate(value)
    if value != qwz_result_v2(source_bytes):
        raise ValueError("quantum-result/v2 does not match the verified source run")
