import React from 'react';
import { 
  Package, 
  DollarSign, 
  ShoppingBag,
  MessageSquareText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnalyticsCard } from '../../../components/common/AnalyticsCard';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { formatDateTime } from '../../../lib/dateUtils';

interface Negotiation {
  id: string;
  negotiation_code: string;
  distributor_id: string;
  distributor_name: string;
  umkm_id: string;
  umkm_name: string;
  product_id: string;
  product_name: string;
  original_unit_price: number;
  requested_unit_price: number;
  agreed_unit_price?: number;
  quantity: number;
  status: string;
  latest_message: string;
  latest_message_at: string;
  created_at: string;
}

const RECENT_ORDERS = [
  { id: 'ORD-7721', buyer: 'Warung Barokah', amount: 'Rp 4.200.000', status: 'Pending', time: '2 mins ago' },
  { id: 'ORD-7720', buyer: 'Toko Kelontong Jaya', amount: 'Rp 12.500.000', status: 'Processing', time: '45 mins ago' },
  { id: 'ORD-7719', buyer: 'Minimarket Sejahtera', amount: 'Rp 8.900.000', status: 'Shipped', time: '3 hours ago' },
];

import { useAuthStore } from '../../../store/use-auth-store';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export const DistributorDashboard = () => {
  const { user } = useAuthStore();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [isLoadingNegotiations, setIsLoadingNegotiations] = useState(true);
  const [negotiationsError, setNegotiationsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      try {
        setIsLoadingStats(true);
        const q = query(collection(db, 'orders'), where('distributor_id', '==', user.id));
        const querySnapshot = await getDocs(q);
        
        let revenue = 0;
        let pending = 0;
        let completed = 0;
        let total = querySnapshot.size;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const amount = data.total_amount || 0;
          const status = data.status || 'pending';

          if (status !== 'cancelled') {
            revenue += amount;
          }
          if (status === 'pending' || status === 'processing' || status === 'shipped') {
            pending++;
          }
          if (status === 'delivered') {
            completed++;
          }
        });

        setStats({
          totalRevenue: revenue,
          totalOrders: total,
          pendingOrders: pending,
          completedOrders: completed
        });
      } catch (err) {
        console.error("Gagal memuat statistik distributor:", err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  useEffect(() => {
    const fetchNegotiations = async () => {
      if (!user?.id) return;
      try {
        setIsLoadingNegotiations(true);
        setNegotiationsError(null);
        
        const q = query(
          collection(db, 'negotiations'),
          where('distributor_id', '==', user.id)
        );
        const querySnapshot = await getDocs(q);
        const list: Negotiation[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Negotiation);
        });

        // Sort in memory by latest_message_at desc
        list.sort((a, b) => {
          const timeA = new Date(a.latest_message_at || a.created_at || 0).getTime();
          const timeB = new Date(b.latest_message_at || b.created_at || 0).getTime();
          return timeB - timeA;
        });

        // Filter active/open negotiations
        const openList = list.filter(
          (neg) => neg.status !== 'cancelled' && neg.status !== 'converted_to_order'
        );

        setNegotiations(openList.slice(0, 3));
      } catch (err) {
        console.error("Gagal memuat negosiasi:", err);
        setNegotiationsError("Gagal memuat daftar negosiasi.");
      } finally {
        setIsLoadingNegotiations(false);
      }
    };

    fetchNegotiations();
  }, [user?.id]);

  return (
    <div className="space-y-10">
      {/* Verification Warning Card for Unverified Distributors */}
      {user && !user.is_verified && (
        <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl shadow-amber-500/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
               <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-amber-800">
                {user.verification_status === 'PENDING_REVIEW' ? 'Akun Dalam Proses Verifikasi' :
                 user.verification_status === 'REJECTED' ? 'Verifikasi Legalitas Ditolak' :
                 user.verification_status === 'ESCALATED' ? 'Pengajuan Sedang Ditinjau Khusus' :
                 'Akun Belum Terverifikasi'}
              </h3>
              <p className="text-sm font-semibold text-amber-700/80 leading-relaxed mt-1">
                {user.verification_status === 'PENDING_REVIEW' ? 'Pengajuan dokumen legalitas Anda sedang diperiksa oleh admin.' :
                 user.verification_status === 'REJECTED' ? `Pengajuan Anda ditolak: ${user.rejection_reason || 'Periksa kembali dokumen Anda.'}` :
                 user.verification_status === 'ESCALATED' ? 'Verifikasi Anda diteruskan ke tim legal untuk audit khusus.' :
                 'Anda belum mengajukan berkas legalitas usaha distributor. Lengkapi verifikasi untuk mulai menjual produk.'}
              </p>
            </div>
          </div>
          {(user.verification_status === 'NOT_SUBMITTED' || !user.verification_status || user.verification_status === 'REJECTED') && (
            <Link to="/distributor/legal-docs">
              <Button className="h-14 px-8 rounded-2xl bg-amber-600 text-white font-black hover:bg-amber-700 shadow-lg shadow-amber-600/20 whitespace-nowrap">
                Lengkapi Verifikasi
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Distributor Control</h1>
          <p className="text-muted-foreground font-medium text-lg">Manage your inventory, order fulfillment, and business verification in real-time.</p>
        </div>
        <div className="flex gap-4">
           <Link to="/inventory">
             <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20">
                <Package className="mr-2" size={20} />
                Add Product
             </Button>
           </Link>
            <div className="relative group/tooltip">
               <Button 
                 disabled 
                 aria-disabled="true"
                 variant="outline" 
                 className="h-14 px-8 rounded-2xl border-border bg-card/20 text-muted-foreground/60 font-black cursor-not-allowed opacity-50"
               >
                  Export Reports
               </Button>
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap z-50 shadow-lg border border-border/50 font-bold">
                  Fitur ekspor laporan akan segera hadir
               </div>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard 
          title="Total Pendapatan" 
          value={isLoadingStats ? '...' : `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`} 
          icon={DollarSign} 
          trend={null}
          className="bg-emerald-500/5 border-emerald-500/20"
        />
        <AnalyticsCard 
          title="Total Pesanan" 
          value={isLoadingStats ? '...' : stats.totalOrders.toString()} 
          icon={ShoppingBag} 
          trend={null}
          className="bg-blue-500/5 border-blue-500/20"
        />
        <AnalyticsCard 
          title="Pesanan Berjalan" 
          value={isLoadingStats ? '...' : stats.pendingOrders.toString()} 
          icon={Clock} 
          trend={null}
          className="bg-amber-500/5 border-amber-500/20"
        />
        <AnalyticsCard 
          title="Pesanan Selesai" 
          value={isLoadingStats ? '...' : stats.completedOrders.toString()} 
          icon={CheckCircle2} 
          trend={null}
          className="bg-purple-500/5 border-purple-500/20"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-10">
          {/* Order Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black tracking-tight">Recent Incoming Orders</h3>
               <Link to="/orders">
                 <Button variant="link" className="text-primary font-bold">View All Orders</Button>
               </Link>
            </div>
            <div className="grid gap-4">
               {RECENT_ORDERS.map((order) => (
                 <motion.div 
                   key={order.id}
                   whileHover={{ x: 4 }}
                   className="p-4 sm:p-6 bg-card border border-border/50 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/30 transition-all"
                 >
                   <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                      <div className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0",
                        order.status === 'Pending' ? "bg-amber-500/10 text-amber-500" :
                        order.status === 'Processing' ? "bg-blue-500/10 text-blue-500" :
                        "bg-emerald-500/10 text-emerald-500"
                      )}>
                         <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                         <p className="font-black text-sm sm:text-lg leading-tight uppercase tracking-tight truncate">{order.id} • {order.buyer}</p>
                         <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-muted-foreground">{order.time}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs sm:text-sm font-black text-primary">{order.amount}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        order.status === 'Pending' ? "bg-amber-500/20 text-amber-500" :
                        order.status === 'Processing' ? "bg-blue-500/20 text-blue-500" :
                        "bg-emerald-500/20 text-emerald-500"
                      )}>
                        {order.status}
                      </span>
                      <Link to="/orders">
                        <Button size="sm" variant="outline" className="rounded-xl font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100">Process</Button>
                      </Link>
                   </div>
                 </motion.div>
               ))}
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-card border border-border/50 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 space-y-6">
             <div className="flex items-center justify-between">
                <h4 className="font-black text-lg sm:text-xl">Inventory Turn Rate</h4>
                <div className="flex gap-2">
                   <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-lg uppercase">Daily</span>
                   <span className="px-3 py-1 bg-muted/40 text-muted-foreground text-xs font-black rounded-lg uppercase">Weekly</span>
                </div>
             </div>
             <div className="h-64 w-full bg-muted/20 rounded-3xl flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-end px-4 sm:px-12 gap-2 sm:gap-6 opacity-20">
                   {[40, 70, 45, 90, 65, 80, 55, 75].map((h, i) => (
                     <div key={i} className="flex-1 bg-primary rounded-t-lg sm:rounded-t-xl" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <p className="text-muted-foreground font-bold relative z-10 text-sm sm:text-base">Analytics Visualization Hooked</p>
             </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-10">
          {/* Active Negotiations */}
          <div className="space-y-6">
             <h3 className="text-2xl font-black tracking-tight">Open Negotiations</h3>
             <div className="grid gap-4">
                {isLoadingNegotiations ? (
                  <div className="p-8 text-center bg-card border border-border/50 rounded-[2rem] flex flex-col items-center justify-center gap-3">
                     <Loader2 className="animate-spin text-primary" size={24} />
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menyelaraskan data...</p>
                  </div>
                ) : negotiationsError ? (
                  <div className="p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-rose-600">
                     <AlertCircle size={24} />
                     <p className="text-xs font-bold">{negotiationsError}</p>
                  </div>
                ) : negotiations.length === 0 ? (
                  <div className="p-8 text-center bg-card border border-border/50 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-muted-foreground/60">
                     <MessageSquareText size={28} className="opacity-40" />
                     <p className="text-xs font-bold">Tidak ada negosiasi aktif saat ini.</p>
                  </div>
                ) : (
                  negotiations.map((neg) => {
                    const priceRequested = neg.requested_unit_price || 0;
                    const priceOriginal = neg.original_unit_price || 0;
                    const discountPercentage = priceOriginal > 0 
                      ? Math.round(((priceOriginal - priceRequested) / priceOriginal) * 100)
                      : 0;

                    const dateFormatted = formatDateTime(neg.latest_message_at || neg.created_at);

                    return (
                      <div key={neg.id} className="p-4 sm:p-6 bg-primary/5 border border-primary/20 rounded-2xl sm:rounded-[2rem] space-y-4 shadow-sm">
                         <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 min-w-0">
                               <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                                  <MessageSquareText size={18} />
                               </div>
                               <div className="min-w-0">
                                  <p className="font-black text-sm truncate">{neg.umkm_name || 'Pembeli UMKM'}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                     <p className="text-xs text-muted-foreground font-medium truncate max-w-[110px]">{neg.product_name || 'Produk'}</p>
                                     {dateFormatted && (
                                       <>
                                         <span className="text-muted-foreground/30 text-xs">•</span>
                                         <p className="text-[10px] text-muted-foreground/70 font-semibold shrink-0">
                                            {dateFormatted}
                                         </p>
                                       </>
                                     )}
                                  </div>
                               </div>
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest shrink-0">{neg.status}</span>
                         </div>
                         <div className="flex items-center justify-between bg-black/5 p-4 rounded-2xl text-xs gap-4">
                            <div className="min-w-0">
                               <p className="text-[10px] text-muted-foreground font-medium truncate">Jumlah: {neg.quantity || 1} unit</p>
                               <p className="font-bold text-muted-foreground/80 line-through mt-0.5 truncate">Rp {priceOriginal.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="text-right shrink-0">
                               {discountPercentage > 0 && (
                                 <span className="bg-primary/20 text-primary text-[10px] font-black px-1.5 py-0.5 rounded mr-2">-{discountPercentage}% Nego</span>
                               )}
                               <span className="text-sm font-black text-primary">Rp {priceRequested.toLocaleString('id-ID')}</span>
                            </div>
                         </div>
                          <div className="flex gap-3">
                             <Link to="/negotiations" className="flex-1">
                               <Button className="w-full h-10 rounded-xl bg-primary text-white text-xs font-black">Counter</Button>
                             </Link>
                             <Link to="/negotiations" className="flex-1">
                               <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-black">Reject</Button>
                             </Link>
                          </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
