import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  MessageSquareText, 
  ShoppingBag, 
  Star, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Award 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import { ReputationBadge } from '../../../components/common/ReputationBadge';
import { cn } from '../../../lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Product } from '../../inventory/services/inventoryService';
import { useAuthStore } from '../../../store/use-auth-store';
import { NegotiationModal } from '../../partners/components/NegotiationModal';
import { useMarketplaceCart } from '../hooks/useMarketplaceCart';

interface Distributor {
  id: string;
  name: string;
  location: string;
  rating: number;
  verified: boolean;
  description: string;
  joined: string;
  products_count: number;
  categories: string[];
  badges: string[];
}

export const DistributorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { handleAddToCart } = useMarketplaceCart();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNegotiateProduct, setSelectedNegotiateProduct] = useState<any | null>(null);

  useEffect(() => {
    const fetchDistributorData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        // Fetch distributor profile
        const profileDoc = await getDoc(doc(db, 'profiles', id));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          setDistributor({
            id: profileDoc.id,
            name: profileData.organization_name || profileData.full_name || 'Distributor Mitra',
            location: profileData.address || 'Balikpapan, Kalimantan Timur',
            rating: profileData.reputation_score || 4.7,
            verified: profileData.is_verified || false,
            description: profileData.description || 'Penyedia logistik dan barang kebutuhan pokok grosir terpercaya mitra PasarMitra.',
            joined: profileData.created_at ? new Date(profileData.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : 'Jan 2026',
            products_count: 0, // Will be set after fetching products
            categories: ['Sembako', 'F&B'],
            badges: ['Elite Supplier', 'Verified Origin']
          });
        }

        // Fetch products
        const q = query(collection(db, 'products'), where('distributor_id', '==', id));
        const querySnapshot = await getDocs(q);
        const prodList: Product[] = [];
        querySnapshot.forEach((doc) => {
          prodList.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(prodList);
        
        if (profileDoc.exists()) {
          setDistributor(prev => prev ? { ...prev, products_count: prodList.length } : null);
        }
      } catch (err) {
        console.error("Gagal memuat profil distributor:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistributorData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground font-bold">
        Memuat profil distributor...
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="p-12 text-center text-muted-foreground font-bold space-y-4">
        <p>Distributor tidak ditemukan.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 pb-20 w-full max-w-full overflow-hidden px-4 sm:px-6 md:px-8">
      {/* Header / Cover */}
      <div className="relative w-full">
         <Button 
           variant="outline" 
           onClick={() => navigate(-1)}
           className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border-white/20 bg-black/40 backdrop-blur-xl text-white hover:bg-white hover:text-black transition-all p-0 flex items-center justify-center"
         >
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
         </Button>
         
         <div className="h-[180px] sm:h-[300px] w-full rounded-[2rem] sm:rounded-[3.5rem] bg-gradient-to-br from-[#06110B] via-[#0B2516] to-[#122A1E] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" 
            />
         </div>

          <div className="px-4 sm:px-12 -mt-16 sm:-mt-24 relative z-10 flex flex-col lg:flex-row items-center lg:items-end gap-6 lg:gap-10 text-center lg:text-left">
             <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-[2rem] sm:rounded-[3rem] bg-card border-4 sm:border-8 border-background shadow-2xl flex items-center justify-center text-primary font-black text-4xl sm:text-6xl shadow-primary/10 shrink-0">
                {distributor.name[0]?.toUpperCase()}
             </div>
             <div className="flex-1 pb-2 lg:pb-4 space-y-3 sm:space-y-4 w-full">
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-4">
                   <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-none">{distributor.name}</h1>
                   {distributor.verified && <ShieldCheck size={24} className="text-primary drop-shadow-[0_0_12px_rgba(34,197,94,0.4)] sm:w-8 sm:h-8" />}
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-8 text-muted-foreground font-bold tracking-tight uppercase text-[10px] sm:text-xs">
                   <span className="flex items-center gap-1.5"><MapPin size={15} className="text-primary" /> {distributor.location}</span>
                   <span className="flex items-center gap-1.5"><Clock size={15} className="text-primary" /> Mitra Sejak {distributor.joined}</span>
                   <span className="flex items-center gap-1.5 font-black text-primary"><ShoppingBag size={15} /> {distributor.products_count} Produk</span>
                </div>
             </div>
             <div className="flex flex-col sm:flex-row flex-wrap gap-3 pb-2 lg:pb-4 w-full lg:w-auto min-w-0 justify-center lg:justify-end">
                {user?.role === 'UMKM' && products.length > 0 && (
                   <Button 
                      className="h-11 sm:h-12 px-6 rounded-xl bg-primary text-primary-foreground font-black text-sm sm:text-base shadow-xl shadow-primary/20 w-full sm:w-auto justify-center whitespace-normal"
                      onClick={() => {
                        if (user?.is_verified !== true) {
                          toast.error("Akun UMKM Anda belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu.");
                          return;
                        }
                        setSelectedNegotiateProduct({ ...products[0], distributor_name: distributor.name });
                      }}
                   >
                      <MessageSquareText size={18} className="mr-2 shrink-0" />
                      Negosiasi Harga
                   </Button>
                )}
             </div>
          </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-12">
        {/* Sidebar Info */}
        <div className="space-y-10">
            <div className="bg-card border border-border/50 rounded-[3rem] p-10 space-y-8 shadow-xl">
               <h3 className="text-xl font-black tracking-tight">Rating Perusahaan</h3>
               <div className="flex items-center justify-between">
                  <div>
                     <p className="text-5xl font-black text-foreground">{distributor.rating.toFixed(1)}</p>
                     <div className="flex items-center gap-1 text-primary mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill={i < Math.round(distributor.rating) ? "currentColor" : "none"} />
                        ))}
                     </div>
                  </div>
                  <ReputationBadge score={distributor.rating} size="lg" />
               </div>
               <div className="space-y-4 pt-4">
                  {[
                    { label: 'Ketepatan Pengiriman', value: '98%' },
                    { label: 'Keaslian Produk', value: '100%' },
                    { label: 'Kebijakan Pengembalian', value: '4.8/5' }
                  ].map((stat) => (
                    <div key={stat.label} className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl">
                       <span className="text-xs font-bold text-muted-foreground uppercase">{stat.label}</span>
                       <span className="text-sm font-black text-primary">{stat.value}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-[#06110B] border border-primary/20 rounded-[3rem] p-10 space-y-6 text-white shadow-2xl relative overflow-hidden">
               <h3 className="text-xl font-black text-primary flex items-center gap-2">
                  <Award size={24} /> Keuntungan Distributor
               </h3>
               <div className="space-y-4 relative z-10">
                  {distributor.badges.map((badge) => (
                    <div key={badge} className="flex items-center gap-4 group">
                       <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                          <CheckCircle2 size={16} />
                       </div>
                       <span className="text-sm font-bold text-white/80">{badge}</span>
                    </div>
                  ))}
               </div>
               <TrendingUp className="absolute -bottom-10 -right-10 text-primary/5 w-64 h-64" />
            </div>
         </div>

         {/* Main Content */}
         <div className="lg:col-span-2 space-y-12">
            <div className="space-y-6">
               <h2 className="text-3xl font-black tracking-tight">Tentang Distributor</h2>
               <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-4xl">
                  {distributor.description}
               </p>
               <div className="flex flex-wrap gap-4 pt-4">
                  {distributor.categories.map((cat) => (
                    <span key={cat} className="px-6 py-2 bg-card border border-border/50 rounded-full text-xs font-black uppercase tracking-widest text-primary/80">
                       {cat}
                    </span>
                  ))}
               </div>
            </div>

            <div className="space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-4">
                     Katalog Produk
                     <span className="text-sm font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">{products.length} BARANG</span>
                  </h3>
               </div>

               {products.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground bg-card border border-border/50 rounded-[2.5rem] font-bold">
                   Belum ada produk yang diunggah ke katalog.
                 </div>
               ) : (
                 <div className="grid sm:grid-cols-2 gap-8">
                    {products.map((prod) => (
                       <motion.div 
                         key={prod.id}
                         whileHover={user?.role === 'UMKM' ? { y: -8, scale: 1.01 } : { y: -8 }}
                         onClick={() => {
                           if (user?.role === 'UMKM') {
                             navigate(`/umkm/products/${prod.id}`);
                           }
                         }}
                         className={cn(
                           "bg-card border border-border/50 rounded-3xl overflow-hidden group shadow-xl flex flex-col h-full transition-shadow duration-300",
                           user?.role === 'UMKM' && "cursor-pointer hover:shadow-2xl"
                         )}
                       >
                          <div className="relative aspect-square overflow-hidden bg-muted">
                             <img src={prod.image_url || '/assets/fallback-product.png'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={prod.name} />
                             <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Tersedia</span>
                             </div>
                             {user?.role === 'UMKM' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart({
                                      id: prod.id,
                                      name: prod.name,
                                      price: prod.price,
                                      category: prod.category || 'Grains',
                                      image: prod.image_url || '/assets/fallback-product.png',
                                      rating: 4.7,
                                      bulk: `${prod.min_order_quantity} ${prod.unit_type}`,
                                      unit: prod.unit_type,
                                      distributor: distributor.name,
                                      distributorId: distributor.id,
                                      stock: prod.stock
                                    });
                                  }}
                                  className="absolute bottom-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-2xl rounded-xl flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all shadow-2xl cursor-pointer z-10"
                                  title="Tambah ke Keranjang"
                                >
                                   <ShoppingBag size={20} />
                                </button>
                             )}
                          </div>
                          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                             <div className="space-y-2">
                                <h4 className="text-base sm:text-lg font-black tracking-tight group-hover:text-primary transition-colors line-clamp-2">{prod.name}</h4>
                             </div>
                             <div className="space-y-3 mt-auto pt-3 border-t border-border/20">
                                <div className="flex items-center justify-between gap-2">
                                   <div>
                                      <p className="text-xl sm:text-2xl font-black">Rp {prod.price.toLocaleString()}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Per {prod.unit_type}</p>
                                   </div>
                                   <div className="text-right shrink-0">
                                      <p className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Harga Bertingkat</p>
                                   </div>
                                </div>
                                {user?.role === 'UMKM' && (
                                   <Button 
                                      variant="outline" 
                                      className="w-full h-10 rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-wider"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         if (user?.is_verified !== true) {
                                           toast.error("Akun UMKM Anda belum terverifikasi. Silakan ajukan verifikasi terlebih dahulu.");
                                           return;
                                         }
                                         setSelectedNegotiateProduct({ ...prod, distributor_name: distributor.name });
                                       }}
                                   >
                                      Negosiasi Harga
                                   </Button>
                                )}
                             </div>
                          </div>
                       </motion.div>
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>

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
};
