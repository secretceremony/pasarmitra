import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { Inventory } from "../../core/types/commerce";

interface InventoryIndicatorProps {
  inventory: Inventory;
  showUnits?: boolean;
  className?: string;
}

export function InventoryIndicator({
  inventory,
  showUnits = true,
  className,
}: InventoryIndicatorProps) {
  const configs = {
    IN_STOCK: {
      label: "In Stock",
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    LOW_STOCK: {
      label: "Low Stock",
      icon: AlertTriangle,
      color: "text-amber-500",
    },
    OUT_OF_STOCK: {
      label: "Out of Stock",
      icon: XCircle,
      color: "text-rose-500",
    },
    PRE_ORDER: {
      label: "Pre-order",
      icon: Clock,
      color: "text-blue-500",
    },
  };

  const config = configs[inventory.status];
  const Icon = config.icon;

  return (
    <div className={cn("text-right", className)}>
      <span className={cn("text-sm font-black flex items-center justify-end gap-1", config.color)}>
        <Icon size={14} /> {config.label}
      </span>
      {showUnits && inventory.unitsLeft !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">{inventory.unitsLeft} units left</p>
      )}
    </div>
  );
}
