import { useEffect, useState, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Zap,
  Thermometer,
  Battery,
  Cpu,
  Wifi,
  RefreshCw,
  Pause,
  Play,
} from 'lucide-react';
import { getLiveReading } from '@/services/batteryApi';
import type { LiveReading } from '@/types/battery';
import Card from '@/components/ui/Card';
import StatusBadge, { StatusDot } from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { THRESHOLDS } from '@/services/batteryApi';

interface Props {
  batteryId: string;
}

interface LiveMetricProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  thresholds?: { warning?: number; critical?: number; min?: number; max?: number };
  invertLogic?: boolean; // true if high = good
}

function LiveMetric({ label, value, unit, icon, color, bgColor, thresholds, invertLogic }: LiveMetricProps) {
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (thresholds) {
    if (thresholds.critical !== undefined) {
      if (invertLogic) {
        if (value < thresholds.critical) status = 'critical';
        else if (thresholds.warning !== undefined && value < thresholds.warning) status = 'warning';
      } else {
        if (value > thresholds.critical) status = 'critical';
        else if (thresholds.warning !== undefined && value > thresholds.warning) status = 'warning';
      }
    }
    if (thresholds.min !== undefined && value < thresholds.min) status = 'warning';
    if (thresholds.max !== undefined && value > thresholds.max) status = 'warning';
  }

  const statusColor =
    status === 'healthy' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';

  return (
    <div className="card card-hover p-5 animate-slide-up relative overflow-hidden">
      {/* Pulse indicator */}
      <div
        className="absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse"
        style={{ backgroundColor: statusColor }}
      />
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="stat-value text-3xl transition-all" style={{ color }}>
          {value.toFixed(value < 10 ? 3 : 1)}
        </span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
      {/* Mini progress bar */}
      <div className="mt-3 h-1 w-full rounded-full bg-base-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.abs(value) * 2)}%`,
            backgroundColor: statusColor,
          }}
        />
      </div>
    </div>
  );
}

export default function LiveMonitoringPage({ batteryId }: Props) {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [history, setHistory] = useState<{ time: string; voltage: number; current: number; temperature: number }[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchReading = async () => {
      const r = await getLiveReading(batteryId);
      if (mounted && !paused) {
        setReading(r);
        setHistory((prev) => {
          const newData = [
            ...prev,
            {
              time: new Date(r.timestamp).toLocaleTimeString(),
              voltage: r.voltage,
              current: r.current,
              temperature: r.temperature,
            },
          ];
          return newData.slice(-20);
        });
        setLoading(false);
      }
    };

    fetchReading();

    if (!paused) {
      intervalRef.current = setInterval(fetchReading, 2000);
    }

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [batteryId, paused]);

  if (loading || !reading) {
    return <LoadingSpinner label="Establishing live connection..." />;
  }

  return (
    <div className="space-y-5">
      {/* Live status banner */}
      <div className="card p-5 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-500/10 relative">
              <Wifi size={22} className="text-success-400" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success-500 ring-2 ring-base-800 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Live Monitoring Active</h2>
                <StatusDot status="healthy" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {batteryId} · Cycle {reading.cycle} · Updated {new Date(reading.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={reading.status} />
            <button
              onClick={() => setPaused(!paused)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                paused
                  ? 'border-success-500/30 bg-success-500/10 text-success-400 hover:bg-success-500/20'
                  : 'border-base-700 bg-base-800 text-slate-400 hover:bg-base-700'
              }`}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LiveMetric
          label="Live Voltage"
          value={reading.voltage}
          unit="V"
          icon={<Zap size={20} className="text-primary-400" />}
          color="#00a8e8"
          bgColor="bg-primary-500/10"
          thresholds={{ min: THRESHOLDS.voltage.min, max: THRESHOLDS.voltage.max }}
        />
        <LiveMetric
          label="Live Current"
          value={reading.current}
          unit="A"
          icon={<Activity size={20} className="text-accent-400" />}
          color="#a78bfa"
          bgColor="bg-accent-500/10"
          thresholds={{ max: THRESHOLDS.current.max }}
        />
        <LiveMetric
          label="Live Temperature"
          value={reading.temperature}
          unit="°C"
          icon={<Thermometer size={20} className="text-warning-400" />}
          color="#f59e0b"
          bgColor="bg-warning-500/10"
          thresholds={{ warning: THRESHOLDS.temperature.warning, critical: THRESHOLDS.temperature.critical }}
        />
        <LiveMetric
          label="Live SOH Prediction"
          value={reading.predicted_soh}
          unit="%"
          icon={<Cpu size={20} className="text-success-400" />}
          color="#10b981"
          bgColor="bg-success-500/10"
          thresholds={{ warning: 80, critical: 60 }}
          invertLogic
        />
      </div>

      {/* Live charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          title="Live Voltage Stream"
          subtitle="Real-time voltage readings (2s interval)"
          icon={<Zap size={16} />}
          action={<RefreshCw size={14} className="text-primary-400 animate-spin-slow" />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="liveVoltage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00a8e8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00a8e8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[3.0, 4.2]} unit="V" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="voltage" name="Voltage" stroke="#00a8e8" strokeWidth={2} fill="url(#liveVoltage)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Live Current Stream"
          subtitle="Real-time current readings (2s interval)"
          icon={<Activity size={16} />}
          action={<RefreshCw size={14} className="text-accent-400 animate-spin-slow" />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="liveCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis unit="A" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="current" name="Current" stroke="#a78bfa" strokeWidth={2} fill="url(#liveCurrent)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Live Temperature Stream"
          subtitle="Real-time temperature readings (2s interval)"
          icon={<Thermometer size={16} />}
          action={<RefreshCw size={14} className="text-warning-400 animate-spin-slow" />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="liveTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis unit="°C" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="temperature" name="Temperature" stroke="#f59e0b" strokeWidth={2} fill="url(#liveTemp)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Status summary */}
        <Card
          title="Battery Status Summary"
          subtitle="Current operational state"
          icon={<Battery size={16} />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-base-700/50 bg-base-800/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                  <Battery size={18} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Battery ID</p>
                  <p className="font-mono text-sm font-semibold text-slate-200">{batteryId}</p>
                </div>
              </div>
              <StatusBadge status={reading.status} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-base-700/50 bg-base-800/50 p-4">
                <p className="text-xs text-slate-500 mb-1">Current Cycle</p>
                <p className="stat-value text-xl text-slate-200">{reading.cycle}</p>
              </div>
              <div className="rounded-xl border border-base-700/50 bg-base-800/50 p-4">
                <p className="text-xs text-slate-500 mb-1">SOH</p>
                <p className="stat-value text-xl text-success-400">{reading.soh.toFixed(1)}%</p>
              </div>
            </div>

            <div className="rounded-xl border border-base-700/50 bg-base-800/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Connection Quality</p>
                <span className="text-xs font-medium text-success-400">Excellent</span>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < 5 ? 'bg-success-500' : 'bg-base-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
