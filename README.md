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
├── src/                      # Source code for the project
│   ├── __init__.py           
│   ├── data_prep.py          # Data cleaning scripts
│   ├── train_model.py        # Model training pipeline
│   └── predict.py            # Future script for running inference on new data
│
├── models/                   # Saved model artifacts
│   └── saved_models/         # Exported .pkl or .joblib model files
│
├── .gitignore                # Git ignore rules for data and environment folders
├── requirements.txt          # List of dependencies (pandas, scikit-learn, xgboost, etc.)
└── README.md                 # Project overview and setup instructions
```

## Setup & Installation

1. Activate your virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

