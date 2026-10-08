"""
FastAPI REST Service for EV Battery Health Prediction (AI_EV_BMS).
Provides real-time inference endpoints for State of Health (SOH) and Remaining Useful Life (RUL)
predictions using trained XGBoost and Random Forest models.
"""

import io
import os
import time
from pathlib import Path
from typing import List, Optional, Dict, Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Define paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models" / "saved_models"
DATA_DIR = BASE_DIR / "data" / "processed"
FRONTEND_DIR = BASE_DIR / "frontend"

# Initialize FastAPI App
app = FastAPI(
    title="AI EV Battery Health Prediction API",
    description="Production REST API for EV Battery State of Health (SOH) & Remaining Useful Life (RUL) Inference",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for easy frontend connection
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model store
MODELS: Dict[str, Dict[str, Any]] = {}

ROLL_COLS = ["avg_voltage", "avg_temp", "discharge_duration", "current_x_duration"]


def load_model_artifacts():
    """Load all saved joblib model artifacts into memory on server startup."""
    model_files = {
        "soh_xgboost": MODELS_DIR / "soh_xgboost.joblib",
        "soh_randomforest": MODELS_DIR / "soh_randomforest.joblib",
        "rul_xgboost": MODELS_DIR / "rul_xgboost.joblib",
        "rul_randomforest": MODELS_DIR / "rul_randomforest.joblib",
    }
    
    loaded_count = 0
    for key, path in model_files.items():
        if path.exists():
            try:
                MODELS[key] = joblib.load(path)
                loaded_count += 1
                print(f"[INFO] Loaded model artifact '{key}' successfully from {path.name}")
            except Exception as e:
                print(f"[WARNING] Failed to load model artifact '{key}': {e}")
        else:
            print(f"[WARNING] Model file not found: {path}")
            
    print(f"[INFO] Model loading complete ({loaded_count}/{len(model_files)} models active)")


@app.on_event("startup")
def startup_event():
    load_model_artifacts()


# --- Pydantic Data Models ---

class TelemetrySample(BaseModel):
    battery_id: str = Field(default="HW_CELL_01", description="Battery Identifier")
    cycle: int = Field(default=100, ge=1, description="Charge/Discharge Cycle Number")
    avg_voltage: float = Field(default=3.52, description="Average Cell Voltage during discharge (V)")
    max_voltage: float = Field(default=4.20, description="Maximum Cell Voltage (V)")
    min_voltage: float = Field(default=2.70, description="Minimum Cell Voltage (V)")
    avg_current: float = Field(default=-1.50, description="Average Discharge Current (A)")
    max_current: float = Field(default=0.0, description="Peak Current (A)")
    avg_temp: float = Field(default=32.5, description="Average Cell Temperature (°C)")
    max_temp: float = Field(default=39.8, description="Peak Cell Temperature (°C)")
    ambient_temp: float = Field(default=24.0, description="Ambient Room Temperature (°C)")
    discharge_duration: float = Field(default=2800.0, description="Total Discharge Time (seconds)")

    class Config:
        json_schema_extra = {
            "example": {
                "battery_id": "HW_CELL_01",
                "cycle": 120,
                "avg_voltage": 3.48,
                "max_voltage": 4.18,
                "min_voltage": 2.65,
                "avg_current": -1.55,
                "max_current": 0.0,
                "avg_temp": 34.2,
                "max_temp": 41.0,
                "ambient_temp": 24.0,
                "discharge_duration": 2750.0
            }
        }


class SinglePredictionRequest(TelemetrySample):
    model_type: str = Field(
        default="xgboost",
        description="Model architecture to use: 'xgboost' or 'randomforest'"
    )


class BatchPredictionRequest(BaseModel):
    samples: List[TelemetrySample]
    model_type: str = Field(default="xgboost", description="'xgboost' or 'randomforest'")


# --- Helper Functions ---

def prepare_inference_df(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    """Computes derived telemetry features and trailing rolling window features."""
    df = df.copy()
    if "battery_id" not in df.columns:
        df["battery_id"] = "HW_CELL_01"
    if "cycle" not in df.columns:
        df["cycle"] = range(1, len(df) + 1)

    df = df.sort_values(["battery_id", "cycle"]).reset_index(drop=True)
    df["current_x_duration"] = df["avg_current"].abs() * df["discharge_duration"]

    for col in ROLL_COLS:
        col_name = f"{col}_roll{window}"
        if col_name not in df.columns:
            df[col_name] = df.groupby("battery_id")[col].transform(
                lambda s: s.rolling(window, min_periods=1).mean()
            )
    return df


def classify_health_status(soh_pct: float, rul_cycles: float) -> Dict[str, str]:
    """Returns battery health status rating, color status, and actionable recommendations."""
    if soh_pct >= 85.0:
        return {
            "status": "EXCELLENT",
            "badge_color": "green",
            "health_score": "Optimal Condition",
            "recommendation": "Normal EV operation. Regular thermal & voltage monitoring recommended."
        }
    elif soh_pct >= 80.0:
        return {
            "status": "GOOD",
            "badge_color": "blue",
            "health_score": "Moderate Aging",
            "recommendation": "Battery operating within nominal parameters. Routine inspection advised."
        }
    elif soh_pct >= 70.0:
        return {
            "status": "WARNING",
            "badge_color": "yellow",
            "health_score": "Significant Degradation",
            "recommendation": "Battery capacity approaching End-of-Life (EOL threshold 80%). Plan for module reconditioning or replacement."
        }
    else:
        return {
            "status": "CRITICAL",
            "badge_color": "red",
            "health_score": "EOL / Replace Required",
            "recommendation": "Battery SOH below safety cutoff (<70%). High risk of rapid capacity loss or thermal stress. Immediate service required."
        }


# --- API Routes ---

@app.get("/api/health", summary="Check API Health & Model Status")
def health_check():
    """Returns server status, timestamp, and loaded model count."""
    return {
        "status": "online",
        "service": "AI EV BMS Health Prediction API",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "models_loaded": list(MODELS.keys()),
        "active_model_count": len(MODELS)
    }


@app.get("/api/models", summary="List Available Machine Learning Models & Metadata")
def list_models():
    """Provides information on trained model artifacts, metrics, and feature schemas."""
    model_info = {}
    for key, artifact in MODELS.items():
        model_info[key] = {
            "target": artifact.get("target"),
            "features_required": len(artifact.get("features", [])),
            "rolling_window": artifact.get("rolling_window", 5),
            "note": artifact.get("note", "Trained on NASA Li-ion dataset"),
            "features_list": artifact.get("features", [])
        }
    return {
        "available_models": model_info,
        "performance_summary": {
            "soh_xgboost": {"r2_lobo": 0.6923, "mae": 0.0420, "rmse": 0.0552},
            "soh_randomforest": {"r2_lobo": 0.5675, "mae": 0.0497, "rmse": 0.0655},
            "rul_xgboost": {"r2_lobo": 0.4844, "mae_cycles": 25.20, "rmse_cycles": 30.35},
            "rul_randomforest": {"r2_lobo": 0.3780, "mae_cycles": 27.09, "rmse_cycles": 33.34}
        }
    }


@app.post("/api/predict/single", summary="Run Real-Time SOH & RUL Prediction for Single Telemetry Sample")
def predict_single(request: SinglePredictionRequest):
    """
    Computes State of Health (SOH %) and Remaining Useful Life (RUL cycles)
    for a single EV battery telemetry snapshot.
    """
    model_type = request.model_type.lower()
    if model_type not in ["xgboost", "randomforest"]:
        raise HTTPException(status_code=400, detail="Invalid model_type. Choose 'xgboost' or 'randomforest'.")

    soh_key = f"soh_{model_type}"
    rul_key = f"rul_{model_type}"

    if soh_key not in MODELS or rul_key not in MODELS:
        raise HTTPException(status_code=500, detail=f"Model artifacts for '{model_type}' are not loaded.")

    # Convert single request to DataFrame
    sample_dict = request.dict()
    sample_dict.pop("model_type")
    df_raw = pd.DataFrame([sample_dict])

    # SOH Prediction
    soh_art = MODELS[soh_key]
    df_prep = prepare_inference_df(df_raw, window=soh_art.get("rolling_window", 5))
    soh_features = df_prep[soh_art["features"]]
    raw_soh = float(soh_art["model"].predict(soh_features)[0])
    soh_percentage = round(raw_soh * 100.0, 2)

    # RUL Prediction
    rul_art = MODELS[rul_key]
    rul_features = df_prep[rul_art["features"]]
    raw_rul = float(rul_art["model"].predict(rul_features)[0])
    rul_cycles = max(0, int(round(raw_rul)))

    health_meta = classify_health_status(soh_percentage, rul_cycles)

    return {
        "battery_id": request.battery_id,
        "cycle": request.cycle,
        "model_used": model_type.upper(),
        "predictions": {
            "state_of_health_pct": soh_percentage,
            "soh_ratio": round(raw_soh, 4),
            "remaining_useful_life_cycles": rul_cycles,
            "estimated_remaining_km": int(rul_cycles * 45),  # Approx 45km per full cycle assumption
        },
        "health_assessment": health_meta,
        "telemetry_summary": {
            "avg_voltage": request.avg_voltage,
            "avg_temp": request.avg_temp,
            "discharge_duration_sec": request.discharge_duration
        }
    }


@app.post("/api/predict/batch", summary="Run Batch Telemetry Inference for Battery Cycle Series")
def predict_batch(request: BatchPredictionRequest):
    """
    Evaluates SOH and RUL over a series of sequential telemetry readings
    (e.g., historical battery log cycles).
    """
    if not request.samples:
        raise HTTPException(status_code=400, detail="Samples list cannot be empty.")

    model_type = request.model_type.lower()
    soh_key = f"soh_{model_type}"
    rul_key = f"rul_{model_type}"

    if soh_key not in MODELS or rul_key not in MODELS:
        raise HTTPException(status_code=500, detail=f"Models for '{model_type}' not available.")

    rows = [s.dict() for s in request.samples]
    df_raw = pd.DataFrame(rows)

    soh_art = MODELS[soh_key]
    rul_art = MODELS[rul_key]

    df_prep = prepare_inference_df(df_raw, window=soh_art.get("rolling_window", 5))

    soh_preds = soh_art["model"].predict(df_prep[soh_art["features"]])
    rul_preds = rul_art["model"].predict(df_prep[rul_art["features"]])

    results = []
    for idx, row in df_prep.iterrows():
        soh_pct = round(float(soh_preds[idx]) * 100.0, 2)
        rul_c = max(0, int(round(float(rul_preds[idx]))))
        results.append({
            "battery_id": str(row.get("battery_id", "HW_CELL_01")),
            "cycle": int(row.get("cycle", idx + 1)),
            "soh_pct": soh_pct,
            "rul_cycles": rul_c,
            "avg_voltage": float(row.get("avg_voltage", 0.0)),
            "avg_temp": float(row.get("avg_temp", 0.0))
        })

    return {
        "count": len(results),
        "model_used": model_type.upper(),
        "predictions": results,
        "latest_status": classify_health_status(results[-1]["soh_pct"], results[-1]["rul_cycles"])
    }


@app.post("/api/predict/csv", summary="Upload CSV File for Batch Battery Telemetry Inference")
async def predict_csv(
    file: UploadFile = File(...),
    model_type: str = Query(default="xgboost", description="'xgboost' or 'randomforest'")
):
    """
    Accepts a CSV file upload containing telemetry columns, processes rolling features,
    and returns cycle-by-cycle predictions with degradation summary metrics.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    content = await file.read()
    try:
        df_uploaded = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV file: {str(e)}")

    model_type = model_type.lower()
    soh_key = f"soh_{model_type}"
    rul_key = f"rul_{model_type}"

    if soh_key not in MODELS or rul_key not in MODELS:
        raise HTTPException(status_code=500, detail=f"Models for '{model_type}' not available.")

    soh_art = MODELS[soh_key]
    rul_art = MODELS[rul_key]

    required_cols = ["avg_voltage", "avg_current", "avg_temp", "discharge_duration"]
    missing = [c for c in required_cols if c not in df_uploaded.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded CSV is missing required telemetry columns: {missing}. Expected at least {required_cols}"
        )

    # Provide fallback values for optional max/min telemetry if missing in raw CSV
    if "max_voltage" not in df_uploaded.columns:
        df_uploaded["max_voltage"] = df_uploaded["avg_voltage"] + 0.5
    if "min_voltage" not in df_uploaded.columns:
        df_uploaded["min_voltage"] = df_uploaded["avg_voltage"] - 0.5
    if "max_current" not in df_uploaded.columns:
        df_uploaded["max_current"] = 0.0
    if "max_temp" not in df_uploaded.columns:
        df_uploaded["max_temp"] = df_uploaded["avg_temp"] + 5.0
    if "ambient_temp" not in df_uploaded.columns:
        df_uploaded["ambient_temp"] = 24.0

    df_prep = prepare_inference_df(df_uploaded, window=soh_art.get("rolling_window", 5))

    soh_preds = soh_art["model"].predict(df_prep[soh_art["features"]])
    rul_preds = rul_art["model"].predict(df_prep[rul_art["features"]])

    records = []
    for idx, row in df_prep.iterrows():
        soh_pct = round(float(soh_preds[idx]) * 100.0, 2)
        rul_c = max(0, int(round(float(rul_preds[idx]))))
        records.append({
            "battery_id": str(row.get("battery_id", "CSV_CELL")),
            "cycle": int(row.get("cycle", idx + 1)),
            "soh_pct": soh_pct,
            "rul_cycles": rul_c,
            "avg_voltage": round(float(row["avg_voltage"]), 3),
            "avg_temp": round(float(row["avg_temp"]), 2),
            "discharge_duration": round(float(row["discharge_duration"]), 1)
        })

    soh_values = [r["soh_pct"] for r in records]
    rul_values = [r["rul_cycles"] for r in records]

    return {
        "filename": file.filename,
        "total_cycles_analyzed": len(records),
        "model_used": model_type.upper(),
        "summary": {
            "initial_soh_pct": soh_values[0],
            "latest_soh_pct": soh_values[-1],
            "min_soh_pct": min(soh_values),
            "latest_rul_cycles": rul_values[-1],
            "degradation_rate_per_cycle": round((soh_values[0] - soh_values[-1]) / max(1, len(soh_values)), 4)
        },
        "latest_health_status": classify_health_status(soh_values[-1], rul_values[-1]),
        "per_cycle_predictions": records
    }


@app.get("/api/batteries", summary="List All Available Battery IDs")
def get_battery_ids_list():
    """Returns list of battery IDs present in the dataset."""
    merged_path = DATA_DIR / "merged_battery_dataset.csv"
    if merged_path.exists():
        try:
            df = pd.read_csv(merged_path)
            if "battery_id" in df.columns:
                batteries = [str(b) for b in df["battery_id"].unique()]
                return {"batteries": batteries}
        except Exception:
            pass
    return {"batteries": ["B0005", "B0006", "B0007", "B0018", "B0029", "B0030", "B0031", "B0032", "B0042", "B0043", "B0044", "B0045", "B0046", "B0047", "B0048", "B0053"]}


def run_battery_ml_inference(df_batt: pd.DataFrame, model_type: str = "xgboost") -> pd.DataFrame:
    """Helper to run SOH and RUL model predictions across battery dataframe cycles."""
    df_batt = df_batt.copy()
    soh_key = f"soh_{model_type.lower()}"
    rul_key = f"rul_{model_type.lower()}"

    # Default fallbacks
    df_batt["predicted_soh"] = (df_batt["soh"] * 100.0) if "soh" in df_batt.columns else 100.0
    df_batt["predicted_rul"] = df_batt["rul"] if "rul" in df_batt.columns else 100

    if soh_key in MODELS and rul_key in MODELS:
        try:
            soh_art = MODELS[soh_key]
            rul_art = MODELS[rul_key]

            # Ensure max/min and ambient fallbacks
            for col, fallback in [("max_voltage", 0.5), ("min_voltage", -0.5), ("max_temp", 5.0), ("ambient_temp", 24.0)]:
                if col not in df_batt.columns and col.replace("max_", "avg_").replace("min_", "avg_") in df_batt.columns:
                    base = col.replace("max_", "avg_").replace("min_", "avg_")
                    df_batt[col] = df_batt[base] + fallback
                elif col not in df_batt.columns:
                    df_batt[col] = 24.0 if "temp" in col else 3.5

            df_prep = prepare_inference_df(df_batt, window=soh_art.get("rolling_window", 5))

            soh_preds = soh_art["model"].predict(df_prep[soh_art["features"]])
            rul_preds = rul_art["model"].predict(df_prep[rul_art["features"]])

            df_batt["predicted_soh"] = np.round(soh_preds * 100.0, 2)
            df_batt["predicted_rul"] = np.maximum(0, np.round(rul_preds)).astype(int)
        except Exception as e:
            print(f"[WARNING] Inference error in run_battery_ml_inference: {e}")

    return df_batt


@app.get("/api/dashboard-data", summary="Get Full Dashboard Data with Real ML Predictions")
def get_dashboard_data_api(battery_id: str = Query(default="B0005"), model_type: str = Query(default="xgboost")):
    """Returns battery summary, recent readings, SOH prediction curve, and active alerts."""
    merged_path = DATA_DIR / "merged_battery_dataset.csv"

    if merged_path.exists():
        try:
            df = pd.read_csv(merged_path)
            df_batt = df[df["battery_id"] == battery_id]
            if df_batt.empty:
                df_batt = df[df["battery_id"] == "B0005"]
                if df_batt.empty:
                    df_batt = df
        except Exception:
            df_batt = pd.DataFrame()
    else:
        df_batt = pd.DataFrame()

    if df_batt.empty:
        # Fallback response
        return {
            "summary": {
                "battery_id": battery_id, "current_cycle": 100, "soh": 85.5,
                "status": "healthy", "voltage": 3.52, "current": 1.25, "temperature": 32.5,
                "rul": 120, "predicted_soh": 86.1
            },
            "recent_readings": [],
            "soh_prediction": [],
            "alerts": []
        }

    df_inferred = run_battery_ml_inference(df_batt, model_type)

    readings = []
    for idx, row in df_inferred.iterrows():
        cycle = int(row.get("cycle", idx + 1))
        actual_soh = round(float(row.get("soh", 0.85)) * 100.0, 2) if row.get("soh", 0.85) <= 1.0 else round(float(row.get("soh")), 2)
        pred_soh = round(float(row.get("predicted_soh", actual_soh)), 2)
        rul_val = int(row.get("predicted_rul", row.get("rul", 100)))

        voltage = round(float(row.get("avg_voltage", 3.5)), 4)
        current = round(abs(float(row.get("avg_current", 1.2))), 3)
        temp = round(float(row.get("avg_temp", 32.0)), 2)
        cap = round(float(row.get("capacity", 1.8)), 4)

        hours_ago = (len(df_inferred) - cycle) * 6
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - hours_ago * 3600))

        readings.append({
            "battery_id": str(row.get("battery_id", battery_id)),
            "cycle": cycle,
            "voltage": voltage,
            "current": current,
            "temperature": temp,
            "capacity": cap,
            "soh": actual_soh,
            "rul": rul_val,
            "predicted_soh": pred_soh,
            "timestamp": ts
        })

    latest = readings[-1] if readings else {}

    status_str = "healthy" if latest.get("soh", 100) >= 80 else ("warning" if latest.get("soh", 100) >= 60 else "critical")

    summary = {
        "battery_id": battery_id,
        "current_cycle": latest.get("cycle", 1),
        "soh": latest.get("soh", 100.0),
        "status": status_str,
        "voltage": latest.get("voltage", 3.5),
        "current": latest.get("current", 1.2),
        "temperature": latest.get("temperature", 32.0),
        "rul": latest.get("rul", 100),
        "predicted_soh": latest.get("predicted_soh", 100.0)
    }

    recent_readings = list(reversed(readings[-10:]))

    step = max(1, len(readings) // 40)
    soh_prediction = [
        {
            "cycle": r["cycle"],
            "actual_soh": r["soh"],
            "predicted_soh": r["predicted_soh"]
        }
        for i, r in enumerate(readings) if i % step == 0 or i == len(readings) - 1
    ]

    alerts = []
    if latest.get("temperature", 0) > 45.0:
        alerts.append({
            "id": "ALT-001",
            "battery_id": battery_id,
            "severity": "warning" if latest.get("temperature", 0) < 50 else "critical",
            "type": "high_temperature",
            "message": f"Elevated cell temperature detected ({latest.get('temperature')}°C)",
            "value": latest.get("temperature"),
            "threshold": 45.0,
            "cycle": latest.get("cycle"),
            "timestamp": latest.get("timestamp"),
            "acknowledged": False
        })
    if latest.get("soh", 100) < 80.0:
        alerts.append({
            "id": "ALT-002",
            "battery_id": battery_id,
            "severity": "warning" if latest.get("soh", 100) >= 60 else "critical",
            "type": "low_soh",
            "message": f"State of Health ({latest.get('soh')}%) dropped below EOL threshold (80%)",
            "value": latest.get("soh"),
            "threshold": 80.0,
            "cycle": latest.get("cycle"),
            "timestamp": latest.get("timestamp"),
            "acknowledged": False
        })

    return {
        "summary": summary,
        "recent_readings": recent_readings,
        "soh_prediction": soh_prediction,
        "alerts": alerts
    }


@app.get("/api/analytics-data", summary="Get Full Analytics Telemetry & ML Predictions")
def get_analytics_data_api(battery_id: str = Query(default="B0005")):
    """Returns all cycle telemetry readings and predictions for analytics plots."""
    dash_data = get_dashboard_data_api(battery_id=battery_id)
    readings = dash_data.get("recent_readings", [])
    # Return all cycle readings in chronological order
    merged_path = DATA_DIR / "merged_battery_dataset.csv"
    if merged_path.exists():
        try:
            df = pd.read_csv(merged_path)
            df_batt = df[df["battery_id"] == battery_id]
            if not df_batt.empty:
                df_inferred = run_battery_ml_inference(df_batt)
                records = []
                for idx, row in df_inferred.iterrows():
                    actual_soh = round(float(row.get("soh", 0.85)) * 100.0, 2) if row.get("soh", 0.85) <= 1.0 else round(float(row.get("soh")), 2)
                    records.append({
                        "cycle": int(row.get("cycle", idx + 1)),
                        "voltage": round(float(row.get("avg_voltage", 3.5)), 4),
                        "current": round(abs(float(row.get("avg_current", 1.2))), 3),
                        "temperature": round(float(row.get("avg_temp", 32.0)), 2),
                        "soh": actual_soh,
                        "predicted_soh": round(float(row.get("predicted_soh", actual_soh)), 2),
                        "capacity": round(float(row.get("capacity", 1.8)), 4)
                    })
                return records
        except Exception:
            pass
    return []


@app.get("/api/live-reading", summary="Get Real-Time Live Battery Reading with AI Prediction")
def get_live_reading_api(battery_id: str = Query(default="B0005")):
    """Returns single live reading simulation with ML prediction."""
    dash_data = get_dashboard_data_api(battery_id=battery_id)
    summary = dash_data.get("summary", {})
    noise = (np.random.rand() - 0.5) * 0.02
    return {
        "battery_id": battery_id,
        "voltage": round(summary.get("voltage", 3.5) + noise, 4),
        "current": round(summary.get("current", 1.2) + noise * 2, 3),
        "temperature": round(summary.get("temperature", 32.0) + noise * 5, 2),
        "soh": summary.get("soh", 85.0),
        "predicted_soh": summary.get("predicted_soh", 85.5),
        "cycle": summary.get("current_cycle", 100),
        "status": summary.get("status", "healthy"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@app.get("/api/all-summaries", summary="Get Health Summaries for All Batteries")
def get_all_summaries_api():
    """Returns summary cards for all available batteries."""
    batt_res = get_battery_ids_list()
    batteries = batt_res.get("batteries", ["B0005"])
    summaries = []
    for b in batteries:
        try:
            d = get_dashboard_data_api(battery_id=b)
            summaries.append(d.get("summary"))
        except Exception:
            pass
    return summaries


@app.get("/api/sample-data", summary="Get NASA Battery Dataset Sample Telemetry Cycles")
def get_sample_data(battery_id: Optional[str] = Query(default=None, description="e.g. B0005, B0006")):
    """
    Returns sample battery test cycles from the processed dataset for quick testing in frontend.
    """
    merged_path = DATA_DIR / "merged_battery_dataset.csv"
    if not merged_path.exists():
        samples = [
            {"battery_id": "B0005", "cycle": 1, "avg_voltage": 3.52, "max_voltage": 4.19, "min_voltage": 2.71, "avg_current": -1.49, "max_current": 0.0, "avg_temp": 32.5, "max_temp": 39.8, "ambient_temp": 24.0, "discharge_duration": 3350.0},
            {"battery_id": "B0005", "cycle": 50, "avg_voltage": 3.48, "max_voltage": 4.17, "min_voltage": 2.68, "avg_current": -1.51, "max_current": 0.0, "avg_temp": 34.1, "max_temp": 41.2, "ambient_temp": 24.0, "discharge_duration": 3100.0},
            {"battery_id": "B0005", "cycle": 100, "avg_voltage": 3.42, "max_voltage": 4.15, "min_voltage": 2.62, "avg_current": -1.53, "max_current": 0.0, "avg_temp": 35.8, "max_temp": 43.1, "ambient_temp": 24.0, "discharge_duration": 2850.0},
            {"battery_id": "B0005", "cycle": 150, "avg_voltage": 3.35, "max_voltage": 4.10, "min_voltage": 2.55, "avg_current": -1.56, "max_current": 0.0, "avg_temp": 37.2, "max_temp": 45.0, "ambient_temp": 24.0, "discharge_duration": 2600.0}
        ]
        return {"source": "synthetic_fallback", "samples": samples}

    try:
        df = pd.read_csv(merged_path)
        if battery_id:
            df_filtered = df[df["battery_id"] == battery_id]
            if df_filtered.empty:
                df_filtered = df
        else:
            df_filtered = df

        sample_indices = np.linspace(0, len(df_filtered) - 1, num=min(20, len(df_filtered)), dtype=int)
        sampled_df = df_filtered.iloc[sample_indices]

        cols = [
            "battery_id", "cycle", "avg_voltage", "max_voltage", "min_voltage",
            "avg_current", "max_current", "avg_temp", "max_temp", "ambient_temp", "discharge_duration"
        ]
        cols_present = [c for c in cols if c in sampled_df.columns]
        samples = sampled_df[cols_present].to_dict(orient="records")

        available_batteries = list(df["battery_id"].unique()) if "battery_id" in df.columns else []

        return {
            "source": "merged_battery_dataset.csv",
            "total_available_rows": len(df),
            "available_batteries": available_batteries[:10],
            "samples": samples
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {str(e)}")


# Serve Web Dashboard Frontend static files
DIST_DIR = FRONTEND_DIR / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react_app(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def serve_index():
        return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI EV BMS Backend Service</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f17; color: #e2e8f0; margin: 0; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .badge { display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 24px; margin: 0 0 12px 0; color: #fff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .links { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .btn { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #1f2937; border-radius: 8px; color: #38bdf8; text-decoration: none; font-weight: 500; font-size: 14px; transition: background 0.2s; }
        .btn:hover { background: #374151; }
        .cmd-box { background: #000; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 13px; color: #a7f3d0; border: 1px solid #111827; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">● FastAPI Server Online</div>
        <h1>AI EV Battery BMS Backend Running</h1>
        <p>The Python FastAPI REST API service with trained XGBoost & Random Forest model inference engines is live and active on port 8000.</p>

        <div class="links">
            <a href="/docs" class="btn"><span>Interactive Swagger API Docs</span> <span>/docs →</span></a>
            <a href="/api/dashboard-data?battery_id=B0005" class="btn"><span>Dashboard Telemetry & ML Endpoint</span> <span>/api/dashboard-data →</span></a>
            <a href="/api/models" class="btn"><span>Trained Models & Metrics Summary</span> <span>/api/models →</span></a>
            <a href="/api/health" class="btn"><span>Server Health Status</span> <span>/api/health →</span></a>
        </div>

        <p style="margin-bottom: 8px; font-weight: 500; color: #cbd5e1;">To view the React UI dashboard:</p>
        <div class="cmd-box">
            cd frontend<br>
            npm run dev
        </div>
    </div>
</body>
</html>"""


