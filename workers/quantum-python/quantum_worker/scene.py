"""Portable QVIS data model/validation; not a new worker RPC or physics engine."""
import hashlib
import json
import math
import struct
from pathlib import Path
from typing import Literal, NotRequired, TypedDict
from .contracts import FiniteValidator


class Dataset(TypedDict):
    id: str
    path: str
    format: Literal["f64le"]
    count: int
    components: Literal[1, 3]
    unit: str
    bytes: int
    sha256: str


class Style(TypedDict):
    color: str
    opacity: float
    size: float


class SceneObject(TypedDict):
    id: str
    label: str
    kind: Literal["point-cloud", "polyline", "vectors", "mesh"]
    positions: str
    values: NotRequired[str]
    indices: NotRequired[str]
    scalars: NotRequired[str]
    visible: bool
    style: Style


class Source(TypedDict):
    repository: str
    revision: str
    entryId: str


class Provenance(TypedDict):
    runId: str
    jobId: str
    model: str
    engine: str
    engineVersion: str
    computedAt: str
    resultSha256: str
    adapter: Literal["qvis/1"]
    parameters: NotRequired[dict[str, float | str]]
    source: NotRequired[Source]


class Coordinates(TypedDict):
    handedness: Literal["right"]
    axes: list[str]
    units: list[str]


class Camera(TypedDict):
    position: list[float]
    target: list[float]
    up: list[float]


class Annotation(TypedDict):
    id: str
    text: str
    position: list[float]


class QuantumScene(TypedDict):
    schema: Literal["quantum-scene/v1"]
    id: str
    title: str
    provenance: Provenance
    coordinates: Coordinates
    camera: Camera
    datasets: list[Dataset]
    objects: list[SceneObject]
    annotations: list[Annotation]


_schema = Path(__file__).resolve().parents[3] / "packages/quantum-scene/quantum-scene.v1.json"
_validator = FiniteValidator(json.loads(_schema.read_text(encoding="utf-8")))


def validate_scene(scene: QuantumScene):
    _validator.validate(scene)

    def unique(items):
        if len(set(items)) != len(items):
            raise ValueError("Duplicate scene identity")

    unique([o["id"] for o in scene["objects"]] + [a["id"] for a in scene["annotations"]])
    unique([d["id"] for d in scene["datasets"]])
    unique([d["path"] for d in scene["datasets"]])
    if sum(d["bytes"] for d in scene["datasets"]) > 16777216:
        raise ValueError("Scene exceeds memory budget")
    datasets = {d["id"]: d for d in scene["datasets"]}
    for d in scene["datasets"]:
        if d["bytes"] != d["count"] * d["components"] * 8:
            raise ValueError("Dataset shape/size mismatch")
    for o in scene["objects"]:
        p = datasets.get(o["positions"])
        if not p or p["components"] != 3:
            raise ValueError("Missing position dataset")
        if o["kind"] == "polyline" and p["count"] < 2:
            raise ValueError("Polyline needs two points")
        if (o["kind"] == "vectors") != ("values" in o) or (o["kind"] == "mesh") != ("indices" in o):
            raise ValueError("Object kind/reference mismatch")
        for key, components, same_count in (("values", 3, True), ("indices", 3, False), ("scalars", 1, True)):
            if key not in o:
                continue
            d = datasets.get(o[key])
            if not d or d["components"] != components or (same_count and d["count"] != p["count"]):
                raise ValueError("Object dataset mismatch")
    c = scene["camera"]
    direction = [t - p for t, p in zip(c["target"], c["position"])]
    u = c["up"]
    cross = [direction[1]*u[2]-direction[2]*u[1], direction[2]*u[0]-direction[0]*u[2], direction[0]*u[1]-direction[1]*u[0]]
    if math.hypot(*cross) < 1e-9:
        raise ValueError("Degenerate scene camera")


def verify_scene_artifacts(scene: QuantumScene, artifacts: dict[str, bytes]):
    validate_scene(scene)
    if set(artifacts) != {d["path"] for d in scene["datasets"]}:
        raise ValueError("Unexpected scene artifacts")
    arrays = {}
    for d in scene["datasets"]:
        data = artifacts[d["path"]]
        if len(data) != d["bytes"] or hashlib.sha256(data).hexdigest() != d["sha256"]:
            raise ValueError("Scene artifact integrity failed")
        values = struct.unpack(f"<{len(data)//8}d", data)
        if not all(math.isfinite(v) for v in values):
            raise ValueError("Non-finite scene data")
        if d["components"] == 3 and not all(abs(v) <= 1000000 for v in values):
            raise ValueError("Scene coordinate exceeds bounds")
        arrays[d["id"]] = values
    for o in scene["objects"]:
        if "indices" in o and not all(v.is_integer() and 0 <= v < len(arrays[o["positions"]])/3 for v in arrays[o["indices"]]):
            raise ValueError("Invalid mesh indices")
    return arrays
