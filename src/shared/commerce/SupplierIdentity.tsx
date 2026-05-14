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
      <div className={cn("flex items-center gap-8", className)}>
        <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center text-accent font-black text-3xl shadow-inner">
          {supplier.name?.[0]}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h4 className="font-black text-2xl tracking-tight">{supplier.name}</h4>
            {supplier.isVerified && (
              <div className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                <ShieldCheck size={24} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-6 pt-1">
            {supplier.productCount && (
              <span className="text-sm text-muted-foreground font-bold flex items-center gap-2">
                <ShoppingBag size={14} /> {supplier.productCount} Products
              </span>
            )}
            {supplier.location && (
              <span className="text-sm text-muted-foreground font-bold flex items-center gap-2">
                <MapPin size={14} /> {supplier.location}
              </span>
            )}
          </div>
        </div>
        {showReputation && supplier.reputation && (
          <div className="flex flex-col items-end gap-3">
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
