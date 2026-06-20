import * as React from "react";
import { MarketplaceSection } from "../../../shared/commerce/MarketplaceSection";
import { ProductCard } from "../../../shared/commerce/ProductCard";
import { ProductSummary } from "../../../core/types/commerce";

interface WholesaleDealsProps {
  deals: ProductSummary[];
  onQuickAdd?: (product: ProductSummary) => void;
  onViewAll?: () => void;
  onViewDetails?: (product: ProductSummary) => void;
}

export function WholesaleDeals({
  deals,
  onQuickAdd,
  onViewAll,
  onViewDetails,
}: WholesaleDealsProps) {
  return (
    <MarketplaceSection
      title="Wholesale Deals"
      subtitle="Limited stock wholesale pricing for verified partners."
      actionLabel="View All Deals"
      onAction={onViewAll}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {deals.map((deal) => (
          <ProductCard
            key={deal.id}
            product={deal}
            onQuickAdd={onQuickAdd}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </MarketplaceSection>
  );
}
