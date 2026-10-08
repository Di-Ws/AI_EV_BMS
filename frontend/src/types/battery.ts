// Battery data types — mirrors the backend schema:
// { battery_id, cycle, voltage, current, temperature, capacity, soh, rul }

export interface BatteryReading {
  battery_id: string;
  cycle: number;
  voltage: number;       // Volts
  current: number;       // Amperes
  temperature: number;   // Celsius
  capacity: number;      // Ah
  soh: number;           // State of Health (%)
  rul: number;           // Remaining Useful Life (cycles)
  predicted_soh?: number; // AI-predicted SOH (%)
  timestamp: string;     // ISO string
}

export type BatteryStatus = 'healthy' | 'warning' | 'critical';

export type AlertSeverity = 'normal' | 'warning' | 'critical';

export interface Alert {
  id: string;
  battery_id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  value: number;
  threshold: number;
  cycle: number;
  timestamp: string;
  acknowledged: boolean;
}

export type AlertType =
  | 'high_temperature'
  | 'low_soh'
  | 'abnormal_voltage'
  | 'abnormal_current';

export interface BatterySummary {
  battery_id: string;
  current_cycle: number;
  soh: number;
  status: BatteryStatus;
  voltage: number;
  current: number;
  temperature: number;
  rul: number;
  predicted_soh: number;
}

export interface LiveReading {
  battery_id: string;
  voltage: number;
  current: number;
  temperature: number;
  soh: number;
  predicted_soh: number;
  cycle: number;
  status: BatteryStatus;
  timestamp: string;
}

export interface DashboardData {
  summary: BatterySummary;
  recent_readings: BatteryReading[];
  soh_prediction: { cycle: number; actual_soh: number; predicted_soh: number }[];
  alerts: Alert[];
}
