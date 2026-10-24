"""Append the bounded BHZ general variants without rewriting frozen v1 branches."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1] / "packages/contracts/schemas"
num = lambda lo, hi: {"type": "number", "minimum": lo, "maximum": hi}
integer = lambda lo, hi: {"type": "integer", "minimum": lo, "maximum": hi}
arr = lambda item, lo, hi: {"type": "array", "items": item, "minItems": lo, "maxItems": hi}
def obj(properties, required=None):
    return {"type": "object", "additionalProperties": False,
            "properties": properties, "required": required or list(properties)}

parameters = obj({"A": num(.25, 2), "B": num(.25, 2), "C": num(-2, 2),
                  "D": num(-1, 1), "M": num(-4, 16), "R": num(-.5, .5),
                  "grid": integer(11, 21), "edgeCells": integer(8, 16),
                  "edgeSamples": integer(11, 21), "continuumExtent": num(.5, 2)})
model = obj({"type": {"const": "bhz_general"}, "parameters": parameters,
             "source": {"$ref": "#/oneOf/0/properties/model/properties/source"}},
            ["type", "parameters"])
id_property = {"type": "string", "minLength": 1, "maxLength": 100,
               "pattern": "^[A-Za-z0-9_-]+$"}
job = obj({"schema": {"const": "quantum-job/v1"}, "jobId": id_property,
           "operation": {"const": "topology"}, "engine": {"const": "native"},
           "model": model})
complex_pair = arr(num(-1.000001, 1.000001), 2, 2)
state = obj({"energy": num(-200, 200), "spin": arr(num(-1.000001, 1.000001), 3, 3),
             "amplitudes": arr(complex_pair, 4, 64)})
edge_state = obj({**state["properties"], "density": arr(num(0, 1.000001), 8, 16),
                  "edgeWeight": num(0, 1.000001)})
bands = arr(arr(num(-200, 200), 121, 441), 4, 4)
edge = obj({"kValues": arr(num(-3.141593, 3.141593), 11, 21),
            "energies": arr(arr(num(-200, 200), 32, 64), 11, 21),
            "weights": arr(arr(num(0, 1.000001), 32, 64), 11, 21),
            "selectedKIndex": integer(0, 20), "states": arr(edge_state, 4, 4)})
analysis = obj({"kind": {"const": "bhz_general"}, "bulkGap": num(0, 200),
                "sampledGap": num(0, 200), "gapClosed": {"type": "boolean"},
                "meshResolved": {"type": "boolean"}, "z2": {"enum": [0, 1, None]},
                "paritySigns": arr({"enum": [-1, 0, 1]}, 4, 4),
                "blockChern": {"enum": [-1, 0, 1, None]},
                "partnerChern": {"enum": [-1, 0, 1, None]},
                "latticeKValues": arr(num(-3.141593, 3.141593), 11, 21),
                "latticeBandEnergies": bands,
                "continuumKValues": arr(num(-2, 2), 11, 21),
                "continuumBandEnergies": bands,
                "bulkStateK": arr(num(-3.141593, 3.141593), 2, 2),
                "bulkStates": arr(state, 4, 4), "edge": edge})
result = obj({"schema": {"const": "quantum-result/v1"}, "jobId": id_property,
              "runId": id_property, "status": {"const": "completed"},
              "operation": {"const": "topology"}, "model": model,
              "engine": obj({"name": {"const": "native"},
                             "version": {"type": "string", "minLength": 1}}),
              "analysis": analysis,
              "provenance": {"$ref": "#/oneOf/5/properties/provenance"}})

for name, variant in (("quantum-job.v1.json", job), ("quantum-result.v1.json", result)):
    path = root / name
    original = path.read_text(encoding="utf-8")
    parsed = json.loads(original)
    if parsed["oneOf"][-1] == variant:
        continue
    if any("bhz_general" in json.dumps(branch) for branch in parsed["oneOf"]):
        raise RuntimeError(f"{name} contains a changed BHZ general variant")
    marker = "  ]\n}"
    assert original.endswith(marker + "\n")
    text = original[:-len(marker + "\n")] + "    ," + json.dumps(variant, separators=(",", ":")) + "\n" + marker + "\n"
    json.loads(text)
    path.write_text(text, encoding="utf-8", newline="")
