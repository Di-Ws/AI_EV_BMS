/**
 * AI EV BMS Frontend Application Logic
 * Interacts with FastAPI backend at /api/predict/single, /api/predict/csv, /api/sample-data
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const apiStatusBadge = document.getElementById('apiStatusBadge');
    const statusText = document.getElementById('statusText');
    const latencyText = document.getElementById('latencyText');
    const modelSelect = document.getElementById('modelSelect');
    
    // Form & Controls
    const telemetryForm = document.getElementById('telemetryForm');
    const batteryIdInput = document.getElementById('batteryId');
    const cycleInput = document.getElementById('cycle');
    const avgVoltageInput = document.getElementById('avgVoltage');
    const maxVoltageInput = document.getElementById('maxVoltage');
    const minVoltageInput = document.getElementById('minVoltage');
    const avgCurrentInput = document.getElementById('avgCurrent');
    const avgTempInput = document.getElementById('avgTemp');
    const maxTempInput = document.getElementById('maxTemp');
    const dischargeDurationRange = document.getElementById('dischargeDurationRange');
    const dischargeDurationInput = document.getElementById('dischargeDuration');
    const btnPredict = document.getElementById('btnPredict');
    const btnLoadSample = document.getElementById('btnLoadSample');
    
    // Results & Gauges
    const sohCircle = document.getElementById('sohCircle');
    const sohValue = document.getElementById('sohValue');
    const rulValue = document.getElementById('rulValue');
    const estKm = document.getElementById('estKm');
    const rulProgressBar = document.getElementById('rulProgressBar');
    const modelUsedBadge = document.getElementById('modelUsedBadge');
    const statusBadge = document.getElementById('statusBadge');
    const healthScoreText = document.getElementById('healthScoreText');
    const statusRecommendation = document.getElementById('statusRecommendation');
    const statusCard = document.getElementById('statusCard');
    const codeSnippetText = document.getElementById('codeSnippetText');
    const btnCopyCurl = document.getElementById('btnCopyCurl');
    
    // CSV Batch Upload Elements
    const csvDropzone = document.getElementById('csvDropzone');
    const csvFileInput = document.getElementById('csvFileInput');
    const btnUploadCsv = document.getElementById('btnUploadCsv');
    const csvMetricsGrid = document.getElementById('csvMetricsGrid');
    const metricTotalCycles = document.getElementById('metricTotalCycles');
    const metricStartSoh = document.getElementById('metricStartSoh');
    const metricFinalSoh = document.getElementById('metricFinalSoh');
    const metricDegradation = document.getElementById('metricDegradation');
    
    let degradationChart = null;

    // Sync Range Slider with Number Input
    dischargeDurationRange.addEventListener('input', (e) => {
        dischargeDurationInput.value = e.target.value;
    });
    dischargeDurationInput.addEventListener('input', (e) => {
        dischargeDurationRange.value = e.target.value;
    });

    // --- API Ping & Health Check ---
    async function checkApiHealth() {
        const startTime = performance.now();
        try {
            const response = await fetch('/api/health');
            const latency = Math.round(performance.now() - startTime);
            
            if (response.ok) {
                const data = await response.json();
                statusText.innerText = `API Online (${data.active_model_count} models loaded)`;
                latencyText.innerText = `${latency} ms`;
                
                const dot = apiStatusBadge.querySelector('.status-dot');
                dot.classList.add('online');
                dot.classList.remove('pulsing');
            } else {
                throw new Error("API returned non-200");
            }
        } catch (err) {
            statusText.innerText = "API Offline / Connecting...";
            latencyText.innerText = "-- ms";
            const dot = apiStatusBadge.querySelector('.status-dot');
            dot.classList.remove('online');
            dot.classList.add('pulsing');
        }
    }
    
    // Poll API Health every 10 seconds
    checkApiHealth();
    setInterval(checkApiHealth, 10000);

    // --- Real-time Single Telemetry Prediction ---
    async function runSinglePrediction() {
        btnPredict.disabled = true;
        btnPredict.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Computing ML Models...`;

        const payload = {
            battery_id: batteryIdInput.value.trim() || "HW_CELL_01",
            cycle: parseInt(cycleInput.value, 10) || 1,
            avg_voltage: parseFloat(avgVoltageInput.value) || 3.5,
            max_voltage: parseFloat(maxVoltageInput.value) || 4.2,
            min_voltage: parseFloat(minVoltageInput.value) || 2.7,
            avg_current: parseFloat(avgCurrentInput.value) || -1.5,
            max_current: 0.0,
            avg_temp: parseFloat(avgTempInput.value) || 30.0,
            max_temp: parseFloat(maxTempInput.value) || 40.0,
            ambient_temp: 24.0,
            discharge_duration: parseFloat(dischargeDurationInput.value) || 2800.0,
            model_type: modelSelect.value
        };

        // Update Dev Code Snippet Box
        codeSnippetText.innerText = `POST /api/predict/single\nContent-Type: application/json\n\n${JSON.stringify(payload, null, 2)}`;

        try {
            const res = await fetch('/api/predict/single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Prediction request failed");
            }

            const data = await res.json();
            updateGaugesAndStatus(data);
        } catch (err) {
            alert(`API Error: ${err.message}`);
        } finally {
            btnPredict.disabled = false;
            btnPredict.innerHTML = `<i class="fa-solid fa-microchip"></i> Run API Prediction`;
        }
    }

    function updateGaugesAndStatus(data) {
        const sohPct = data.predictions.state_of_health_pct;
        const rulCycles = data.predictions.remaining_useful_life_cycles;
        const estKmVal = data.predictions.estimated_remaining_km;
        const healthMeta = data.health_assessment;

        // 1. Update SOH Value & Circular Gauge
        sohValue.innerText = sohPct.toFixed(1);
        
        // SOH Ring stroke calculation (radius=66, max circumference=414.69)
        const circumference = 414.69;
        const offset = circumference - (sohPct / 100.0) * circumference;
        sohCircle.style.strokeDashoffset = Math.max(0, offset);

        // Color coding ring based on SOH
        if (sohPct >= 80) {
            sohCircle.style.stroke = 'var(--accent-emerald)';
        } else if (sohPct >= 70) {
            sohCircle.style.stroke = 'var(--accent-warning)';
        } else {
            sohCircle.style.stroke = 'var(--accent-danger)';
        }

        // 2. Update RUL Card
        rulValue.innerText = rulCycles;
        estKm.innerText = estKmVal.toLocaleString();
        
        // Assume 500 cycles is max fresh scale for progress bar
        const maxRulScale = 500;
        const rulPct = Math.min(100, Math.max(0, (rulCycles / maxRulScale) * 100));
        rulProgressBar.style.width = `${rulPct}%`;

        // 3. Update Model Badge & Status Card
        modelUsedBadge.innerText = `${data.model_used} API`;
        
        statusCard.className = `status-card ${healthMeta.badge_color}`;
        statusBadge.className = `status-badge ${healthMeta.badge_color}`;
        statusBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${healthMeta.status}`;
        healthScoreText.innerText = healthMeta.health_score;
        statusRecommendation.innerText = healthMeta.recommendation;
    }

    telemetryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runSinglePrediction();
    });

    modelSelect.addEventListener('change', () => {
        runSinglePrediction();
    });

    // --- Presets Handler ---
    const presets = {
        fresh: { cycle: 10, avg_voltage: 3.58, max_voltage: 4.19, min_voltage: 2.72, avg_current: -1.48, avg_temp: 31.5, max_temp: 38.0, duration: 3300 },
        mid: { cycle: 100, avg_voltage: 3.48, max_voltage: 4.16, min_voltage: 2.65, avg_current: -1.52, avg_temp: 34.2, max_temp: 41.5, duration: 2850 },
        aged: { cycle: 220, avg_voltage: 3.32, max_voltage: 4.08, min_voltage: 2.50, avg_current: -1.58, avg_temp: 38.5, max_temp: 46.2, duration: 2300 }
    };

    document.querySelectorAll('.chip[data-preset]').forEach(chip => {
        chip.addEventListener('click', () => {
            const presetKey = chip.getAttribute('data-preset');
            const data = presets[presetKey];
            if (data) {
                cycleInput.value = data.cycle;
                avgVoltageInput.value = data.avg_voltage;
                maxVoltageInput.value = data.max_voltage;
                minVoltageInput.value = data.min_voltage;
                avgCurrentInput.value = data.avg_current;
                avgTempInput.value = data.avg_temp;
                maxTempInput.value = data.max_temp;
                dischargeDurationInput.value = data.duration;
                dischargeDurationRange.value = data.duration;
                runSinglePrediction();
            }
        });
    });

    // --- Quick Load Sample NASA Data ---
    btnLoadSample.addEventListener('click', async () => {
        btnLoadSample.disabled = true;
        btnLoadSample.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching...`;
        
        try {
            const res = await fetch('/api/sample-data');
            const data = await res.json();
            if (data.samples && data.samples.length > 0) {
                // Pick mid-life sample cycle from NASA dataset
                const sample = data.samples[Math.floor(data.samples.length / 2)];
                batteryIdInput.value = sample.battery_id || "B0005";
                cycleInput.value = sample.cycle || 50;
                avgVoltageInput.value = sample.avg_voltage || 3.48;
                maxVoltageInput.value = sample.max_voltage || 4.17;
                minVoltageInput.value = sample.min_voltage || 2.68;
                avgCurrentInput.value = sample.avg_current || -1.51;
                avgTempInput.value = sample.avg_temp || 34.1;
                maxTempInput.value = sample.max_temp || 41.2;
                dischargeDurationInput.value = sample.discharge_duration || 3100;
                dischargeDurationRange.value = sample.discharge_duration || 3100;

                runSinglePrediction();
            }
        } catch (err) {
            alert(`Failed to load NASA sample telemetry: ${err.message}`);
        } finally {
            btnLoadSample.disabled = false;
            btnLoadSample.innerHTML = `<i class="fa-solid fa-flask"></i> Load Sample Data`;
        }
    });

    // --- Copy cURL Snippet ---
    btnCopyCurl.addEventListener('click', () => {
        const textToCopy = codeSnippetText.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            btnCopyCurl.innerHTML = `<i class="fa-solid fa-check" style="color: var(--accent-emerald);"></i>`;
            setTimeout(() => {
                btnCopyCurl.innerHTML = `<i class="fa-regular fa-copy"></i>`;
            }, 1500);
        });
    });

    // --- CSV Batch Upload & Charting ---
    btnUploadCsv.addEventListener('click', () => csvFileInput.click());
    csvDropzone.addEventListener('click', () => csvFileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        csvDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            csvDropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        csvDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            csvDropzone.classList.remove('dragover');
        });
    });

    csvDropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.csv')) {
            uploadCsvFile(files[0]);
        } else {
            alert("Please drop a valid .csv telemetry file.");
        }
    });

    csvFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadCsvFile(e.target.files[0]);
        }
    });

    async function uploadCsvFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const currentModel = modelSelect.value;
        btnUploadCsv.disabled = true;
        btnUploadCsv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing CSV...`;

        try {
            const res = await fetch(`/api/predict/csv?model_type=${currentModel}`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "CSV batch prediction failed");
            }

            const data = await res.json();
            renderBatchResults(data);
        } catch (err) {
            alert(`CSV Processing Error: ${err.message}`);
        } finally {
            btnUploadCsv.disabled = false;
            btnUploadCsv.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload Telemetry CSV`;
        }
    }

    function renderBatchResults(data) {
        // Unhide summary metrics
        csvMetricsGrid.classList.remove('hidden');
        metricTotalCycles.innerText = data.total_cycles_analyzed;
        metricStartSoh.innerText = `${data.summary.initial_soh_pct}%`;
        metricFinalSoh.innerText = `${data.summary.latest_soh_pct}%`;
        metricDegradation.innerText = `${data.summary.degradation_rate_per_cycle}%`;

        // Prepare chart datasets
        const cycles = data.per_cycle_predictions.map(r => r.cycle);
        const sohSeries = data.per_cycle_predictions.map(r => r.soh_pct);
        const rulSeries = data.per_cycle_predictions.map(r => r.rul_cycles);

        renderDegradationChart(cycles, sohSeries, rulSeries);
    }

    function renderDegradationChart(cycles, sohSeries, rulSeries) {
        const ctx = document.getElementById('degradationChart').getContext('2d');

        if (degradationChart) {
            degradationChart.destroy();
        }

        degradationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: cycles,
                datasets: [
                    {
                        label: 'Predicted SOH (%)',
                        data: sohSeries,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'ySOH'
                    },
                    {
                        label: 'Predicted RUL (Cycles)',
                        data: rulSeries,
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'yRUL'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    tooltip: {
                        backgroundColor: '#121824',
                        titleColor: '#f0f4f8',
                        bodyColor: '#00f2fe',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#64748b' },
                        title: { display: true, text: 'Cycle Number', color: '#94a3b8' }
                    },
                    ySOH: {
                        type: 'linear',
                        position: 'left',
                        min: 50,
                        max: 105,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#00f2fe' },
                        title: { display: true, text: 'State of Health (%)', color: '#00f2fe' }
                    },
                    yRUL: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#f59e0b' },
                        title: { display: true, text: 'Remaining Useful Life (Cycles)', color: '#f59e0b' }
                    }
                }
            }
        });
    }

    // Initialize initial default prediction on load
    runSinglePrediction();
    
    // Auto-load demo chart with sample data
    btnLoadSample.click();
});
