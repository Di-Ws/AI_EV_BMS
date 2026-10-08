# AI_EV_BMS — EV Battery Health & RUL Prediction System

An end-to-end Machine Learning pipeline and REST API for predicting EV battery **State of Health (SOH)** and **Remaining Useful Life (RUL)** using NASA Li-ion battery telemetry.

---

## 📌 Project Purpose

The **AI EV BMS** system uses machine learning regression models (XGBoost and Random Forest) trained on physical battery discharge cycles (voltage, current, temperature, discharge duration, and trailing rolling window features) to estimate battery capacity degradation and predict remaining cycle life. The project provides both a production FastAPI REST API and an interactive web dashboard interface.

---

## 📁 Directory Structure

```
ev-battery-health/
│
├── data/                     # Data directory (kept separate from code)
│   ├── raw/                  # Downloaded NASA Li-ion datasets (NOT tracked in git)
│   ├── processed/            # Master merged battery dataset (merged_battery_dataset.csv)
│   └── dummy/                # Synthetic sample datasets
│
├── models/                   # Saved model artifacts
│   └── saved_models/         # Exported .joblib dictionary files (soh_xgboost, rul_xgboost)
│
├── src/                      # Source code
│   ├── __init__.py
│   ├── api.py                # FastAPI REST API service & static file server
│   ├── data_prep.py          # Telemetry cleaning and rolling feature engineering
│   ├── evaluate_model.py     # LOBO cross-validation & model exporter script
│   ├── merge_datasets.py     # NASA dataset merger pipeline
│   ├── predict.py            # Hardware-agnostic CLI inference engine
│   └── train_model.py        # Pipeline class definition
│
├── frontend/                 # Web Dashboard interface
│   ├── index.html            # Dashboard UI structure & telemetry forms
│   ├── style.css             # Glassmorphism dark mode stylesheet
│   └── app.js                # Frontend JS connecting UI to FastAPI endpoints
│
├── notebooks/                # Jupyter notebooks for exploration
│   ├── 01_data_exploration.ipynb
│   └── 02_model_evaluation.ipynb
│
├── .gitignore                # Git ignore rules for data, models, and virtualenvs
├── requirements.txt          # Python dependencies (pip freeze)
├── TEAM_MERGE_GUIDE.md       # Integration guide for teammates
└── README.md                 # Project documentation
```

---

## 🚀 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Di-Ws/AI_EV_BMS.git
   cd ev-battery-health
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## 📥 How to Download the NASA Dataset

> **Note**: Raw data files are **NOT** stored in the Git repository due to file size.

1. Download the official NASA PCoE Li-ion Battery Aging Datasets (or NASA Prognostics Data Repository).
2. Extract the `.mat` / `.csv` files into the `data/raw/` folder:
   ```
   data/raw/
   ├── B0005.mat
   ├── B0006.mat
   ├── B0007.mat
   └── B0018.mat
   ```
3. Run the dataset merger script to extract clean telemetry into `data/processed/merged_battery_dataset.csv`:
   ```bash
   python src/merge_datasets.py
   ```

---

## 🏋️ How to Train and Export Models

To run **Leave-One-Battery-Out (LOBO)** cross-validation across NASA batteries and export updated model artifacts into `models/saved_models/`:

```bash
python src/evaluate_model.py --save
```

This command generates and saves:
- `models/saved_models/soh_xgboost.joblib`
- `models/saved_models/rul_xgboost.joblib`
- `models/saved_models/soh_randomforest.joblib`
- `models/saved_models/rul_randomforest.joblib`

---

## ⚡ How to Start the REST API

Launch the FastAPI server with Uvicorn:

```bash
uvicorn src.api:app --reload --port 8000
```

Once running:
- **Interactive Web Dashboard**: `http://127.0.0.1:8000`
- **Swagger Interactive API Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

---

## 🔌 API Inference Request & Response Schema (`POST /api/predict/single`)

### Request Body (JSON)
```json
{
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
  "discharge_duration": 2750.0,
  "model_type": "xgboost"
}
```

### Response Body (JSON)
```json
{
  "battery_id": "HW_CELL_01",
  "cycle": 120,
  "model_used": "XGBOOST",
  "predictions": {
    "state_of_health_pct": 64.67,
    "soh_ratio": 0.6467,
    "remaining_useful_life_cycles": 20,
    "estimated_remaining_km": 900
  },
  "health_assessment": {
    "status": "CRITICAL",
    "badge_color": "red",
    "health_score": "EOL / Replace Required",
    "recommendation": "Battery SOH below safety cutoff (<70%). High risk of rapid capacity loss or thermal stress. Immediate service required."
  },
  "telemetry_summary": {
    "avg_voltage": 3.48,
    "avg_temp": 34.2,
    "discharge_duration_sec": 2750.0
  }
}
```

---

## ⚠️ Important Assumptions & Model Limitations

1. **State of Health (SOH)**: SOH is modeled as a fraction/ratio (0.0 to 1.0, expressed as percentage in UI) representing remaining discharge capacity relative to the battery's initial reference capacity.
2. **Remaining Useful Life (RUL)**: RUL is defined specifically as the number of discharge cycles remaining until the battery's SOH decays to **80% (End of Life / EOL threshold)** of its own early reference capacity.
3. **Prototype NASA Lab Data**: The machine learning models are research prototypes trained on constant-current laboratory discharge profiles at controlled ambient temperatures. Calibration or fine-tuning may be required for non-standard EV dynamic drive cycles or alternative cell chemistries.
