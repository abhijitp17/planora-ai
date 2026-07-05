"""Regression locks on ensemble + bias math."""

import numpy as np
import pytest

from core.ensembles import (
    detect_forecast_bias,
    simple_average_ensemble,
    weighted_ensemble,
)


def test_simple_average_ensemble_golden():
    out = simple_average_ensemble([np.array([10.0, 20.0]), np.array([20.0, 40.0])])
    assert out.tolist() == [15.0, 30.0]


def test_weighted_ensemble_golden():
    out = weighted_ensemble(
        [np.array([10.0, 20.0]), np.array([20.0, 40.0])], [0.25, 0.75]
    )
    assert out.tolist() == [17.5, 35.0]


def test_weighted_ensemble_normalizes_weights():
    # Weights that don't sum to 1 must still be normalized by their sum.
    out = weighted_ensemble([np.array([10.0]), np.array([20.0])], [1.0, 3.0])
    assert out.tolist() == pytest.approx([17.5])


def test_detect_forecast_bias_golden():
    b = detect_forecast_bias(np.array([100.0, 100.0, 100.0]), np.array([90.0, 95.0, 92.0]))
    assert b["mean_error"] == pytest.approx(7.6666667, abs=1e-6)
    assert b["bias_pct"] == pytest.approx(7.6666667, abs=1e-6)
    assert b["correction_factor"] == pytest.approx(0.9233333, abs=1e-6)
    assert b["bias_type"] == "overforecast"


def test_detect_forecast_bias_direction():
    under = detect_forecast_bias(np.array([100.0]), np.array([120.0]))
    assert under["bias_type"] == "underforecast"
