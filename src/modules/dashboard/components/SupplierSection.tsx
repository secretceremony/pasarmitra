import * as React from "react";
import { MarketplaceSection } from "../../../shared/commerce/MarketplaceSection";
import { SupplierIdentity } from "../../../shared/commerce/SupplierIdentity";
import { Surface } from "../../../shared/ui/Surface";
import { SupplierSummary } from "../../../core/types/commerce";
import { Link } from "react-router-dom";

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
          <Link to={`/distributor/${dist.id}`} key={dist.id} className="block hover:no-underline">
            <Surface
              intent="card"
              hover="accentGlow"
              padding="lg"
              className="group border-l-8 border-l-transparent hover:border-l-accent cursor-pointer"
            >
              <SupplierIdentity 
                supplier={dist} 
                layout="row" 
                showReputation 
              />
            </Surface>
          </Link>
        ))}
      </div>
    </MarketplaceSection>
  );
}

