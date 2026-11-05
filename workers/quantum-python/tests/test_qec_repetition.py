import pytest

from quantum_worker.engines.qec_repetition import solve


def test_each_single_error_is_corrected_and_defects_are_temporal():
    for bit, syndrome in ((0, [1, 0]), (1, [1, 1]), (2, [0, 1])):
        result = solve({"flips": [-1, bit, -1]})
        assert result["rounds"][1]["defects"] == syndrome
        assert result["rounds"][2]["defects"] == [0, 0]
        assert result["decoder"]["correctionBit"] == bit
        assert result["decoder"]["correctedBits"] == [0, 0, 0]


def test_two_errors_are_explicitly_ambiguous():
    result = solve({"flips": [0, 1]})
    assert result["decoder"]["ambiguousMultipleErrors"]
    assert result["decoder"]["logicalResult"] == 1


@pytest.mark.parametrize("flips", [[], [3], [True], [0] * 33, "0", [0.0]])
def test_invalid_schedule_refused(flips):
    with pytest.raises(ValueError):
        solve({"flips": flips})
