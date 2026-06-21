import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface EmptyStateCTA {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  /** Lucide icon component to render */
  icon: LucideIcon;
  /** Bold title text */
  title: string;
  /** Softer descriptive text */
  description?: string;
  /** Optional call-to-action */
  cta?: EmptyStateCTA;
  /**
   * `compact` — no card wrapper, minimal padding; for use inside <td colSpan> cells.
   * `default` — full dashed-border card with generous padding.
   */
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Reusable empty state component.
 * Use `variant="compact"` inside table `<td>` cells.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'gap-3 py-16 px-4' : 'gap-5 py-16 px-6',
        !isCompact &&
          'bg-card border border-dashed border-border/60 rounded-[2.5rem] shadow-sm',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl',
          isCompact
            ? 'w-14 h-14 bg-muted/40 text-muted-foreground/40'
            : 'w-16 h-16 bg-muted/50 text-muted-foreground/50'
        )}
      >
        <Icon size={isCompact ? 26 : 30} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="space-y-1.5 max-w-xs">
        <p
          className={cn(
            'font-black tracking-tight text-foreground',
            isCompact ? 'text-sm' : 'text-base'
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              'font-medium leading-relaxed text-muted-foreground',
              isCompact ? 'text-xs' : 'text-sm'
            )}
          >
            {description}
          </p>
        )}
      </div>

      {/* CTA */}
      {cta && (
        cta.href ? (
          <Link
            to={cta.href}
            className="inline-flex items-center justify-center h-10 rounded-xl border border-primary text-primary font-black uppercase tracking-wider text-xs px-6 hover:bg-primary hover:text-primary-foreground transition-all select-none"
            onClick={cta.onClick}
          >
            {cta.label}
          </Link>
        ) : (
          <Button
            variant="outline"
            className="h-10 rounded-xl border-primary text-primary font-black uppercase tracking-wider text-xs px-6 hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={cta.onClick}
          >
            {cta.label}
          </Button>
        )
      )}
    </motion.div>
  );

  return content;
}
