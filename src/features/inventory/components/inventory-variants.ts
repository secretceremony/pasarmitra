import { cva } from 'class-variance-authority';

export const inventoryStatusBadgeVariants = cva(
  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit transition-colors",
  {
    variants: {
      intent: {
        success: "bg-emerald-500/10 text-emerald-500",
        warning: "bg-amber-500/10 text-amber-500",
        error: "bg-rose-500/10 text-rose-500",
        neutral: "bg-slate-500/10 text-slate-500",
        unknown: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      intent: "neutral",
    },
  }
);

export const stockIndicatorVariants = cva(
  "h-full rounded-full transition-all",
  {
    variants: {
      stockLevel: {
        good: "bg-primary w-[70%]",
        low: "bg-amber-500 w-[20%]",
        out: "bg-rose-500 w-[5%]",
      },
    },
    defaultVariants: {
      stockLevel: "good",
    },
  }
);

export const stockTextVariants = cva(
  "text-[10px] font-black transition-colors",
  {
    variants: {
      stockLevel: {
        good: "text-primary",
        low: "text-amber-500",
        out: "text-rose-500",
      },
    },
    defaultVariants: {
      stockLevel: "good",
    },
  }
);
