import * as React from "react";
import { cn } from "../../lib/utils";
import { Price } from "../../core/types/commerce";

interface PriceDisplayProps {
  price: Price;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function PriceDisplay({
  price,
  size = "md",
  className,
}: PriceDisplayProps) {
  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: 0,
  }).format(price.amount);

  const sizeStyles = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("font-black text-foreground", sizeStyles[size])}>
        {formattedAmount}
      </span>
      {price.minOrder && (
        <span className="text-xs text-muted-foreground font-bold mt-1">
          Min. Order: {price.minOrder}
        </span>
      )}
    </div>
  );
}
