import { useEffect, useState } from 'react';

interface GaugeProps {
  value: number;       // 0-100
  label: string;
  size?: number;       // diameter in px
  unit?: string;
  thresholds?: { warning: number; critical: number };
}

export default function Gauge({
  value,
  label,
  size = 180,
  unit = '%',
  thresholds = { warning: 60, critical: 80 },
}: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  // Semi-circle: use half circumference
  const semiCircumference = circumference / 2;
  const progress = (animatedValue / 100) * semiCircumference;
  const dashOffset = semiCircumference - progress;

  // Determine color based on value (higher = healthier for SOH)
  const getColor = () => {
    if (value >= thresholds.critical) return '#10b981'; // success
    if (value >= thresholds.warning) return '#f59e0b'; // warning
    return '#ef4444'; // danger
  };

  const color = getColor();
  const center = size / 2;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 20} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${16} ${center} A ${radius} ${radius} 0 0 1 ${size - 16} ${center}`}
            fill="none"
            stroke="#1a2332"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${16} ${center} A ${radius} ${radius} 0 0 1 ${size - 16} ${center}`}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={semiCircumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.3s ease',
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = Math.PI - (tick / 100) * Math.PI;
            const x1 = center + Math.cos(angle) * (radius - 2);
            const y1 = center - Math.sin(angle) * (radius - 2);
            const x2 = center + Math.cos(angle) * (radius + 6);
            const y2 = center - Math.sin(angle) * (radius + 6);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#2a3649"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Center value */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <span className="stat-value text-4xl" style={{ color }}>
            {value.toFixed(1)}
            <span className="text-lg text-slate-500">{unit}</span>
          </span>
        </div>
      </div>
      <span className="mt-1 text-sm font-medium text-slate-400">{label}</span>
    </div>
  );
}
