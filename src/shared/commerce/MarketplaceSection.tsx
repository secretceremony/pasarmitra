import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { FADE_UP } from "../../core/animations";

interface MarketplaceSectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  accentColor?: string; // e.g. 'primary', 'accent'
}

export function MarketplaceSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  className,
  headerClassName,
  accentColor = "primary",
}: MarketplaceSectionProps) {
  const accentBorder = accentColor === "primary" ? "border-primary" : "border-accent";
  const actionText = accentColor === "primary" ? "text-primary" : "text-accent";

  return (
    <section className={cn("space-y-10", className)}>
      <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2", headerClassName)}>
        <div className={cn("space-y-2 border-l-4 pl-4 md:pl-8 py-2", accentBorder)}>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg font-medium">{subtitle}</p>
          )}
        </div>
        
        {actionLabel && (
          <Button 
            variant="link" 
            onClick={onAction}
            className={cn("font-black flex gap-2 sm:gap-3 items-center text-sm sm:text-base md:text-xl p-0 hover:gap-4 transition-all w-fit", actionText)}
          >
            {actionLabel} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </Button>
        )}
      </div>

      <motion.div {...FADE_UP}>
        {children}
      </motion.div>
    </section>
  );
}
