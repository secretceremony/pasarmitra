import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { dashboardAdapters } from '../../../core/adapters/dashboard';
import { dashboardSelectors } from '../selectors';

/**
 * Hook to fetch and prepare dashboard data from Firestore.
 * Leverages adapters for normalization and selectors for specific views.
 */
export function useDashboardData() {
  const dealsQuery = useQuery({
    queryKey: ['dashboard', 'deals'],
    queryFn: async () => {
      // Fetch active products from Firestore
      const q = query(
        collection(db, 'products'),
        where('is_active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const rawDeals = [];
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const pId = docSnap.id;
        
        // Resolve distributor name
        let distributorName = 'Distributor';
        if (data.distributor_id) {
          try {
            const distSnap = await getDoc(doc(db, 'profiles', data.distributor_id));
            if (distSnap.exists()) {
              const distData = distSnap.data();
              distributorName = distData.organization_name || distData.business_name || distData.full_name || 'Distributor';
            }
          } catch (e) {
            console.error('Error fetching distributor profile:', e);
          }
        }
        
        rawDeals.push({
          id: pId,
          name: data.name || 'Produk Tanpa Nama',
          price: data.price || 0,
          stock: data.stock || 0,
          minOrder: `${data.min_order_quantity || 1} ${data.unit_type || 'Unit'}`,
          distributor: distributorName,
          distributorId: data.distributor_id || '',
          unit: data.unit_type || 'Unit',
          image: data.image_url || '/assets/fallback-product.png',
          discount: data.discount_tag || '',
          description: data.description || '',
          category: data.category || 'Sembako',
          tiered_pricing: data.tiered_pricing || []
        });
      }
      
      return rawDeals.map(dashboardAdapters.toProductSummary);
    }
  });

  const suppliersQuery = useQuery({
    queryKey: ['dashboard', 'suppliers'],
    queryFn: async () => {
      // Query profiles where role is DISTRIBUTOR
      const q = query(
        collection(db, 'profiles'),
        where('role', '==', 'DISTRIBUTOR')
      );
      const querySnapshot = await getDocs(q);
      const rawSuppliers = [];
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const sId = docSnap.id;
        
        // Count products for this distributor
        let productCount = '0+';
        try {
          const prodQ = query(
            collection(db, 'products'),
            where('distributor_id', '==', sId)
          );
          const prodSnap = await getDocs(prodQ);
          productCount = `${prodSnap.size}+`;
        } catch (e) {
          console.error('Error counting products:', e);
        }
        
        rawSuppliers.push({
          id: sId,
          name: data.organization_name || data.business_name || data.full_name || 'Distributor',
          location: data.address || 'Balikpapan, Kalimantan Timur',
          rating: data.reputation_score || 5.0,
          verified: data.is_verified || false,
          products: productCount,
        });
      }
      
      return rawSuppliers.map(dashboardAdapters.toSupplierSummary);
    }
  });

  return {
    deals: {
      data: dealsQuery.data || [],
      isLoading: dealsQuery.isLoading,
      availableDeals: dealsQuery.data ? dashboardSelectors.getAvailableDeals(dealsQuery.data) : [],
      heroDeal: dealsQuery.data ? dashboardSelectors.getHeroDeal(dealsQuery.data) : null,
    },
    suppliers: {
      data: suppliersQuery.data || [],
      isLoading: suppliersQuery.isLoading,
    }
  };
}
