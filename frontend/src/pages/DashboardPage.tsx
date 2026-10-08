import { useEffect, useState } from 'react';
import {
  Gauge as GaugeIcon,
  Zap,
  Thermometer,
  Battery,
  RefreshCw,
  TrendingDown,
  Activity,
  ArrowRight,
  Clock,
  Cpu,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { getDashboardData } from '@/services/batteryApi';
import type { DashboardData } from '@/types/battery';
import Gauge from '@/components/ui/Gauge';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import StatusBadge, { StatusDot } from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  batteryId: string;
}

export default function DashboardPage({ batteryId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDashboardData(batteryId).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [batteryId]);

  if (loading || !data) {
    return <LoadingSpinner label="Loading dashboard data..." />;
  }

  const { summary, recent_readings, soh_prediction, alerts } = data;
  const sohColor =
    summary.status === 'healthy'
      ? 'success'
      : summary.status === 'warning'
      ? 'warning'
      : 'danger';

  const recentAlerts = alerts.filter((a) => a.severity !== 'normal').slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Top row: SOH gauge + key metrics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* SOH Gauge */}
        <div className="card card-hover p-6 flex flex-col items-center justify-center animate-slide-up">
          <div className="flex items-center gap-2 self-start mb-2">
            <GaugeIcon size={16} className="text-primary-400" />
            <span className="text-sm font-semibold text-slate-300">Battery Health (SOH)</span>
          </div>
          <Gauge value={summary.soh} label="State of Health" size={200} />
          <div className="mt-4">
            <StatusBadge status={summary.status} />
          </div>
          <div className="mt-4 grid w-full grid-cols-2 gap-3 pt-4 border-t border-base-700/50">
            <div className="text-center">
              <p className="text-xs text-slate-500">Predicted SOH</p>
              <p className="stat-value text-lg text-primary-400 mt-0.5">
                {summary.predicted_soh.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Current Cycle</p>
              <p className="stat-value text-lg text-slate-200 mt-0.5">
                {summary.current_cycle}
              </p>
            </div>
          </div>
        </div>

        {/* Key metrics grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            title="Voltage"
            value={summary.voltage.toFixed(2)}
            unit="V"
            icon={<Zap size={20} />}
            iconBg="bg-primary-500/10 text-primary-400"
            statusColor="primary"
            trend={-0.3}
            trendLabel="vs last cycle"
          />
          <StatCard
            title="Current"
            value={summary.current.toFixed(1)}
            unit="A"
            icon={<Activity size={20} />}
            iconBg="bg-accent-500/10 text-accent-400"
            statusColor="primary"
            trend={2.1}
            trendLabel="vs last cycle"
          />
          <StatCard
            title="Temperature"
            value={summary.temperature.toFixed(1)}
            unit="°C"
            icon={<Thermometer size={20} />}
            iconBg={
              summary.temperature > 35
                ? 'bg-danger-500/10 text-danger-400'
                : 'bg-warning-500/10 text-warning-400'
            }
            statusColor={
              summary.temperature > 35 ? 'danger' : summary.temperature > 30 ? 'warning' : 'neutral'
            }
            trend={1.2}
            trendLabel="vs last cycle"
          />
          <StatCard
            title="Remaining Useful Life"
            value={summary.rul}
            unit="cycles"
            icon={<TrendingDown size={20} />}
            iconBg="bg-success-500/10 text-success-400"
            statusColor="success"
            trend={-0.5}
            trendLabel="degradation rate"
          />
        </div>
      </div>

      {/* SOH Prediction chart + Alert summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* SOH Prediction Chart */}
        <div className="lg:col-span-2">
          <Card
            title="SOH Prediction — Actual vs Predicted"
            subtitle="AI-predicted State of Health over charge cycles"
            icon={<Cpu size={16} />}
            action={
              <Link
                to="/analytics"
                className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300"
              >
                View Analytics <ArrowRight size={12} />
              </Link>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={soh_prediction}>
                <defs>
                  <linearGradient id="actualSoh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00a8e8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00a8e8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predictedSoh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                <XAxis
                  dataKey="cycle"
                  label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis domain={[40, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111820',
                    border: '1px solid #222d3f',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actual_soh"
                  name="Actual SOH"
                  stroke="#00a8e8"
                  strokeWidth={2}
                  fill="url(#actualSoh)"
                />
                <Area
                  type="monotone"
                  dataKey="predicted_soh"
                  name="Predicted SOH"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#predictedSoh)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card
          title="Recent Alerts"
          subtitle="Active warnings across all batteries"
          icon={<RefreshCw size={16} />}
          action={
            <Link
              to="/alerts"
              className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300"
            >
              View All <ArrowRight size={12} />
            </Link>
          }
        >
          <div className="space-y-3">
            {recentAlerts.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <StatusDot status="healthy" />
                <p className="mt-3 text-sm text-slate-400">All systems normal</p>
                <p className="text-xs text-slate-600">No active warnings</p>
              </div>
            )}
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 ${
                  alert.severity === 'critical'
                    ? 'border-danger-500/20 bg-danger-500/5'
                    : 'border-warning-500/20 bg-warning-500/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={alert.severity} />
                    <span className="font-mono text-xs font-medium text-slate-300">
                      {alert.battery_id}
                    </span>
                  </div>
                  <StatusBadge status={alert.severity} size="sm" showIcon={false} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                <p className="mt-1.5 text-[10px] text-slate-600">
                  Cycle {alert.cycle} · {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Readings Table */}
      <Card
        title="Recent Battery Readings"
        subtitle={`Latest 10 readings from ${batteryId}`}
        icon={<Battery size={16} />}
        action={
          <Link
            to="/history"
            className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300"
          >
            Full History <ArrowRight size={12} />
          </Link>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-700/50 text-xs text-slate-500">
                <th className="px-5 py-3 text-left font-medium">Cycle</th>
                <th className="px-5 py-3 text-right font-medium">Voltage (V)</th>
                <th className="px-5 py-3 text-right font-medium">Current (A)</th>
                <th className="px-5 py-3 text-right font-medium">Temp (°C)</th>
                <th className="px-5 py-3 text-right font-medium">SOH (%)</th>
                <th className="px-5 py-3 text-right font-medium">RUL</th>
                <th className="px-5 py-3 text-left font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recent_readings.map((reading, i) => (
                <tr
                  key={`${reading.cycle}-${i}`}
                  className="border-b border-base-700/30 transition-colors hover:bg-base-700/20"
                >
                  <td className="px-5 py-3 font-mono text-slate-300">{reading.cycle}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-200">
                    {reading.voltage.toFixed(3)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-200">
                    {reading.current.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    <span
                      className={
                        reading.temperature > 35
                          ? 'text-danger-400'
                          : reading.temperature > 30
                          ? 'text-warning-400'
                          : 'text-slate-200'
                      }
                    >
                      {reading.temperature.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    <span
                      className={
                        reading.soh >= 80
                          ? 'text-success-400'
                          : reading.soh >= 60
                          ? 'text-warning-400'
                          : 'text-danger-400'
                      }
                    >
                      {reading.soh.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">
                    {reading.rul}
                  </td>
                  <td className="px-5 py-3 text-left text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(reading.timestamp).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
