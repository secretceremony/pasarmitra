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
import { ProductDetailsModal } from '../components/common/ProductDetailsModal';
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
  const { user } = useAuthStore();
  const [selectedNegotiateProduct, setSelectedNegotiateProduct] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);

  // Fetch verified suppliers
  const { data: verifiedSuppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['marketplace', 'verified-suppliers'],
    queryFn: async () => {
      const q = query(
        collection(db, 'profiles'),
        where('role', '==', 'DISTRIBUTOR'),
        where('is_verified', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.organization_name || data.business_name || data.full_name || 'Distributor',
          location: data.address || 'Indonesia',
          rating: data.reputation_score || 5.0,
        });
      }
      return list;
    }
  });

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
    <div className="space-y-12">
      <MarketplaceHeroBanner onViewSuppliers={() => setIsSuppliersModalOpen(true)} />

      <div id="marketplace-toolbar" className="scroll-mt-24">
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
            onNegotiate={user?.role === 'UMKM' ? (prod) => setSelectedNegotiateProduct(prod) : undefined}
            onViewDetails={(prod) => {
              setSelectedProduct(prod);
              setIsDetailsOpen(true);
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

      <ProductDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />

      {isSuppliersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full mx-4 shadow-2xl relative flex flex-col max-h-[85vh] animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setIsSuppliersModalOpen(false)}
              className="absolute top-6 right-6 p-2.5 bg-muted/40 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer z-10"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="mb-6 pr-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Building2 size={20} />
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">
                  Distributor Terverifikasi
                </h3>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Daftar distributor resmi PasarMitra yang telah melewati verifikasi legalitas dan reputasi usaha.
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] custom-scrollbar">
              {isLoadingSuppliers ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="animate-spin text-primary" size={28} />
                  <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Memuat distributor...</p>
                </div>
              ) : verifiedSuppliers.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">Belum ada distributor terverifikasi</p>
                </div>
              ) : (
                verifiedSuppliers.map((supplier: any) => (
                  <div 
                    key={supplier.id}
                    className="group bg-muted/20 border border-border/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/20 hover:bg-muted/35 transition-all duration-300"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-base text-foreground truncate">
                          {supplier.name}
                        </h4>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-md text-[9px] font-black uppercase text-[#D4AF37] tracking-tight shrink-0">
                          <ShieldCheck size={10} />
                          Verified
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground font-bold">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{supplier.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={12} className="fill-[#D4AF37] text-[#D4AF37]" />
                          <span>Reputasi: <strong className="text-foreground">{supplier.rating.toFixed(1)}</strong> / 5.0</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={() => {
                          setIsSuppliersModalOpen(false);
                          navigate(`/distributor/${supplier.id}`);
                        }}
                        className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-border/40 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Profil
                      </button>
                      <button
                        onClick={() => {
                          setIsSuppliersModalOpen(false);
                          setSearch(supplier.name);
                        }}
                        className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-primary/10"
                      >
                        <Search size={12} />
                        Filter
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
