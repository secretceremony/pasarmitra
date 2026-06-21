import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MarketplaceProduct } from '../types/product.types';
import { inventoryService } from '../../inventory/services/inventoryService';
import { CATEGORIES } from '../data/categories';

export function useMarketplaceFilters() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const categoryParam = queryParams.get('category');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state from query parameters on load/change
  useEffect(() => {
    if (categoryParam) {
      const decoded = decodeURIComponent(categoryParam);
      const isValid = (CATEGORIES as readonly string[]).includes(decoded);
      if (isValid) {
        setSelectedCategory(decoded);
      } else {
        setSelectedCategory('All');
      }
    } else {
      setSelectedCategory('All');
    }
  }, [categoryParam]);

  // Set category and update URL param reactively
  const handleSetSelectedCategory = useCallback((newCat: string) => {
    setSelectedCategory(newCat);
    const params = new URLSearchParams(location.search);
    if (newCat === 'All') {
      params.delete('category');
    } else {
      params.set('category', newCat);
    }
    navigate({ search: params.toString() }, { replace: true });
  }, [location.search, navigate]);

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
        image: p.image_url || '/assets/fallback-product.png',
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
    handleSetSelectedCategory('All');
  }, [handleSetSelectedCategory]);

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory: handleSetSelectedCategory,
    products,
    filteredProducts,
    isLoading,
    error,
    resetFilters,
    refetch: fetchActiveProducts
  };
}

