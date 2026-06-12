import numpy as np
from typing import List, Dict

def simple_average_ensemble(predictions: List[np.ndarray]) -> np.ndarray:
    """ Average exactly n models outputs array element-wise """
    stacked = np.stack(predictions)
    return np.mean(stacked, axis=0)

def weighted_ensemble(predictions: List[np.ndarray], weights: List[float]) -> np.ndarray:
    stacked = np.stack(predictions)
    weight_array = np.array(weights).reshape(-1, 1)
    return np.sum(stacked * weight_array, axis=0) / np.sum(weights)

def evaluate_models(y_true: np.ndarray, model_preds: Dict[str, np.ndarray]):
    from core.forecasting import calculate_metrics
    results = {}
    for name, pred in model_preds.items():
        results[name] = calculate_metrics(y_true, pred)
        
    return results

# ═════════════════════════════════════════════════════════════════════════════
# Priority 2 — Advanced Ensemble Methods
# ═════════════════════════════════════════════════════════════════════════════

from sklearn.linear_model import LinearRegression
from sklearn.model_selection import TimeSeriesSplit
import numpy as np

def stacked_ensemble_weights(
    model_predictions: dict,  # {model_name: predictions_array}
    actuals: np.ndarray
) -> dict:
    """
    Learn optimal ensemble weights using stacked generalization.
    Returns: {model_name: weight} that minimizes error.
    """
    # Stack predictions as features
    X = np.column_stack(list(model_predictions.values()))
    y = actuals
    
    # Train meta-learner with non-negative weights
    from sklearn.linear_model import Ridge
    meta = Ridge(alpha=1.0, fit_intercept=False, positive=True)
    
    # Time series cross-validation
    tscv = TimeSeriesSplit(n_splits=3)
    weights_list = []
    
    for train_idx, _ in tscv.split(X):
        meta.fit(X[train_idx], y[train_idx])
        weights_list.append(meta.coef_)
    
    # Average weights across folds
    optimal_weights = np.mean(weights_list, axis=0)
    
    # Normalize to sum to 1
    optimal_weights = optimal_weights / optimal_weights.sum()
    
    # Map back to model names
    model_names = list(model_predictions.keys())
    weight_dict = {name: float(weight) for name, weight in zip(model_names, optimal_weights)}
    
    return weight_dict


def detect_forecast_bias(
    actuals: np.ndarray,
    forecasts: np.ndarray
) -> dict:
    """
    Detect systematic forecast bias.
    Returns: {mean_error, bias_pct, correction_factor}
    """
    errors = actuals - forecasts
    mean_error = np.mean(errors)
    mean_actual = np.mean(actuals)
    
    bias_pct = (mean_error / mean_actual) * 100 if mean_actual != 0 else 0
    
    # Correction factor: multiply future forecasts by this
    correction_factor = 1 - (bias_pct / 100)
    
    return {
        "mean_error": float(mean_error),
        "bias_pct": float(bias_pct),
        "correction_factor": float(correction_factor),
        "bias_type": "overforecast" if mean_error > 0 else "underforecast" if mean_error < 0 else "unbiased",
    }


def sensitivity_analysis(
    y: np.ndarray,
    base_model,
    param_variations: dict,  # {param_name: [value1, value2, value3]}
    horizon: int = 12
) -> list:
    """
    Run sensitivity analysis on model parameters.
    Returns: [{param, value, forecast, mape_delta}]
    """
    results = []
    
    # Baseline
    baseline_pred = base_model.predict(steps=horizon)
    test_y = y[-horizon:]  # Last horizon periods for validation
    baseline_mape = np.mean(np.abs((test_y - baseline_pred[:len(test_y)]) / test_y)) * 100
    
    # Try each variation
    for param_name, values in param_variations.items():
        for val in values:
            try:
                # Clone model and set parameter
                import copy
                model_copy = copy.deepcopy(base_model)
                setattr(model_copy, param_name, val)
                
                # Refit and predict
                model_copy.fit(y[:-horizon])
                pred = model_copy.predict(steps=horizon)
                mape = np.mean(np.abs((test_y - pred[:len(test_y)]) / test_y)) * 100
                
                results.append({
                    "parameter": param_name,
                    "value": val,
                    "mape": round(mape, 2),
                    "mape_delta": round(mape - baseline_mape, 2),
                    "forecast_avg": round(np.mean(pred), 0),
                })
            except:
                continue
    
    return results

