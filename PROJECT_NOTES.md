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

## 📝 Future Tasks Roadmap
- [x] Perform 80/20 Train-Test Data Preparation & Splitting (`prepare_data()`).
- [ ] Implement data evaluation & error metrics calculation (RMSE, MAE, R² score).
- [ ] Connect raw NASA Li-ion battery dataset cleaning pipeline in `src/data_prep.py`.
- [ ] Add model saving/exporting functionality (`joblib.dump()`) in `src/train_model.py`.
- [ ] Implement inference function in `src/predict.py` for real-time predictions.

