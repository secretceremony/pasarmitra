import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/use-auth-store';
import { DistributorDashboard } from '../features/distributor/components/DistributorDashboard';
import { useDashboardData } from '../modules/dashboard/hooks/useDashboardData';
import { useMarketplaceCart } from '../features/marketplace/hooks/useMarketplaceCart';
import { ProductDetailsModal } from '../components/common/ProductDetailsModal';

// Modular Sections
import { HeroSection } from '../modules/dashboard/components/HeroSection';
import { CategoryCarousel } from '../modules/dashboard/components/CategoryCarousel';
import { WholesaleDeals } from '../modules/dashboard/components/WholesaleDeals';
import { SupplierSection } from '../modules/dashboard/components/SupplierSection';
import { AnalyticsOverview } from '../modules/dashboard/components/AnalyticsOverview';
import { PremiumPromo } from '../modules/dashboard/components/PremiumPromo';

/**
 * Dashboard Orchestrator
 * High-level layout and role-based routing.
 * Below 100 lines.
 */
export default function Dashboard() {
  const { user } = useAuthStore();
  const { deals, suppliers } = useDashboardData();
  const { handleQuickAdd } = useMarketplaceCart();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (user?.role === 'DISTRIBUTOR') {
    return <DistributorDashboard />;
  }

  return (
    <div className="space-y-16 pb-20">
      <HeroSection />
      
      <CategoryCarousel />
 
      <WholesaleDeals 
        deals={deals.data} 
        onQuickAdd={handleQuickAdd}
        onViewAll={() => navigate('/marketplace')}
        onViewDetails={(prod) => {
          setSelectedProduct(prod);
          setIsDetailsOpen(true);
        }}
      />
 
      <div id="verified-suppliers-section" className="grid lg:grid-cols-2 gap-12 scroll-mt-20">
         <SupplierSection 
            suppliers={suppliers.data} 
            onViewDirectory={() => navigate('/marketplace')}
         />
 
         <div className="space-y-12">
            <AnalyticsOverview />
            <PremiumPromo />
         </div>
      </div>

      <ProductDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddToCart={handleQuickAdd}
      />
    </div>
  );
}

