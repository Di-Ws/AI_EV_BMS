import type {
  BatteryReading,
  BatteryStatus,
  BatterySummary,
  Alert,
  AlertType,
  AlertSeverity,
  DashboardData,
  LiveReading,
} from '@/types/battery';

// ============================================================
// MOCK DATA GENERATOR
// Generates data that mirrors the real NASA battery dataset
// (battery_cycle_level_dataset_CLEAN_FINAL.csv).
//
// Battery IDs, voltage ranges, temperature ranges, capacity,
// SOH degradation curves, and RUL patterns all match the
// actual training data so the dashboard looks realistic
// for your presentation.
//
// The dataset has columns: battery_id, cycle, voltage,
// temperature, capacity, soh, rul
// SOH is 0–1 in the dataset; we convert to 0–100 for display.
// "current" is not in the dataset but the ESP32 will provide
// it in real-time, so we generate synthetic values here.
// ============================================================

// Battery profiles extracted from the real dataset
interface BatteryProfile {
  id: string;
  cycles: number;
  initialSoh: number;   // 0–1
  finalSoh: number;     // 0–1
  voltageStart: number; // V
  voltageEnd: number;   // V
  tempBase: number;     // °C
  tempVariance: number; // °C spread
  capacityStart: number; // Ah
  rulStart: number;     // cycles
}

const BATTERY_PROFILES: BatteryProfile[] = [
  { id: 'B0005', cycles: 168, initialSoh: 1.0, finalSoh: 0.71, voltageStart: 3.53, voltageEnd: 3.47, tempBase: 32.3, tempVariance: 1.2, capacityStart: 1.86, rulStart: 167 },
  { id: 'B0006', cycles: 155, initialSoh: 1.0, finalSoh: 0.60, voltageStart: 3.56, voltageEnd: 3.41, tempBase: 32.2, tempVariance: 1.5, capacityStart: 2.06, rulStart: 154 },
  { id: 'B0007', cycles: 168, initialSoh: 1.0, finalSoh: 0.76, voltageStart: 3.53, voltageEnd: 3.48, tempBase: 32.2, tempVariance: 1.0, capacityStart: 1.92, rulStart: 167 },
  { id: 'B0018', cycles: 132, initialSoh: 1.0, finalSoh: 0.73, voltageStart: 3.53, voltageEnd: 3.44, tempBase: 30.8, tempVariance: 1.0, capacityStart: 1.86, rulStart: 131 },
  { id: 'B0029', cycles: 40, initialSoh: 1.0, finalSoh: 0.95, voltageStart: 3.37, voltageEnd: 3.39, tempBase: 52.8, tempVariance: 0.3, capacityStart: 1.75, rulStart: 39 },
  { id: 'B0030', cycles: 40, initialSoh: 1.0, finalSoh: 0.94, voltageStart: 3.38, voltageEnd: 3.39, tempBase: 54.3, tempVariance: 0.3, capacityStart: 1.69, rulStart: 39 },
  { id: 'B0031', cycles: 40, initialSoh: 1.0, finalSoh: 1.00, voltageStart: 3.40, voltageEnd: 3.42, tempBase: 53.7, tempVariance: 0.2, capacityStart: 1.69, rulStart: 39 },
  { id: 'B0032', cycles: 40, initialSoh: 1.0, finalSoh: 0.96, voltageStart: 3.33, voltageEnd: 3.34, tempBase: 54.5, tempVariance: 0.3, capacityStart: 1.71, rulStart: 39 },
  { id: 'B0042', cycles: 112, initialSoh: 1.0, finalSoh: 0.80, voltageStart: 3.47, voltageEnd: 3.36, tempBase: 29.5, tempVariance: 2.0, capacityStart: 1.77, rulStart: 111 },
  { id: 'B0043', cycles: 112, initialSoh: 1.0, finalSoh: 0.76, voltageStart: 3.48, voltageEnd: 3.41, tempBase: 29.5, tempVariance: 2.0, capacityStart: 1.73, rulStart: 111 },
  { id: 'B0044', cycles: 112, initialSoh: 1.0, finalSoh: 0.74, voltageStart: 3.46, voltageEnd: 3.41, tempBase: 31.5, tempVariance: 2.0, capacityStart: 1.69, rulStart: 111 },
  { id: 'B0045', cycles: 72, initialSoh: 1.0, finalSoh: 0.62, voltageStart: 3.35, voltageEnd: 3.31, tempBase: 9.4, tempVariance: 0.5, capacityStart: 1.21, rulStart: 71 },
  { id: 'B0046', cycles: 72, initialSoh: 1.0, finalSoh: 0.69, voltageStart: 3.44, voltageEnd: 3.33, tempBase: 9.0, tempVariance: 0.5, capacityStart: 1.80, rulStart: 71 },
  { id: 'B0047', cycles: 72, initialSoh: 1.0, finalSoh: 0.70, voltageStart: 3.47, voltageEnd: 3.38, tempBase: 8.4, tempVariance: 0.5, capacityStart: 1.71, rulStart: 71 },
  { id: 'B0048', cycles: 72, initialSoh: 1.0, finalSoh: 0.74, voltageStart: 3.47, voltageEnd: 3.41, tempBase: 7.9, tempVariance: 0.5, capacityStart: 1.66, rulStart: 71 },
  { id: 'B0053', cycles: 55, initialSoh: 1.0, finalSoh: 1.00, voltageStart: 3.08, voltageEnd: 3.06, tempBase: 12.4, tempVariance: 0.3, capacityStart: 1.31, rulStart: 54 },
];

