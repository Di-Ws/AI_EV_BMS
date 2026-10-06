# AI_EV_BMS - EV Battery Health Prediction

An end-to-end machine learning project for predicting EV battery State of Health (SOH) and Remaining Useful Life (RUL) using NASA Li-ion battery datasets.

## Directory Structure

```
ev-battery-health/
│
├── .vscode/                  # VS Code specific settings
│   └── settings.json         # Workspace configurations (e.g., default Python interpreter)
│
├── data/                     # Keep data strictly separate from code
│   ├── raw/                  # Teammate drops the raw NASA Li-ion datasets here (immutable)
│   ├── processed/            # Teammate outputs the cleaned CSVs here
│   └── dummy/                # Synthetic / sample datasets stored here
│
├── notebooks/                # Jupyter notebooks for exploration
│   ├── 01_data_exploration.ipynb  # Teammate's EDA
│   └── 02_model_evaluation.ipynb  # Deeper metric analysis
│
├── frontend/                 # Interactive Web Application Dashboard
│   ├── index.html            # Dashboard layout & controls
│   ├── style.css             # Glassmorphism dark theme styling
│   └── app.js                # Frontend JS connecting to FastAPI endpoints
│
├── src/                      # Source code for the project
│   ├── __init__.py           
│   ├── api.py                # FastAPI REST Service & CORS Middleware
│   ├── data_prep.py          # Data cleaning scripts
│   ├── evaluate_model.py     # LOBO cross-validation & model exporter
│   ├── merge_datasets.py     # Master dataset extraction pipeline
│   ├── predict.py            # Hardware-agnostic inference engine
│   └── train_model.py        # Model training pipeline
│
├── models/                   # Saved model artifacts
│   └── saved_models/         # Exported .joblib model files (SOH & RUL)
│
├── .gitignore                # Git ignore rules for data and environment folders
├── requirements.txt          # List of dependencies (pandas, scikit-learn, xgboost, fastapi, uvicorn)
└── README.md                 # Project overview and setup instructions
```

## Setup & Running the API & Frontend

1. **Activate Virtual Environment**:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Start the FastAPI REST API Server**:
   ```powershell
   python -m uvicorn src.api:app --reload --host 127.0.0.1 --port 8000
   ```

4. **Access Applications**:
   - **Interactive Web Dashboard**: `http://127.0.0.1:8000`
   - **Swagger / OpenAPI Interactive Docs**: `http://127.0.0.1:8000/docs`
   - **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

## API Endpoints

- `GET /api/health`: Health status and active models
- `GET /api/models`: Model registry & LOBO metrics summary
- `POST /api/predict/single`: Real-time SOH % and RUL cycle prediction for a telemetry snapshot
- `POST /api/predict/batch`: Array batch inference across multiple telemetry cycles
- `POST /api/predict/csv`: Upload `.csv` log file for degradation analysis and chart generation
- `GET /api/sample-data`: Load real NASA Li-ion battery test cycles


