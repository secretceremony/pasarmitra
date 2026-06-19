import { useState, useMemo, useCallback } from 'react';
import { MarketplaceProduct } from '../types/product.types';
import { PRODUCTS } from '../data/products';

export function useMarketplaceFilters() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory('All');
  }, []);

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    filteredProducts,
    resetFilters
  };
}