const BATTERY_IDS = BATTERY_PROFILES.map((p) => p.id);

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getStatusFromSoh(soh: number): BatteryStatus {
  if (soh >= 80) return 'healthy';
  if (soh >= 60) return 'warning';
  return 'critical';
}

function generateReadingsForBattery(profile: BatteryProfile): BatteryReading[] {
  const readings: BatteryReading[] = [];
  const { id, cycles, initialSoh, finalSoh, voltageStart, voltageEnd, tempBase, tempVariance, capacityStart, rulStart } = profile;
  const batteryIndex = BATTERY_PROFILES.indexOf(profile);

  for (let cycle = 1; cycle <= cycles; cycle++) {
    const seed = batteryIndex * 10000 + cycle;
    const progress = (cycle - 1) / Math.max(1, cycles - 1); // 0 → 1

    // SOH: non-linear degradation with realistic noise
    // Uses exponential decay matching the real dataset pattern
    const degradationRate = -Math.log(finalSoh / initialSoh);
    const soh01 = initialSoh * Math.exp(-degradationRate * progress);
    const sohNoise = (seededRandom(seed) - 0.5) * 0.008; // small noise
    const soh01Noisy = Math.max(0.4, Math.min(1.05, soh01 + sohNoise));

    // Voltage: linear interpolation with fluctuation (matches dataset)
    const voltage = voltageStart + (voltageEnd - voltageStart) * progress
      + (seededRandom(seed + 1) - 0.5) * 0.03;

    // Temperature: base + variance with noise (some batteries have step changes)
    const tempNoise = (seededRandom(seed + 2) - 0.5) * tempVariance;
    const temperature = tempBase + tempNoise;

    // Capacity: degrades proportionally to SOH
    const capacity = capacityStart * (soh01Noisy / initialSoh)
      + (seededRandom(seed + 3) - 0.5) * 0.02;

    // Current: synthetic (not in dataset, ESP32 will provide real values)
    // Discharge current varies 0.5–2.0A for these small cells
    const current = 1.2 + (seededRandom(seed + 4) - 0.5) * 1.0;

    // RUL: counts down from rulStart to 0
    const rul = Math.max(0, rulStart - (cycle - 1));

    // Predicted SOH: slightly off from actual (simulates ML prediction error)
    const predictedSoh01 = soh01Noisy + (seededRandom(seed + 5) - 0.5) * 0.015;

    const hoursAgo = (cycles - cycle) * 6;
    const timestamp = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    readings.push({
      battery_id: id,
      cycle,
      voltage: parseFloat(voltage.toFixed(4)),
      current: parseFloat(current.toFixed(3)),
      temperature: parseFloat(temperature.toFixed(2)),
      capacity: parseFloat(capacity.toFixed(4)),
      soh: parseFloat((soh01Noisy * 100).toFixed(2)),
      rul,
      predicted_soh: parseFloat((predictedSoh01 * 100).toFixed(2)),
      timestamp,
    });
  }

  return readings;
}

