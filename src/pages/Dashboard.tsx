import React from 'react';
import { useAuthStore } from '../store/use-auth-store';
import { DistributorDashboard } from '../features/distributor/components/DistributorDashboard';
import { useDashboardData } from '../modules/dashboard/hooks/useDashboardData';

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

  if (user?.role === 'DISTRIBUTOR') {
    return <DistributorDashboard />;
  }

  return (
    <div className="space-y-16 pb-20">
      <HeroSection />
      
      <CategoryCarousel />

      <WholesaleDeals 
        deals={deals.data} 
        onQuickAdd={(p) => console.log('Quick add:', p.name)}
      />

      <div className="grid lg:grid-cols-2 gap-12">
         <SupplierSection 
            suppliers={suppliers.data} 
         />

         <div className="space-y-12">
            <AnalyticsOverview />
            <PremiumPromo />
         </div>
      </div>
    </div>
  );
}
