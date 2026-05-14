import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  description?: string;
  className?: string;
  isLoading?: boolean;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  isLoading
}) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "p-6 bg-card border rounded-3xl shadow-sm relative overflow-hidden group transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon size={24} />
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full",
            trend.isUp ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
          )}>
            {trend.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      <div className="space-y-1 relative z-10">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <h3 className="text-3xl font-bold tracking-tight">
          {isLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
          ) : (
            value
          )}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </div>

      {/* Decorative background circle */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </motion.div>
  );
}
