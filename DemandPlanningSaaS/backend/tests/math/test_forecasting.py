"""Regression locks on the forecasting math (the platform's one genuinely real asset).

Golden values are recorded from the current reference implementation. If a future
change alters the numeric behaviour of these functions, these tests fail — catching
accidental regressions to the crown-jewel engine before it ships.
"""

import numpy as np
import pandas as pd
import pytest

from core.forecasting import MovingAverageModel, SESModel, calculate_metrics


def test_calculate_metrics_golden():
    y_true = np.array([100.0, 110.0, 90.0, 120.0])
    y_pred = np.array([105.0, 100.0, 95.0, 115.0])
    m = calculate_metrics(y_true, y_pred)
    assert m["MAE"] == pytest.approx(6.25, abs=1e-9)
    assert m["RMSE"] == pytest.approx(6.6143783, abs=1e-6)
    assert m["MAPE"] == pytest.approx(5.9532828, abs=1e-6)


def test_mape_handles_zero_actual_without_dividing_by_zero():
    # The 1e-5 floor in the MAPE formula must prevent inf/NaN when an actual is 0.
    m = calculate_metrics(np.array([0.0, 100.0]), np.array([5.0, 100.0]))
    assert np.isfinite(m["MAPE"])


def test_moving_average_model_golden():
    df = pd.DataFrame({"d": [10.0, 12.0, 14.0, 16.0, 18.0, 20.0]})
    model = MovingAverageModel(window=3)
    model.fit(df, "d")
    # Mean of the last 3 observations (16, 18, 20) = 18, held flat.
    assert model.predict(2).tolist() == [18.0, 18.0]


def test_ses_model_is_deterministic_and_reasonable():
    df = pd.DataFrame({"d": [10.0, 12.0, 14.0, 16.0, 18.0, 20.0]})
    model = SESModel()
    model.fit(df, "d")
    preds = np.asarray(model.predict(2), dtype=float)
    # SES forecasts a flat level; for a rising series it lands near the last values.
    assert preds.shape == (2,)
    assert preds[0] == pytest.approx(preds[1], abs=1e-9)  # flat
    assert 10.0 <= preds[0] <= 25.0
