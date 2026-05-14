import { Star, ShieldCheck, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ReputationLevel = 'trusted' | 'neutral' | 'risky' | 'elite';

interface ReputationBadgeProps {
  level?: ReputationLevel;
  score?: number;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  verifications?: number; // Legacy support
}

export function ReputationBadge({ 
  level, 
  score,
  label,
  className,
  size = 'md',
  verifications
}: ReputationBadgeProps) {
  
  // Determine level from score if level is not provided
  let effectiveLevel: ReputationLevel = level || 'neutral';
  if (!level && typeof score === 'number') {
    if (score >= 4.8) effectiveLevel = 'elite';
    else if (score >= 4.0) effectiveLevel = 'trusted';
    else if (score >= 2.5) effectiveLevel = 'neutral';
    else effectiveLevel = 'risky';
  }
  
  const configs: Record<ReputationLevel, { icon: any, color: string, bg: string, border: string, text: string }> = {
    elite: {
      icon: Award,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-600'
    },
    trusted: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-600'
    },
    neutral: {
      icon: ShieldCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-600'
    },
    risky: {
      icon: AlertTriangle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-600'
    }
  };

  const config = configs[effectiveLevel];
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-black uppercase tracking-widest text-[10px]",
      config.bg,
      config.border,
      config.text,
      size === 'sm' && "px-2 py-1 gap-1 text-[8px]",
      size === 'lg' && "px-4 py-2 gap-3 text-xs",
      className
    )}>
      <Icon size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16} className={config.color} />
      <div className="flex items-center gap-1">
        <span>{label || (typeof score === 'number' ? score.toFixed(1) : effectiveLevel)}</span>
        {verifications && verifications > 0 && effectiveLevel !== 'risky' && (
          <ShieldCheck size={size === 'sm' ? 10 : 12} className="text-primary ml-1" />
        )}
      </div>
    </div>
  );
}

