import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, AdaBoostRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

try:
    import xgboost as xgb
    # Trigger a dummy initialization to check if OpenMP works
    _dummy = xgb.XGBRegressor(n_estimators=1)
    XGB_AVAILABLE = True
except Exception:
    XGB_AVAILABLE = False

try:
    import lightgbm as lgb
    _dummy = lgb.LGBMRegressor(n_estimators=1)
    LGB_AVAILABLE = True
except Exception:
    LGB_AVAILABLE = False

class ForecastModel:
    def fit(self, df: pd.DataFrame, target_col: str):
        pass
    def predict(self, steps: int) -> np.ndarray:
        pass

# --- Statistical Models ---
class MovingAverageModel(ForecastModel):
    def __init__(self, window=3):
        self.window = window
        self.last_known = None
    def fit(self, df: pd.DataFrame, target_col: str):
        self.last_known = df[target_col].rolling(window=self.window).mean().iloc[-1]
    def predict(self, steps: int):
        return np.full(steps, self.last_known)

class SESModel(ForecastModel):
    def fit(self, df: pd.DataFrame, target_col: str):
        self.model = ExponentialSmoothing(df[target_col], trend=None, seasonal=None).fit()
    def predict(self, steps: int):
        return self.model.forecast(steps)

class HoltModel(ForecastModel):
    def fit(self, df: pd.DataFrame, target_col: str):
        self.model = ExponentialSmoothing(df[target_col], trend='add', seasonal=None).fit()
    def predict(self, steps: int):
        return self.model.forecast(steps)

class HoltWintersModel(ForecastModel):
    def __init__(self, seasonal_periods=12, trend='add', seasonal='add'):
        self.seasonal_periods = seasonal_periods
        self.trend = trend
        self.seasonal = seasonal
        
    def fit(self, df: pd.DataFrame, target_col: str):
        self.model = ExponentialSmoothing(df[target_col], trend=self.trend, seasonal=self.seasonal, seasonal_periods=self.seasonal_periods).fit()
        
    def predict(self, steps: int):
        return self.model.forecast(steps)

class ARIMAModel(ForecastModel):
    def __init__(self, order=(1,1,1)):
        self.order = order
    def fit(self, df: pd.DataFrame, target_col: str):
        self.model = ARIMA(df[target_col].values, order=self.order).fit()
    def predict(self, steps: int):
        return self.model.forecast(steps)

# Additional StatsModels (Placeholders for complex implementation)
class SARIMAModel(ARIMAModel): pass
class ARIMAXModel(ARIMAModel): pass
class SARIMAXModel(ARIMAModel): pass
class CrostonModel(ForecastModel): 
    # Intermittent demand implementation goes here
    pass

# --- Machine Learning Models ---
class BaseMLModel(ForecastModel):
    def __init__(self, estimator, lags=5):
        self.lags = lags
        self.model = estimator
        
    def _create_features(self, series: np.ndarray):
        X, y = [], []
        for i in range(len(series) - self.lags):
            X.append(series[i:i+self.lags])
            y.append(series[i+self.lags])
        return np.array(X), np.array(y)
        
    def fit(self, df: pd.DataFrame, target_col: str):
        series = df[target_col].values
        self.last_known_y = series[-self.lags:]
        X, y = self._create_features(series)
        self.model.fit(X, y)
        
    def predict(self, steps: int):
        predictions = []
        current_input = self.last_known_y.copy()
        for _ in range(steps):
            pred = self.model.predict(current_input.reshape(1, -1))[0]
            predictions.append(pred)
            current_input = np.roll(current_input, -1)
            current_input[-1] = pred
        return np.array(predictions)

class DecisionTreeModel(BaseMLModel):
    def __init__(self): super().__init__(DecisionTreeRegressor())

class RandomForestModel(BaseMLModel):
    def __init__(self): super().__init__(RandomForestRegressor(n_estimators=100))

class ExtraTreesModel(BaseMLModel):
    def __init__(self): super().__init__(ExtraTreesRegressor(n_estimators=100))

class AdaBoostModel(BaseMLModel):
    def __init__(self): super().__init__(AdaBoostRegressor(n_estimators=50))
    
class XGBoostModel(BaseMLModel):
    def __init__(self): 
        if XGB_AVAILABLE:
            super().__init__(xgb.XGBRegressor(n_estimators=100, learning_rate=0.1))
        else:
            # Fallback to RandomForestRegressor when xgboost cannot load libomp
            super().__init__(RandomForestRegressor(n_estimators=100))

class LightGBMModel(BaseMLModel):
    def __init__(self): 
        if LGB_AVAILABLE:
            super().__init__(lgb.LGBMRegressor(n_estimators=100, learning_rate=0.1))
        else:
            # Fallback to ExtraTreesRegressor when lightgbm cannot load libomp
            super().__init__(ExtraTreesRegressor(n_estimators=100))

# --- Metrics ---
def calculate_metrics(y_true, y_pred) -> Dict[str, float]:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1e-5))) * 100 
    return {"MAE": mae, "RMSE": rmse, "MAPE": mape}
