import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Base pulse wrapper ────────────────────────────────────────
const Pulse = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-xl bg-muted/40', className)} />
);

// ── SkeletonCard ─────────────────────────────────────────────
// A card-shaped shimmer placeholder.
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'bg-card border border-border/40 rounded-3xl p-6 space-y-4 overflow-hidden',
      className
    )}
  >
    <div className="flex items-center gap-4">
      <Pulse className="w-12 h-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-3/4" />
        <Pulse className="h-3 w-1/2" />
      </div>
    </div>
    <Pulse className="h-3 w-full" />
    <Pulse className="h-3 w-5/6" />
  </div>
);

// ── SkeletonRow ───────────────────────────────────────────────
// A single-row list item placeholder.
export const SkeletonRow = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'flex items-center gap-4 p-4 bg-muted/10 border border-border/30 rounded-2xl',
      className
    )}
  >
    <Pulse className="w-10 h-10 shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <Pulse className="h-3.5 w-1/2" />
      <Pulse className="h-2.5 w-1/3" />
    </div>
    <Pulse className="h-6 w-16 shrink-0" />
  </div>
);

// ── SkeletonText ──────────────────────────────────────────────
// A short text-line placeholder.
export const SkeletonText = ({
  width = 'w-32',
  className,
}: {
  width?: string;
  className?: string;
}) => <Pulse className={cn('h-4', width, className)} />;

// ── PageLoader ────────────────────────────────────────────────
// Full-page centered spinner for blocking loads.
export const PageLoader = ({
  label = 'Memuat data...',
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-4 py-32 text-muted-foreground',
      className
    )}
  >
    <Loader2 className="animate-spin text-primary" size={36} />
    <p className="text-xs font-black uppercase tracking-widest">{label}</p>
  </div>
);
