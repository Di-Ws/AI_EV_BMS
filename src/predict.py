"""
Inference script for running predictions on new battery data.
"""
import pandas as pd
import joblib


def predict_battery_health(model_path: str, new_data: pd.DataFrame):
    """Load model artifact and generate battery health predictions."""
    model = joblib.load(model_path)
    predictions = model.predict(new_data)
    return predictions
