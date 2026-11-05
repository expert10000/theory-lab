"""Bounded three-data-bit repetition-code syndrome example.

This is a classical stabilizer measurement record, not a surface-code solver.
The decoder uses the final two parity checks and cannot resolve multiple errors.
"""

from hashlib import sha256
import json


def solve(params):
    flips = params.get("flips")
    if not isinstance(flips, list) or not 1 <= len(flips) <= 32 or any(
        type(bit) is not int or bit not in (-1, 0, 1, 2) for bit in flips
    ):
        raise ValueError("flips must be 1..32 rounds of -1 (none) or data-bit indices 0..2")
    bits = [0, 0, 0]
    previous = [0, 0]
    rounds = []
    for index, flip in enumerate(flips):
        if flip >= 0:
            bits[flip] ^= 1
        syndrome = [bits[0] ^ bits[1], bits[1] ^ bits[2]]
        defects = [syndrome[0] ^ previous[0], syndrome[1] ^ previous[1]]
        rounds.append({"round": index, "flip": flip, "syndrome": syndrome,
                       "defects": defects, "dataBits": bits.copy()})
        previous = syndrome
    correction = {(0, 0): -1, (1, 0): 0, (1, 1): 1, (0, 1): 2}[tuple(previous)]
    corrected = bits.copy()
    if correction >= 0:
        corrected[correction] ^= 1
    record = {"schema": "qec-repetition-study/v1", "code": "three-bit-repetition",
              "initialLogical": 0, "rounds": rounds,
              "decoder": {"method": "final-syndrome-minimum-weight", "correctionBit": correction,
                          "correctedBits": corrected, "logicalResult": corrected[0],
                          "ambiguousMultipleErrors": sum(bit >= 0 for bit in flips) > 1},
              "limitations": ["Only ideal parity checks and prescribed bit flips are modeled.",
                              "Multiple data errors can share a syndrome; no surface-code or fault-tolerance claim."]}
    record["sha256"] = sha256(json.dumps(record, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return record
