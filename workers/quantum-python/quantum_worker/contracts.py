import json
import math
from pathlib import Path
from jsonschema import Draft7Validator, validators

SCHEMA_DIR = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "schemas"

def finite_number(_checker, value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

FiniteValidator = validators.extend(Draft7Validator, type_checker=Draft7Validator.TYPE_CHECKER.redefine("number", finite_number))
VALIDATORS = {name: FiniteValidator(json.loads((SCHEMA_DIR / f"{name}.v1.json").read_text(encoding="utf-8")))
              for name in ("quantum-job", "quantum-result", "worker-capabilities", "worker-resources")}

def validate(name, value):
    VALIDATORS[name].validate(value)
    if name == "quantum-job" and value["operation"] == "oscillator":
        p = value["model"]["parameters"]
        if p["levels"] > p["cutoff"] or p["state"] >= p["cutoff"] - 1 or p["points"] % 2 != 1:
            raise ValueError("Oscillator needs levels<=cutoff, state<cutoff-1 and an odd grid")
    if name == "quantum-job" and value["operation"] == "orbital":
        p = value["model"]["parameters"]
        if p["l"] >= p["n"] or abs(p["m"]) > p["l"] or (p["basis"] != "complex" and p["m"] < 0) or (p["basis"] == "real_sin" and p["m"] == 0):
            raise ValueError("Invalid orbital quantum numbers or real-harmonic convention")
