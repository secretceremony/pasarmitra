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
      <div className={cn("flex items-end justify-between px-2", headerClassName)}>
        <div className={cn("space-y-2 border-l-4 pl-8 py-2", accentBorder)}>
          <h3 className="text-4xl font-black tracking-tighter">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground text-lg font-medium">{subtitle}</p>
          )}
        </div>
        
        {actionLabel && (
          <Button 
            variant="link" 
            onClick={onAction}
            className={cn("font-black flex gap-3 items-center text-xl p-0 hover:gap-4 transition-all", actionText)}
          >
            {actionLabel} <ArrowRight size={24} />
          </Button>
        )}
      </div>

      <motion.div {...FADE_UP}>
        {children}
      </motion.div>
    </section>
  );
}
