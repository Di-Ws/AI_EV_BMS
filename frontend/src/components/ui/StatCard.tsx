import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  iconBg?: string;
  trend?: number; // percentage change
  trendLabel?: string;
  statusColor?: 'success' | 'warning' | 'danger' | 'primary' | 'neutral';
  children?: ReactNode;
}

const colorMap = {
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
  primary: 'text-primary-400',
  neutral: 'text-slate-400',
};

export default function StatCard({
  title,
  value,
  unit,
  icon,
  iconBg = 'bg-primary-500/10 text-primary-400',
  trend,
  trendLabel,
  statusColor = 'neutral',
  children,
}: StatCardProps) {
  const valueColor = colorMap[statusColor];
  const isPositiveTrend = trend !== undefined && trend > 0;
  const isNegativeTrend = trend !== undefined && trend < 0;
  const TrendIcon = isPositiveTrend ? TrendingUp : isNegativeTrend ? TrendingDown : Minus;

  return (
    <div className="card card-hover p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-slate-400">{title}</span>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={`stat-value text-3xl ${valueColor}`}>{value}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className="mt-2 flex items-center gap-2">
          {trend !== undefined && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                isPositiveTrend
                  ? 'text-success-400'
                  : isNegativeTrend
                  ? 'text-danger-400'
                  : 'text-slate-500'
              }`}
            >
              <TrendIcon size={12} />
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {trendLabel && <span className="text-xs text-slate-500">{trendLabel}</span>}
        </div>
      )}

      {children}
    </div>
  );
}
