import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, MapPin, Star, ExternalLink, Search, X, Building2 } from 'lucide-react';
import { CATEGORIES, DISTRIBUTOR_TYPES, LOCATIONS } from '../features/marketplace/data/categories';
import { useMarketplaceFilters } from '../features/marketplace/hooks/useMarketplaceFilters';
import { useMarketplaceCart } from '../features/marketplace/hooks/useMarketplaceCart';
import { useAuthStore } from '../store/use-auth-store';
import { NegotiationModal } from '../features/partners/components/NegotiationModal';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  MarketplaceToolbar,
  MarketplaceResultsHeader,
  MarketplaceGrid,
  MarketplaceEmptyState
} from '../features/marketplace/components';
import { HeroSection } from '../modules/dashboard/components/HeroSection';
import { Pagination } from '../components/common/Pagination';
import { useEffect } from 'react';

export default function Marketplace() {
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedNegotiateProduct, setSelectedNegotiateProduct] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    search, 
    setSearch, 
    selectedCategory, 
    setSelectedCategory, 
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    selectedLocation,
    setSelectedLocation,
    selectedDistributorType,
    setSelectedDistributorType,
    verifiedOnly,
    setVerifiedOnly,
    minRating,
    setMinRating,
    sortBy,
    setSortBy,
    filteredProducts,
    products,
    isLoading,
    resetFilters
  } = useMarketplaceFilters();

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedCategory,
    minPrice,
    maxPrice,
    selectedLocation,
    selectedDistributorType,
    verifiedOnly,
    minRating,
    sortBy
  ]);

  const { handleAddToCart } = useMarketplaceCart();

  const handleDistributorClick = (distributorId: string) => {
    navigate(`/distributor/${distributorId}`);
  };

  const handleResetFilters = () => {
    resetFilters();
  };

  return (
    <div className="space-y-6 sm:space-y-12 w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer text-left"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Marketplace</span>
      </div>

      <HeroSection onViewSuppliers={() => navigate('/umkm/distributors')} />

      <div id="marketplace-toolbar" className="scroll-mt-24 w-full space-y-4">
        <MarketplaceToolbar 
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
            {/* Price Filter */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Rentang Harga (Rp)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full h-11 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Lokasi Distributor</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-11 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary cursor-pointer"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === 'All' ? 'Semua Wilayah' : loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Distributor Type Filter */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Jenis Distributor</label>
              <select
                value={selectedDistributorType}
                onChange={(e) => setSelectedDistributorType(e.target.value)}
                className="w-full h-11 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary cursor-pointer"
              >
                {DISTRIBUTOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'Semua Jenis' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating & Verified Toggles */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Rating Minimum</label>
                <div className="flex gap-2">
                  {[0, 4.0, 4.5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setMinRating(rating)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
                        minRating === rating 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {rating === 0 ? 'Semua' : `${rating} ★`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-between">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  Hanya Terverifikasi
                </label>
                
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center text-center space-y-4 bg-card border border-dashed rounded-[4rem] shadow-sm">
           <Loader2 className="animate-spin text-primary" size={40} />
           <p className="text-muted-foreground font-black text-xs uppercase tracking-widest">Memuat produk marketplace...</p>
        </div>
      ) : products.length === 0 ? (
        <MarketplaceEmptyState 
          title="Belum ada produk aktif."
          description="Produk distributor akan muncul setelah disetujui oleh admin."
          showButton={false}
        />
      ) : filteredProducts.length === 0 ? (
        <MarketplaceEmptyState 
          onReset={handleResetFilters}
          title="Tidak ada produk yang cocok dengan filter ini."
          description="Tidak ada produk yang cocok dengan filter ini. Coba ubah kata kunci, kategori, lokasi, atau rentang harga."
          showButton={true}
        />
      ) : (
        <div className="space-y-10">
          <MarketplaceResultsHeader 
            count={filteredProducts.length} 
            sortBy={sortBy} 
            onSortChange={setSortBy} 
          />
          <MarketplaceGrid 
            products={filteredProducts.slice((currentPage - 1) * 10, currentPage * 10)}
            onAddToCart={handleAddToCart}
            onViewDistributor={handleDistributorClick}
            onNegotiate={user?.role === 'UMKM' ? (prod) => {
              if (user?.is_verified !== true) {
                toast.error("Akun UMKM Anda belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu.");
                return;
              }
              setSelectedNegotiateProduct(prod);
            } : undefined}
            onViewDetails={(prod) => {
              navigate(`/umkm/products/${prod.id}`);
            }}
          />
          {filteredProducts.length > 10 && (
            <div className="pt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredProducts.length / 10)}
                onPageChange={setCurrentPage}
                totalItems={filteredProducts.length}
                itemsPerPage={10}
              />
            </div>
          )}
        </div>
      )}

      {selectedNegotiateProduct && (
        <NegotiationModal
          isOpen={!!selectedNegotiateProduct}
          onClose={() => setSelectedNegotiateProduct(null)}
          product={selectedNegotiateProduct}
          umkmId={user?.id || ''}
          umkmName={user?.full_name || user?.email || 'Pembeli UMKM'}
        />
      )}

    </div>
  );
}
