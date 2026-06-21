import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Building2, 
  Search, 
  MapPin, 
  ShieldCheck, 
  Star, 
  ArrowLeft, 
  SlidersHorizontal,
  Package,
  Layers,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/common/EmptyState';

interface Profile {
  id: string;
  role: string;
  is_active?: boolean;
  is_suspended?: boolean;
  is_verified?: boolean;
  organization_name?: string;
  full_name?: string;
  address?: string;
  description?: string;
  reputation_score?: number;
  created_at?: string;
  business_district?: string;
  business_type?: string;
  business_address?: string;
}

interface Product {
  id: string;
  distributor_id?: string;
  category?: string;
  name?: string;
}

export default function DistributorsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'products'>('newest');

  // Fetch distributor profiles
  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError, refetch: refetchProfiles } = useQuery({
    queryKey: ['distributors-list', 'profiles'],
    queryFn: async () => {
      const q = query(
        collection(db, 'profiles'),
        where('role', '==', 'DISTRIBUTOR')
      );
      const querySnapshot = await getDocs(q);
      const list: Profile[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Profile);
      });
      return list;
    }
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['distributors-list', 'products'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const list: Product[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });
      return list;
    }
  });

  // Map products data to calculate counts and unique categories per distributor
  const distributorStats = useMemo(() => {
    const stats: Record<string, { count: number; categories: Set<string>; productNames: string[] }> = {};
    
    products.forEach((prod) => {
      const distId = prod.distributor_id;
      const cat = prod.category;
      const name = prod.name;
      if (distId) {
        if (!stats[distId]) {
          stats[distId] = { count: 0, categories: new Set<string>(), productNames: [] };
        }
        stats[distId].count += 1;
        if (cat) {
          stats[distId].categories.add(cat);
        }
        if (name) {
          stats[distId].productNames.push(name.toLowerCase());
        }
      }
    });
    
    return stats;
  }, [products]);

  // Filter only active, non-suspended, verified distributors
  const activeDistributors = useMemo(() => {
    return profiles.filter((p) => 
      p.is_active !== false && 
      p.is_suspended !== true && 
      p.is_verified === true
    );
  }, [profiles]);

  // Extract unique Balikpapan districts from active distributors for filter options
  const uniqueDistricts = useMemo(() => {
    return [
      'Balikpapan Kota',
      'Balikpapan Selatan',
      'Balikpapan Tengah',
      'Balikpapan Utara',
      'Balikpapan Barat',
      'Balikpapan Timur'
    ];
  }, []);

  // Extract unique categories from all products for filter options
  const uniqueCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    products.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
    });
    return Array.from(categoriesSet).sort();
  }, [products]);

  // Search & Filter & Sort processing
  const filteredAndSortedDistributors = useMemo(() => {
    let result = [...activeDistributors];

    // Filter by Search Query (distributor name, business name, address/city, description, categories, or product keywords)
    if (searchTerm.trim()) {
      const queryLower = searchTerm.toLowerCase().trim();
      result = result.filter((d) => {
        const stats = distributorStats[d.id];
        const orgName = (d.organization_name || '').toLowerCase();
        const fullName = (d.full_name || '').toLowerCase();
        const address = (d.address || '').toLowerCase();
        const desc = (d.description || '').toLowerCase();
        
        // Match with categories
        const matchCategory = stats 
          ? Array.from(stats.categories).some(cat => cat.toLowerCase().includes(queryLower)) 
          : false;

        // Match with product names
        const matchProducts = stats
          ? stats.productNames.some(pName => pName.includes(queryLower))
          : false;

        return (
          orgName.includes(queryLower) ||
          fullName.includes(queryLower) ||
          address.includes(queryLower) ||
          desc.includes(queryLower) ||
          matchCategory ||
          matchProducts
        );
      });
    }

    // Filter by District
    if (selectedCity !== 'All') {
      result = result.filter((d) => {
        return d.business_district === selectedCity;
      });
    }

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter((d) => {
        const stats = distributorStats[d.id];
        return stats && stats.categories.has(selectedCategory);
      });
    }

    // Sort processing
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // Newest first
      }
      if (sortBy === 'name') {
        const nameA = (a.organization_name || a.full_name || '').toLowerCase();
        const nameB = (b.organization_name || b.full_name || '').toLowerCase();
        return nameA.localeCompare(nameB); // Alphabetical A-Z
      }
      if (sortBy === 'products') {
        const countA = distributorStats[a.id]?.count || 0;
        const countB = distributorStats[b.id]?.count || 0;
        return countB - countA; // Highest count first
      }
      return 0;
    });

    return result;
  }, [activeDistributors, searchTerm, selectedCity, selectedCategory, sortBy, distributorStats]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCity('All');
    setSelectedCategory('All');
    setSortBy('newest');
  };

  const isLoading = isLoadingProfiles || isLoadingProducts;
  const hasError = profilesError || productsError;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-7xl mx-auto overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Header section with back button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-1.5 pl-0 text-muted-foreground hover:text-primary font-bold text-xs uppercase tracking-wider pl-0 h-auto py-1"
          >
            <ArrowLeft size={14} />
            Kembali ke Marketplace
          </Button>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Distributor Terverifikasi</h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-3xl">
            Hubungi langsung distributor tangan pertama dan dapatkan jaminan harga grosir terbaik untuk bisnis kelontong Anda.
          </p>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-card border border-border/50 rounded-xl p-3 sm:p-4 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Cari nama, lokasi, kategori, atau produk distributor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-muted/40 border border-border/30 rounded-lg text-xs font-semibold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/70 text-foreground"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by City */}
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/30 rounded-lg px-2 h-9 shrink-0">
              <MapPin size={12} className="text-primary/60 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-[11px] font-bold outline-none border-none pr-5 cursor-pointer text-foreground"
              >
                <option value="All">Semua Kecamatan</option>
                {uniqueDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Product Category */}
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/30 rounded-lg px-2 h-9 shrink-0">
              <Layers size={12} className="text-primary/60 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-[11px] font-bold outline-none border-none pr-5 cursor-pointer text-foreground"
              >
                <option value="All">Semua Kategori</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/30 rounded-lg px-2 h-9 shrink-0">
              <SlidersHorizontal size={12} className="text-primary/60 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[11px] font-bold outline-none border-none pr-5 cursor-pointer text-foreground"
              >
                <option value="newest">Terbaru</option>
                <option value="name">Nama (A-Z)</option>
                <option value="products">Produk Terbanyak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || selectedCity !== 'All' || selectedCategory !== 'All') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-muted-foreground items-center">
              <span>Filter Aktif:</span>
              {searchTerm && (
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Pencarian: "{searchTerm}"
                </span>
              )}
              {selectedCity !== 'All' && (
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Kecamatan: {selectedCity}
                </span>
              )}
              {selectedCategory !== 'All' && (
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Kategori: {selectedCategory}
                </span>
              )}
            </div>
            <Button
              variant="link"
              onClick={handleResetFilters}
              className="text-[11px] text-primary font-black uppercase tracking-wider p-0 h-auto"
            >
              Atur Ulang Filter
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-card border border-dashed border-border/60 rounded-2xl shadow-sm">
          <Loader2 className="animate-spin text-primary animate-duration-1000" size={32} />
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
            Memuat daftar distributor...
          </p>
        </div>
      ) : hasError ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 bg-card border border-border/50 rounded-2xl shadow-sm text-center max-w-md mx-auto px-4">
          <AlertCircle className="text-rose-500" size={36} />
          <div className="space-y-1">
            <h3 className="text-base font-bold tracking-tight text-foreground">Gagal memuat data</h3>
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              Terjadi masalah koneksi saat mengambil profil distributor dari Firestore.
            </p>
          </div>
          <Button 
            onClick={() => { refetchProfiles(); }}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20"
          >
            Coba Lagi
          </Button>
        </div>
      ) : filteredAndSortedDistributors.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={selectedCity !== 'All' ? `Belum ada distributor terverifikasi di ${selectedCity}.` : 'Belum ada distributor yang sesuai.'}
          description={selectedCity !== 'All' ? 'Belum ada distributor terverifikasi di area ini. Coba pilih kecamatan Balikpapan lainnya.' : 'Coba ubah kata kunci pencarian atau filter yang digunakan.'}
          cta={
            searchTerm || selectedCity !== 'All' || selectedCategory !== 'All'
              ? { label: "Atur Ulang Filter", onClick: handleResetFilters }
              : undefined
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full"
        >
          <AnimatePresence mode="popLayout">
            {filteredAndSortedDistributors.map((dist) => {
              const stats = distributorStats[dist.id] || { count: 0, categories: new Set<string>() };
              const prodCount = stats.count;
              const catsArray = Array.from(stats.categories);
              const initials = (dist.organization_name || dist.full_name || 'D').slice(0, 2).toUpperCase();

              return (
                <motion.div
                  layout
                  key={dist.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 hover:border-primary/20 hover:shadow-md transition-all duration-300 shadow-sm flex flex-col justify-between group h-full relative overflow-hidden"
                >
                  {/* Decorative verification background glow */}
                  {dist.is_verified && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-[16px] pointer-events-none" />
                  )}

                  <div className="space-y-3">
                    {/* Top Header Row (Avatar, Name, Badge) */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 font-bold text-base shadow-inner shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight group-hover:text-primary transition-colors break-words">
                            {dist.organization_name || dist.full_name || 'Distributor Mitra'}
                          </h3>
                          {dist.is_verified && (
                            <ShieldCheck size={14} className="text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold mt-0.5">
                          <MapPin size={11} className="shrink-0 text-primary/60" />
                          <span className="break-words line-clamp-1">
                            {dist.business_district || dist.address || 'Balikpapan, Kalimantan Timur'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed min-h-[2.5rem] line-clamp-2">
                      {dist.description || 'Penyedia kebutuhan sembako grosir terpercaya dan mitra logistik terdaftar di PasarMitra.'}
                    </p>

                    {/* Stats badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/30">
                      <div className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                        <Package size={11} className="text-primary/60" />
                        <span>{prodCount} Produk</span>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                        <span>{dist.reputation_score ? dist.reputation_score.toFixed(1) : '4.7'}</span>
                      </div>
                    </div>

                    {/* Categories list */}
                    {catsArray.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {catsArray.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="bg-primary/5 text-primary border border-primary/10 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider"
                          >
                            {cat}
                          </span>
                        ))}
                        {catsArray.length > 3 && (
                          <span className="bg-muted/40 text-muted-foreground rounded-full px-1.5 py-0.5 text-[8px] font-bold">
                            +{catsArray.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3">
                    <Button
                      onClick={() => navigate(`/distributor/${dist.id}`)}
                      className="w-full h-8.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-sm shadow-primary/15 group-hover:scale-[1.01] transition-all cursor-pointer"
                    >
                      Lihat Profil
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
