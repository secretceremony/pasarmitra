import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { motion, type HTMLMotionProps } from "motion/react";

const surfaceVariants = cva(
  "rounded-[2rem] border transition-all duration-300",
  {
    variants: {
      intent: {
        none: "border-transparent",
        card: "bg-card border-border/50 shadow-xl",
        elevated: "bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl",
        glass: "bg-card/60 backdrop-blur-3xl border-border/50",
        accent: "bg-accent/5 border-accent/20 shadow-xl",
        primary: "bg-primary/5 border-primary/20 shadow-xl",
      },
      hover: {
        none: "",
        scale: "hover:scale-[1.01] hover:shadow-2xl",
        glow: "hover:border-primary/40 hover:shadow-primary/10",
        accentGlow: "hover:border-accent/40 hover:shadow-accent/10",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10",
        hero: "px-16 py-12",
      }
    },
    defaultVariants: {
      intent: "card",
      hover: "none",
      padding: "md",
    },
  }
);

export interface SurfaceProps
  extends Omit<HTMLMotionProps<"div">, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag">,
    VariantProps<typeof surfaceVariants> {
  asChild?: boolean;
}

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, intent, hover, padding, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(surfaceVariants({ intent, hover, padding, className }))}
        {...props}
      />
    );
  }
);

Surface.displayName = "Surface";

export { Surface, surfaceVariants };
