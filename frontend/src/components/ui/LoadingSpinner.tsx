import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 size={size} className="animate-spin text-primary-400" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
