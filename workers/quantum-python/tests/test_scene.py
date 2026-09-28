import copy
import hashlib
import json
import struct
import unittest
from pathlib import Path
from quantum_worker.scene import validate_scene, verify_scene_artifacts
from jsonschema.exceptions import ValidationError


class SceneTests(unittest.TestCase):
    def test_shared_lattice_fixtures_and_identity_checks(self):
        root = Path(__file__).resolve().parents[3] / "packages/quantum-scene/fixtures"
        for family in ("square","honeycomb","simple_cubic"):
            fixture = json.loads((root / f"lattice-{family}.json").read_text(encoding="utf-8"))
            scene = fixture["scene"]
            artifacts = {p: struct.pack(f"<{len(v)}d", *v) for p,v in fixture["values"].items()}
            arrays = verify_scene_artifacts(scene, artifacts)
            self.assertEqual(len(arrays["site-basis"]), 8 if family != "square" else 4)
            d = next(d for d in scene["datasets"] if d["id"] == "site-cells")
            values = list(arrays["site-cells"]); values[0] = 99
            artifacts[d["path"]] = struct.pack(f"<{len(values)}d", *values)
            d["sha256"] = hashlib.sha256(artifacts[d["path"]]).hexdigest()
            with self.assertRaisesRegex(ValueError,"site identity"):
                verify_scene_artifacts(scene, artifacts)

    def setUp(self):
        self.fixture = json.loads((Path(__file__).resolve().parents[3] / "packages/quantum-scene/fixtures/bloch-vector.json").read_text())

    def test_shared_fixture_and_binary_hashes(self):
        scene = self.fixture["scene"]
        validate_scene(scene)
        artifacts = {p: struct.pack(f"<{len(v)}d", *v) for p, v in self.fixture["values"].items()}
        arrays = verify_scene_artifacts(scene, artifacts)
        self.assertEqual(arrays["directions"], (0, 0, 1))
        artifacts["directions.f64"] = bytes(24)
        with self.assertRaises(ValueError):
            verify_scene_artifacts(scene, artifacts)

    def test_invalid_contracts(self):
        rejected = json.loads((Path(__file__).resolve().parents[3] / "packages/quantum-scene/fixtures/rejected.json").read_text())
        for fixture in rejected:
            scene = copy.deepcopy(self.fixture["scene"])
            if fixture["field"] == "schema":
                scene["schema"] = fixture["value"]
            elif fixture["field"] == "path":
                scene["datasets"][0]["path"] = fixture["value"]
            else:
                scene["objects"][0]["kind"] = fixture["value"]
            with self.assertRaises(ValidationError):
                validate_scene(scene)
        for parameters in ({"delta": float("nan")}, {"delta": True}, {"unsafe-key": 1}, {}):
            scene = copy.deepcopy(self.fixture["scene"])
            scene["provenance"]["parameters"] = parameters
            with self.assertRaises(ValidationError):
                validate_scene(scene)
        mutations = [
            lambda s: s.update(schema="quantum-scene/v2"),
            lambda s: s.update(script="executable"),
            lambda s: s["datasets"][0].update(path="../secret.f64"),
            lambda s: s["datasets"][0].update(bytes=8),
            lambda s: s["objects"][0].update(values="missing"),
            lambda s: s["objects"][0].update(kind="mesh"),
            lambda s: s["camera"].update(target=s["camera"]["position"]),
            lambda s: s["objects"][0]["style"].update(opacity=float("nan")),
        ]
        for mutate in mutations:
            scene = copy.deepcopy(self.fixture["scene"])
            mutate(scene)
            with self.assertRaises((ValueError, ValidationError)):
                validate_scene(scene)

    def test_shared_field_fixture(self):
        fixture = json.loads((Path(__file__).resolve().parents[3] / "packages/quantum-scene/fixtures/complex-field.json").read_text())
        artifacts = {p: struct.pack(f"<{len(v)}d", *v) for p, v in fixture["values"].items()}
        arrays = verify_scene_artifacts(fixture["scene"], artifacts)
        self.assertEqual(arrays["real"][18], 1)
        fixture["scene"]["fields"][0]["grid"]["spacing"][0] = 0
        with self.assertRaises(ValueError):
            validate_scene(fixture["scene"])