// Pre-generate all data once
const allReadings: Record<string, BatteryReading[]> = {};
for (const profile of BATTERY_PROFILES) {
  allReadings[profile.id] = generateReadingsForBattery(profile);
}

function getLatestReading(batteryId: string): BatteryReading {
  const readings = allReadings[batteryId] || allReadings[BATTERY_IDS[0]];
  return readings[readings.length - 1];
}

function generateAlerts(): Alert[] {
  const alerts: Alert[] = [];
  let alertId = 1;

  // Generate alerts based on actual data patterns
  const alertConfigs: {
    batteryId: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    value: number;
    threshold: number;
    cycleOffset: number;
  }[] = [
      {
        batteryId: 'B0029',
        type: 'high_temperature',
        severity: 'warning',
        message: 'Battery temperature above normal operating range (52.8°C avg)',
        value: 52.8,
        threshold: 45.0,
        cycleOffset: 2,
      },
      {
        batteryId: 'B0030',
        type: 'high_temperature',
        severity: 'critical',
        message: 'Critical temperature sustained at 54.3°C — thermal management inspection recommended',
        value: 54.3,
        threshold: 50.0,
        cycleOffset: 1,
      },
      {
        batteryId: 'B0006',
        type: 'low_soh',
        severity: 'warning',
        message: 'State of Health approaching end-of-life threshold (60.4%)',
        value: 60.4,
        threshold: 60.0,
        cycleOffset: 3,
      },
      {
        batteryId: 'B0045',
        type: 'low_soh',
        severity: 'warning',
        message: 'State of Health below 70% — battery degradation accelerating',
        value: 63.5,
        threshold: 70.0,
        cycleOffset: 2,
      },
      {
        batteryId: 'B0046',
        type: 'abnormal_voltage',
        severity: 'warning',
        message: 'Voltage drop detected — cell voltage trending below nominal range',
        value: 3.33,
        threshold: 3.35,
        cycleOffset: 5,
      },
      {
        batteryId: 'B0005',
        type: 'abnormal_current',
        severity: 'normal',
        message: 'Discharge current within normal operating parameters',
        value: 1.25,
        threshold: 2.0,
        cycleOffset: 4,
      },
    ];

  for (const cfg of alertConfigs) {
    const latest = getLatestReading(cfg.batteryId);
    alerts.push({
      id: `ALT-${String(alertId++).padStart(3, '0')}`,
      battery_id: cfg.batteryId,
      severity: cfg.severity,
      type: cfg.type,
      message: cfg.message,
      value: cfg.value,
      threshold: cfg.threshold,
      cycle: Math.max(1, latest.cycle - cfg.cycleOffset),
      timestamp: new Date(Date.now() - cfg.cycleOffset * 3600000 * 6).toISOString(),
      acknowledged: false,
    });
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, normal: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ============================================================
// LIVE FASTAPI API SERVICE LAYER CONNECTED TO ML MODEL
// ============================================================

const API_BASE = '/api';

export async function getBatteryIds(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/batteries`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.batteries;
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.warn('Backend API unavailable, using battery profile IDs fallback', e);
  }
  return [...BATTERY_IDS];
}

export async function getDashboardData(batteryId: string = 'B0005'): Promise<DashboardData> {
  try {
    const res = await fetch(`${API_BASE}/dashboard-data?battery_id=${encodeURIComponent(batteryId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.summary) {
        return data as DashboardData;
      }
    }
  } catch (e) {
    console.warn('Backend API unavailable, using profile calculation fallback', e);
  }

  // Fallback profile generator if server is starting
  const readings = allReadings[batteryId] || allReadings[BATTERY_IDS[0]];
  const latest = readings[readings.length - 1];
  const recent = readings.slice(-10).reverse();

  const sohPrediction = readings
    .filter((_, i) => i % Math.max(1, Math.floor(readings.length / 50)) === 0)
    .map((r) => ({
      cycle: r.cycle,
      actual_soh: r.soh,
      predicted_soh: r.predicted_soh || r.soh,
    }));

  const summary: BatterySummary = {
    battery_id: batteryId,
    current_cycle: latest.cycle,
    soh: latest.soh,
    status: getStatusFromSoh(latest.soh),
    voltage: latest.voltage,
    current: latest.current,
    temperature: latest.temperature,
    rul: latest.rul,
    predicted_soh: latest.predicted_soh || latest.soh,
  };

  return {
    summary,
    recent_readings: recent,
    soh_prediction: sohPrediction,
    alerts: generateAlerts(),
  };
}

export async function getBatterySummary(batteryId: string = 'B0005'): Promise<BatterySummary> {
  const dashData = await getDashboardData(batteryId);
  return dashData.summary;
}

export async function getAnalyticsData(batteryId: string = 'B0005') {
  try {
    const res = await fetch(`${API_BASE}/analytics-data?battery_id=${encodeURIComponent(batteryId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Analytics API call failed, using fallback profile data', e);
  }

  const readings = allReadings[batteryId] || allReadings[BATTERY_IDS[0]];
  return readings.map((r) => ({
    cycle: r.cycle,
    voltage: r.voltage,
    current: r.current,
    temperature: r.temperature,
    soh: r.soh,
    predicted_soh: r.predicted_soh || r.soh,
    capacity: r.capacity,
  }));
}

export async function getLiveReading(batteryId: string = 'B0005'): Promise<LiveReading> {
  try {
    const res = await fetch(`${API_BASE}/live-reading?battery_id=${encodeURIComponent(batteryId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.battery_id) {
        return data as LiveReading;
      }
    }
  } catch (e) {
    console.warn('Live reading API failed, using fallback generator', e);
  }

  const latest = getLatestReading(batteryId);
  const noise = () => (Math.random() - 0.5) * 0.3;
  return {
    battery_id: batteryId,
    voltage: parseFloat((latest.voltage + noise() * 0.01).toFixed(4)),
    current: parseFloat((latest.current + noise() * 0.1).toFixed(3)),
    temperature: parseFloat((latest.temperature + noise() * 0.2).toFixed(2)),
    soh: latest.soh,
    predicted_soh: latest.predicted_soh || latest.soh,
    cycle: latest.cycle,
    status: getStatusFromSoh(latest.soh),
    timestamp: new Date().toISOString(),
  };
}

export async function getAlerts(): Promise<Alert[]> {
  try {
    const dashData = await getDashboardData('B0005');
    if (dashData.alerts && dashData.alerts.length > 0) {
      return dashData.alerts;
    }
  } catch (e) {
    // Fallback
  }
  return generateAlerts();
}

export async function getHistory(
  batteryId: string = 'B0005',
  cycleStart: number = 1,
  cycleEnd: number = 168
): Promise<BatteryReading[]> {
  try {
    const dashData = await getDashboardData(batteryId);
    if (dashData.recent_readings) {
      return dashData.recent_readings.filter((r) => r.cycle >= cycleStart && r.cycle <= cycleEnd);
    }
  } catch (e) {
    // Fallback
  }
  const readings = allReadings[batteryId] || allReadings[BATTERY_IDS[0]];
  return readings.filter((r) => r.cycle >= cycleStart && r.cycle <= cycleEnd);
}

export async function getAllSummaries(): Promise<BatterySummary[]> {
  try {
    const res = await fetch(`${API_BASE}/all-summaries`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as BatterySummary[];
      }
    }
  } catch (e) {
    console.warn('All summaries API failed, using fallback profiles', e);
  }

  return BATTERY_IDS.map((id) => {
    const latest = getLatestReading(id);
    return {
      battery_id: id,
      current_cycle: latest.cycle,
      soh: latest.soh,
      status: getStatusFromSoh(latest.soh),
      voltage: latest.voltage,
      current: latest.current,
      temperature: latest.temperature,
      rul: latest.rul,
      predicted_soh: latest.predicted_soh || latest.soh,
    };
  });
}

export async function login(email: string, _password: string): Promise<{ success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (email && _password.length >= 4) {
    return { success: true };
  }
  return { success: false };
}

// Thresholds tuned for the NASA battery dataset characteristics
export const THRESHOLDS = {
  soh: { healthy: 80, warning: 60 },
  voltage: { min: 2.8, max: 4.0, nominal: 3.5 },
  current: { min: 0, max: 2.0, nominal: 1.2 },
  temperature: { warning: 45, critical: 50, nominal: 30 },
};

export function getMaxCycles(batteryId: string): number {
  const profile = BATTERY_PROFILES.find((p) => p.id === batteryId);
  return profile ? profile.cycles : 168;
}

