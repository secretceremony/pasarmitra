import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  Download, 
  ArrowUpRight, 
  CreditCard, 
  PieChart as PieChartIcon,
  Filter,
  Activity,
  Loader2,
  Clock,
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  Search
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { formatDateTime } from '../../../lib/dateUtils';
import { Pagination } from '../../../components/common/Pagination';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const colorMap: Record<string, string> = {
  Komisi: '#10b981',
  Langganan: '#06b6d4',
  Iklan: '#f59e0b',
  Lainnya: '#6b7280'
};

// will be defined inside component

interface PaymentRow {
  id: string;
  timestamp: string;
  reference: string;
  recipient: string;
  type: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export const FinancialDashboard = () => {
  const navigate = useNavigate();
  const [revenueBreakdown, setRevenueBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  const [globalBaseline, setGlobalBaseline] = useState<number>(0.05); // Default 5%
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch orders
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const oList: any[] = [];
        ordersSnap.forEach((docSnap) => {
          oList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setOrders(oList);

        // Fetch payouts from Firestore
        const payoutsSnap = await getDocs(collection(db, 'payouts'));
        const livePayments: PaymentRow[] = [];
        payoutsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          livePayments.push({
            id: docSnap.id,
            timestamp: formatDateTime(data.timestamp || data.created_at),
            reference: data.reference || docSnap.id,
            recipient: data.recipient || data.entity || 'Distributor',
            type: data.type || 'Payout Distributor',
            amount: Number(data.amount) || 0,
            status: data.status === 'PAID' || data.status === 'SUCCESS' ? 'SUCCESS' : data.status === 'FAILED' ? 'FAILED' : 'PENDING'
          });
        });

        setPayments(livePayments);

        // Fetch revenue breakdown from Firestore and compute percentages
        const revSnap = await getDocs(collection(db, 'revenue_breakdown'));
        const breakdownRaw: { name: string; amount: number }[] = [];
        revSnap.forEach((docSnap) => {
          const d = docSnap.data();
          breakdownRaw.push({
            name: d.name || docSnap.id,
            amount: Number(d.amount) || 0,
          });
        });
        // Compute total and percentages
        const totalAmount = breakdownRaw.reduce((sum, item) => sum + item.amount, 0) || 1; // avoid division by zero
        const breakdownWithPercent = breakdownRaw.map((item) => ({
          name: item.name,
          value: Math.round((item.amount / totalAmount) * 100), // rounded percentage
          color: colorMap[item.name] || '#6b7280', // fallback gray
        }));
        setRevenueBreakdown(breakdownWithPercent);

        // Fetch commission settings
        const commSnap = await getDocs(collection(db, 'settings'));
        commSnap.forEach((d) => {
          if (d.id === 'commission') {
            const data = d.data();
            if (data.globalBaseline) {
              setGlobalBaseline(data.globalBaseline / 100);
            }
          }
        });
      } catch (err) {
        console.error("Gagal memuat data keuangan:", err);
        setError("Gagal memuat data keuangan dari Firestore.");
      } finally {
        setIsLoading(false);
      }
    };
    loadFinancialData();
  }, [retryTrigger]);

  // Dynamic calculations based on Firestore orders
  const totalVolume = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  
  const platformRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const fee = Number(o.platform_fee ?? o.service_fee);
      if (Number.isFinite(fee) && fee > 0) {
        return sum + fee;
      }
      return sum + (Number(o.total_amount) || 0) * globalBaseline;
    }, 0);

  const pendingPayouts = orders
    .filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const escrowHoldings = orders
    .filter(o => ['pending', 'processing', 'shipped'].includes(o.status))
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Generate weekly chart data dynamically from actual orders
  const getWeeklyRevenueFlow = () => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const revenueMap: Record<string, number> = {
      'Sen': 0, 'Sel': 0, 'Rab': 0, 'Kam': 0, 'Jum': 0, 'Sab': 0, 'Min': 0
    };

    orders.forEach(o => {
      if (o.status === 'delivered' && o.created_at) {
        try {
          const d = new Date(o.created_at);
          if (isNaN(d.getTime())) return;
          const dayName = days[d.getDay()];
          if (revenueMap[dayName] !== undefined) {
            const fee = Number(o.platform_fee ?? o.service_fee);
            const revenueContribution = Number.isFinite(fee) && fee > 0
              ? fee
              : (Number(o.total_amount) || 0) * globalBaseline;
            revenueMap[dayName] += revenueContribution;
          }
        } catch (e) {
          console.error("Invalid date in weekly revenue calculation:", o.created_at, e);
        }
      }
    });

    return Object.entries(revenueMap).map(([day, val]) => ({
      day,
      revenue: val
    }));
  };

  const revenueFlowData = getWeeklyRevenueFlow();

  return (
    <div className="space-y-12 pb-20">
      {/* Breadcrumbs & Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <button 
                onClick={() => navigate('/admin/dashboard')} 
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Admin Dashboard
              </button>
              <span>/</span>
              <span className="text-foreground">Finance</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Keuangan Platform</h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
               Pantau komisi platform, pembayaran distributor, escrow, dan transaksi keuangan PasarMitra.
            </p>
         </div>
         <div className="flex gap-3 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/dashboard')}
              className="h-14 px-6 rounded-2xl border-border bg-card font-black hover:bg-muted transition-all cursor-pointer"
            >
               <ChevronLeft size={20} className="mr-2" />
               Kembali ke Dashboard
            </Button>
            <div title="Fitur ini akan hadir pada milestone berikutnya (Coming in later milestone)">
               <Button disabled variant="outline" className="h-14 px-6 rounded-2xl border-border bg-card text-muted-foreground/60 font-black cursor-not-allowed opacity-50 flex items-center">
                  <Filter size={20} className="mr-2" />
                  Rentang Kustom
               </Button>
            </div>
            <div title="Fitur ini akan hadir pada milestone berikutnya (Coming in later milestone)">
               <Button disabled className="h-14 px-6 rounded-2xl bg-muted text-muted-foreground font-black border border-border/50 cursor-not-allowed opacity-50 flex items-center">
                  <Download size={20} className="mr-2" />
                  Unduh Laporan
               </Button>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Data Keuangan...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6 text-rose-500 bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <AlertCircle size={32} />
           </div>
           <div className="text-center space-y-1">
              <p className="font-black text-lg text-foreground">Gagal Memuat Data Keuangan</p>
              <p className="text-sm font-semibold text-muted-foreground">{error}</p>
           </div>
           <Button 
             onClick={() => setRetryTrigger(prev => prev + 1)}
             className="h-12 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black cursor-pointer"
           >
              Coba Lagi
           </Button>
        </div>
      ) : (
        <>
          {/* Financial Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {[
               { label: 'Pendapatan Komisi Platform', value: formatCurrency(platformRevenue), change: '+12.5%', icon: Wallet, color: 'text-emerald-500' },
               { label: 'Pembayaran Distributor Tertunda', value: formatCurrency(pendingPayouts), change: 'Aktif', icon: Clock, color: 'text-amber-500' },
               { label: 'Dana Escrow Aktif', value: formatCurrency(escrowHoldings), change: 'Aman', icon: ShieldCheck, color: 'text-blue-500' },
               { label: 'Rata-rata Komisi', value: `${(globalBaseline * 100).toFixed(1)}%`, change: 'Stabil', icon: TrendingUp, color: 'text-primary' }
             ].map((stat, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: i * 0.1 }}
                 className="bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group"
               >
                  <div className="flex justify-between items-start mb-6">
                     <div className={cn("w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center transition-transform group-hover:scale-110 duration-500", stat.color)}>
                        <stat.icon size={28} />
                     </div>
                     <div className="flex items-center gap-1 text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest">
                        <ArrowUpRight size={12} />
                        {stat.change}
                     </div>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
               </motion.div>
             ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-5 gap-8">
             {/* Live Revenue Stream Chart */}
             <div className="lg:col-span-3 bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                   <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                      <Activity className="text-emerald-500" size={24} />
                      Aliran Pendapatan Mingguan (Komisi)
                   </h3>
                   <div className="flex bg-muted/30 p-1 rounded-xl w-fit">
                      <button className="px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-widest bg-primary text-primary-foreground shadow-lg cursor-pointer">7 Hari</button>
                      <button disabled title="Coming in later milestone" className="px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-widest text-muted-foreground/45 cursor-not-allowed">30 Hari</button>
                      <button disabled title="Coming in later milestone" className="px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-widest text-muted-foreground/45 cursor-not-allowed">90 Hari</button>
                   </div>
                </div>
                
                <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueFlowData}>
                         <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#C9C1B1" opacity={0.2} />
                         <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#5C6A7A', fontSize: 12, fontWeight: 700}} />
                         <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#5C6A7A', fontSize: 12, fontWeight: 700}}
                            tickFormatter={(v) => `Rp${v.toLocaleString('id-ID')}`}
                         />
                         <Tooltip 
                            formatter={(v: number) => [`Rp ${v.toLocaleString('id-ID')}`, 'Pendapatan']}
                            contentStyle={{ backgroundColor: '#1b2632', border: 'none', borderRadius: '16px', color: '#EEE9DF' }}
                            itemStyle={{ color: '#10b981', fontWeight: 900 }}
                         />
                         <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#revenueGradient)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Source Allocation Breakdown */}
             <div className="lg:col-span-2 bg-[#1B2632] rounded-[3rem] p-10 text-[#EEE9DF] shadow-2xl flex flex-col justify-between space-y-6">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   <PieChartIcon className="text-primary" size={24} />
                   Alokasi Pendapatan
                </h3>
                
                <div className="h-[230px] relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={revenueBreakdown}
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={8}
                            dataKey="value"
                         >
                            {revenueBreakdown.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                         </Pie>
                         <Tooltip 
                            contentStyle={{ backgroundColor: '#1B2632', border: 'none', borderRadius: '16px', color: '#EEE9DF' }} 
                         />
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black text-primary tracking-tighter italic">100%</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Dialokasikan</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {revenueBreakdown.map((item) => (
                     <div key={item.name} className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                           <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{item.name}</span>
                        </div>
                        <span className="text-xl font-black italic">{item.value}%</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-xl">
             <div className="p-8 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 shrink-0">
                   <CreditCard className="text-primary" size={24} />
                   Riwayat Pembayaran Terbaru
                </h3>
                <div className="relative group w-full sm:w-72">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                   <input
                     type="text"
                     placeholder="Cari referensi atau penerima..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full h-10 bg-muted/40 border border-border/30 pl-10 pr-4 rounded-xl text-xs font-bold outline-none focus:border-primary/40 focus:bg-card transition-all font-sans text-foreground"
                   />
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                   <thead>
                      <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/30">
                         <th className="px-10 py-6">Tanggal</th>
                         <th className="px-10 py-6">Referensi</th>
                         <th className="px-10 py-6">Penerima</th>
                         <th className="px-10 py-6">Jenis Transaksi</th>
                         <th className="px-10 py-6 text-right">Jumlah</th>
                         <th className="px-10 py-6">Status</th>
                         <th className="px-10 py-6 text-right">Aksi</th>
                      </tr>
                   </thead>
                    <tbody className="divide-y divide-border/30">
                        {(() => {
                           const filteredPayments = payments.filter((row) => {
                              const term = searchQuery.toLowerCase().trim();
                              if (!term) return true;
                              return (
                                 (row.reference && row.reference.toLowerCase().includes(term)) ||
                                 (row.recipient && row.recipient.toLowerCase().includes(term)) ||
                                 (row.type && row.type.toLowerCase().includes(term))
                              );
                           });
                           const itemsPerPage = 10;
                           const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
                           const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                           if (filteredPayments.length === 0) {
                              return (
                                 <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                       <div className="flex flex-col items-center justify-center gap-3">
                                         <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/40 mx-auto">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                                         </div>
                                         <div className="space-y-1">
                                           <p className="text-sm font-black text-foreground">
                                             {searchQuery ? "Tidak ada hasil pencarian yang cocok." : "Belum ada data pembayaran."}
                                           </p>
                                           <p className="text-xs font-medium text-muted-foreground">
                                             {searchQuery ? "Coba kata kunci pencarian yang lain." : "Data akan muncul setelah transaksi atau payout distributor tercatat di sistem."}
                                           </p>
                                         </div>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           }

                           return paginatedPayments.map((row, i) => (
                              <tr key={i} className="hover:bg-primary/5 transition-all group">
                                 <td className="px-10 py-6 text-sm font-bold text-muted-foreground">{row.timestamp}</td>
                                 <td className="px-10 py-6 font-mono text-xs text-muted-foreground">{row.reference}</td>
                                 <td className="px-10 py-6">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black italic text-xs">
                                          {row.recipient ? row.recipient[0] : 'P'}
                                       </div>
                                       <span className="text-sm font-bold group-hover:text-primary transition-colors">{row.recipient}</span>
                                    </div>
                                 </td>
                                 <td className="px-10 py-6 text-xs font-black uppercase tracking-wider text-foreground">{row.type}</td>
                                 <td className="px-10 py-6 text-right font-black italic text-md text-foreground">{formatCurrency(row.amount)}</td>
                                 <td className="px-10 py-6">
                                    <div className={cn(
                                      "flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit border",
                                      row.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                      row.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                      "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    )}>
                                       <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                                         row.status === 'SUCCESS' ? "bg-emerald-500" : 
                                         row.status === 'PENDING' ? "bg-amber-500" : 
                                         "bg-rose-500"
                                       )} />
                                       {row.status === 'SUCCESS' ? 'SUKSES' : row.status === 'PENDING' ? 'TERTUNDA' : 'GAGAL'}
                                    </div>
                                 </td>
                                 <td className="px-10 py-6 text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => { setSelectedPayment(row); setIsPaymentModalOpen(true); }}
                                      className="text-xs font-bold text-primary hover:bg-primary/5 rounded-lg px-3 py-1 cursor-pointer"
                                    >
                                       Detail
                                    </Button>
                                 </td>
                              </tr>
                           ));
                        })()}
                    </tbody>
                 </table>
              </div>
              {(() => {
                 const filteredPayments = payments.filter((row) => {
                    const term = searchQuery.toLowerCase().trim();
                    if (!term) return true;
                    return (
                       (row.reference && row.reference.toLowerCase().includes(term)) ||
                       (row.recipient && row.recipient.toLowerCase().includes(term)) ||
                       (row.type && row.type.toLowerCase().includes(term))
                    );
                 });
                 const itemsPerPage = 10;
                 const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
                 if (filteredPayments.length > 0) {
                    return (
                       <div className="px-8 pb-4">
                          <Pagination
                             currentPage={currentPage}
                             totalPages={totalPages}
                             onPageChange={setCurrentPage}
                             totalItems={filteredPayments.length}
                             itemsPerPage={itemsPerPage}
                          />
                       </div>
                    );
                 }
                  return null;
               })()}
            </div>
         </>
      )}

      {/* Invoice Receipt Modal */}
      {isPaymentModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-[2rem] p-8 max-w-md w-full mx-4 shadow-2xl relative space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detail Transaksi Keuangan</span>
                <h3 className="text-xl font-black tracking-tight">{selectedPayment.type}</h3>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <hr className="border-border/60" />

            {/* Invoice style receipt */}
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-3 font-medium text-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Referensi Transaksi</span>
                  <span className="font-mono font-bold text-foreground">{selectedPayment.reference}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span className="text-foreground">{selectedPayment.timestamp}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Penerima / Entitas</span>
                  <span className="text-foreground font-bold">{selectedPayment.recipient}</span>
                </div>
                <hr className="border-border/40 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground">Jumlah Bersih</span>
                  <span className="text-2xl font-black text-foreground italic">{formatCurrency(selectedPayment.amount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-muted-foreground">Status Pembayaran</span>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                  selectedPayment.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                  selectedPayment.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                  "bg-rose-500/10 text-rose-500 border-rose-500/20"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                    selectedPayment.status === 'SUCCESS' ? "bg-emerald-500" : 
                    selectedPayment.status === 'PENDING' ? "bg-amber-500" : 
                    "bg-rose-500"
                  )} />
                  {selectedPayment.status === 'SUCCESS' ? 'SUKSES' : selectedPayment.status === 'PENDING' ? 'TERTUNDA' : 'GAGAL'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsPaymentModalOpen(false)} className="w-full rounded-xl font-bold">
                Tutup
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
