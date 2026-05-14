import { useQuery } from '@tanstack/react-query';
import { dashboardAdapters } from '../../../core/adapters/dashboard';
import { dashboardSelectors } from '../selectors';

/**
 * Mock data representing what might come from an API.
 * In a real scenario, this would be fetched via axios/fetch/supabase.
 */
const MOCK_RAW_DEALS = [
  { id: 1, name: 'Minyak Goreng SunCo 2L', price: 'Rp 32.500', stock: 1240, minOrder: '1 Box', distributor: 'PT. Salim Ivomas', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400', discount: '-15%' },
  { id: 2, name: 'Beras Pandan Wangi 25kg', price: 'Rp 345.000', stock: 85, minOrder: '5 Sacks', distributor: 'Mitra Tani Sejahtera', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400', discount: 'HOT' },
  { id: 3, name: 'Kopi Kapal Api Mix 1 Dus', price: 'Rp 142.000', stock: 560, minOrder: '10 Dus', distributor: 'Santos Jaya Abadi', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=400', discount: '-5%' },
  { id: 4, name: 'Gula Pasir Gulaku 1kg', price: 'Rp 16.200', stock: 2100, minOrder: '1 Karton', distributor: 'Sugar Group Companies', image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&q=80&w=400', discount: '-10%' },
];

const MOCK_RAW_SUPPLIERS = [
  { id: 1, name: 'PT. Indofood Sukses Makmur', location: 'Jakarta Utara', rating: 4.9, products: '2,400+', verified: true },
  { id: 2, name: 'Wings Group Indonesia', location: 'Surabaya', rating: 4.8, products: '1,800+', verified: true },
  { id: 3, name: 'Mayora Indah Tbk', location: 'Tangerang', rating: 4.7, products: '900+', verified: true },
];

/**
 * Hook to fetch and prepare dashboard data.
 * Leverages adapters for normalization and selectors for specific views.
 */
export function useDashboardData() {
  const dealsQuery = useQuery({
    queryKey: ['dashboard', 'deals'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_RAW_DEALS.map(dashboardAdapters.toProductSummary);
    }
  });

  const suppliersQuery = useQuery({
    queryKey: ['dashboard', 'suppliers'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_RAW_SUPPLIERS.map(dashboardAdapters.toSupplierSummary);
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
