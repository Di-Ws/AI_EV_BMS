import { useEffect, useState } from 'react';
import {
  Bell,
  Thermometer,
  HeartPulse,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Filter,
} from 'lucide-react';
import { getAlerts } from '@/services/batteryApi';
import type { Alert, AlertSeverity, AlertType } from '@/types/battery';
import Card from '@/components/ui/Card';
import StatusBadge, { StatusDot } from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const alertTypeConfig: Record<AlertType, { icon: typeof Thermometer; label: string }> = {
  high_temperature: { icon: Thermometer, label: 'High Temperature' },
  low_soh: { icon: HeartPulse, label: 'Low SOH' },
  abnormal_voltage: { icon: Zap, label: 'Abnormal Voltage' },
  abnormal_current: { icon: Activity, label: 'Abnormal Current' },
};

const severityFilters: { value: AlertSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All Alerts' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'normal', label: 'Normal' },
];

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m ago`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');

  useEffect(() => {
    getAlerts().then((a) => {
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading alerts..." />;
  }

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    normal: alerts.filter((a) => a.severity === 'normal').length,
  };

  return (
    <div className="space-y-5">
      {/* Alert summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-hover p-5 animate-slide-up border-danger-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-500/10">
                <XCircle size={20} className="text-danger-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Critical Alerts</p>
                <p className="stat-value text-2xl text-danger-400">{counts.critical}</p>
              </div>
            </div>
            <StatusDot status="critical" />
          </div>
        </div>

        <div className="card card-hover p-5 animate-slide-up border-warning-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/10">
                <AlertTriangle size={20} className="text-warning-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Warning Alerts</p>
                <p className="stat-value text-2xl text-warning-400">{counts.warning}</p>
              </div>
            </div>
            <StatusDot status="warning" />
          </div>
        </div>

        <div className="card card-hover p-5 animate-slide-up border-success-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/10">
                <CheckCircle2 size={20} className="text-success-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Normal Status</p>
                <p className="stat-value text-2xl text-success-400">{counts.normal}</p>
              </div>
            </div>
            <StatusDot status="healthy" />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 animate-slide-up">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-400 mr-2">Filter by severity:</span>
          {severityFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                  : 'bg-base-700/40 text-slate-400 border border-transparent hover:bg-base-700/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <div className="flex flex-col items-center py-12 text-center">
              <Info size={32} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">No alerts found for this filter</p>
            </div>
          </Card>
        )}

        {filtered.map((alert, index) => {
          const typeCfg = alertTypeConfig[alert.type];
          const TypeIcon = typeCfg.icon;
          const severityStyles = {
            critical: 'border-danger-500/20 bg-danger-500/5 glow-danger',
            warning: 'border-warning-500/20 bg-warning-500/5 glow-warning',
            normal: 'border-success-500/20 bg-success-500/5',
          };

          return (
            <div
              key={alert.id}
              className={`card p-5 animate-slide-up ${severityStyles[alert.severity]}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Type icon */}
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                    alert.severity === 'critical'
                      ? 'bg-danger-500/10 text-danger-400'
                      : alert.severity === 'warning'
                      ? 'bg-warning-500/10 text-warning-400'
                      : 'bg-success-500/10 text-success-400'
                  }`}
                >
                  <TypeIcon size={20} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-200">
                        {alert.battery_id}
                      </span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">{typeCfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <StatusBadge status={alert.severity} size="sm" />
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>

                  {/* Value vs threshold */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Detected:</span>
                      <span
                        className={`font-mono font-semibold ${
                          alert.severity === 'critical'
                            ? 'text-danger-400'
                            : alert.severity === 'warning'
                            ? 'text-warning-400'
                            : 'text-success-400'
                        }`}
                      >
                        {alert.value.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Threshold:</span>
                      <span className="font-mono text-slate-400">{alert.threshold.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Cycle:</span>
                      <span className="font-mono text-slate-400">{alert.cycle}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Time:</span>
                      <span className="text-slate-400">{formatTimeAgo(alert.timestamp)}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-600 ml-auto">
                      {alert.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
