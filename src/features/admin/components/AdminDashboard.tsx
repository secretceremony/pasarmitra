import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  TrendingUp, 
  Activity,
  BarChart3,
  Globe,
  Loader2,
  Wallet,
  Scale,
  Clock,
  History,
  AlertTriangle,
  Users,
  ShoppingBag,
  Box
} from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

export const AdminDashboard = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [moderationItems, setModerationItems] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [globalBaseline, setGlobalBaseline] = useState<number>(1.375);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch profiles safely
        try {
          const profSnap = await getDocs(collection(db, 'profiles'));
          const pList: any[] = [];
          profSnap.forEach(d => pList.push({ id: d.id, ...d.data() }));
          setProfiles(pList);
        } catch (e) {
          console.error("Error fetching profiles:", e);
        }

        // Fetch orders safely
        try {
          const ordersSnap = await getDocs(collection(db, 'orders'));
          const oList: any[] = [];
          ordersSnap.forEach(d => oList.push({ id: d.id, ...d.data() }));
          setOrders(oList);
        } catch (e) {
          console.error("Error fetching orders:", e);
        }

        // Fetch disputes safely
        try {
          const disputesSnap = await getDocs(collection(db, 'disputes'));
          const dList: any[] = [];
          disputesSnap.forEach(d => dList.push({ id: d.id, ...d.data() }));
          setDisputes(dList);
        } catch (e) {
          console.error("Error fetching disputes:", e);
        }

        // Fetch moderation items safely
        try {
          const modSnap = await getDocs(collection(db, 'moderation_items'));
          const mList: any[] = [];
          modSnap.forEach(d => mList.push({ id: d.id, ...d.data() }));
          setModerationItems(mList);
        } catch (e) {
          console.error("Error fetching moderation items:", e);
        }

        // Fetch audit logs safely
        try {
          const logsSnap = await getDocs(collection(db, 'audit_logs'));
          const lList: any[] = [];
          logsSnap.forEach(d => lList.push({ id: d.id, ...d.data() }));
          setAuditLogs(lList);
        } catch (e) {
          console.error("Error fetching audit logs:", e);
        }

        // Fetch commission settings safely
        try {
          const globalDoc = await getDoc(doc(db, 'settings', 'commission'));
          if (globalDoc.exists()) {
            setGlobalBaseline(globalDoc.data().globalBaseline || 1.375);
          }
        } catch (e) {
          console.error("Error fetching settings/commission:", e);
        }

      } catch (err) {
        console.error("Gagal memuat data admin dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // Distributors status
  const distributors = profiles.filter(p => p.role === 'DISTRIBUTOR');
  const pendingVerifications = distributors.filter(p => !p.is_verified || p.verification_status === 'PENDING_REVIEW').length;
  const verifiedDistributors = distributors.filter(p => p.is_verified || p.verification_status === 'VERIFIED').length;
  const umkmCount = profiles.filter(p => p.role === 'UMKM').length;
  
  // Product Approval
  const pendingProductApprovals = moderationItems.filter(m => 
    (((m.targetType ?? m.type) || '').toUpperCase() === 'PRODUCT') && 
    ((m.status || '').toLowerCase() === 'pending')
  ).length;

  // Disputes & Refunds (deduplicated by invoiceId/orderId/id key)
  const uniqueDisputes = disputes.filter((d, index, self) => {
    const key = d.invoiceId || d.orderId || d.id;
    
    // Hide development mock disputes by default unless safe development flag is set
    const isMock = typeof d.id === 'string' && d.id.startsWith('dsp-');
    const showMock = typeof window !== 'undefined' && localStorage.getItem('show_mock_data') === 'true';
    if (isMock && !showMock) return false;

    return self.findIndex(x => (x.invoiceId || x.orderId || x.id) === key) === index;
  });
  const activeDisputesCount = uniqueDisputes.filter(d => d.status === 'OPEN' || d.status === 'IN_MEDIATION' || d.status === 'REFUND_REQUESTED').length;
  const pendingRefundsCount = uniqueDisputes.filter(d => d.status === 'OPEN' || d.status === 'REFUND_REQUESTED').length;
  
  // Financial metrics
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const totalVolume = completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const commissionRevenue = completedOrders.reduce((sum, o) => {
    const fee = o.platform_fee ?? o.service_fee;
    if (fee !== undefined && fee !== null) {
      return sum + Number(fee);
    }
    return sum + (Number(o.total_amount) || 0) * (globalBaseline / 100);
  }, 0);
  const subscriptionRevenue = 0; // Safe fallback Rp 0
  const platformRevenue = commissionRevenue + subscriptionRevenue;

  const formatTurnover = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(2)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const formatStatusToIndonesian = (statusStr: string) => {
    const s = (statusStr || '').toUpperCase();
    switch (s) {
      case 'OPEN': return 'Aktif';
      case 'PENDING': return 'Menunggu';
      case 'IN_MEDIATION': return 'Mediasi Aktif';
      case 'REFUND_REQUESTED': return 'Refund Diminta';
      case 'RESOLVED': return 'Selesai';
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak';
      default: return statusStr || 'Menunggu';
    }
  };

  const getMonthlyTransactionVolume = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const volumeMap: Record<string, number> = {};
    const now = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      volumeMap[mName] = 0;
      last6Months.push(mName);
    }

    orders.forEach(o => {
      if (o.status === 'delivered' && o.created_at) {
        try {
          const d = new Date(o.created_at);
          if (isNaN(d.getTime())) return;
          const mName = months[d.getMonth()];
          if (volumeMap[mName] !== undefined) {
            volumeMap[mName] += Number(o.total_amount) || 0;
          }
        } catch (e) {
          console.error("Invalid date in monthly transaction volume calculation:", o.created_at, e);
        }
      }
    });

    return last6Months.map(name => ({
      name,
      value: volumeMap[name] || 0
    }));
  };

  const chartData = getMonthlyTransactionVolume();

  const getRecentAuditLogs = () => {
    const sorted = [...auditLogs].sort((a, b) => {
      const aTime = a.created_at || a.timestamp || '';
      const bTime = b.created_at || b.timestamp || '';
      return bTime.localeCompare(aTime);
    });
    return sorted.slice(0, 5);
  };

  const recentLogs = getRecentAuditLogs();
  const hasTransactions = completedOrders.length > 0;

  const getActionQueueItems = () => {
    const items: any[] = [];

    // 1. Pending distributor verifications
    profiles
      .filter(p => p.role === 'DISTRIBUTOR' && (!p.is_verified || p.verification_status === 'PENDING_REVIEW'))
      .forEach(p => {
        items.push({
          id: `verify-${p.id}`,
          priority: 'Tinggi',
          priorityColor: 'bg-red-500/10 text-red-500 border-red-500/20 dark:border-red-500/30',
          type: 'Verifikasi Distributor',
          reference: p.business_name || p.fullName || p.email || 'Distributor Baru',
          status: 'Menunggu Review',
          actionText: 'Review',
          link: '/admin/verifications'
        });
      });

    // 2. Pending product approvals
    moderationItems
      .filter(m => (((m.targetType ?? m.type) || '').toUpperCase() === 'PRODUCT') && ((m.status || '').toLowerCase() === 'pending'))
      .forEach(m => {
        items.push({
          id: `mod-${m.id}`,
          priority: 'Sedang',
          priorityColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:border-amber-500/30',
          type: 'Approval Produk',
          reference: m.productName || m.title || m.targetId || 'Produk Baru',
          status: 'Menunggu Approval',
          actionText: 'Cek Produk',
          link: '/admin/moderation'
        });
      });

    // 3. Open disputes (uses uniqueDisputes to avoid duplicate logs/rows)
    uniqueDisputes
      .filter(d => d.status === 'OPEN' || d.status === 'IN_MEDIATION' || d.status === 'REFUND_REQUESTED')
      .forEach(d => {
        items.push({
          id: `dispute-${d.id}`,
          priority: 'Tinggi',
          priorityColor: 'bg-red-500/10 text-red-500 border-red-500/20 dark:border-red-500/30',
          type: 'Dispute',
          reference: d.invoiceId || d.orderId || `Sengketa #${d.id.slice(0, 6)}`,
          status: formatStatusToIndonesian(d.status),
          actionText: 'Proses',
          link: '/admin/disputes'
        });
      });

    return items;
  };

  const actionQueue = getActionQueueItems();

  const getRelativeTimeText = (timestampStr: string, createdAtStr?: string) => {
    if (!createdAtStr && !timestampStr) return 'Baru saja';
    try {
      const date = new Date(createdAtStr || timestampStr);
      const diffMs = new Date().getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);

      if (diffMin < 1) return 'Baru saja';
      if (diffMin < 60) return `${diffMin} menit lalu`;
      if (diffHr < 24) return `${diffHr} jam lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return timestampStr || 'Baru saja';
    }
  };

  const getReadableEventTitle = (event: string) => {
    const ev = (event || '').toUpperCase();
    if (ev.includes('COMMISSION') || ev.includes('KOMISI') || ev === 'KOMISI_BASELINE_REKALIBRASI') {
      return 'Komisi platform diperbarui';
    }
    if (ev === 'DISTRIBUTOR_VERIFICATION_APPROVED' || ev.includes('VERIFICATION_APPROVED')) {
      return 'Verifikasi distributor disetujui';
    }
    if (ev === 'DISTRIBUTOR_VERIFICATION_REJECTED' || ev.includes('VERIFICATION_REJECTED')) {
      return 'Verifikasi distributor ditolak';
    }
    if (ev === 'DISTRIBUTOR_VERIFICATION_ESCALATED') {
      return 'Verifikasi distributor dieskalasi';
    }
    if (ev === 'PRODUCT_APPROVED' || ev.includes('MODERATION_APPROVED') || ev.includes('MODERATION_APPROVED_SAFE')) {
      return 'Produk disetujui';
    }
    if (ev === 'PRODUCT_REJECTED' || ev.includes('MODERATION_CONTENT_BLOCKED')) {
      return 'Produk ditolak';
    }
    if (ev === 'DISPUTE_OPENED' || ev.includes('DISPUTE_CREATED')) {
      return 'Dispute baru dibuat';
    }
    if (ev === 'REFUND_APPROVED' || ev.includes('DISPUTE_REFUNDED')) {
      return 'Refund disetujui';
    }
    if (ev === 'DISPUTE_RESOLVED') {
      return 'Dispute diselesaikan';
    }
    if (ev === 'DISPUTE_REJECTED') {
      return 'Dispute ditolak';
    }
    if (ev === 'DISPUTE_ESCALATED') {
      return 'Dispute dieskalasi';
    }
    if (ev === 'USER_SUSPENDED') {
      return 'Pengguna ditangguhkan';
    }
    if (ev === 'USER_UNSUSPENDED') {
      return 'Tangguhan pengguna dicabut';
    }
    if (ev === 'USER_SOFT_DELETED') {
      return 'Pengguna dinonaktifkan';
    }
    return ev.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getReadableEventDetails = (log: any) => {
    const ev = (log.event || '').toUpperCase();
    let details = log.details || '';
    
    if (ev.includes('COMMISSION') || ev.includes('KOMISI')) {
      const match = details.match(/(\d+\.\d+)/);
      if (match) {
        const num = parseFloat(match[1]);
        details = details.replace(match[1], `${parseFloat(num.toFixed(2))}`);
      }
      if (details.includes('recalibrated') || details.includes('adjusted') || details.includes('REKALIBRASI') || details.includes('baseline')) {
        const rateMatch = details.match(/(\d+\.?\d*)/);
        const rate = rateMatch ? `${parseFloat(parseFloat(rateMatch[1]).toFixed(2))}%` : '1.38%';
        return `Baseline komisi platform disesuaikan menjadi ${rate}.`;
      }
    }
    
    if (details.toUpperCase().includes('APPROVED')) {
      details = details.replace(/approved/gi, 'disetujui');
    }
    if (details.toUpperCase().includes('REJECTED')) {
      details = details.replace(/rejected/gi, 'ditolak');
    }
    if (details.toUpperCase().includes('SUSPENDED')) {
      details = details.replace(/suspended/gi, 'ditangguhkan');
    }
    if (details.toUpperCase().includes('UNSUSPENDED')) {
      details = details.replace(/unsuspended/gi, 'tangguhan dicabut');
    }
    if (details.toUpperCase().includes('SOFT DELETED')) {
      details = details.replace(/soft deleted/gi, 'dinonaktifkan');
    }
    
    return details;
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between flex-wrap gap-6">
         <div className="space-y-1 border-l-4 border-[#FFB162] pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Dashboard Admin PasarMitra</h1>
            <p className="text-muted-foreground font-medium">Pantau operasional marketplace B2B, verifikasi distributor, transaksi, dispute, dan pendapatan platform.</p>
         </div>
         <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="h-14 px-8 rounded-2xl border-border bg-card font-black flex gap-2 items-center cursor-pointer"
              onClick={() => navigate('/admin/verifications')}
            >
               <ShieldCheck size={20} className="text-[#FFB162]" />
               Tinjau Distributor
            </Button>
            <Button 
              className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20 flex gap-2 items-center cursor-pointer"
              onClick={() => navigate('/admin/disputes')}
            >
               <Scale size={20} />
               Arbitrase Sengketa
            </Button>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Data Dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             {[
               { 
                 label: 'Total Pengguna', 
                 value: `${profiles.length}`, 
                 subtext: 'Distributor, UMKM, dan admin terdaftar', 
                 icon: Users, 
                 color: 'text-[#FFB162]',
                 badge: null
               },
               { 
                 label: 'Distributor Aktif', 
                 value: `${verifiedDistributors}`, 
                 subtext: 'Seller B2B yang telah disetujui', 
                 icon: ShieldCheck, 
                 color: 'text-emerald-500',
                 badge: null
               },
               { 
                 label: 'UMKM Aktif', 
                 value: `${umkmCount}`, 
                 subtext: 'Pembeli aktif dalam ekosistem', 
                 icon: ShoppingBag, 
                 color: 'text-blue-500',
                 badge: null
               },
               { 
                 label: 'Verifikasi Pending', 
                 value: `${pendingVerifications}`, 
                 subtext: 'Distributor menunggu review', 
                 icon: ShieldCheck, 
                 color: 'text-amber-500',
                 badge: pendingVerifications > 0 ? { text: 'PERLU REVIEW', style: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' } : null
               },
               { 
                 label: 'Produk Pending', 
                 value: `${pendingProductApprovals}`, 
                 subtext: 'Produk menunggu approval', 
                 icon: Box, 
                 color: 'text-rose-500',
                 badge: pendingProductApprovals > 0 ? { text: 'PERLU APPROVAL', style: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' } : null
               },
               { 
                 label: 'Dispute Aktif', 
                 value: `${activeDisputesCount}`, 
                 subtext: 'Komplain transaksi yang perlu tindakan', 
                 icon: Scale, 
                 color: 'text-red-500',
                 badge: activeDisputesCount > 0 ? { text: 'PERLU TINDAKAN', style: 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' } : null
               },
               { 
                 label: 'Komisi Bulan Ini', 
                 value: formatTurnover(commissionRevenue), 
                 subtext: 'Pendapatan dari transaksi berhasil', 
                 icon: TrendingUp, 
                 color: 'text-emerald-500',
                 badge: null
               },
               { 
                 label: 'Langganan Bulan Ini', 
                 value: formatTurnover(subscriptionRevenue), 
                 subtext: 'Pendapatan dari paket distributor', 
                 icon: Wallet, 
                 color: 'text-blue-500',
                 badge: null
               }
             ].map((stat, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
                 className="bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-xl space-y-4 hover:border-primary/30 transition-all group"
               >
                  <div className="flex justify-between items-start">
                     <div className={cn("w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center", stat.color)}>
                        <stat.icon size={28} />
                     </div>
                     {stat.badge && (
                        <span className={cn("text-xs font-black px-3 py-1 rounded-full border", stat.badge.style)}>
                           {stat.badge.text}
                        </span>
                     )}
                  </div>
                  <div>
                     <h3 className="text-2xl font-black tracking-tighter">{stat.value}</h3>
                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                     <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">{stat.subtext}</p>
                  </div>
               </motion.div>
             ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
             {/* Main Chart */}
             <div className="lg:col-span-2 bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                      <BarChart3 className="text-primary" />
                      Volume GMV Transaksi Bulanan
                   </h3>
                   <div className="flex gap-2">
                      <Button variant="ghost" className="h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground">GMV (IDR)</Button>
                   </div>
                </div>
                
                {!hasTransactions ? (
                   <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border/60 rounded-3xl bg-muted/10 p-8 text-center space-y-4">
                      <TrendingUp size={48} className="text-muted-foreground/40" />
                      <div className="space-y-1">
                         <p className="text-lg font-black text-foreground">Belum ada transaksi bulan ini</p>
                         <p className="text-xs text-muted-foreground max-w-sm">Data transaksi akan muncul setelah UMKM melakukan pembelian dari distributor.</p>
                      </div>
                      <Button 
                         variant="outline" 
                         size="sm" 
                         className="h-10 px-6 rounded-xl border-border bg-card font-black text-xs uppercase tracking-widest cursor-pointer mt-2"
                         onClick={() => navigate('/admin/finances')}
                      >
                         Lihat Keuangan
                      </Button>
                   </div>
                ) : (
                   <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartData}>
                            <defs>
                               <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FFB162" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#FFB162" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#C9C1B1" opacity={0.2} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5C6A7A', fontSize: 12, fontWeight: 700}} />
                            <YAxis 
                               axisLine={false} 
                               tickLine={false} 
                               tick={{fill: '#5C6A7A', fontSize: 12, fontWeight: 700}} 
                               tickFormatter={(v) => formatTurnover(v)}
                            />
                            <Tooltip 
                               formatter={(value: any) => [formatTurnover(Number(value)), 'Total Volume']}
                               contentStyle={{ backgroundColor: '#1B2632', border: 'none', borderRadius: '16px', color: '#EEE9DF' }}
                               itemStyle={{ color: '#FFB162', fontWeight: 900 }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#FFB162" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                )}
             </div>

             {/* Side Panel: Ringkasan Operasional */}
             <div className="bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                     <Globe className="text-primary" />
                     Ringkasan Operasional
                  </h3>
                  <div className="space-y-6 pt-6">
                     {[
                       { label: 'Komisi Platform', value: `${parseFloat(globalBaseline.toFixed(2))}%`, link: '/admin/commissions', color: 'text-[#FFB162]' },
                       { label: 'Dispute Aktif', value: `${activeDisputesCount} Kasus`, link: '/admin/disputes', color: 'text-rose-500' },
                       { label: 'Refund Pending', value: `${pendingRefundsCount} Klaim`, link: '/admin/disputes', color: 'text-red-500' }
                     ].map((stat) => (
                        <div 
                          key={stat.label} 
                          className="flex items-center justify-between p-4 bg-muted/20 border border-border/30 rounded-2xl hover:border-primary/40 transition-all cursor-pointer"
                          onClick={() => navigate(stat.link)}
                        >
                           <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                           <span className={cn("text-sm font-black", stat.color)}>{stat.value}</span>
                        </div>
                     ))}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-border/30">
                   <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
                      <Activity className="text-primary animate-pulse" size={28} />
                      <div>
                         <p className="text-sm font-black leading-tight">Sistem Normal</p>
                         <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Auth aktif &bull; Database aktif &bull; Storage aktif</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Antrian Tindakan Admin Section */}
          <div className="bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                      <Scale className="text-primary" />
                      Antrian Tindakan Admin
                   </h3>
                   <p className="text-muted-foreground font-medium text-xs">
                      Daftar tugas operasional marketplace B2B yang mendesak dan membutuhkan tindakan persetujuan super admin.
                   </p>
                </div>
                {actionQueue.length > 0 && (
                   <span className="bg-primary/10 text-primary text-xs font-black px-3.5 py-1.5 rounded-full border border-primary/20">
                      {actionQueue.length} TUGAS TERTUNDA
                   </span>
                )}
             </div>

             {actionQueue.length === 0 ? (
                <div className="p-10 border border-dashed border-border/60 rounded-3xl bg-muted/10 text-center space-y-3">
                   <ShieldCheck className="mx-auto text-emerald-500" size={40} />
                   <div>
                      <p className="font-black text-sm text-foreground">Tidak ada tindakan tertunda</p>
                      <p className="text-xs text-muted-foreground">Semua operasional aman.</p>
                   </div>
                </div>
             ) : (
                <div className="overflow-x-auto border border-border/30 rounded-2xl">
                   <table className="w-full text-left border-collapse font-sans">
                      <thead>
                         <tr className="bg-muted/30 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <th className="p-4 pl-6">Prioritas</th>
                            <th className="p-4">Tipe</th>
                            <th className="p-4">Nama / Referensi</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 pr-6 text-right">Aksi</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 text-xs font-bold text-foreground">
                         {actionQueue.slice(0, 5).map((item) => (
                            <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                               <td className="p-4 pl-6">
                                  <span className={cn("px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider", item.priorityColor)}>
                                     {item.priority}
                                  </span>
                               </td>
                               <td className="p-4">{item.type}</td>
                               <td className="p-4 text-muted-foreground">{item.reference}</td>
                               <td className="p-4">
                                  <span className="text-amber-500 font-extrabold">{item.status}</span>
                               </td>
                               <td className="p-4 pr-6 text-right">
                                  <Button 
                                     size="sm" 
                                     className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                     onClick={() => navigate(item.link)}
                                  >
                                     {item.actionText}
                                  </Button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>

          {/* Platform Revenue Summary Section */}
          <div className="bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-6">
             <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   <Wallet className="text-primary" />
                   Pendapatan Platform
                </h3>
                <p className="text-muted-foreground font-medium text-xs">
                   Rangkuman model bisnis platform PasarMitra yang bersumber dari komisi transaksi B2B distributor-UMKM dan biaya langganan distributor aktif.
                </p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {[
                  { label: 'Komisi Transaksi', value: formatTurnover(commissionRevenue), desc: 'Berdasarkan volume transaksi distributor' },
                  { label: 'Langganan Distributor', value: formatTurnover(subscriptionRevenue), desc: 'Paket langganan bulanan aktif' },
                  { label: 'Total Pendapatan Platform', value: formatTurnover(platformRevenue), desc: 'Akumulasi komisi + langganan' },
                  { label: 'Estimasi Pendapatan Bulan Ini', value: formatTurnover(platformRevenue), desc: 'Estimasi pendapatan berjalan' }
                ].map((item) => (
                  <div key={item.label} className="p-6 bg-muted/20 border border-border/30 rounded-2xl space-y-1 hover:border-primary/20 transition-all">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p>
                     <p className="text-2xl font-black text-foreground">{item.value}</p>
                     <p className="text-[10px] font-medium text-muted-foreground/60">{item.desc}</p>
                  </div>
                ))}
             </div>
          </div>

          {/* Recent Operational Activity Feed */}
          <div className="bg-[#1B2632] rounded-[4rem] p-12 text-[#EEE9DF] relative overflow-hidden shadow-3xl">
             <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent" />
             <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-center flex-wrap gap-4">
                   <div className="space-y-1">
                      <h2 className="text-3xl font-black tracking-tighter leading-tight flex items-center gap-3">
                         <History className="text-primary" />
                         Aktivitas Terbaru
                      </h2>
                      <p className="text-white/60 font-medium text-sm max-w-lg">Jejak aktivitas, pendaftaran, persetujuan produk, dan tindakan administratif platform.</p>
                   </div>
                   <Button 
                     variant="outline" 
                     className="h-10 px-6 rounded-xl border-white/20 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest cursor-pointer"
                     onClick={() => navigate('/admin/audit')}
                   >
                      Lihat Semua Log
                   </Button>
                </div>

                <div className="space-y-4">
                   {recentLogs.length === 0 ? (
                      <p className="text-white/40 font-bold text-sm italic py-6">Belum ada aktivitas terbaru.</p>
                   ) : (
                      recentLogs.map((log) => (
                        <div key={log.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="space-y-1">
                              <h4 className="text-base font-black text-white">{getReadableEventTitle(log.event)}</h4>
                              <p className="text-sm font-bold text-white/80">{getReadableEventDetails(log)}</p>
                              <p className="text-xs text-white/40 font-bold flex items-center gap-1.5 pt-1 flex-wrap">
                                 {log.user ? (
                                   <a href={`mailto:${log.user}`} className="hover:text-primary transition-colors hover:underline">
                                     {log.user}
                                   </a>
                                 ) : (
                                   <span>System</span>
                                 )}
                                 <span>&bull;</span>
                                 <Clock size={12} className="inline animate-none text-white/40" /> 
                                 <span>{getRelativeTimeText(log.timestamp, log.created_at)}</span>
                              </p>
                           </div>
                           <div className="shrink-0 text-right">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                log.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              )}>
                                 {log.status === 'SUCCESS' ? 'BERHASIL' : log.status === 'WARNING' ? 'PERINGATAN' : log.status === 'BLOCK' ? 'TERBLOKIR' : log.status}
                              </span>
                           </div>
                        </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
