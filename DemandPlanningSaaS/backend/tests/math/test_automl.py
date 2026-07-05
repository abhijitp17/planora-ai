"""Regression locks on inventory-optimization math in core/automl.py."""

import numpy as np
import pytest

from core.automl import calculate_dynamic_safety_stock, optimize_service_level


def test_dynamic_safety_stock_golden():
    # SS = Z * sqrt[(LT * sigma_d^2) + (D^2 * sigma_LT^2)]  at 95% service level.
    ss = calculate_dynamic_safety_stock(
        avg_demand=100, std_demand=15, avg_lead_time=7, std_lead_time=1.0, service_level=0.95
    )
    assert ss == pytest.approx(176.965153, abs=1e-4)


def test_dynamic_safety_stock_increases_with_service_level():
    lo = calculate_dynamic_safety_stock(100, 15, 7, 1.0, 0.90)
    hi = calculate_dynamic_safety_stock(100, 15, 7, 1.0, 0.99)
    assert hi > lo


def test_dynamic_safety_stock_increases_with_lead_time_variance():
    stable = calculate_dynamic_safety_stock(100, 15, 7, 0.0, 0.95)
    volatile = calculate_dynamic_safety_stock(100, 15, 7, 3.0, 0.95)
    assert volatile > stable


def test_optimize_service_level_returns_bounded_result():
    level, detail = optimize_service_level(
        avg_demand=100, std_demand=15, lead_time=7, unit_cost=10.0
    )
    assert 0.70 <= level <= 0.999
    assert isinstance(detail, dict)
