import json
import math
from pathlib import Path
from jsonschema import Draft7Validator, validators

SCHEMA_DIR = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "schemas"

def finite_number(_checker, value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

FiniteValidator = validators.extend(Draft7Validator, type_checker=Draft7Validator.TYPE_CHECKER.redefine("number", finite_number))
VALIDATORS = {name: FiniteValidator(json.loads((SCHEMA_DIR / f"{name}.v1.json").read_text(encoding="utf-8")))
              for name in ("quantum-job", "quantum-result", "worker-capabilities")}

def validate(name, value):
    VALIDATORS[name].validate(value)
