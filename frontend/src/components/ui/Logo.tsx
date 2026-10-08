import { BatteryCharging } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { icon: 20, text: 'text-base', sub: 'text-[10px]' },
  md: { icon: 28, text: 'text-xl', sub: 'text-xs' },
  lg: { icon: 36, text: 'text-2xl', sub: 'text-sm' },
};

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/10 border border-primary-500/30">
        <BatteryCharging size={s.icon} className="text-primary-400" />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success-500 ring-2 ring-base-900 animate-pulse" />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold text-slate-100 ${s.text}`}>
            EV<span className="text-primary-400">Battery</span>
          </span>
          <span className={`font-medium text-slate-500 ${s.sub}`}>
            Health Monitoring System
          </span>
        </div>
      )}
    </div>
  );
}
