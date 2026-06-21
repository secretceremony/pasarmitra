import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, MapPin, Star, ExternalLink, Search, X, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../features/marketplace/data/categories';
import { useMarketplaceFilters } from '../features/marketplace/hooks/useMarketplaceFilters';
import { useMarketplaceCart } from '../features/marketplace/hooks/useMarketplaceCart';
import { useAuthStore } from '../store/use-auth-store';
import { NegotiationModal } from '../features/partners/components/NegotiationModal';
import { toast } from 'sonner';
import {
  MarketplaceToolbar,
  MarketplaceResultsHeader,
  MarketplaceGrid,
  MarketplaceEmptyState
} from '../features/marketplace/components';
import { HeroSection } from '../modules/dashboard/components/HeroSection';

export default function Marketplace() {
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedNegotiateProduct, setSelectedNegotiateProduct] = useState<any | null>(null);
  const { 
    search, 
    setSearch, 
    selectedCategory, 
    setSelectedCategory, 
    products,
    filteredProducts,
    isLoading
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
    <div className="space-y-6 sm:space-y-12 w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Marketplace</span>
      </div>

      <HeroSection onViewSuppliers={() => navigate('/umkm/distributors')} />

      <div id="marketplace-toolbar" className="scroll-mt-24 w-full">
        <MarketplaceToolbar 
          search={search}
          onSearchChange={setSearch}
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
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
          title="Tidak ada produk yang sesuai dengan pencarian atau filter."
          description="Coba sesuaikan kata kunci atau filter pencarian Anda."
          showButton={true}
        />
      ) : (
        <div className="space-y-10">
          <MarketplaceResultsHeader count={filteredProducts.length} />
          <MarketplaceGrid 
            products={filteredProducts}
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
