import * as React from "react";
import { MarketplaceSection } from "../../../shared/commerce/MarketplaceSection";
import { SupplierIdentity } from "../../../shared/commerce/SupplierIdentity";
import { Surface } from "../../../shared/ui/Surface";
import { SupplierSummary } from "../../../core/types/commerce";

interface SupplierSectionProps {
  suppliers: SupplierSummary[];
  onViewDirectory?: () => void;
}

export function SupplierSection({
  suppliers,
  onViewDirectory,
}: SupplierSectionProps) {
  return (
    <MarketplaceSection
      title="Verified Suppliers"
      actionLabel="Full Directory"
      onAction={onViewDirectory}
      accentColor="accent"
    >
      <div className="space-y-6">
        {suppliers.map((dist) => (
          <Surface
            key={dist.id}
            intent="card"
            hover="accentGlow"
            padding="lg"
            className="group border-l-8 border-l-transparent hover:border-l-accent"
          >
            <SupplierIdentity 
              supplier={dist} 
              layout="row" 
              showReputation 
            />
          </Surface>
        ))}
      </div>
    </MarketplaceSection>
  );
}
