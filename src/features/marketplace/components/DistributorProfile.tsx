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
import { ReputationBadge } from '../../../components/common/ReputationBadge';
import { cn } from '../../../lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Product } from '../../inventory/services/inventoryService';

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
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            location: 'Bandung, Jawa Barat',
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
    <div className="space-y-12 pb-20">
      {/* Header / Cover */}
      <div className="relative">
         <Button 
           variant="outline" 
           onClick={() => navigate(-1)}
           className="absolute top-8 left-8 z-10 h-12 w-12 rounded-2xl border-white/20 bg-black/40 backdrop-blur-xl text-white hover:bg-white hover:text-black transition-all"
         >
            <ArrowLeft size={24} />
         </Button>
         
         <div className="h-[300px] w-full rounded-[3.5rem] bg-gradient-to-br from-[#06110B] via-[#0B2516] to-[#122A1E] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" 
            />
         </div>

         <div className="px-12 -mt-24 relative z-10 flex flex-col md:flex-row items-end gap-10">
            <div className="w-48 h-48 rounded-[3rem] bg-card border-8 border-background shadow-2xl flex items-center justify-center text-primary font-black text-6xl shadow-primary/10">
               {distributor.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 pb-4 space-y-4">
               <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-black tracking-tighter leading-none">{distributor.name}</h1>
                  {distributor.verified && <ShieldCheck size={32} className="text-primary drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]" />}
               </div>
               <div className="flex flex-wrap items-center gap-8 text-muted-foreground font-bold tracking-tight uppercase text-xs">
                  <span className="flex items-center gap-2"><MapPin size={18} className="text-primary" /> {distributor.location}</span>
                  <span className="flex items-center gap-2"><Clock size={18} className="text-primary" /> Mitra Sejak {distributor.joined}</span>
                  <span className="flex items-center gap-2 font-black text-primary"><ShoppingBag size={18} /> {distributor.products_count} Produk</span>
               </div>
            </div>
            <div className="flex gap-4 pb-4">
               <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20">
                  <MessageSquareText size={20} className="mr-2" />
                  Negosiasi
               </Button>
               <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card/60 backdrop-blur-xl font-black text-lg">
                  Ajukan Kemitraan
               </Button>
            </div>
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
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
                        whileHover={{ y: -8 }}
                        className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden group shadow-xl"
                      >
                         <div className="relative h-64">
                            <img src={prod.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={prod.name} />
                            <div className="absolute top-6 left-6">
                               <span className="px-4 py-1 bg-black/40 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Tersedia</span>
                            </div>
                            <button className="absolute bottom-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all shadow-2xl">
                               <ShoppingBag size={24} />
                            </button>
                         </div>
                         <div className="p-8 space-y-4">
                            <h4 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{prod.name}</h4>
                            <div className="flex items-center justify-between">
                               <div>
                                  <p className="text-3xl font-black">Rp {prod.price.toLocaleString()}</p>
                                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Per {prod.unit_type}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm cursor-pointer hover:bg-primary hover:text-white transition-all">Harga Bertingkat</p>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
