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
    kind: Literal["point-cloud", "polyline", "segments", "vectors", "mesh"]
    positions: str
    values: NotRequired[str]
    indices: NotRequired[str]
    scalars: NotRequired[str]
    colorMap: NotRequired[Literal["phase"]]
    visible: bool
    style: Style


class Source(TypedDict):
    repository: str
    revision: str
    entryId: str


class Provenance(TypedDict):
    kind: NotRequired[Literal["geometry-fixture", "numerical-result"]]
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


class FieldGrid(TypedDict):
    shape: list[int]
    origin: list[float]
    spacing: list[float]
    order: Literal["xyz-z-fastest"]


class SceneField(TypedDict):
    id: str
    label: str
    kind: Literal["scalar-field", "complex-field"]
    real: str
    imaginary: NotRequired[str]
    grid: FieldGrid


class SceneLattice(TypedDict):
    dimensions: Literal[2, 3]
    basis: list[dict]
    translations: list[list[float]]
    repeats: list[int]
    boundary: Literal["open"]
    sites: str
    cells: str
    basisIndices: str


class SceneReciprocal(TypedDict):
    directBasis: list[list[float]]
    basis: list[list[float]]
    directUnit: str
    reciprocalUnit: str
    pointObject: str
    points: list[dict]
    paths: list[dict]
    boundaryObjects: list[str]


class QuantumScene(TypedDict):
    schema: Literal["quantum-scene/v1"]
    id: str
    title: str
    provenance: Provenance
    coordinates: Coordinates
    camera: Camera
    datasets: list[Dataset]
    objects: list[SceneObject]
    fields: NotRequired[list[SceneField]]
    lattice: NotRequired[SceneLattice]
    reciprocal: NotRequired[SceneReciprocal]
    annotations: list[Annotation]


_schema = Path(__file__).resolve().parents[3] / "packages/quantum-scene/quantum-scene.v1.json"
_validator = FiniteValidator(json.loads(_schema.read_text(encoding="utf-8")))


