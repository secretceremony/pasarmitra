import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../features/marketplace/data/categories';
import { useMarketplaceFilters } from '../features/marketplace/hooks/useMarketplaceFilters';
import { useMarketplaceCart } from '../features/marketplace/hooks/useMarketplaceCart';
import {
  MarketplaceHeroBanner,
  MarketplaceToolbar,
  MarketplaceResultsHeader,
  MarketplaceGrid,
  MarketplaceEmptyState
} from '../features/marketplace/components';

export default function Marketplace() {
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const { 
    search, 
    setSearch, 
    selectedCategory, 
    setSelectedCategory, 
    filteredProducts 
  } = useMarketplaceFilters();

  const { handleAddToCart } = useMarketplaceCart();

  const handleDistributorClick = (distributorId: string) => {
    navigate(`/distributor/${distributorId}`);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
  };

  return (
    <div className="space-y-12">
      <MarketplaceHeroBanner />

      <MarketplaceToolbar 
        search={search}
        onSearchChange={setSearch}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {filteredProducts.length > 0 ? (
        <div className="space-y-10">
          <MarketplaceResultsHeader count={filteredProducts.length} />
          <MarketplaceGrid 
            products={filteredProducts}
            onAddToCart={handleAddToCart}
            onViewDistributor={handleDistributorClick}
          />
        </div>
      ) : (
        <MarketplaceEmptyState onReset={handleResetFilters} />
      )}
    </div>
  );
}
