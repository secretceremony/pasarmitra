import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/use-auth-store';
import { DistributorDashboard } from '../features/distributor/components/DistributorDashboard';
import { AnalyticsCard } from '../components/common/AnalyticsCard';
import { Button } from '../components/ui/button';
import { 
  DollarSign, 
  ShoppingBag, 
  MessageSquareText, 
  Building2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertCircle,
  XCircle,
  Store,
  UserCheck,
  Eye,
  FileText,
  Loader2,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { orderService, Order } from '../features/orders/services/orderService';
import { formatDate } from '../lib/dateUtils';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Statistics
  const [stats, setStats] = useState({
    totalSpent: 0,
    activeOrders: 0,
    activeNegotiations: 0,
    distributorPartners: 0,
  });

  // User profile verification state
  const [verification, setVerification] = useState<{
    isVerified: boolean;
    status: string;
    notes?: string;
  }>({
    isVerified: false,
    status: 'NOT_SUBMITTED'
  });

  // Lists
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [activeNegotiations, setActiveNegotiations] = useState<any[]>([]);
  const [connectedDistributors, setConnectedDistributors] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user?.role !== 'UMKM' || !user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 1. Fetch verification status from profiles collection to ensure real-time accuracy
        const profileSnap = await getDoc(doc(db, 'profiles', user.id));
        if (profileSnap.exists()) {
          const pData = profileSnap.data();
          setVerification({
            isVerified: pData.is_verified || false,
            status: pData.verification_status || 'NOT_SUBMITTED',
            notes: pData.verification_notes
          });
        }

        // 2. Fetch Buyer Orders
        const ordersList = await orderService.getBuyerOrders(user.id);
        let spent = 0;
        let activeOrd = 0;

        ordersList.forEach((order) => {
          const amount = order.total_amount || 0;
          const status = (order.status || 'pending').toLowerCase();

          if (status !== 'cancelled') {
            spent += amount;
          }
          if (status === 'pending' || status === 'processing' || status === 'shipped') {
            activeOrd++;
          }
        });

        setRecentOrders(ordersList.slice(0, 3));

        // 3. Fetch Buyer Negotiations
        const negQ = query(
          collection(db, 'negotiations'),
          where('umkm_id', '==', user.id)
        );
        const negSnapshot = await getDocs(negQ);
        const negList: any[] = [];
        let activeNegCount = 0;

        negSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const negItem = { id: docSnap.id, ...data };
          const status = (data.status || 'pending').toLowerCase();

          if (status === 'pending' || status === 'countered' || status === 'accepted') {
            activeNegCount++;
            negList.push(negItem);
          }
        });

        // Sort negotiations descending in memory (latest message or creation)
        const sortedNegs = negList.sort((a, b) => {
          const timeA = new Date(a.latest_message_at || a.created_at || 0).getTime();
          const timeB = new Date(b.latest_message_at || b.created_at || 0).getTime();
          return timeB - timeA;
        });
        setActiveNegotiations(sortedNegs.slice(0, 3));

        // 4. Fetch Connected Distributors (partnerships where status == 'active')
        const partnersQ = query(
          collection(db, 'partnerships'),
          where('umkm_id', '==', user.id),
          where('status', '==', 'active')
        );
        const partnersSnapshot = await getDocs(partnersQ);
        const activePartnersCount = partnersSnapshot.size;

        const distList: any[] = [];
        for (const partDoc of partnersSnapshot.docs) {
          const partData = partDoc.data();
          const distId = partData.distributor_id;
          if (distId) {
            const distProfileSnap = await getDoc(doc(db, 'profiles', distId));
            if (distProfileSnap.exists()) {
              const distData = distProfileSnap.data();
              
              // Count active products for this distributor
              const prodQ = query(
                collection(db, 'products'),
                where('distributor_id', '==', distId),
                where('is_active', '==', true)
              );
              const prodSnap = await getDocs(prodQ);

              distList.push({
                id: distId,
                name: distData.organization_name || distData.business_name || distData.full_name || 'Distributor',
                business_district: distData.business_district || 'Balikpapan',
                business_address: distData.business_address || 'Kalimantan Timur',
                is_verified: distData.is_verified || false,
                productCount: prodSnap.size
              });
            }
          }
        }
        setConnectedDistributors(distList);

        setStats({
          totalSpent: spent,
          activeOrders: activeOrd,
          activeNegotiations: activeNegCount,
          distributorPartners: activePartnersCount
        });

      } catch (err) {
        console.error("Gagal memuat data dashboard UMKM:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, user?.role]);

  if (user?.role === 'DISTRIBUTOR') {
    return <DistributorDashboard />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-black text-xs uppercase tracking-widest">Memuat Dashboard...</p>
      </div>
    );
  }

  // Indonesian status mappings
  const getOrderStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Menunggu';
      case 'processing': return 'Diproses';
      case 'shipped': return 'Dikirim';
      case 'delivered': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'shipped': return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getNegotiationStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Menunggu Tanggapan';
      case 'countered': return 'Negosiasi Ulang';
      case 'accepted': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'cancelled': return 'Dibatalkan';
      case 'converted_to_order': return 'Selesai';
      default: return status;
    }
  };

  const getNegotiationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'countered': return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
      case 'accepted': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'rejected': return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'cancelled': return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
      case 'converted_to_order': return 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderVerificationBanner = () => {
    const { isVerified, status, notes } = verification;
    
    if (isVerified) {
      return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 gap-3">
          <div className="flex gap-3 items-start sm:items-center">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-black">UMKM Terverifikasi</p>
              <p className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-400/80">Akun usaha Anda sudah dapat melakukan pembelian grosir.</p>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'PENDING_REVIEW') {
      return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 gap-3">
          <div className="flex gap-3 items-start sm:items-center">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Clock className="text-amber-500 animate-pulse" size={20} />
            </div>
            <div>
              <p className="text-sm font-black">Verifikasi UMKM sedang ditinjau</p>
              <p className="text-xs font-semibold text-amber-600/80 dark:text-amber-400/80">Admin sedang meninjau data usaha Anda.</p>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'NEEDS_REVISION') {
      return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 gap-3 w-full">
          <div className="flex gap-3 items-start sm:items-center">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
              <AlertCircle className="text-rose-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-black">Verifikasi perlu diperbarui</p>
              <p className="text-xs font-semibold text-rose-600/80 dark:text-rose-400/80">
                {notes ? `Catatan: ${notes}` : 'Silakan perbaiki data pengajuan verifikasi Anda.'}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/umkm/profile')}
            className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer w-full sm:w-auto"
          >
            Perbaiki Pengajuan
          </Button>
        </div>
      );
    }

    if (status === 'REJECTED') {
      return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 gap-3 w-full">
          <div className="flex gap-3 items-start sm:items-center">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
              <XCircle className="text-rose-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-black">Verifikasi Ditolak</p>
              <p className="text-xs font-semibold text-rose-600/80 dark:text-rose-400/80">
                {notes ? `Alasan: ${notes}` : 'Pengajuan verifikasi usaha Anda ditolak. Silakan ajukan ulang.'}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/umkm/profile')}
            className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer w-full sm:w-auto"
          >
            Ajukan Ulang
          </Button>
        </div>
      );
    }

    // Default: NOT_SUBMITTED
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 gap-3 w-full">
        <div className="flex gap-3 items-start sm:items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
            <AlertCircle className="text-blue-500" size={20} />
          </div>
          <div>
            <p className="text-sm font-black">Akun UMKM belum terverifikasi</p>
            <p className="text-xs font-semibold text-blue-600/80 dark:text-blue-400/80">Ajukan verifikasi usaha agar dapat melakukan checkout pesanan.</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/umkm/profile')}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer w-full sm:w-auto"
        >
          Ajukan Verifikasi
        </Button>
      </div>
    );
  };

  const isUnverified = !verification.isVerified;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 md:space-y-8 min-w-0 overflow-hidden">
      
      {/* 1. Header & Verification Status */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Selamat datang, {user?.full_name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed">
            Pantau pembelian, negosiasi, dan status pasokan usaha Anda di PasarMitra Balikpapan.
          </p>
        </div>
        
        {renderVerificationBanner()}
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <AnalyticsCard 
          title="Total Belanja" 
          value={`Rp ${stats.totalSpent.toLocaleString('id-ID')}`} 
          icon={DollarSign}
          isLoading={isLoading}
          description="Akumulasi nilai pesanan valid Anda"
        />
        <AnalyticsCard 
          title="Pesanan Aktif" 
          value={stats.activeOrders} 
          icon={ShoppingBag}
          isLoading={isLoading}
          description="Pesanan dalam pengiriman & proses"
        />
        <AnalyticsCard 
          title="Negosiasi Aktif" 
          value={stats.activeNegotiations} 
          icon={MessageSquareText}
          isLoading={isLoading}
          description="Negosiasi harga penawaran terbuka"
        />
        <AnalyticsCard 
          title="Mitra Terhubung" 
          value={stats.distributorPartners} 
          icon={Building2}
          isLoading={isLoading}
          description="Distributor aktif terhubung kemitraan"
        />
      </div>

      {/* 3. Aksi Cepat Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Aksi Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
          {/* Marketplace */}
          <button
            onClick={() => navigate('/marketplace')}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer gap-2 group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Store className="text-primary" size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Belanja Produk
            </span>
          </button>

          {/* Directory */}
          <button
            onClick={() => navigate('/umkm/distributors')}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer gap-2 group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="text-primary" size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Cari Distributor
            </span>
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate('/umkm/cart')}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer gap-2 group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag className="text-primary" size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Lihat Keranjang
            </span>
          </button>

          {/* Orders */}
          <button
            onClick={() => navigate('/orders')}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer gap-2 group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="text-primary" size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Pantau Pesanan
            </span>
          </button>

          {/* Negotiations */}
          <button
            onClick={() => navigate('/umkm/negosiasi-harga')}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer gap-2 group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquareText className="text-primary" size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Negosiasi Harga
            </span>
          </button>

          {/* Disputes */}
          <button
            onClick={() => navigate('/umkm/disputes')}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer gap-2 group min-w-0"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldAlert className="text-primary" size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Komplain Saya
            </span>
          </button>

          {/* Profile & Verification */}
          <button
            onClick={() => navigate('/umkm/profile')}
            className={cn(
              "flex flex-col items-center justify-center text-center p-3 rounded-xl border transition-all cursor-pointer gap-2 group min-w-0",
              isUnverified 
                ? "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/60 animate-pulse" 
                : "border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform",
              isUnverified ? "bg-blue-500/20" : "bg-primary/10"
            )}>
              <UserCheck className={isUnverified ? "text-blue-500" : "text-primary"} size={18} />
            </div>
            <span className="font-black text-[10px] uppercase tracking-wider text-foreground block truncate w-full">
              Profil & Verifikasi
            </span>
          </button>
        </div>
      </div>

      {/* 4. Recent Orders + Active Negotiations Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        
        {/* Recent Orders Card */}
        <div className="border border-border/50 rounded-2xl bg-card p-4 sm:p-5 flex flex-col justify-between min-h-[300px] min-w-0">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2 flex justify-between items-center">
              <span>Pesanan Terbaru</span>
              <button 
                onClick={() => navigate('/orders')} 
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer uppercase tracking-widest"
              >
                Semua <ArrowRight size={10} />
              </button>
            </h3>

            {recentOrders.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs font-bold text-muted-foreground italic">Belum ada pesanan</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">Mulai belanja produk grosir dari marketplace PasarMitra.</p>
                <Button 
                  onClick={() => navigate('/marketplace')} 
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  Jelajahi Marketplace
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {recentOrders.map((order) => (
                  <div key={order.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 min-w-0">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-black text-xs text-foreground truncate">
                          #{order.order_code || order.id.slice(0, 8)}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase border shrink-0", getOrderStatusColor(order.status))}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground truncate">
                        Distributor: {order.distributor_name || 'Distributor'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Tanggal: {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-xs font-black text-foreground italic leading-none">
                        Rp {order.total_amount.toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={() => navigate(`/umkm/orders/${order.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary border border-border/60 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <Eye size={10} />
                        Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Negotiations Card */}
        <div className="border border-border/50 rounded-2xl bg-card p-4 sm:p-5 flex flex-col justify-between min-h-[300px] min-w-0">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2 flex justify-between items-center">
              <span>Negosiasi Aktif</span>
              <button 
                onClick={() => navigate('/umkm/negosiasi-harga')} 
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer uppercase tracking-widest"
              >
                Semua <ArrowRight size={10} />
              </button>
            </h3>

            {activeNegotiations.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs font-bold text-muted-foreground italic">Belum ada negosiasi aktif</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">Ajukan negosiasi harga dari halaman produk jika ingin mendapatkan penawaran khusus.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {activeNegotiations.map((neg) => (
                  <div key={neg.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 min-w-0">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-black text-xs text-foreground truncate block">
                          {neg.product_name}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase border shrink-0", getNegotiationStatusColor(neg.status))}>
                          {getNegotiationStatusLabel(neg.status)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground truncate">
                        Distributor: {neg.distributor_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold italic leading-none pt-0.5">
                        Tawaran: Rp {neg.requested_unit_price.toLocaleString('id-ID')} (Qty: {neg.quantity})
                      </p>
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => navigate(`/umkm/negosiasi-harga?id=${neg.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <MessageSquareText size={10} />
                        Buka
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Connected Distributors Preview List */}
      <div className="border border-border/50 rounded-2xl bg-card p-4 sm:p-5 space-y-4 min-w-0 w-full">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2 flex justify-between items-center">
          <span>Mitra Distributor Anda</span>
          <button 
            onClick={() => navigate('/umkm/distributors')} 
            className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer uppercase tracking-widest"
          >
            Directory <ArrowRight size={10} />
          </button>
        </h3>

        {connectedDistributors.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs font-bold text-muted-foreground italic">Belum ada mitra distributor</p>
            <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">Kirimkan penawaran kemitraan atau ajukan negosiasi ke distributor untuk mulai terhubung.</p>
            <Button 
              onClick={() => navigate('/umkm/distributors')} 
              className="h-8 px-4 rounded-lg bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider cursor-pointer"
            >
              Cari Distributor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedDistributors.map((dist) => (
              <div key={dist.id} className="border border-border/40 p-4 rounded-xl flex flex-col justify-between gap-3 min-w-0">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="text-sm font-black text-foreground truncate flex-1">
                      {dist.name}
                    </h4>
                    {dist.is_verified && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black uppercase rounded shrink-0">
                        <ShieldCheck size={8} /> Verified
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold truncate">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span>Kecamatan {dist.business_district}, Balikpapan</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium truncate pl-4">
                      {dist.business_address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/10">
                  <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                    {dist.productCount} Produk Aktif
                  </span>
                  <button
                    onClick={() => navigate(`/distributor/${dist.id}`)}
                    className="text-[9px] font-black text-primary hover:text-primary/80 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                  >
                    Profil <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Bottom Marketplace Teaser */}
      <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 w-full min-w-0">
        <div className="space-y-1 text-center md:text-left min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-black text-[#D4AF37] flex items-center justify-center md:justify-start gap-1.5">
            <TrendingUp size={16} />
            Butuh stok pasokan baru?
          </h4>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground leading-relaxed">
            Jelajahi produk grosir sembako dan ajukan negosiasi dengan distributor resmi terverifikasi di Balikpapan.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/marketplace')}
          className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#c49f27] text-white font-black text-xs uppercase tracking-wider flex gap-2 items-center justify-center shrink-0 cursor-pointer w-full md:w-auto"
        >
          <Store size={14} />
          Jelajahi Marketplace
        </Button>
      </div>

    </div>
  );
}
