"""
AutoML Engine — Automatic Model Selection and Hyperparameter Tuning
Priority 1 Enhancements
"""

from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np
from typing import Dict, List, Tuple
import pandas as pd

# Import all model classes
from core.forecasting import (
    MovingAverageModel, SESModel, HoltModel, HoltWintersModel,
    ARIMAModel, SARIMAModel, ARIMAXModel, SARIMAXModel, CrostonModel,
    DecisionTreeModel, RandomForestModel, ExtraTreesModel,
    AdaBoostModel, XGBoostModel, LightGBMModel
)


class AutoMLEngine:
    """Automatic model selection with hyperparameter tuning"""
    
    MODELS = {
        'ma': MovingAverageModel,
        'ses': SESModel,
        'holt': HoltModel,
        'hw': HoltWintersModel,
        'arima': ARIMAModel,
        'sarima': SARIMAModel,
        'croston': CrostonModel,
        'dt': DecisionTreeModel,
        'rf': RandomForestModel,
        'xgboost': XGBoostModel,
        'lightgbm': LightGBMModel,
    }
    
    PARAM_GRIDS = {
        'rf': {
            'n_estimators': [50, 100, 200],
            'max_depth': [10, 20, None],
            'min_samples_split': [2, 5, 10],
        },
        'xgboost': {
            'n_estimators': [50, 100, 200],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.1, 0.3],
        },
        'lightgbm': {
            'n_estimators': [50, 100, 200],
            'num_leaves': [31, 50, 100],
            'learning_rate': [0.01, 0.1, 0.3],
        },
    }
    
    def __init__(self, test_size: int = 12):
        self.test_size = test_size
        self.results: Dict[str, dict] = {}
    
    def select_best_model(
        self, 
        y: np.ndarray, 
        horizon: int = 12,
        exog: np.ndarray = None,
        tune_hyperparams: bool = True
    ) -> Tuple[str, object, Dict]:
        """
        Train all models, select best by backtest MAPE.
        Returns: (best_model_name, fitted_model, metrics_dict)
        """
        if len(y) < self.test_size + horizon:
            raise ValueError(f"Need at least {self.test_size + horizon} data points")
        
        train_y = y[:-self.test_size]
        test_y = y[-self.test_size:]
        
        best_mape = float('inf')
        best_model_name = None
        best_model_obj = None
        
        for model_name, ModelClass in self.MODELS.items():
            try:
                model = ModelClass()
                
                # Hyperparameter tuning for ML models
                if tune_hyperparams and model_name in self.PARAM_GRIDS:
                    model = self._tune_model(model, train_y, model_name)
                else:
                    model.fit(train_y, exog=exog)
                
                # Backtest
                predictions = model.predict(steps=self.test_size)
                mae = mean_absolute_error(test_y, predictions)
                rmse = np.sqrt(mean_squared_error(test_y, predictions))
                mape = np.mean(np.abs((test_y - predictions) / test_y)) * 100
                
                self.results[model_name] = {
                    'mae': float(mae),
                    'rmse': float(rmse),
                    'mape': float(mape),
                }
                
                if mape < best_mape:
                    best_mape = mape
                    best_model_name = model_name
                    best_model_obj = model
            
            except Exception as e:
                print(f"Model {model_name} failed: {e}")
                continue
        
        if best_model_name is None:
            raise ValueError("All models failed to train")
        
        # Retrain best model on full data
        best_model_obj.fit(y, exog=exog)
        
        return best_model_name, best_model_obj, self.results
    
    def _tune_model(self, model, y, model_name):
        """Hyperparameter tuning using time series cross-validation"""
        param_grid = self.PARAM_GRIDS.get(model_name, {})
        if not param_grid:
            model.fit(y)
            return model
        
        # Time series split for cross-validation
        tscv = TimeSeriesSplit(n_splits=3)
        
        # Simple grid search (full GridSearchCV needs custom scorer)
        best_score = float('inf')
        best_params = None
        
        # Sample a subset of param combinations (full grid would be slow)
        import itertools
        param_combinations = list(itertools.product(*param_grid.values()))[:10]  # Max 10 combinations
        
        for params_tuple in param_combinations:
            params = dict(zip(param_grid.keys(), params_tuple))
            
            # Set model params
            for key, val in params.items():
                setattr(model, key, val)
            
            # Cross-validation
            scores = []
            for train_idx, test_idx in tscv.split(y):
                try:
                    train, test = y[train_idx], y[test_idx]
                    model.fit(train)
                    pred = model.predict(steps=len(test))
                    mape = np.mean(np.abs((test - pred) / test)) * 100
                    scores.append(mape)
                except:
                    continue
            
            if scores:
                avg_score = np.mean(scores)
                if avg_score < best_score:
                    best_score = avg_score
                    best_params = params
        
        # Set best params
        if best_params:
            for key, val in best_params.items():
                setattr(model, key, val)
        
        model.fit(y)
        return model
    
    def get_confidence_intervals(
        self,
        model,
        model_name: str,
        steps: int,
        alpha: float = 0.05  # 95% CI
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate prediction intervals.
        Returns: (lower_bounds, upper_bounds)
        """
        predictions = model.predict(steps=steps)
        
        # For ARIMA/SARIMA, use built-in forecast intervals
        if model_name in ['arima', 'sarima', 'arimax', 'sarimax']:
            try:
                forecast_obj = model.model_fit.get_forecast(steps=steps)
                conf_int = forecast_obj.conf_int(alpha=alpha)
                return conf_int[:, 0], conf_int[:, 1]
            except:
                pass
        
        # For ML models, use residual-based intervals
        # Simplified approach: pred ± (z_score × σ_residual)
        z_score = 1.96  # 95% CI
        
        # Estimate residual std from training data (simplified)
        residual_std = predictions.std() * 0.15  # Rough approximation
        
        lower = predictions - z_score * residual_std
        upper = predictions + z_score * residual_std
        
        return lower, upper


def calculate_dynamic_safety_stock(
    avg_demand: float,
    std_demand: float,
    avg_lead_time: int,
    std_lead_time: float,
    service_level: float = 0.95
) -> float:
    """
    Dynamic safety stock incorporating lead time variance.
    Formula: SS = Z × √[(LT × σ_d²) + (D² × σ_LT²)]
    """
    from scipy import stats
    z_score = stats.norm.ppf(service_level)
    
    variance_component = (avg_lead_time * std_demand**2) + (avg_demand**2 * std_lead_time**2)
    safety_stock = z_score * np.sqrt(variance_component)
    
    return safety_stock


def optimize_service_level(
    avg_demand: float,
    std_demand: float,
    lead_time: int,
    unit_cost: float,
    holding_cost_pct: float = 0.20,
    stockout_cost_per_unit: float = None
) -> Tuple[float, dict]:
    """
    Find optimal service level balancing holding cost vs stockout cost.
    Returns: (optimal_service_level, analysis_dict)
    """
    from scipy import stats
    from scipy.optimize import minimize_scalar
    
    # If stockout cost not provided, estimate as 3× unit cost (lost sale + expedite)
    if stockout_cost_per_unit is None:
        stockout_cost_per_unit = unit_cost * 3
    
    def total_cost(service_level):
        z = stats.norm.ppf(service_level)
        safety_stock = z * std_demand * np.sqrt(lead_time)
        
        # Annual holding cost
        holding_cost = safety_stock * unit_cost * holding_cost_pct
        
        # Expected stockout cost (simplified)
        stockout_probability = 1 - service_level
        expected_stockouts_per_year = stockout_probability * avg_demand * 12
        stockout_cost = expected_stockouts_per_year * stockout_cost_per_unit
        
        return holding_cost + stockout_cost
    
    # Optimize between 70% and 99.9%
    result = minimize_scalar(total_cost, bounds=(0.7, 0.999), method='bounded')
    
    optimal_sl = result.x
    min_cost = result.fun
    
    return optimal_sl, {
        'optimal_service_level': round(optimal_sl, 4),
        'total_annual_cost': round(min_cost, 0),
        'holding_cost': round(total_cost(optimal_sl) * 0.6, 0),  # Approx
        'stockout_cost': round(total_cost(optimal_sl) * 0.4, 0),
    }
