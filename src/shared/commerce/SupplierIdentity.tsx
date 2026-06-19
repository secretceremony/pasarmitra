import * as React from "react";
import { ShieldCheck, MapPin, ShoppingBag } from "lucide-react";
import { cn } from "../../lib/utils";
import { SupplierSummary } from "../../core/types/commerce";
import { ReputationBadge } from "../../components/common/ReputationBadge";

interface SupplierIdentityProps {
  supplier: Partial<SupplierSummary>;
  layout?: "row" | "stack";
  className?: string;
  showReputation?: boolean;
}

export function SupplierIdentity({
  supplier,
  layout = "stack",
  className,
  showReputation = false,
}: SupplierIdentityProps) {
  if (layout === "row") {
    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8", className)}>
        <div className="flex items-center gap-4 sm:gap-8 flex-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent/10 rounded-2xl sm:rounded-[2rem] flex items-center justify-center text-accent font-black text-2xl sm:text-3xl shadow-inner shrink-0">
            {supplier.name?.[0]}
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="font-black text-xl sm:text-2xl tracking-tight break-words">{supplier.name}</h4>
              {supplier.isVerified && (
                <div className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] shrink-0">
                  <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-1">
              {supplier.productCount && (
                <span className="text-xs sm:text-sm text-muted-foreground font-bold flex items-center gap-2">
                  <ShoppingBag size={14} /> {supplier.productCount} Products
                </span>
              )}
              {supplier.location && (
                <span className="text-xs sm:text-sm text-muted-foreground font-bold flex items-center gap-2">
                  <MapPin size={14} /> {supplier.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {showReputation && supplier.reputation && (
          <div className="flex flex-col items-start sm:items-end gap-3 shrink-0 self-start sm:self-auto">
            <ReputationBadge level={supplier.reputation} size="md" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <span className="text-xs font-black text-primary/60 uppercase tracking-[0.2em]">
        {supplier.name}
      </span>
    </div>
  );
}
