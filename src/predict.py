"""
Inference script for running battery SOH / RUL predictions on hardware logs or CSV input.
Agility & Data-Source Agnostic: Automatically formats input features using artifact metadata.
"""
import argparse
from pathlib import Path
import pandas as pd
import joblib

BASE_FEATURES = [
    "avg_voltage", "max_voltage", "min_voltage",
    "avg_current", "max_current",
    "avg_temp", "max_temp", "ambient_temp",
    "discharge_duration",
]
ROLL_COLS = ["avg_voltage", "avg_temp", "discharge_duration", "current_x_duration"]


def prepare_inference_features(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    """
    Data-source agnostic feature engineering for incoming battery logs.
    Computes current_x_duration and trailing rolling window averages per battery.
    """
    df = df.copy()
    
    # Ensure cycle and battery_id exist if single stream provided
    if "battery_id" not in df.columns:
        df["battery_id"] = "HW_CELL_01"
    if "cycle" not in df.columns:
        df["cycle"] = range(1, len(df) + 1)

    df = df.sort_values(["battery_id", "cycle"]).reset_index(drop=True)

    # Coulomb-counting proxy (A*s)
    df["current_x_duration"] = df["avg_current"].abs() * df["discharge_duration"]

    for col in ROLL_COLS:
        col_name = f"{col}_roll{window}"
        if col_name not in df.columns:
            df[col_name] = df.groupby("battery_id")[col].transform(
                lambda s: s.rolling(window, min_periods=1).mean()
            )

    return df


def predict_battery_health(model_path: str, data: pd.DataFrame) -> pd.DataFrame:
    """
    Loads saved .joblib model dictionary artifact and generates predictions.
    Enforces exact feature ordering and schema stored in artifact metadata.
    """
    artifact = joblib.load(model_path)
    model = artifact["model"]
    expected_features = artifact["features"]
    window = artifact.get("rolling_window", 5)

    df_prepared = prepare_inference_features(data, window=window)

    # Check for missing required features
    missing = [col for col in expected_features if col not in df_prepared.columns]
    if missing:
        raise ValueError(f"Input data is missing required feature columns: {missing}")

    X_in = df_prepared[expected_features]
    preds = model.predict(X_in)

    target_name = artifact.get("target", "prediction")
    df_prepared[f"predicted_{target_name}"] = preds
    return df_prepared[['battery_id', 'cycle', f"predicted_{target_name}"]]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="models/saved_models/soh_xgboost.joblib")
    parser.add_argument("--data", type=str, default="data/processed/merged_battery_dataset.csv")
    args = parser.parse_args()

    data_in = pd.read_csv(args.data).head(10)
    res = predict_battery_health(args.model, data_in)
    print("\n=== Sample Inference Predictions ===")
    print(res.to_string(index=False))
