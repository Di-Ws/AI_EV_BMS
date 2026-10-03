"""
Training pipeline script for EV battery State of Health (SOH) and Remaining Useful Life (RUL) models.
Features leak-free inputs, battery-wise GroupShuffleSplit, and baseline comparison.
"""
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import GroupShuffleSplit
from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
import xgboost as xgb
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

# Non-leaky feature set (excluding capacity, soh, rul, cycle, battery_id)
FEATURE_COLS = [
    'avg_voltage', 'max_voltage', 'min_voltage',
    'avg_current', 'max_current',
    'avg_temp', 'max_temp', 'ambient_temp',
    'discharge_duration'
]


class BatteryHealthModel:
    """
    Leak-free EV Battery State of Health (SoH) and Remaining Useful Life (RUL) prediction pipeline.
    """

    def __init__(self, data_path: str = "data/processed/merged_battery_dataset.csv", random_state: int = 42):
        self.data_path = data_path
        self.random_state = random_state
        self.df = None
        self.models = {}
        self.results = {}

    def load_data(self) -> pd.DataFrame:
        """Loads processed battery dataset and handles missing values."""
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Dataset not found at {self.data_path}. Please run data preprocessing first.")
        
        self.df = pd.read_csv(self.data_path)
        # Drop rows with missing feature or target values
        required_cols = FEATURE_COLS + ['battery_id', 'soh', 'rul']
        existing_cols = [c for c in required_cols if c in self.df.columns]
        self.df = self.df.dropna(subset=existing_cols).copy()
        print(f"Loaded dataset from {self.data_path} with {len(self.df)} rows across {self.df['battery_id'].nunique()} batteries.")
        return self.df

    def split_data_battery_wise(self, target_col: str, test_size: float = 0.2):
        """
        Splits data using GroupShuffleSplit based on battery_id to prevent data leakage across cycles.
        """
        if self.df is None:
            self.load_data()

        # Available feature columns
        available_features = [col for col in FEATURE_COLS if col in self.df.columns]
        X = self.df[available_features]
        y = self.df[target_col]
        groups = self.df['battery_id']

        gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=self.random_state)
        train_idx, test_idx = next(gss.split(X, y, groups=groups))

        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        train_groups = groups.iloc[train_idx].nunique()
        test_groups = groups.iloc[test_idx].nunique()

        print(f"\n" + "="*60)
        print(f"BATTERY-WISE SPLIT (Target: {target_col.upper()})")
        print(f"="*60)
        print(f" - Features ({len(available_features)}): {available_features}")
        print(f" - Train set: {len(X_train)} samples across {train_groups} batteries")
        print(f" - Test set:  {len(X_test)} samples across {test_groups} batteries")
        print(f" - Train battery IDs: {sorted(groups.iloc[train_idx].unique().tolist())}")
        print(f" - Test battery IDs:  {sorted(groups.iloc[test_idx].unique().tolist())}")

        return X_train, X_test, y_train, y_test

    def train_and_evaluate_target(self, target_col: str, save_models: bool = True):
        """
        Trains Mean Baseline, Random Forest, and XGBoost models for a given target (soh or rul).
        Reports R², MAE, RMSE and exports saved models.
        """
        X_train, X_test, y_train, y_test = self.split_data_battery_wise(target_col=target_col)

        candidate_models = {
            'Mean Baseline': DummyRegressor(strategy='mean'),
            'Random Forest': RandomForestRegressor(n_estimators=100, random_state=self.random_state),
            'XGBoost': xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=self.random_state)
        }

        target_results = {}
        target_models = {}

        print(f"\n--- Model Performance Comparison ({target_col.upper()}) ---")
        for name, model in candidate_models.items():
            model.fit(X_train, y_train)
            preds = model.predict(X_test)

            mse = mean_squared_error(y_test, preds)
            rmse = float(np.sqrt(mse))
            mae = float(mean_absolute_error(y_test, preds))
            r2 = float(r2_score(y_test, preds))

            target_results[name] = {'R2': r2, 'MAE': mae, 'RMSE': rmse}
            target_models[name] = model

            print(f"[{name}]")
            print(f"  - R²   : {r2:8.4f}")
            print(f"  - MAE  : {mae:8.4f}")
            print(f"  - RMSE : {rmse:8.4f}")

            # Save non-baseline trained model artifacts
            if save_models and name != 'Mean Baseline':
                save_dir = "models/saved_models"
                os.makedirs(save_dir, exist_ok=True)
                model_filename = os.path.join(save_dir, f"{target_col.lower()}_{name.lower().replace(' ', '_')}.joblib")
                joblib.dump(model, model_filename)
                print(f"  -> Exported model artifact: {model_filename}")

        self.models[target_col] = target_models
        self.results[target_col] = target_results
        return target_results

    def run_full_pipeline(self):
        """Runs model training and evaluation for both SOH and RUL targets independently."""
        self.load_data()
        soh_results = self.train_and_evaluate_target('soh')
        rul_results = self.train_and_evaluate_target('rul')
        return {'soh': soh_results, 'rul': rul_results}


if __name__ == "__main__":
    pipeline = BatteryHealthModel()
    pipeline.run_full_pipeline()


