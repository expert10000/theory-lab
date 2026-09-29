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
    if name == "quantum-job" and value["operation"] == "oscillator_pulse":
        p, s, i = value["model"]["parameters"], value["solver"], value["initialState"]
        duration = s["tStop"]-s["tStart"]
        alpha = math.hypot(i["alphaRe"], i["alphaIm"]) if i["type"] == "coherent" else 0
        drive = math.hypot(p["epsilonRe"], p["epsilonIm"])
        if (p["points"] % 2 != 1 or duration <= 0 or duration > 20 or p["omega"]*duration > 50
                or drive > .5 or alpha > 2 or alpha+drive*min(duration, math.sqrt(2*math.pi)*p["pulseWidth"]) > 4
                or p["pulseCenter"] < 0 or p["pulseCenter"] > duration or s["maxStep"] > p["pulseWidth"]/8
                or duration/s["maxStep"] > 20000 or (i["type"] == "fock" and i["index"] >= p["cutoff"]-1)):
            raise ValueError("Unsupported Gaussian pulse width/center/integration budget")
    if name == "quantum-job" and value["operation"] == "oscillator_drive":
        p, s, i = value["model"]["parameters"], value["solver"], value["initialState"]
        duration = s["tStop"]-s["tStart"]
        alpha = math.hypot(i["alphaRe"], i["alphaIm"]) if i["type"] == "coherent" else 0
        drive = math.hypot(p["epsilonRe"], p["epsilonIm"])
        if (p["points"] % 2 != 1 or duration <= 0 or duration > 20 or p["omega"]*duration > 50
                or drive > .5 or alpha > 2 or alpha+drive*duration > 4
                or (i["type"] == "fock" and i["index"] >= p["cutoff"]-1)):
            raise ValueError("Unsupported bounded monochromatic oscillator drive")
    if name == "quantum-job" and value["operation"] == "oscillator_evolve":
        p, s, i = value["model"]["parameters"], value["solver"], value["initialState"]
        if (p["points"] % 2 != 1 or s["tStop"] <= s["tStart"] or p["omega"]*(s["tStop"]-s["tStart"]) > 100
                or (i["index"] >= p["cutoff"]-1 if i["type"] == "fock" else i["alphaRe"]**2+i["alphaIm"]**2 > 4)):
            raise ValueError("Unsupported bounded oscillator evolution")
    if name == "quantum-job" and value["operation"] == "oscillator":
        p = value["model"]["parameters"]
        if p["levels"] > p["cutoff"] or p["state"] >= p["cutoff"] - 1 or p["points"] % 2 != 1:
            raise ValueError("Oscillator needs levels<=cutoff, state<cutoff-1 and an odd grid")
    if name == "quantum-job" and value["operation"] == "orbital":
        p = value["model"]["parameters"]
        if p["l"] >= p["n"] or abs(p["m"]) > p["l"] or (p["basis"] != "complex" and p["m"] < 0) or (p["basis"] == "real_sin" and p["m"] == 0):
            raise ValueError("Invalid orbital quantum numbers or real-harmonic convention")
