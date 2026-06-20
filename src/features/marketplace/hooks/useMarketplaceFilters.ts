import { useState, useMemo, useCallback, useEffect } from 'react';
import { MarketplaceProduct } from '../types/product.types';
import { inventoryService } from '../../inventory/services/inventoryService';

export function useMarketplaceFilters() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const activeProducts = await inventoryService.getActiveProducts();
      
      const mapped: MarketplaceProduct[] = activeProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        image: p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
        rating: 4.7, // Default rating fallback
        bulk: `${p.min_order_quantity} ${p.unit_type}`,
        unit: p.unit_type,
        distributor: p.distributor_name || 'Distributor',
        distributorId: p.distributor_id,
        stock: p.stock
      }));
      
      setProducts(mapped);
    } catch (err) {
      console.error('Failed to load active marketplace products:', err);
      setError('Gagal memuat produk dari Firestore');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            (p.distributor || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory('All');
  }, []);

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    products,
    filteredProducts,
    isLoading,
    error,
    resetFilters,
    refetch: fetchActiveProducts
  };
}
