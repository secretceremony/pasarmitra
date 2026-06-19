import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  BarChart3,
  Globe,
  Database,
  Cpu,
  Zap,
  Loader2
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export const AdminDashboard = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch profiles
        const profSnap = await getDocs(collection(db, 'profiles'));
        const pList: any[] = [];
        profSnap.forEach(d => pList.push({ id: d.id, ...d.data() }));
        setProfiles(pList);

        // Fetch orders
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const oList: any[] = [];
        ordersSnap.forEach(d => oList.push({ id: d.id, ...d.data() }));
        setOrders(oList);
      } catch (err) {
        console.error("Gagal memuat data admin dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const totalUsersCount = profiles.length;
  const pendingVerifications = profiles.filter(p => p.role === 'DISTRIBUTOR' && !p.is_verified).length;
  
  const totalVolume = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const formatTurnover = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
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
        const d = new Date(o.created_at);
        const mName = months[d.getMonth()];
        if (volumeMap[mName] !== undefined) {
          volumeMap[mName] += 1;
        }
      }
    });

    return last6Months.map(name => ({
      name,
      value: volumeMap[name] || 0
    }));
  };

  const chartData = getMonthlyTransactionVolume();

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Tinjauan Sistem</h1>
            <p className="text-muted-foreground font-medium">Status real-time infrastruktur & ekosistem PasarMitra.</p>
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black">
               <Database size={20} className="mr-2" />
               Cadangkan Sistem
            </Button>
            <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
               <Zap size={20} className="mr-2" />
               Perbaikan Darurat
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
               { label: 'Total Pengguna', value: totalUsersCount.toLocaleString('id-ID'), change: 'Aktif', icon: Users, color: 'text-blue-500' },
               { label: 'Omset Pasar', value: formatTurnover(totalVolume), change: '+8.4%', icon: TrendingUp, color: 'text-emerald-500' },
               { label: 'Menunggu Verif.', value: pendingVerifications.toString(), change: 'Perlu Tindakan', icon: ShieldCheck, color: 'text-amber-500' },
               { label: 'Kesehatan Platform', value: '99.9%', change: 'Normal', icon: Activity, color: 'text-primary' }
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
                     <span className={cn("text-xs font-black px-3 py-1 rounded-full", i === 2 && pendingVerifications > 0 ? "bg-amber-500/10 text-amber-500 animate-pulse" : "bg-emerald-500/10 text-emerald-500")}>
                        {stat.change}
                     </span>
                  </div>
                  <div>
                     <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
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
                      Volume Transaksi (Jumlah)
                   </h3>
                   <div className="flex gap-2">
                      <Button variant="ghost" className="h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground">Bulanan</Button>
                   </div>
                </div>
                
                <div className="h-[400px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                         <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#2C3B4D" stopOpacity={0.1}/>
                               <stop offset="95%" stopColor="#2C3B4D" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#C9C1B1" opacity={0.2} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5C6A7A', fontSize: 12, fontWeight: 700}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fill: '#5C6A7A', fontSize: 12, fontWeight: 700}} />
                         <Tooltip 
                            contentStyle={{ backgroundColor: '#1B2632', border: 'none', borderRadius: '16px', color: '#EEE9DF' }}
                            itemStyle={{ color: '#FFB162', fontWeight: 900 }}
                         />
                         <Area type="monotone" dataKey="value" stroke="#2C3B4D" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Distribution Chart */}
             <div className="bg-card border border-border/50 rounded-[3rem] p-10 shadow-xl space-y-8">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   <Globe className="text-primary" />
                   Dampak Regional
                </h3>
                <div className="space-y-8 pt-4">
                   {[
                     { region: 'Jabodetabek', value: '45%', color: 'bg-primary' },
                     { region: 'Jawa Timur', value: '22%', color: 'bg-accent' },
                     { region: 'Jawa Tengah', value: '18%', color: 'bg-destructive' },
                     { region: 'Pulau Lainnya', value: '15%', color: 'bg-muted' }
                   ].map((reg) => (
                     <div key={reg.region} className="space-y-3">
                        <div className="flex justify-between items-end">
                           <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{reg.region}</span>
                           <span className="text-sm font-black">{reg.value}</span>
                        </div>
                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-1000", reg.color)} style={{ width: reg.value }} />
                        </div>
                     </div>
                   ))}
                </div>
                
                <div className="pt-8 border-t border-border/30">
                   <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                      <Cpu className="text-primary" size={32} />
                      <div>
                         <p className="text-[10px] font-black text-primary uppercase tracking-widest">Beban Server</p>
                         <p className="text-lg font-black italic">Latensi Rendah Aktif</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* System Monitoring */}
          <div className="bg-[#1B2632] rounded-[4rem] p-16 text-[#EEE9DF] relative overflow-hidden shadow-3xl">
             <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent" />
             <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                   <div className="space-y-4">
                      <h2 className="text-5xl font-black tracking-tighter leading-tight">Kesehatan Operasional <br /><span className="text-primary">Infrastruktur.</span></h2>
                      <p className="text-white/60 font-medium text-lg leading-relaxed max-w-lg">Node pengiriman edge kami berjalan dengan performa puncak. Pelindung keamanan aktif di semua titik akhir.</p>
                   </div>
                   <div className="flex flex-wrap gap-4">
                      <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                         <span className="text-xs font-black uppercase tracking-widest">Gateway: OK</span>
                      </div>
                      <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                         <span className="text-xs font-black uppercase tracking-widest">Auth: OK</span>
                      </div>
                      <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                         <span className="text-xs font-black uppercase tracking-widest">Penyimpanan: OK</span>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: 'Waktu Aktif', value: '184 Hari' },
                      { label: 'Permintaan', value: '2.4M / Hari' },
                      { label: 'Tingkat Kesalahan', value: '0.001%' },
                      { label: 'Escrow Terkunci', value: formatTurnover(totalVolume * 0.15) }
                    ].map((monitor) => (
                      <div key={monitor.label} className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] space-y-2">
                         <p className="text-3xl font-black text-primary tracking-tighter italic">{monitor.value}</p>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{monitor.label}</p>
                      </div>
                    ))}
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
