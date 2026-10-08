import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
  noPadding = false,
}: CardProps) {
  return (
    <div className={`card card-hover animate-slide-up ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-base-700/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-primary-400">{icon}</span>}
            <div>
              {title && <h3 className="text-sm font-semibold text-slate-200">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
