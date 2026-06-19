import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Search, 
  Filter, 
  Download, 
  Terminal, 
  History, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Database, 
  Lock, 
  Unlock,
  Cpu,
  Globe,
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

export const AuditLogSystem = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const qSnap = await getDocs(collection(db, 'audit_logs'));
        const lList: any[] = [];
        qSnap.forEach((docSnap) => {
          lList.push({ id: docSnap.id, ...docSnap.data() });
        });
        lList.sort((a, b) => {
          const aTime = a.created_at || '';
          const bTime = b.created_at || '';
          return bTime.localeCompare(aTime);
        });
        setLogs(lList);
      } catch (err) {
        console.error("Gagal memuat log audit:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    return (
      log.id.toLowerCase().includes(term) ||
      (log.event || '').toLowerCase().includes(term) ||
      (log.user || '').toLowerCase().includes(term) ||
      (log.ip || '').toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Jejak Audit Sistem</h1>
            <p className="text-muted-foreground font-medium">Rekam riwayat yang tidak dapat diubah dari semua tindakan administratif dan peristiwa keamanan.</p>
         </div>
         <div className="flex gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black">
               <Terminal size={20} className="mr-2" />
               Lihat Output Mentah
            </Button>
            <Button className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20">
               <Download size={20} className="mr-2" />
               Buat Laporan CSV
            </Button>
         </div>
      </div>

      {/* System Pulse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-[#1B2632] p-8 rounded-[2.5rem] border border-white/10 text-white space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
               <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400">
                  <Cpu size={24} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Beban Real-time</span>
            </div>
            <div className="space-y-1">
               <h3 className="text-4xl font-black tracking-tighter italic">12.4%</h3>
               <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Konsumsi CPU Normal</p>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 rounded-full w-[12.4%]" />
            </div>
         </div>
         <div className="bg-[#1B2632] p-8 rounded-[2.5rem] border border-white/10 text-white space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
               <div className="p-4 bg-primary/20 rounded-2xl text-primary">
                  <Globe size={24} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status Edge</span>
            </div>
            <div className="space-y-1">
               <h3 className="text-4xl font-black tracking-tighter italic">Sehat</h3>
               <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Pengiriman CDN Global OK</p>
            </div>
            <div className="flex gap-2">
               {[...Array(8)].map((_, i) => <div key={i} className="h-3 w-3 bg-emerald-500/40 rounded-sm" />)}
            </div>
         </div>
         <div className="bg-[#1B2632] p-8 rounded-[2.5rem] border border-white/10 text-white space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
               <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-400">
                  <Activity size={24} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Postur Keamanan</span>
            </div>
            <div className="space-y-1">
               <h3 className="text-4xl font-black tracking-tighter italic">Terlindungi</h3>
               <p className="text-xs font-bold text-white/40 uppercase tracking-widest">24 Ancaman Diblokir (24j)</p>
            </div>
            <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl w-fit">
               <p className="text-[10px] font-black uppercase text-rose-500 animate-pulse">Pemindaian Aktif...</p>
            </div>
         </div>
      </div>

      {/* Log Feed */}
      <div className="bg-card border border-border/50 rounded-[3.5rem] overflow-hidden shadow-2xl">
         <div className="p-10 border-b border-border/50 flex flex-col lg:flex-row gap-8 justify-between bg-muted/5 backdrop-blur-3xl sticky top-0 z-20">
            <div className="flex-1 relative group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Cari log aktivitas berdasarkan pengguna, tindakan, atau kata kunci..." 
                 className="w-full h-14 bg-card border border-border/30 px-16 rounded-2xl text-sm font-bold shadow-sm focus:border-primary/40 focus:bg-white transition-all outline-none" 
               />
            </div>
            <div className="flex gap-4">
               <Button variant="outline" className="h-14 px-8 rounded-2xl border-border bg-card font-black">
                  <Filter size={20} className="mr-2" />
                  Filter Kategori
               </Button>
               <Button variant="outline" className="h-14 w-14 rounded-2xl border-border bg-card">
                  <History size={20} />
               </Button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-muted/10 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                     <th className="px-10 py-6">Waktu / ID</th>
                     <th className="px-10 py-6">Aktivitas Operasi</th>
                     <th className="px-10 py-6">Aktor / Agen</th>
                     <th className="px-10 py-6">IP Jaringan</th>
                     <th className="px-10 py-6 text-right">Detail Aktivitas</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/30">
                  {isLoading ? (
                     <tr>
                        <td colSpan={5} className="py-20 text-center">
                           <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                              <Loader2 className="animate-spin text-primary" size={32} />
                              <p className="font-black text-xs uppercase tracking-widest">Memuat Log Audit...</p>
                           </div>
                        </td>
                     </tr>
                  ) : filteredLogs.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="py-20 text-center text-sm font-bold text-muted-foreground">
                           Tidak ada log aktivitas sistem saat ini.
                        </td>
                     </tr>
                  ) : (
                     filteredLogs.map((log, i) => (
                       <motion.tr 
                         key={log.id}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: i * 0.05 }}
                         className="group transition-all hover:bg-muted/30"
                       >
                          <td className="px-10 py-8">
                             <div className="flex flex-col">
                                <span className="text-xs font-black text-muted-foreground font-mono">{log.timestamp}</span>
                                <span className="text-[10px] font-bold opacity-30 mt-1">{log.id}</span>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <div className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit border",
                                log.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                log.status === 'BLOCK' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                             )}>
                                {log.status === 'SUCCESS' ? <ShieldCheck size={14} /> : log.status === 'BLOCK' ? <Lock size={14} /> : <ShieldAlert size={14} />}
                                {log.event}
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                                   <User size={14} />
                                </div>
                                <span className="text-sm font-bold italic">{log.user}</span>
                             </div>
                          </td>
                          <td className="px-10 py-8 font-mono text-xs text-muted-foreground">{log.ip}</td>
                          <td className="px-10 py-8 text-right max-w-xs">
                             <div className="flex items-center justify-end gap-3 group/detail">
                                <span className="text-xs font-medium text-muted-foreground truncate">{log.details}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                   <Eye size={14} />
                                </Button>
                             </div>
                          </td>
                       </motion.tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>

         {/* Pagination Overlay */}
         <div className="p-8 border-t border-border/50 bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-black text-muted-foreground uppercase tracking-widest">
               <span className="flex items-center gap-2"><Database size={14} /> Retensi Log: 365 Hari</span>
               <span className="w-px h-4 bg-border" />
               <span className="text-emerald-500">Perekaman Langsung Aktif</span>
            </div>
            <div className="flex items-center gap-4">
               <Button variant="outline" className="h-10 px-4 rounded-xl border-border bg-card text-xs font-black">
                  <ChevronLeft size={16} className="mr-2" /> Seb.
               </Button>
               <span className="text-xs font-black text-muted-foreground">Halaman 1 dari 1</span>
               <Button variant="outline" className="h-10 px-4 rounded-xl border-border bg-card text-xs font-black">
                  Sel. <ChevronRight size={16} className="ml-2" />
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
