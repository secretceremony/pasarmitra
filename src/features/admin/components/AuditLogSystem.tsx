import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Search, 
  Filter, 
  Download, 
  History, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Database, 
  Lock, 
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { formatDateTime } from '../../../lib/dateUtils';

interface AuditLog {
  id: string;
  timestamp: string;
  created_at: string;
  event: string;
  user: string;
  role: string;
  module: string;
  status: 'SUCCESS' | 'WARNING' | 'BLOCK' | 'FAILED';
  details: string;
  targetCollection?: string;
  targetId?: string;
  ip: string;
}

export const AuditLogSystem = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const qSnap = await getDocs(collection(db, 'audit_logs'));
        const liveList: AuditLog[] = [];
        
        qSnap.forEach((docSnap) => {
          const data = docSnap.data();
          
          // Map live logs defensively
          const liveLog: AuditLog = {
            id: docSnap.id,
            // Use created_at (ISO string) as source of truth; timestamp is kept for backwards compat
            timestamp: data.created_at || data.timestamp || '',
            created_at: data.created_at || new Date().toISOString(),
            event: data.event || 'Tindakan administratif',
            user: data.user || 'System',
            role: data.role || 'ADMIN',
            module: 'Moderasi', // Initial fallback, will map dynamically below
            status: data.status || 'SUCCESS',
            details: data.details || 'Tidak tersedia',
            targetCollection: data.targetCollection || undefined,
            targetId: data.targetId || undefined,
            ip: data.ip || '127.0.0.1'
          };
          
          // Map module dynamically
          liveLog.module = mapLiveModule(liveLog);
          liveList.push(liveLog);
        });
        
        // Sort by created_at descending
        liveList.sort((a, b) => b.created_at.localeCompare(a.created_at));
        
        setLogs(liveList);
      } catch (err) {
        console.error("Gagal memuat log audit:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const mapLiveModule = (log: any): string => {
    if (log.module && log.module !== 'Moderasi') return log.module;
    const evt = (log.event || '').toUpperCase();
    const coll = (log.targetCollection || '').toLowerCase();
    
    if (evt.includes('DISPUTE') || coll === 'disputes') return 'Dispute';
    if (evt.includes('VERIFY') || evt.includes('PARTNERSHIP')) return 'Verifikasi';
    if (evt.includes('PRODUCT') || evt.includes('REVIEW') || evt.includes('MODERATION') || coll === 'products' || coll === 'moderation_items') return 'Moderasi';
    if (evt.includes('COMMISSION') || evt.includes('FINANCE') || evt.includes('PAYMENT') || evt.includes('REFUND')) return 'Finance';
    if (evt.includes('USER') || evt.includes('SUSPEND') || evt.includes('REACTIVATE') || coll === 'profiles') return 'User Management';
    if (evt.includes('ORDER') || coll === 'orders') return 'Order';
    
    return 'Moderasi'; // Default fallback module
  };

  const getNormalizedStatus = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') {
      return { label: 'Sukses', code: 'SUCCESS', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    }
    if (s === 'WARNING') {
      return { label: 'Perlu Ditinjau', code: 'WARNING', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
    return { label: 'Gagal', code: 'FAILED', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  };

  const getReferenceText = (log: any) => {
    if (log.targetCollection && log.targetId) {
      return `${log.targetCollection}/${log.targetId}`;
    }
    return log.targetId || log.targetCollection || 'Tidak tersedia';
  };

  // Computations for summary cards
  const totalAktivitas = logs.length;
  
  const todayIso = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const aksiHariIni = logs.filter(l => l.created_at && l.created_at.startsWith(todayIso)).length;
  
  const perluDitinjau = logs.filter(l => getNormalizedStatus(l.status).code === 'WARNING').length;

  const getMostActiveModule = () => {
    if (logs.length === 0) return 'Tidak ada';
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const m = l.module || 'Sistem';
      counts[m] = (counts[m] || 0) + 1;
    });
    let maxModule = 'Moderasi';
    let maxCount = 0;
    Object.entries(counts).forEach(([m, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxModule = m;
      }
    });
    return maxModule;
  };

  const modulAktif = getMostActiveModule();

  // Filter logs logic
  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      log.id.toLowerCase().includes(term) ||
      (log.event || '').toLowerCase().includes(term) ||
      (log.user || '').toLowerCase().includes(term) ||
      (log.ip || '').toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term) ||
      (log.module || '').toLowerCase().includes(term)
    );

    const matchesModule = selectedModule === 'ALL' || log.module === selectedModule;
    
    const norm = getNormalizedStatus(log.status);
    const matchesStatus = selectedStatus === 'ALL' || norm.code === selectedStatus;

    return matchesSearch && matchesModule && matchesStatus;
  });

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleViewLatest = () => {
    if (filteredLogs.length > 0) {
      setSelectedLog(filteredLogs[0]);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-12 pb-20 w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
            <button 
              onClick={() => navigate('/admin/dashboard')} 
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-foreground">Log Audit</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Jejak Audit</h1>
          <p className="text-muted-foreground font-medium max-w-2xl">
            Pantau riwayat tindakan administratif pada sistem PasarMitra.
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
          <Button 
            variant="outline" 
            onClick={handleViewLatest}
            disabled={filteredLogs.length === 0}
            className="h-14 px-6 rounded-2xl border-border bg-card font-black hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Eye size={20} className="mr-2" />
            Lihat Log Terbaru
          </Button>
          <div title="Fitur ini akan hadir pada milestone berikutnya (Coming in later milestone)">
            <Button 
              disabled 
              className="h-14 px-6 rounded-2xl bg-muted text-muted-foreground font-black border border-border/50 cursor-not-allowed opacity-50 flex items-center"
            >
              <Download size={20} className="mr-2" />
              Buat Laporan CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Card 1 */}
        <div className="bg-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-border/50 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary">
              <Database size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Aktivitas</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-black tracking-tighter italic">{totalAktivitas}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total log tercatat</p>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="bg-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-border/50 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-sky-500/10 rounded-2xl text-sky-500">
              <Clock size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aksi Hari Ini</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-black tracking-tighter italic">{aksiHariIni}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tindakan hari ini</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-border/50 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
              <ShieldAlert size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Perlu Ditinjau</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-black tracking-tighter italic">{perluDitinjau}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Peristiwa warning</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-border/50 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <Settings size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modul Teraktif</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black tracking-tighter italic truncate">{modulAktif}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aktivitas tertinggi</p>
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-card border border-border/50 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 lg:p-10 border-b border-border/50 flex flex-col lg:flex-row gap-6 justify-between bg-muted/5 backdrop-blur-3xl">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari log berdasarkan aktor, aksi, referensi, atau detail..." 
              className="w-full h-14 bg-card border border-border/30 px-16 rounded-2xl text-sm font-bold shadow-sm focus:border-primary/40 focus:bg-white transition-all outline-none" 
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <select 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
              className="h-14 bg-card border border-border/30 px-6 rounded-2xl text-sm font-bold shadow-sm focus:border-primary/40 transition-all outline-none cursor-pointer"
            >
              <option value="ALL">Semua Modul</option>
              <option value="Verifikasi">Verifikasi</option>
              <option value="Moderasi">Moderasi</option>
              <option value="Finance">Finance</option>
              <option value="Dispute">Dispute</option>
              <option value="User Management">User Management</option>
              <option value="Order">Order</option>
            </select>

            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-14 bg-card border border-border/30 px-6 rounded-2xl text-sm font-bold shadow-sm focus:border-primary/40 transition-all outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUCCESS">Sukses</option>
              <option value="WARNING">Perlu Ditinjau</option>
              <option value="FAILED">Gagal</option>
            </select>

            <Button 
              variant="outline" 
              onClick={() => { setSearchQuery(''); setSelectedModule('ALL'); setSelectedStatus('ALL'); }}
              className="h-14 w-14 rounded-2xl border-border bg-card hover:bg-muted cursor-pointer"
              title="Reset Filters"
            >
              <History size={20} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-muted/10 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="px-8 py-6">Waktu</th>
                <th className="px-8 py-6">Aktor</th>
                <th className="px-8 py-6">Role</th>
                <th className="px-8 py-6">Modul</th>
                <th className="px-8 py-6">Aksi</th>
                <th className="px-8 py-6">Referensi</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="font-black text-xs uppercase tracking-widest">Memuat Log Audit...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/40">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground">Tidak ada log yang cocok.</p>
                        <p className="text-xs font-medium text-muted-foreground">Tidak ada log aktivitas administratif yang sesuai dengan filter yang dipilih.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => {
                  const normStatus = getNormalizedStatus(log.status);
                  return (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                      className="group transition-all hover:bg-muted/30"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-muted-foreground font-mono">{formatDateTime(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                            <User size={13} />
                          </div>
                          <span className="text-sm font-bold italic text-foreground block max-w-[160px] truncate" title={log.user}>
                            {log.user}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          {log.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-foreground">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-mono text-xs text-foreground bg-muted/40 border border-border/40 px-2 py-1 rounded">
                          {log.event}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-mono text-xs text-muted-foreground max-w-[180px] truncate" title={getReferenceText(log)}>
                        {getReferenceText(log)}
                      </td>
                      <td className="px-8 py-6">
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit border",
                          normStatus.colorClass
                        )}>
                          {normStatus.label}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewDetail(log)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          title="Lihat Detail Log"
                        >
                          <Eye size={14} />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Overlay */}
        <div className="p-8 border-t border-border/50 bg-muted/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-black text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-2"><Database size={14} /> Retensi Log: 365 Hari</span>
            <span className="w-px h-4 bg-border" />
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Perekaman Langsung Aktif
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" disabled className="h-10 px-4 rounded-xl border-border bg-card text-xs font-black opacity-50 cursor-not-allowed">
              <ChevronLeft size={16} className="mr-2" /> Seb.
            </Button>
            <span className="text-xs font-black text-muted-foreground">Halaman 1 dari 1</span>
            <Button variant="outline" disabled className="h-10 px-4 rounded-xl border-border bg-card text-xs font-black opacity-50 cursor-not-allowed">
              Sel. <ChevronRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-[2rem] p-8 max-w-xl w-full mx-4 shadow-2xl relative space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detail Log Audit</span>
                <h3 className="text-2xl font-black tracking-tight">{selectedLog.event || 'Tindakan Administratif'}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <hr className="border-border/60" />

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">Waktu</span>
                <span className="font-mono font-bold text-foreground">{formatDateTime(selectedLog.timestamp)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">ID Log</span>
                <span className="font-mono text-xs text-muted-foreground block truncate" title={selectedLog.id}>{selectedLog.id}</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">Aktor</span>
                <span className="font-bold text-foreground italic">{selectedLog.user}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">Role</span>
                <span className="font-bold text-foreground">{selectedLog.role}</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">Modul</span>
                <span className="font-bold text-foreground">{selectedLog.module}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">IP Address</span>
                <span className="font-mono text-foreground">{selectedLog.ip || '127.0.0.1'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground block">Referensi</span>
                <span className="font-mono text-xs text-foreground bg-muted/50 px-2.5 py-1 rounded border border-border/40 inline-block truncate max-w-full" title={getReferenceText(selectedLog)}>
                  {getReferenceText(selectedLog)}
                </span>
              </div>
            </div>

            <hr className="border-border/60" />

            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground block">Deskripsi Detail</span>
              <div className="p-4 bg-muted/30 border border-border/50 rounded-2xl text-sm leading-relaxed text-foreground font-medium">
                {selectedLog.details}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsModalOpen(false)} className="px-6 rounded-xl font-bold">
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
