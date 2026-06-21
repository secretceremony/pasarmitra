import React from 'react';
import { toast } from 'sonner';
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

import { useAuthStore } from '../../../store/use-auth-store';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const NEGOTIATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  countered: 'Ditawar Balik',
  accepted: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  converted_to_order: 'Selesai',
  checked_out: 'Selesai'
};

export const DistributorDashboard = () => {
  const { user } = useAuthStore();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

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
        const list: any[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const amount = data.total_amount || 0;
          const status = data.status || 'pending';
          const orderDate = data.created_at || data.timestamp || null;

          if (status !== 'cancelled') {
            revenue += amount;
          }
          if (status === 'pending' || status === 'processing' || status === 'shipped') {
            pending++;
          }
          if (status === 'delivered') {
            completed++;
          }

          list.push({
            id: docSnap.id,
            buyer: data.buyer_name || data.organization_name || 'Tanpa Nama',
            amount: `Rp ${amount.toLocaleString('id-ID')}`,
            status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
            time: orderDate ? formatDateTime(orderDate) : 'Baru saja',
            rawDate: orderDate ? new Date(orderDate).getTime() : 0,
            ...data
          });
        });

        // Sort by date descending
        list.sort((a, b) => b.rawDate - a.rawDate);

        setStats({
          totalRevenue: revenue,
          totalOrders: total,
          pendingOrders: pending,
          completedOrders: completed
        });
        setRecentOrders(list.slice(0, 3));
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
    <div className="space-y-10 w-full max-w-full overflow-hidden min-w-0">
      {/* Verification Warning Card for Unverified Distributors */}
      {user && !user.is_verified && (
        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
               <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-amber-800">
                {user.verification_status === 'PENDING_REVIEW' ? 'Akun Dalam Proses Verifikasi' :
                 user.verification_status === 'REJECTED' ? 'Verifikasi Ditolak' :
                 user.verification_status === 'NEEDS_REVISION' ? 'Dokumen Perlu Diperbaiki' :
                 'Akun Belum Terverifikasi'}
              </h3>
              <p className="text-xs font-semibold text-amber-700/80 leading-relaxed mt-0.5">
                {user.verification_status === 'PENDING_REVIEW'
                  ? 'Pengajuan verifikasi usaha Anda sedang diperiksa oleh admin. Harap tunggu.'
                  : user.verification_status === 'REJECTED'
                    ? `Pengajuan ditolak: ${user.verification_notes || user.rejection_reason || 'Periksa kembali dokumen Anda dan ajukan ulang.'}`
                    : user.verification_status === 'NEEDS_REVISION'
                      ? `Revisi diperlukan: ${user.verification_notes || 'Lengkapi atau perbaiki data verifikasi Anda.'}`
                      : 'Akun distributor Anda belum terverifikasi. Ajukan verifikasi usaha terlebih dahulu sebelum produk dapat tampil di marketplace.'}
              </p>
            </div>
          </div>
          {(user.verification_status !== 'PENDING_REVIEW') && (
            <Link to="/distributor/profile">
              <Button className="h-10 px-6 rounded-xl bg-amber-600 text-white font-black text-xs hover:bg-amber-700 shadow-lg shadow-amber-600/20 whitespace-nowrap">
                Ajukan Verifikasi
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter">Kontrol Distributor</h1>
          <p className="text-muted-foreground font-medium text-lg">Kelola inventaris, pemenuhan pesanan, dan verifikasi bisnis Anda secara real-time.</p>
        </div>
        <div className="flex gap-4">
            <Link 
              to="/inventory"
              onClick={(e) => {
                if (user?.is_verified !== true) {
                  e.preventDefault();
                  toast.error("Akun Anda belum terverifikasi secara legal. Silakan lengkapi berkas legalitas usaha Anda.");
                }
              }}
            >
              <Button 
                className={cn(
                  "h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 transition-all",
                  user?.is_verified !== true && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground shadow-none hover:bg-muted"
                )}
                aria-disabled={user?.is_verified !== true}
              >
                 <Package className="mr-2" size={20} />
                 Tambah Produk
              </Button>
            </Link>

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

      {/* Two-column dashboard: Recent Orders (main) + Open Negotiations (side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full min-w-0">

        {/* ── Main column: Recent Orders + Chart ── */}
        <div className="lg:col-span-2 min-w-0 overflow-hidden flex flex-col gap-8">

          {/* Recent Incoming Orders */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black tracking-tight truncate">Pesanan Masuk Terbaru</h3>
              <Link to="/orders" className="shrink-0">
                <Button variant="link" className="text-primary font-bold px-0">Lihat Semua</Button>
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {isLoadingStats ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground bg-muted/20 rounded-2xl">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <p className="font-black text-[10px] uppercase tracking-widest">Memuat pesanan...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center bg-muted/10 border border-dashed border-border/50 rounded-2xl">
                  <ShoppingBag size={28} className="text-muted-foreground/30" />
                  <p className="text-sm font-bold text-muted-foreground">
                    Belum ada pesanan masuk.<br />
                    <span className="font-normal text-xs">Pesanan baru dari mitra UMKM akan muncul di sini.</span>
                  </p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-4 p-4 bg-muted/20 border border-border/40 rounded-2xl group hover:border-primary/30 hover:bg-primary/5 transition-all min-w-0 overflow-hidden"
                  >
                    {/* Status icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      order.status === 'Pending'    ? "bg-amber-500/15 text-amber-500" :
                      order.status === 'Processing' ? "bg-blue-500/15 text-blue-500"   :
                      order.status === 'Shipped'    ? "bg-violet-500/15 text-violet-500" :
                      "bg-emerald-500/15 text-emerald-500"
                    )}>
                      <ShoppingBag size={18} />
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm leading-tight truncate">
                        {order.buyer || 'Tanpa Nama'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground font-mono truncate max-w-[120px]">
                          #{typeof order.id === 'string' ? order.id.slice(0, 10) : order.id}
                        </span>
                        <span className="text-muted-foreground/30 text-xs">•</span>
                        <span className="text-xs font-black text-primary shrink-0">{order.amount}</span>
                        <span className="text-muted-foreground/30 text-xs">•</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{order.time}</span>
                      </div>
                    </div>

                    {/* Status badge + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider hidden sm:inline-flex",
                        order.status === 'Pending'    ? "bg-amber-500/20 text-amber-600" :
                        order.status === 'Processing' ? "bg-blue-500/20 text-blue-600"   :
                        order.status === 'Shipped'    ? "bg-violet-500/20 text-violet-600" :
                        "bg-emerald-500/20 text-emerald-600"
                      )}>
                        {order.status}
                      </span>
                      <Link to="/orders">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-8 px-3 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Proses
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Inventory Turn Rate info state */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-black text-lg truncate">Perputaran Inventaris</h4>
            </div>
            <div className="h-56 w-full bg-muted/5 border border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              <p className="text-muted-foreground font-semibold text-sm max-w-xs">
                Analitik perputaran inventaris akan tersedia setelah pesanan selesai terkumpul.
              </p>
            </div>
          </div>
        </div>

        {/* ── Side column: Open Negotiations ── */}
        <div className="min-w-0 overflow-hidden">
          <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-5 min-w-0 overflow-hidden h-fit">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black tracking-tight truncate">Negosiasi Aktif</h3>
              <Link to="/negotiations" className="shrink-0">
                <Button variant="link" className="text-primary font-bold px-0">Lihat Semua</Button>
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {isLoadingNegotiations ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground bg-muted/20 rounded-2xl">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menyelaraskan data...</p>
                </div>
              ) : negotiationsError ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-rose-600 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                  <AlertCircle size={22} />
                  <p className="text-xs font-bold text-center px-4">{negotiationsError}</p>
                </div>
              ) : negotiations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center bg-muted/10 border border-dashed border-border/50 rounded-2xl w-full">
                  <MessageSquareText size={28} className="text-muted-foreground/30" />
                  <p className="text-sm font-bold text-muted-foreground">
                    Tidak ada negosiasi aktif.<br />
                    <span className="font-normal text-xs">Penawaran baru dari UMKM akan muncul di sini.</span>
                  </p>
                </div>
              ) : (
                negotiations.map((neg) => {
                  const priceRequested = neg.requested_unit_price || 0;
                  const priceOriginal  = neg.original_unit_price  || 0;
                  const discountPct    = priceOriginal > 0
                    ? Math.round(((priceOriginal - priceRequested) / priceOriginal) * 100)
                    : 0;
                  const dateFormatted  = formatDateTime(neg.latest_message_at || neg.created_at);

                  return (
                    <div
                      key={neg.id}
                      className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3 min-w-0 overflow-hidden"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                            <MessageSquareText size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-sm truncate leading-tight">{neg.umkm_name || 'Pembeli UMKM'}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{neg.product_name || 'Produk'}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest shrink-0 pt-0.5 bg-primary/10 px-2 py-0.5 rounded-md">
                          {NEGOTIATION_STATUS_LABELS[neg.status?.toLowerCase()] || neg.status}
                        </span>
                      </div>

                      {/* Price row */}
                      <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 px-3 py-2.5 rounded-xl gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground truncate">{neg.quantity || 1} unit</p>
                          <p className="text-xs font-bold text-muted-foreground/60 line-through truncate">
                            Rp {priceOriginal.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {discountPct > 0 && (
                            <span className="text-[9px] font-black bg-primary/15 text-primary px-1.5 py-0.5 rounded mr-1">
                              -{discountPct}%
                            </span>
                          )}
                          <span className="text-sm font-black text-primary">
                            Rp {priceRequested.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      {/* Date */}
                      {dateFormatted && (
                        <p className="text-[10px] text-muted-foreground/60 font-medium">{dateFormatted}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link to="/negotiations" className="flex-1">
                          <Button className="w-full h-9 rounded-xl bg-primary text-white text-xs font-black">Balas</Button>
                        </Link>
                        <Link to="/negotiations" className="flex-1">
                          <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-black">Tolak</Button>
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
