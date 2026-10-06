# 🛠️ Team Guide: Pulling the ML API & Merging your Frontend Dashboard

This step-by-step guide explains how to pull the latest Machine Learning REST API backend from GitHub, run it locally, merge your custom frontend dashboard code, and connect it to the prediction endpoints.

---

## 📌 Step 1: Pull the Latest Backend API Code from GitHub

Before making or merging any local changes, fetch the latest code from the remote repository.

### Option A: If you are on the `main` branch with no uncommitted changes
```bash
# 1. Fetch latest remote branches
git fetch origin

# 2. Pull the latest commits into your local main branch
git pull origin main
```

### Option B: If you have local uncommitted changes on your dashboard
If you have work in progress on your local machine, stash your work before pulling to prevent conflicts:

```bash
# 1. Temporarily save your uncommitted frontend work
git stash save "My frontend dashboard progress"

# 2. Pull the latest code from GitHub
git pull origin main

# 3. Re-apply your saved frontend work
git stash pop
```

### Option C: If you worked on a separate Git branch (e.g. `feature/dashboard`)
```bash
# 1. Switch to your feature branch
git checkout feature/dashboard

# 2. Merge the updated main branch (containing src/api.py) into your branch
git merge main
```

---

## 📌 Step 2: Install Dependencies & Launch the API Server

1. **Activate your Python virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```

2. **Install updated dependencies** (`fastapi`, `uvicorn`, `pydantic`, `python-multipart`):
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI server**:
   ```bash
   python -m uvicorn src.api:app --reload --host 127.0.0.1 --port 8000
   ```

4. **Verify API is running**:
   - Open your browser to **`http://127.0.0.1:8000/api/health`** — You should see `"status": "online"` with `4` active models.
   - Explore interactive Swagger API Docs at **`http://127.0.0.1:8000/docs`**.

---

## 📌 Step 3: Organize & Merge Your Frontend Code

### Where to place frontend files:
- Place your frontend HTML, CSS, and JavaScript files inside the **`frontend/`** directory:
  ```
  ev-battery-health/
  ├── frontend/
  │   ├── index.html     <-- Main dashboard HTML structure
  │   ├── style.css      <-- CSS styles & design system
  │   └── app.js         <-- JavaScript logic & API calls
  ```

FastAPI automatically serves static files placed in `frontend/` at `http://127.0.0.1:8000/`.

---

## 📌 Step 4: Connect Your Frontend Dashboard to the API

Here are ready-to-use JavaScript code snippets for integrating your dashboard UI with the backend API endpoints:

### 1️⃣ Real-Time Single Telemetry SOH & RUL Prediction (`POST /api/predict/single`)

Call this function when a user clicks "Predict" or submits a telemetry input form:

```javascript
/**
 * Sends battery telemetry input to the API and receives SOH & RUL predictions.
 */
async function predictBatteryHealth(telemetryData) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/predict/single', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                battery_id: telemetryData.battery_id || "HW_CELL_01",
                cycle: parseInt(telemetryData.cycle, 10),
                avg_voltage: parseFloat(telemetryData.avg_voltage),
                max_voltage: parseFloat(telemetryData.max_voltage),
                min_voltage: parseFloat(telemetryData.min_voltage),
                avg_current: parseFloat(telemetryData.avg_current),
                max_current: 0.0,
                avg_temp: parseFloat(telemetryData.avg_temp),
                max_temp: parseFloat(telemetryData.max_temp),
                ambient_temp: 24.0,
                discharge_duration: parseFloat(telemetryData.discharge_duration),
                model_type: telemetryData.model_type || "xgboost" // 'xgboost' or 'randomforest'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Prediction request failed");
        }

        const data = await response.json();
        
        // --- Access Response Metrics ---
        const sohPct = data.predictions.state_of_health_pct;           // e.g. 92.45 (%)
        const rulCycles = data.predictions.remaining_useful_life_cycles; // e.g. 185 (cycles)
        const estKm = data.predictions.estimated_remaining_km;         // e.g. 8325 (km)
        const healthStatus = data.health_assessment.status;           // 'EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL'
        const recommendation = data.health_assessment.recommendation; // Human readable advice

        // --- Update your UI components ---
        console.log(`SOH: ${sohPct}%, RUL: ${rulCycles} cycles, Status: ${healthStatus}`);
        return data;

    } catch (err) {
        console.error("API Error:", err);
        alert(`Prediction Error: ${err.message}`);
    }
}
```

---

### 2️⃣ Batch CSV File Telemetry Inference (`POST /api/predict/csv`)

Call this function when a user uploads or drops a `.csv` telemetry log file:

```javascript
/**
 * Uploads a battery log CSV file and receives cycle-by-cycle predictions + summary degradation rates.
 */
async function uploadTelemetryCsv(fileObject, modelType = "xgboost") {
    const formData = new FormData();
    formData.append('file', fileObject);

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/predict/csv?model_type=${modelType}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "CSV batch processing failed");
        }

        const data = await response.json();
        
        // --- Access Batch Results ---
        console.log("Analyzed Cycles:", data.total_cycles_analyzed);
        console.log("Initial SOH:", data.summary.initial_soh_pct);
        console.log("Latest SOH:", data.summary.latest_soh_pct);
        console.log("Degradation Rate / Cycle:", data.summary.degradation_rate_per_cycle);

        // Per-cycle list for rendering Chart.js or D3 line charts:
        // data.per_cycle_predictions -> [{ cycle: 1, soh_pct: 98.2, rul_cycles: 210 }, ...]
        return data;

    } catch (err) {
        console.error("CSV Upload Error:", err);
    }
}
```

---

### 3️⃣ Fetch NASA Battery Dataset Sample Telemetry (`GET /api/sample-data`)

Call this function to populate your dashboard with pre-loaded realistic NASA battery test cycles (B0005, B0006, B0007, B0018):

```javascript
async function loadSampleTelemetry(batteryId = "B0005") {
    const response = await fetch(`http://127.0.0.1:8000/api/sample-data?battery_id=${batteryId}`);
    const data = await response.json();
    return data.samples; // Array of telemetry sample objects
}
```

---

## 📌 Step 5: Test & Verify the Integration

1. Start the API server: `python -m uvicorn src.api:app --reload`
2. Open your dashboard in the browser: `http://127.0.0.1:8000`
3. Enter sample values (e.g. `cycle: 100`, `avg_voltage: 3.48`, `avg_temp: 34.2`, `discharge_duration: 2850`) and click **Predict**.
4. Check that SOH %, RUL cycles, and Health Badges render dynamically on your dashboard.

---

## 📌 Step 6: Commit and Push the Merged Dashboard to GitHub

Once your dashboard is connected and verified, commit your changes and push back to GitHub:

```bash
# 1. Stage your frontend updates
git add frontend/

# 2. Create a clean commit message
git commit -m "feat: merge custom frontend dashboard with FastAPI ML backend"

# 3. Push your work to GitHub
git push origin main
```

---

* 🎉 **Congratulations!** Your EV Battery Health Management System is now fully integrated end-to-end from Machine Learning models to REST API to Web Frontend Dashboard!*
