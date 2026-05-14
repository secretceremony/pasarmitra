import { cn } from '../../lib/utils';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'danger';

interface StatusBadgeProps {
  label: string;
  type?: StatusType;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ label, type = 'neutral', className, dot = true }: StatusBadgeProps) {
  const variants: Record<StatusType, string> = {
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    neutral: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    danger: 'bg-red-900 text-red-200 border-red-600',
  };

  const dotVariants: Record<StatusType, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-500',
    danger: 'bg-red-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
      variants[type],
      className
    )}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotVariants[type])} />}
      {label}
    </span>
  );
}
