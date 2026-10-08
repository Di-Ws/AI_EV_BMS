import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  History,
  TrendingUp,
  Zap,
  Thermometer,
  Activity,
  Gauge as GaugeIcon,
  Filter,
  Search,
  Calendar,
} from 'lucide-react';
import { getHistory, getBatteryIds } from '@/services/batteryApi';
import type { BatteryReading } from '@/types/battery';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  batteryId: string;
  batteryIds: string[];
}

export default function HistoryPage({ batteryId, batteryIds }: Props) {
  const [data, setData] = useState<BatteryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBattery, setSelectedBattery] = useState(batteryId);
  const [cycleStart, setCycleStart] = useState(1);
  const [cycleEnd, setCycleEnd] = useState(500);
  const [allBatteryIds, setAllBatteryIds] = useState<string[]>(batteryIds);

  useEffect(() => {
    if (batteryIds.length === 0) {
      getBatteryIds().then(setAllBatteryIds);
    } else {
      setAllBatteryIds(batteryIds);
    }
  }, [batteryIds]);

  const fetchData = async () => {
    setLoading(true);
    const history = await getHistory(selectedBattery, cycleStart, cycleEnd);
    // Sample for chart readability
    setData(history.filter((_, i) => i % Math.max(1, Math.floor(history.length / 100)) === 0));
    setLoading(false);
  };

  useEffect(() => {
    setSelectedBattery(batteryId);
  }, [batteryId]);

  useEffect(() => {
    fetchData();
  }, [selectedBattery, cycleStart, cycleEnd]);

  if (loading) {
    return <LoadingSpinner label="Loading battery history..." />;
  }

  const stats = {
    totalCycles: data.length,
    avgSoh: (data.reduce((s, d) => s + d.soh, 0) / (data.length || 1)).toFixed(1),
    avgVoltage: (data.reduce((s, d) => s + d.voltage, 0) / (data.length || 1)).toFixed(2),
    avgTemp: (data.reduce((s, d) => s + d.temperature, 0) / (data.length || 1)).toFixed(1),
    avgCurrent: (data.reduce((s, d) => s + d.current, 0) / (data.length || 1)).toFixed(1),
    avgRul: Math.round(data.reduce((s, d) => s + d.rul, 0) / (data.length || 1)),
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card p-5 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-primary-400" />
          <h2 className="text-sm font-semibold text-slate-200">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Battery ID */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Battery ID</label>
            <select
              value={selectedBattery}
              onChange={(e) => setSelectedBattery(e.target.value)}
              className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-primary-500/50"
            >
              {allBatteryIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* Cycle Start */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Cycle Start</label>
            <input
              type="number"
              min={1}
              max={cycleEnd}
              value={cycleStart}
              onChange={(e) => setCycleStart(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-primary-500/50"
            />
          </div>

          {/* Cycle End */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Cycle End</label>
            <input
              type="number"
              min={cycleStart}
              value={cycleEnd}
              onChange={(e) => setCycleEnd(parseInt(e.target.value) || 500)}
              className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-primary-500/50"
            />
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Cycles', value: stats.totalCycles, icon: <Calendar size={14} />, color: 'text-primary-400' },
          { label: 'Avg SOH', value: `${stats.avgSoh}%`, icon: <GaugeIcon size={14} />, color: 'text-success-400' },
          { label: 'Avg Voltage', value: `${stats.avgVoltage}V`, icon: <Zap size={14} />, color: 'text-primary-400' },
          { label: 'Avg Temp', value: `${stats.avgTemp}°C`, icon: <Thermometer size={14} />, color: 'text-warning-400' },
          { label: 'Avg Current', value: `${stats.avgCurrent}A`, icon: <Activity size={14} />, color: 'text-accent-400' },
          { label: 'Avg RUL', value: stats.avgRul, icon: <TrendingUp size={14} />, color: 'text-success-400' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 animate-slide-up">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              {stat.icon}
              {stat.label}
            </div>
            <p className={`stat-value text-lg ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* History charts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* SOH History */}
        <Card
          title="SOH History"
          subtitle={`State of Health over cycles ${cycleStart}–${cycleEnd}`}
          icon={<GaugeIcon size={16} />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="histSoh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[40, 100]} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }} labelStyle={{ color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="soh" name="SOH" stroke="#10b981" strokeWidth={2} fill="url(#histSoh)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* RUL History */}
        <Card
          title="RUL History"
          subtitle="Remaining Useful Life over cycles"
          icon={<TrendingUp size={16} />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="histRul" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00a8e8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00a8e8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis unit=" cyc" />
              <Tooltip contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }} labelStyle={{ color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="rul" name="RUL" stroke="#00a8e8" strokeWidth={2} fill="url(#histRul)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Voltage History */}
        <Card
          title="Voltage History"
          subtitle="Cell voltage over selected cycles"
          icon={<Zap size={16} />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[3.0, 4.2]} unit="V" />
              <Tooltip contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }} labelStyle={{ color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="voltage" name="Voltage" stroke="#00a8e8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Temperature History */}
        <Card
          title="Temperature History"
          subtitle="Operating temperature over selected cycles"
          icon={<Thermometer size={16} />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="histTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="°C" />
              <Tooltip contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }} labelStyle={{ color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="temperature" name="Temperature" stroke="#f59e0b" strokeWidth={2} fill="url(#histTemp)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Current History */}
        <Card
          title="Current History"
          subtitle="Charge/discharge current over selected cycles"
          icon={<Activity size={16} />}
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
              <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis unit="A" />
              <Tooltip contentStyle={{ backgroundColor: '#111820', border: '1px solid #222d3f', borderRadius: '12px' }} labelStyle={{ color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="current" name="Current" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Data table */}
      <Card
        title="Historical Data Records"
        subtitle={`${data.length} readings from ${selectedBattery}`}
        icon={<History size={16} />}
        noPadding
      >
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-base-800">
              <tr className="border-b border-base-700/50 text-xs text-slate-500">
                <th className="px-5 py-3 text-left font-medium">Cycle</th>
                <th className="px-5 py-3 text-right font-medium">Voltage (V)</th>
                <th className="px-5 py-3 text-right font-medium">Current (A)</th>
                <th className="px-5 py-3 text-right font-medium">Temp (°C)</th>
                <th className="px-5 py-3 text-right font-medium">Capacity (Ah)</th>
                <th className="px-5 py-3 text-right font-medium">SOH (%)</th>
                <th className="px-5 py-3 text-right font-medium">RUL</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((reading, i) => (
                <tr key={`${reading.cycle}-${i}`} className="border-b border-base-700/30 hover:bg-base-700/20 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-slate-300">{reading.cycle}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-200">{reading.voltage.toFixed(3)}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-200">{reading.current.toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-200">{reading.temperature.toFixed(1)}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-200">{reading.capacity.toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    <span className={reading.soh >= 80 ? 'text-success-400' : reading.soh >= 60 ? 'text-warning-400' : 'text-danger-400'}>
                      {reading.soh.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-300">{reading.rul}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