def validate_scene(scene: QuantumScene):
    _validator.validate(scene)
    if not scene["objects"] and not scene.get("fields"):
        raise ValueError("Scene has no objects or fields")

    def unique(items):
        if len(set(items)) != len(items):
            raise ValueError("Duplicate scene identity")

    unique([o["id"] for o in scene["objects"]] + [a["id"] for a in scene["annotations"]] + [f["id"] for f in scene.get("fields", [])])
    unique([d["id"] for d in scene["datasets"]])
    unique([d["path"] for d in scene["datasets"]])
    if sum(d["bytes"] for d in scene["datasets"]) > 16777216:
        raise ValueError("Scene exceeds memory budget")
    datasets = {d["id"]: d for d in scene["datasets"]}
    for d in scene["datasets"]:
        if d["bytes"] != d["count"] * d["components"] * 8:
            raise ValueError("Dataset shape/size mismatch")
    for field in scene.get("fields", []):
        if (field["kind"] == "complex-field") != ("imaginary" in field):
            raise ValueError("Field kind/reference mismatch")
        grid = field["grid"]
        nodes = math.prod(grid["shape"])
        for key in ("real", "imaginary"):
            if key not in field:
                continue
            d = datasets.get(field[key])
            if not d or d["components"] != 1 or d["count"] != nodes:
                raise ValueError("Field grid/dataset mismatch")
        for a in range(3):
            if grid["spacing"][a] <= 0 or abs(grid["origin"][a] + grid["spacing"][a]*(grid["shape"][a]-1)) > 1000000:
                raise ValueError("Invalid field grid extent")
    for o in scene["objects"]:
        if o.get("colorMap") == "phase" and ("scalars" not in o or datasets.get(o["scalars"], {}).get("unit") != "rad"):
            raise ValueError("Phase color requires a radian scalar dataset")
        p = datasets.get(o["positions"])
        if not p or p["components"] != 3:
            raise ValueError("Missing position dataset")
        if o["kind"] == "polyline" and p["count"] < 2:
            raise ValueError("Polyline needs two points")
        if o["kind"] == "segments" and (p["count"] < 2 or p["count"] % 2):
            raise ValueError("Segments need endpoint pairs")
        if (o["kind"] == "vectors") != ("values" in o) or (o["kind"] == "mesh") != ("indices" in o):
            raise ValueError("Object kind/reference mismatch")
        for key, components, same_count in (("values", 3, True), ("indices", 3, False), ("scalars", 1, True)):
            if key not in o:
                continue
            d = datasets.get(o[key])
            if not d or d["components"] != components or (same_count and d["count"] != p["count"]):
                raise ValueError("Object dataset mismatch")
    lattice = scene.get("lattice")
    if lattice:
        count = math.prod(lattice["repeats"])*len(lattice["basis"])
        translations = lattice["translations"]
        if len(translations) != lattice["dimensions"] or (lattice["dimensions"] == 2 and lattice["repeats"][2] != 1):
            raise ValueError("Lattice dimension mismatch")
        a, b = translations[:2]
        cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
        rank = math.hypot(*cross) if len(translations) == 2 else abs(sum(v*w for v,w in zip(cross,translations[2])))
        if rank < 1e-9:
            raise ValueError("Degenerate lattice basis")
        for key, components in (("sites",3),("cells",3),("basisIndices",1)):
            d = datasets.get(lattice[key])
            if not d or d["components"] != components or d["count"] != count:
                raise ValueError("Lattice dataset mismatch")
    reciprocal = scene.get("reciprocal")
    if reciprocal:
        r = reciprocal
        objects = {o["id"]: o for o in scene["objects"]}
        unique([p["id"] for p in r["points"]]); unique([p["object"] for p in r["paths"]]); unique(r["boundaryObjects"])
        if len(r["basis"]) != len(r["directBasis"]):
            raise ValueError("Reciprocal dimension mismatch")
        for i,a in enumerate(r["directBasis"]):
            for j,b in enumerate(r["basis"]):
                if abs(sum(v*w for v,w in zip(a,b))-(2*math.pi if i==j else 0)) > 1e-9:
                    raise ValueError("Reciprocal basis is not dual (2pi convention)")
        o = objects.get(r["pointObject"])
        if not o or o["kind"] != "point-cloud" or datasets[o["positions"]]["count"] != len(r["points"]):
            raise ValueError("Reciprocal point object mismatch")
        point_ids = {p["id"] for p in r["points"]}
        for path in r["paths"]:
            o = objects.get(path["object"])
            if not o or o["kind"] != "polyline" or datasets[o["positions"]]["count"] != len(path["points"]) or any(p not in point_ids for p in path["points"]):
                raise ValueError("Reciprocal path mismatch")
        if any(objects.get(o,{}).get("kind") not in ("polyline","segments") for o in r["boundaryObjects"]):
            raise ValueError("Reciprocal boundary mismatch")
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
        if o.get("colorMap") == "phase" and not all(abs(v) <= math.pi + 1e-10 for v in arrays[o["scalars"]]):
            raise ValueError("Phase outside radian range")
    for field in scene.get("fields", []):
        if field["kind"] == "complex-field":
            for key in ("real", "imaginary"):
                if not all(abs(v) <= 1e100 for v in arrays[field[key]]):
                    raise ValueError("Complex amplitude exceeds safe derived-density range")
    lattice = scene.get("lattice")
    if lattice:
        positions, cells, basis = (arrays[lattice[key]] for key in ("sites","cells","basisIndices"))
        seen = set()
        for i, k in enumerate(basis):
            cell = cells[3*i:3*i+3]
            identity = (*cell,k)
            if not k.is_integer() or not 0 <= k < len(lattice["basis"]) or any(not v.is_integer() or not 0 <= v < lattice["repeats"][j] for j,v in enumerate(cell)) or identity in seen:
                raise ValueError("Invalid lattice site identity")
            seen.add(identity)
            for axis in range(3):
                expected = lattice["basis"][int(k)]["position"][axis] + sum(t[axis]*cell[j] for j,t in enumerate(lattice["translations"]))
                if abs(positions[3*i+axis]-expected) > 1e-9:
                    raise ValueError("Lattice position disagrees with cell and basis")
    r = scene.get("reciprocal")
    if r:
        objects = {o["id"]: o for o in scene["objects"]}
        def check_points(object_id, points):
            values = arrays[objects[object_id]["positions"]]
            for i,p in enumerate(points):
                if any(abs(v-values[3*i+a]) > 1e-9 for a,v in enumerate(p)):
                    raise ValueError("Reciprocal point coordinates disagree")
        check_points(r["pointObject"], [p["position"] for p in r["points"]])
        for path in r["paths"]:
            check_points(path["object"], [next(p["position"] for p in r["points"] if p["id"] == id) for id in path["points"]])
    return arrays
