import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BarChart3, TrendingUp, Zap, Thermometer, Activity, Cpu } from 'lucide-react';
import { getAnalyticsData } from '@/services/batteryApi';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { THRESHOLDS } from '@/services/batteryApi';

interface Props {
  batteryId: string;
}

export default function AnalyticsPage({ batteryId }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAnalyticsData(batteryId).then((d) => {
      // Sample every 5th cycle for chart readability
      setData(d.filter((_, i) => i % 5 === 0));
      setLoading(false);
    });
  }, [batteryId]);

  if (loading) {
    return <LoadingSpinner label="Loading analytics data..." />;
  }

  const chartData = data;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="card p-5 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
            <BarChart3 size={20} className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Battery Health Analytics</h2>
            <p className="text-xs text-slate-500">
              Degradation trends and AI prediction accuracy for {batteryId}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Cycles', value: data.length * 5, icon: <TrendingUp size={14} /> },
            { label: 'Avg Voltage', value: `${(chartData.reduce((s, d) => s + d.voltage, 0) / chartData.length).toFixed(2)}V`, icon: <Zap size={14} /> },
            { label: 'Avg Temperature', value: `${(chartData.reduce((s, d) => s + d.temperature, 0) / chartData.length).toFixed(1)}°C`, icon: <Thermometer size={14} /> },
            { label: 'Data Points', value: chartData.length, icon: <Activity size={14} /> },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                {stat.icon}
                {stat.label}
              </div>
              <span className="stat-value text-lg text-slate-200">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* SOH vs Cycle */}
        <Card
          title="SOH vs Cycle"
          subtitle="State of Health degradation over charge cycles"
          icon={<TrendingUp size={16} />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sohGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[40, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <ReferenceLine y={THRESHOLDS.soh.healthy} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Healthy', fill: '#10b981', fontSize: 10 }} />
              <ReferenceLine y={THRESHOLDS.soh.warning} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="soh"
                name="SOH"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#sohGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Predicted vs Actual SOH */}
        <Card
          title="Predicted SOH vs Actual SOH"
          subtitle="AI model prediction accuracy comparison"
          icon={<Cpu size={16} />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[40, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line type="monotone" dataKey="soh" name="Actual SOH" stroke="#00a8e8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="predicted_soh" name="Predicted SOH" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Voltage vs Cycle */}
        <Card
          title="Voltage vs Cycle"
          subtitle="Cell voltage trends across charge cycles"
          icon={<Zap size={16} />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00a8e8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00a8e8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[3.0, 4.2]} unit="V" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <ReferenceLine y={THRESHOLDS.voltage.nominal} stroke="#2a3649" strokeDasharray="3 3" label={{ value: 'Nominal', fill: '#64748b', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="voltage"
                name="Voltage"
                stroke="#00a8e8"
                strokeWidth={2}
                fill="url(#voltageGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Temperature vs Cycle */}
        <Card
          title="Temperature vs Cycle"
          subtitle="Operating temperature over charge cycles"
          icon={<Thermometer size={16} />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="°C" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <ReferenceLine y={THRESHOLDS.temperature.warning} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={THRESHOLDS.temperature.critical} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="temperature"
                name="Temperature"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#tempGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Current vs Cycle — full width */}
        <Card
          title="Current vs Cycle"
          subtitle="Charge/discharge current patterns over cycles"
          icon={<Activity size={16} />}
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="A" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <ReferenceLine y={THRESHOLDS.current.nominal} stroke="#2a3649" strokeDasharray="3 3" label={{ value: 'Nominal', fill: '#64748b', fontSize: 10 }} />
              <ReferenceLine y={THRESHOLDS.current.max} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="current" name="Current" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
