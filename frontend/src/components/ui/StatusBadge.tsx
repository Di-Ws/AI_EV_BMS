import type { BatteryStatus, AlertSeverity } from '@/types/battery';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';

const config = {
  healthy: {
    label: 'Healthy',
    icon: CheckCircle2,
    text: 'text-success-400',
    bg: 'bg-success-500/10',
    border: 'border-success-500/30',
    dot: 'bg-success-500',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    text: 'text-warning-400',
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/30',
    dot: 'bg-warning-500',
  },
  critical: {
    label: 'Critical',
    icon: XCircle,
    text: 'text-danger-400',
    bg: 'bg-danger-500/10',
    border: 'border-danger-500/30',
    dot: 'bg-danger-500',
  },
  normal: {
    label: 'Normal',
    icon: Info,
    text: 'text-success-400',
    bg: 'bg-success-500/10',
    border: 'border-success-500/30',
    dot: 'bg-success-500',
  },
};

interface StatusBadgeProps {
  status: BatteryStatus | AlertSeverity;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const cfg = config[status] || config.healthy;
  const Icon = cfg.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-sm px-3 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${cfg.bg} ${cfg.border} ${cfg.text} ${sizeClasses}`}
    >
      {showIcon && <Icon size={iconSize} />}
      {cfg.label}
    </span>
  );
}

export function StatusDot({ status }: { status: BatteryStatus | AlertSeverity }) {
  const cfg = config[status] || config.healthy;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.dot}`}
      />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
    </span>
  );
}
