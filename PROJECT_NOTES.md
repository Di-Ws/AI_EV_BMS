# EV Battery Health Prediction (AI_EV_BMS) - Project Task Notes

This file keeps track of all completed tasks, project milestones, and explanations of what each component does in plain, human-understandable language.

---

## 📌 Milestone 1: Environment & Dependency Setup
* **What we did**: Installed core Python data science and machine learning libraries (`pandas`, `scikit-learn`, `xgboost`, `matplotlib`, `seaborn`, `joblib`) inside a virtual environment (`venv`).
* **Why it matters**: Ensures everyone on the team uses exact, matching package versions so the code runs reliably without unexpected crashes or version conflicts.
* **Key File**: [`requirements.txt`](file:///d:/ev-battery-health/requirements.txt)

---

## 📌 Milestone 2: Project Workspace & Folder Structure Setup
* **What we did**: Organized the project into clear, dedicated folders so code, data, notebooks, and models never get mixed up.
* **Folder Breakdown**:
  * [`.vscode/settings.json`](file:///d:/ev-battery-health/.vscode/settings.json): Tells VS Code automatically which Python environment to use.
  * [`data/`](file:///d:/ev-battery-health/data/): Divided into `raw/` (unmodified original data), `processed/` (cleaned data ready for training), and `dummy/` (synthetic sample data).
  * [`notebooks/`](file:///d:/ev-battery-health/notebooks/): Jupyter notebooks for data visualization (`01_data_exploration.ipynb`) and deeper model metric evaluation (`02_model_evaluation.ipynb`).
  * [`src/`](file:///d:/ev-battery-health/src/): Core Python scripts containing the actual logic:
    * `data_prep.py`: Data cleaning and feature extraction helper functions.
    * `train_model.py`: Model training pipeline class.
    * `predict.py`: Script to load saved models and run predictions on new incoming battery data.
  * [`models/saved_models/`](file:///d:/ev-battery-health/models/saved_models/): Directory to save trained model files (`.pkl` or `.joblib`).
  * [`.gitignore`](file:///d:/ev-battery-health/.gitignore): Prevents large datasets, temporary files, and virtual environments from cluttering Git.
  * [`README.md`](file:///d:/ev-battery-health/README.md): Project summary and setup instructions.

---

## 📌 Milestone 3: Version Control & GitHub Repository Push
* **What we did**: Initialized Git locally, staged project structure files, resolved remote conflict, and pushed the repository to GitHub.
* **Why it matters**: Syncs the codebase with the team repository at [`https://github.com/Di-Ws/AI_EV_BMS.git`](https://github.com/Di-Ws/AI_EV_BMS.git) so teammates can collaborate smoothly.

---

## 📌 Milestone 4: Object-Oriented Machine Learning Pipeline (`BatteryHealthModel`)
* **What we did**: Implemented a modular, reusable Python class [`BatteryHealthModel`](file:///d:/ev-battery-health/src/train_model.py#L15-L95) inside `src/train_model.py`.

### 🔍 Breakdown of Methods in `BatteryHealthModel`:

1. **`__init__()` & Initialization**:
   * **Human Explanation**: Sets up the pipeline instance. If you pass real data, it uses your dataset. If no data is provided, it automatically generates synthetic battery data to test the pipeline.

2. **`generate_synthetic_data()`**:
   * **Human Explanation**: Creates mock data simulating real EV battery behavior:
     * `cycle`: Number of times the battery was charged/discharged (1 to 1000).
     * `avg_voltage`: Average voltage level of the cell (3.2V to 4.2V).
     * `max_temp`: Peak temperature recorded (°C).
     * `SoH` (State of Health target): Calculates remaining health starting at 100%, degrading based on cycle count and peak temperature, plus realistic sensor noise.

3. **`prepare_data()`**:
   * **Human Explanation**: Separates the input features (`cycle`, `avg_voltage`, `max_temp`) from the target outcome (`SoH`), and splits the data into:
     * **80% Training Data** (`X_train`, `y_train`): Used to teach the AI models.
     * **20% Testing Data** (`X_test`, `y_test`): Kept hidden to evaluate how accurate the models are later.

4. **`train_models()`**:
   * **Human Explanation**: Takes the training data and trains two separate Machine Learning models side-by-side:
     * **Random Forest Regressor**: An ensemble of decision trees that averages multiple predictions.
     * **XGBoost Regressor**: A gradient-boosted decision tree model known for high accuracy on structured data.
   * Both trained models are saved in a dictionary (`self.models`) for easy comparison and usage.

## 📌 Milestone 5: Data Preparation & 80/20 Train-Test Splitting
* **What we did**: Refined `prepare_data()` in [`src/train_model.py`](file:///d:/ev-battery-health/src/train_model.py#L50-L75).
* **How it works**:
  1. **Feature Isolation (`X`)**: Selects `['cycle', 'avg_voltage', 'max_temp']` columns.
  2. **Target Isolation (`y`)**: Selects `'SoH'` column.
  3. **80/20 Train-Test Split**: Uses `scikit-learn`'s `train_test_split(X, y, test_size=0.2, random_state=42)` to split 1,000 samples into **800 training samples** and **200 testing samples**.
  4. **Attribute Persistence**: Stores `self.X_train`, `self.X_test`, `self.y_train`, `self.y_test` on the `BatteryHealthModel` instance.

---

## 📌 Milestone 6: Merged Battery Health Dataset & ML Model Pipeline Verification
* **What we did**: 
  1. Extracted and merged all 34 NASA battery datasets into a unified, clean master dataset saved at [`data/processed/merged_battery_dataset.csv`](file:///d:/ev-battery-health/data/processed/merged_battery_dataset.csv) (2,769 samples across 14 columns).
  2. Implemented dataset merger and ML verification pipeline in [`src/merge_datasets.py`](file:///d:/ev-battery-health/src/merge_datasets.py).
  3. Feature matrix includes: `cycle`, `avg_voltage`, `max_voltage`, `min_voltage`, `avg_current`, `max_current`, `avg_temp`, `max_temp`, `discharge_duration`.
  4. Target variables: `soh` (State of Health) and `rul` (Remaining Useful Life).
* **Model Accuracy Verification Results**:
  * **Random Forest Regressor**: $R^2 = 0.9265$ (92.65% variance explained), $\text{MAE} = 0.3292$
  * **XGBoost Regressor**: $R^2 = 0.9211$ (92.11% variance explained), $\text{MAE} = 0.2561$

---

## 📌 Milestone 7: Leak-Free Battery-Wise Model Training & Evaluation
* **What we did**:
  1. **Fixed Feature Leakage**: Dropped `capacity`, target columns (`soh`, `rul`), `cycle`, and `battery_id` from inputs. Retained non-leaky physical features.
  2. **Battery-Wise Split**: Replaced random train-test splitting with `GroupShuffleSplit` on `battery_id`.

---

## 📌 Milestone 8: Per-Battery Reference Capacity, Warm-Up Trimming & LOBO Evaluation (v2)
* **What we did**:
  1. **Per-Battery Reference Capacity**: Replaced fixed 2.0 Ah / Cycle 1 denominator with median of the 3 highest capacities in the first 20 valid cycles per battery. Bounded `soh_max` to realistic $1.000 - 1.140$ (eliminating the $27.55\times$ spike).
  2. **Warm-Up & Low-Capacity Trimming**: Filtered discharges $\le 0.5\text{ Ah}$ and trimmed initial warm-up cycles until capacity reaches $95\%$ of reference capacity (fixed `B0033` initial ramp). Removed `B0052` (<10 valid rows).
  3. **Honest RUL Labels**: Defined RUL relative to battery-specific EOL threshold ($\text{SOH} \le 80\%$). 19 of 33 batteries reached EOL (1,216 valid RUL samples; 2,490 valid SOH samples).
  4. **Leave-One-Battery-Out (LOBO) Results**:
     * **Target: State of Health (`soh`)**:
       * **Mean Baseline**: $R^2 = -0.0301$, $\text{MAE} = 0.0820$, $\text{RMSE} = 0.1010$
       * **Random Forest**: $R^2 = 0.5675$, $\text{MAE} = 0.0497$, $\text{RMSE} = 0.0655$
       * **XGBoost**: $R^2 = 0.6923$, $\text{MAE} = 0.0420$, $\text{RMSE} = 0.0552$
     * **Target: Remaining Useful Life (`rul`)**:
       * **Mean Baseline**: $R^2 = -0.0656$, $\text{MAE} = 36.2154$ cycles, $\text{RMSE} = 43.6343$ cycles
       * **Random Forest**: $R^2 = 0.3780$, $\text{MAE} = 27.0895$ cycles, $\text{RMSE} = 33.3378$ cycles
       * **XGBoost**: $R^2 = 0.4844$, $\text{MAE} = 25.2010$ cycles, $\text{RMSE} = 30.3519$ cycles

---

## 📌 Milestone 9: Final Model Artifact Export & Hardware Readiness Preparation
* **What we did**:
  1. **Final Model Artifact Export**: Executed `python src/evaluate_model.py --save` to fit models on all valid NASA battery cycles and exported dictionary artifacts (`soh_randomforest.joblib`, `soh_xgboost.joblib`, `rul_randomforest.joblib`, `rul_xgboost.joblib`).
  2. **Self-Contained Model Packaging**: Stored model weights, required feature names in exact order, target names, and rolling window parameters inside each `.joblib` dictionary file.
  3. **Hardware-Agnostic Inference Engine**: Updated [`src/predict.py`](file:///d:/ev-battery-health/src/predict.py) to parse hardware telemetry logs, dynamically build trailing rolling features, enforce exact feature order, and return real-time predictions.
  4. **Hardware Transition Protocol**:
     * **Data-Source Agnostic Schema**: Standardized input fields (`battery_id`, `cycle`, `avg_voltage`, `max_voltage`, `min_voltage`, `avg_current`, `max_current`, `avg_temp`, `max_temp`, `ambient_temp`, `discharge_duration`).
     * **Capacity Ground-Truth Protocol**: Schedule periodic controlled full discharge tests to measure reference capacity for retraining/calibration.
     * **Time-Series Evaluation**: Evaluate hardware cells using temporal splitting (train on early cycles, evaluate on later cycles).
     * **Raw Signal Archival**: Save raw time-series sensor data (1Hz/10Hz) to `data/raw/` so summary metrics can be re-computed without re-cycling cells.

---

## 📌 Milestone 10: Production FastAPI REST API & Interactive Web Dashboard Frontend
* **What we did**:
  1. **RESTful Machine Learning API ([`src/api.py`](file:///d:/ev-battery-health/src/api.py))**:
     * Built with **FastAPI** and **Uvicorn**.
     * Automatically loads trained `.joblib` model artifacts (`soh_xgboost`, `soh_randomforest`, `rul_xgboost`, `rul_randomforest`) on startup.
     * Enforces CORS policy (`allow_origins=["*"]`) for seamless frontend connectivity.
     * Interactive Swagger UI docs available at `http://127.0.0.1:8000/docs`.
  2. **API Endpoints**:
     * `GET /api/health`: Healthcheck, timestamp, and loaded model count.
     * `GET /api/models`: Model registry info, feature lists, and LOBO metrics summary.
     * `POST /api/predict/single`: Real-time SOH %, RUL cycles, health classification status (EXCELLENT, GOOD, WARNING, CRITICAL), and actionable safety recommendations for single telemetry input.
     * `POST /api/predict/batch`: Array-based multi-cycle telemetry inference.
     * `POST /api/predict/csv`: Upload `.csv` log files for automatic rolling feature engineering, degradation rate calculation, and cycle-by-cycle predictions.
     * `GET /api/sample-data`: Serves real test battery cycles from `data/processed/merged_battery_dataset.csv`.
  3. **Web Dashboard Frontend ([`frontend/`](file:///d:/ev-battery-health/frontend/))**:
     * High-tech dark mode interface with glassmorphism styling ([`frontend/style.css`](file:///d:/ev-battery-health/frontend/style.css)).
     * Real-time form controls with preset quick-loaders (Fresh, Mid-Life, Aged cell telemetry) ([`frontend/index.html`](file:///d:/ev-battery-health/frontend/index.html)).
     * Animated circular State of Health (SOH) gauge & Remaining Useful Life progress bar ([`frontend/app.js`](file:///d:/ev-battery-health/frontend/app.js)).
     * Integrated drag-and-drop CSV batch upload with Chart.js aging degradation visualization curves.

---

## 📝 Future Tasks Roadmap
- [x] Perform Train-Test Data Preparation & Splitting (`prepare_data()`).
- [x] Extract & merge raw NASA Li-ion battery datasets into `data/processed/merged_battery_dataset.csv`.
- [x] Implement data evaluation & error metrics calculation (RMSE, MAE, R² score).
- [x] Fix feature list to remove data leakage (`capacity`, `cycle`, `soh`, `rul`).
- [x] Implement Per-Battery Reference Capacity & Warm-up Trimming.
- [x] Run Leave-One-Battery-Out (LOBO) Cross-Validation across all 33 valid batteries.
- [x] Export final model artifacts using `python src/evaluate_model.py --save`.
- [x] Implement inference function in `src/predict.py` for real-time predictions.
- [x] Build production REST API & connecting web frontend dashboard (`src/api.py` & `frontend/`).
- [ ] Build exploratory visuals & evaluation plots in `notebooks/`.





