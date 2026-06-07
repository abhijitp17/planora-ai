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
