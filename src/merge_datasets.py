"""
Dataset merger and ML model verification script for EV Battery Management System (AI_EV_BMS).
"""
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score


def merge_and_finalize_dataset(
    summary_csv: str = "data/processed/nasa_battery_summary.csv",
    output_csv: str = "data/processed/merged_battery_dataset.csv"
) -> pd.DataFrame:
    """
    Finalizes the merged battery dataset containing:
    - battery_id, cycle
    - capacity (Ah)
    - avg_voltage, max_voltage, min_voltage (V)
    - avg_current, max_current (A)
    - avg_temp, max_temp, ambient_temp (°C)
    - discharge_duration (s)
    - target variables: soh, rul
    """
    if not os.path.exists(summary_csv):
        raise FileNotFoundError(f"Summary dataset '{summary_csv}' not found. Run src/data_prep.py first.")

    df = pd.read_csv(summary_csv)
    df = df.dropna(subset=['soh', 'avg_voltage', 'avg_current', 'avg_temp', 'cycle']).copy()

    # Re-order columns for clarity
    feature_cols = [
        'battery_id', 'cycle', 'capacity',
        'avg_voltage', 'max_voltage', 'min_voltage',
        'avg_current', 'max_current',
        'avg_temp', 'max_temp', 'ambient_temp',
        'discharge_duration', 'soh', 'rul'
    ]
    df = df[[c for c in feature_cols if c in df.columns]]

    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"Merged dataset saved to '{output_csv}' with {len(df)} clean rows and {len(df.columns)} columns.")
    return df


def verify_ml_pipeline(dataset_path: str = "data/processed/merged_battery_dataset.csv"):
    """
    Trains and evaluates Machine Learning models (Random Forest and XGBoost)
    on the merged battery dataset and reports RMSE, MAE, R2 scores.
    """
    df = pd.read_csv(dataset_path)

    features = ['cycle', 'avg_voltage', 'max_voltage', 'min_voltage', 'avg_current', 'max_current', 'avg_temp', 'max_temp', 'discharge_duration']
    target = 'soh'

    X = df[features]
    y = df[target]

    # Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("\n" + "="*50)
    print("ML MODEL PIPELINE VERIFICATION")
    print("="*50)
    print(f"Features ({len(features)}): {features}")
    print(f"Target: {target}")
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    models = {
        'RandomForestRegressor': RandomForestRegressor(n_estimators=100, random_state=42),
        'XGBoostRegressor': xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    }

    results = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        mse = mean_squared_error(y_test, preds)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)

        results[name] = {'RMSE': rmse, 'MAE': mae, 'R2': r2}

        print(f"\n[Model: {name}] Performance:")
        print(f" - RMSE : {rmse:.6f}")
        print(f" - MAE  : {mae:.6f}")
        print(f" - R2   : {r2:.6f} ({r2*100:.2f}% variance explained)")

    return results


if __name__ == "__main__":
    df_merged = merge_and_finalize_dataset()
    verify_ml_pipeline()
