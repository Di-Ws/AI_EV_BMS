"""
Training pipeline script for EV battery State of Health (SOH) / RUL models.
"""
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
from sklearn.metrics import mean_squared_error, r2_score
import joblib


class BatteryHealthModel:
    """
    EV Battery State of Health (SoH) prediction model pipeline.
    """

    def __init__(self, df: pd.DataFrame = None, num_samples: int = 1000, random_state: int = 42):
        self.random_state = random_state
        if df is not None:
            self.df = df
        else:
            self.df = self.generate_synthetic_data(num_samples=num_samples)

        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.models = {}

    def generate_synthetic_data(self, num_samples: int = 1000) -> pd.DataFrame:
        """Generates synthetic battery metrics data."""
        np.random.seed(self.random_state)
        cycles = np.random.randint(1, 1000, size=num_samples)
        avg_voltage = np.random.uniform(3.2, 4.2, size=num_samples)
        max_temp = np.random.uniform(25.0, 55.0, size=num_samples)

        # SOH target with synthetic relationship + noise
        soh = 100.0 - (cycles * 0.03) - (max_temp * 0.1) + np.random.normal(0, 1.5, size=num_samples)
        soh = np.clip(soh, 50.0, 100.0)

        return pd.DataFrame({
            'cycle': cycles,
            'avg_voltage': avg_voltage,
            'max_temp': max_temp,
            'SoH': soh
        })

    def prepare_data(self, test_size: float = 0.2, random_state: int = None):
        """
        Extracts features (X: cycle, avg_voltage, max_temp) and target (y: SoH),
        then performs an 80/20 train-test split using scikit-learn.
        Saves the splits as instance attributes (self.X_train, self.X_test, self.y_train, self.y_test).
        """
        rs = random_state if random_state is not None else self.random_state

        # Isolate features (X) and target (y)
        feature_cols = ['cycle', 'avg_voltage', 'max_temp']
        target_col = 'SoH'

        X = self.df[feature_cols]
        y = self.df[target_col]

        # Perform 80/20 train-test split
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=test_size, random_state=rs
        )

        print(f"Data Preparation Complete:")
        print(f" - Features (X): {feature_cols}")
        print(f" - Target (y): {target_col}")
        print(f" - Training set: {self.X_train.shape[0]} samples (80%)")
        print(f" - Testing set:  {self.X_test.shape[0]} samples (20%)")

        return self.X_train, self.X_test, self.y_train, self.y_test


    def train_models(self, random_state: int = None):
        """
        Initializes Random Forest and XGBoost Regressors inside a dictionary,
        and fits them on the training data.
        """
        rs = random_state if random_state is not None else self.random_state

        if self.X_train is None or self.y_train is None:
            raise ValueError("Training data is not prepared. Call prepare_data() first.")

        self.models = {
            'RandomForest': RandomForestRegressor(n_estimators=100, random_state=rs),
            'XGBoost': xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=rs)
        }

        for name, model in self.models.items():
            print(f"Training {name} model...")
            model.fit(self.X_train, self.y_train)

        return self.models


if __name__ == "__main__":
    pipeline = BatteryHealthModel()
    pipeline.prepare_data()
    trained_models = pipeline.train_models()
    print("Models trained successfully!")

