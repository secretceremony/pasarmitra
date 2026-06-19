import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  CreditCard,
  PieChart as PieChartIcon,
  Filter,
  Search,
  ChevronRight,
  Activity,
  BarChart3,
  Building2,
  Users,
  Loader2
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
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
  Cell,
  BarChart,
  Bar
} from 'recharts';

const REVENUE_BREAKDOWN = [
  { name: 'Langganan', value: 40, color: '#2C3B4D' },
  { name: 'Komisi', value: 35, color: '#FFB162' },
  { name: 'Iklan', value: 15, color: '#A35139' },
  { name: 'Lainnya', value: 10, color: '#C9C1B1' },
];

export const FinancialDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [globalBaseline, setGlobalBaseline] = useState<number>(0.05); // Default 5%
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setIsLoading(true);
        // Fetch orders
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const oList: any[] = [];
        ordersSnap.forEach((docSnap) => {
          oList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setOrders(oList);

        // Fetch payouts
        const payoutsSnap = await getDocs(collection(db, 'payouts'));
        const pList: any[] = [];
        payoutsSnap.forEach((docSnap) => {
          pList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPayouts(pList);

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
      } finally {
        setIsLoading(false);
      }
    };
    loadFinancialData();
  }, []);

  // Dynamic calculations based on Firestore orders
  const totalVolume = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const platformRevenue = totalVolume * globalBaseline;

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
        const d = new Date(o.created_at);
        const dayName = days[d.getDay()];
        if (revenueMap[dayName] !== undefined) {
          revenueMap[dayName] += (Number(o.total_amount) || 0) * globalBaseline;
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
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-emerald-500 pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Keuangan & Perbendaharaan</h1>
            <p className="text-muted-foreground font-medium">Memantau likuiditas platform, komisi, dan siklus pembayaran ekosistem PasarMitra.</p>
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black">
               <Filter size={20} className="mr-2" />
               Rentang Kustom
            </Button>
            <Button className="h-14 px-8 rounded-2xl bg-emerald-600 text-white font-black shadow-xl shadow-emerald-600/20">
               <Download size={20} className="mr-2" />
               Laporan Pajak 2026
            </Button>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Data Keuangan...</p>
        </div>
      ) : (
        <>
          {/* Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             {[
               { label: `Pendapatan Platform (${(globalBaseline * 100).toFixed(1)}%)`, value: formatCurrency(platformRevenue), change: '+12.5%', icon: Wallet, color: 'text-emerald-500' },
               { label: 'Pembayaran Tertunda', value: formatCurrency(pendingPayouts), change: 'Aktif', icon: Clock, color: 'text-amber-500' },
               { label: 'Dana Escrow Terkunci', value: formatCurrency(escrowHoldings), change: 'Aman', icon: ShieldCheck, color: 'text-blue-500' },
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

          <div className="grid lg:grid-cols-5 gap-8">
             {/* Live Revenue Stream */}
             <div className="lg:col-span-3 bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                      <Activity className="text-emerald-500" />
                      Aliran Pendapatan Mingguan (Komisi)
                   </h3>
                   <div className="flex bg-muted/30 p-1 rounded-xl">
                      {['7H', '30H', '90H'].map(t => (
                        <button key={t} className={cn("px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-widest", t === '7H' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground")}>{t}</button>
                      ))}
                   </div>
                </div>
                
                <div className="h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueFlowData}>
                         <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                               <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
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
                            contentStyle={{ backgroundColor: '#1B2632', border: 'none', borderRadius: '16px', color: '#EEE9DF' }}
                            itemStyle={{ color: '#22c55e', fontWeight: 900 }}
                         />
                         <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={4} fillOpacity={1} fill="url(#revenueGradient)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Breakdown */}
             <div className="lg:col-span-2 bg-[#1B2632] rounded-[3rem] p-10 text-[#EEE9DF] shadow-2xl flex flex-col justify-between">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   <PieChartIcon className="text-primary" />
                   Distribusi Sumber
                </h3>
                
                <div className="h-[300px] relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={REVENUE_BREAKDOWN}
                            innerRadius={80}
                            outerRadius={110}
                            paddingAngle={10}
                            dataKey="value"
                         >
                            {REVENUE_BREAKDOWN.map((entry, index) => (
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

                <div className="grid grid-cols-2 gap-4 mt-8">
                   {REVENUE_BREAKDOWN.map((item) => (
                     <div key={item.name} className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 mb-1">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{item.name}</span>
                        </div>
                        <span className="text-xl font-black italic">{item.value}%</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Recent Payout Table */}
          <div className="bg-card border border-border/50 rounded-[3rem] overflow-hidden shadow-xl">
             <div className="p-8 border-b border-border/50 flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   <CreditCard className="text-primary" />
                   Siklus Pembayaran Terbaru
                </h3>
                <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all">Lihat Riwayat Pembayaran</Button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/30">
                         <th className="px-10 py-6">Penerima / Entitas</th>
                         <th className="px-10 py-6">Metode Pembayaran</th>
                         <th className="px-10 py-6">ID Perbendaharaan</th>
                         <th className="px-10 py-6 text-right">Jumlah Bersih</th>
                         <th className="px-10 py-6">Persetujuan</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/30">
                      {payouts.length === 0 ? (
                         <tr>
                            <td colSpan={5} className="py-12 text-center text-sm font-bold text-muted-foreground">
                               Tidak ada transaksi pembayaran terbaru.
                            </td>
                         </tr>
                      ) : (
                         payouts.map((row, i) => (
                           <tr key={i} className="hover:bg-primary/5 transition-all group">
                              <td className="px-10 py-8">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black italic">
                                       {row.entity ? row.entity[0] : 'P'}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-black group-hover:text-primary transition-colors">{row.entity}</span>
                                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{row.type}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-8 text-sm font-bold text-muted-foreground">{row.method}</td>
                              <td className="px-10 py-8 font-mono text-xs text-muted-foreground">{row.id}</td>
                              <td className="px-10 py-8 text-right font-black italic text-lg">{formatCurrency(row.amount)}</td>
                              <td className="px-10 py-8">
                                 <div className={cn(
                                   "flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit border",
                                   row.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                 )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", row.status === 'PAID' ? "bg-emerald-500" : "bg-amber-500")} />
                                    {row.status === 'PAID' ? 'DIBAYAR' : 'TERTUNDA'}
                                 </div>
                              </td>
                           </tr>
                         ))
                      )}
                   </tbody>
                </table>
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

const Clock = ({ size, className }: any) => <Activity size={size} className={className} />;
const ShieldCheck = ({ size, className }: any) => <ShieldCheckIcon size={size} className={className} />;
import { ShieldCheck as ShieldCheckIcon } from 'lucide-react';
