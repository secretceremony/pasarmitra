import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Building2,
  MapPin,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Scale,
  Gavel,
  History,
  Search,
  Loader2
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { cn } from '../../../lib/utils';

export const DistributorVerification = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditNote, setAuditNote] = useState('');
  const [search, setSearch] = useState('');
  const { user: currentUser } = useAuthStore();

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const qSnap = await getDocs(collection(db, 'profiles'));
      const list: any[] = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        // Hanya verifikasi untuk akun dengan role DISTRIBUTOR
        if (data.role === 'DISTRIBUTOR') {
          list.push({
            id: doc.id,
            company: data.organization_name || data.full_name || 'PT. Tanpa Nama',
            type: 'DISTRIBUTOR PERUSAHAAN',
            submitted: data.created_at ? new Date(data.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'Baru Saja',
            status: data.is_verified ? 'VERIFIED' : (data.verification_status || 'PENDING_REVIEW'),
            is_verified: data.is_verified || false,
            documents: [
              { name: 'Nomor Induk Berusaha (NIB)', status: data.nib ? 'TAMPILKAN' : 'MENUNGGU' },
              { name: 'NPWP Perusahaan', status: data.npwp ? 'TAMPILKAN' : 'MENUNGGU' },
              { name: 'Izin Operasional Gudang', status: 'MENUNGGU' }
            ],
            requestedBadge: data.requested_badge || 'Premium Fast Shipper',
            location: data.address || 'Indonesia'
          });
        }
      });
      setApplications(list);
    } catch (err) {
      console.error("Gagal memuat aplikasi verifikasi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const selected = applications.find(v => v.id === selectedId);

  const handleApprove = async () => {
    if (!selectedId) return;
    try {
      const docRef = doc(db, 'profiles', selectedId);
      await updateDoc(docRef, { 
        is_verified: true,
        verification_status: 'VERIFIED',
        audit_note: auditNote
      });
      
      // Catat log
      await createAuditLog({
        event: 'VERIFIKASI_SETUJU',
        status: 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `Menyetujui verifikasi distributor ${selected?.company || ''} dengan catatan: ${auditNote || 'Tidak ada catatan'}`
      });

      alert('Distributor berhasil diverifikasi!');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error("Gagal menyetujui verifikasi:", err);
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    if (!auditNote.trim()) {
      alert('Anda wajib menuliskan alasan penolakan pada kolom Catatan Audit Internal terlebih dahulu.');
      return;
    }
    try {
      const docRef = doc(db, 'profiles', selectedId);
      await updateDoc(docRef, { 
        is_verified: false,
        verification_status: 'REJECTED',
        rejection_reason: auditNote,
        audit_note: auditNote
      });

      // Catat log
      await createAuditLog({
        event: 'VERIFIKASI_TOLAK',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Menolak verifikasi distributor ${selected?.company || ''} dengan alasan: ${auditNote}`
      });

      alert('Pendaftaran distributor ditolak.');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error("Gagal menolak verifikasi:", err);
    }
  };

  const handleEscalate = async () => {
    if (!selectedId) return;
    try {
      const docRef = doc(db, 'profiles', selectedId);
      await updateDoc(docRef, { 
        verification_status: 'ESCALATED',
        audit_note: auditNote
      });

      // Catat log
      await createAuditLog({
        event: 'VERIFIKASI_ESKALASI',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Meneruskan verifikasi distributor ${selected?.company || ''} ke Tim Hukum dengan catatan: ${auditNote || 'Tidak ada catatan'}`
      });

      alert('Kasus pendaftaran berhasil diteruskan ke Tim Hukum.');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error("Gagal meneruskan kasus ke Tim Hukum:", err);
    }
  };

  const filteredApplications = applications.filter(app => 
    app.company.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusType = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING_REVIEW': return 'warning';
      case 'REJECTED': return 'danger';
      case 'ESCALATED': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'Diverifikasi';
      case 'PENDING_REVIEW': return 'Menunggu Verifikasi';
      case 'REJECTED': return 'Ditolak';
      case 'ESCALATED': return 'Eskalasi Legal';
      default: return status;
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
         <div className="space-y-1 border-l-4 border-amber-500 pl-8 py-2">
            <h1 className="text-4xl font-black tracking-tighter">Verifikasi Distributor</h1>
            <p className="text-muted-foreground font-medium">Tinjau dan validasi dokumen legal perusahaan distributor sebelum diaktifkan.</p>
         </div>
         <div className="flex items-center gap-4 bg-amber-500/10 px-6 py-3 rounded-2xl border border-amber-500/20">
            <Clock className="text-amber-500" size={24} />
            <div>
               <p className="text-xs font-black uppercase text-amber-500 tracking-widest">Rata-rata Peninjauan</p>
               <p className="text-lg font-black italic">4.2 Jam</p>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground bg-card border border-border/50 rounded-[3rem] shadow-xl">
           <Loader2 className="animate-spin text-primary" size={48} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Berkas Pendaftaran...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-12">
          {/* List of Applications */}
          <div className="lg:col-span-2 space-y-6">
             <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari pengajuan distributor..." 
                  className="w-full h-14 bg-card border border-border/50 rounded-2xl px-14 text-sm font-bold shadow-sm outline-none focus:border-primary/40 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             
             <div className="space-y-4">
                {filteredApplications.length === 0 ? (
                  <p className="text-center py-10 font-bold text-muted-foreground text-sm">Tidak ada distributor yang menunggu verifikasi.</p>
                ) : (
                  filteredApplications.map((app) => (
                    <motion.div
                      key={app.id}
                      onClick={() => setSelectedId(app.id)}
                      className={cn(
                        "p-8 bg-card border rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden group",
                        selectedId === app.id ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/30"
                      )}
                    >
                       <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-muted/40 rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                             <Building2 size={24} />
                          </div>
                          <StatusBadge 
                            type={getStatusType(app.status)} 
                            label={getStatusLabel(app.status)} 
                          />
                       </div>
                       <div className="space-y-1">
                          <h4 className="font-black text-xl tracking-tight leading-tight">{app.company}</h4>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{app.type}</p>
                       </div>
                       <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30 text-xs font-bold text-muted-foreground">
                          <span className="flex items-center gap-2"><Clock size={14} /> Terdaftar: {app.submitted}</span>
                          <ArrowRight size={16} className={cn("transition-transform", selectedId === app.id ? "translate-x-0" : "-translate-x-4 opacity-0")} />
                       </div>
                       {selectedId === app.id && <div className="absolute top-0 right-0 w-2 h-full bg-primary" />}
                    </motion.div>
                  ))
                )}
             </div>
          </div>

          {/* Details View */}
          <div className="lg:col-span-3">
             <AnimatePresence mode="wait">
                {selectedId ? (
                  <motion.div
                    key={selectedId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-card border border-border/50 rounded-[3rem] p-12 shadow-2xl space-y-10 sticky top-10"
                  >
                     <div className="flex justify-between items-start">
                        <div className="space-y-3">
                           <div className="flex items-center gap-4 flex-wrap">
                              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">{selected?.company}</h2>
                              {selected?.is_verified && <ShieldCheck className="text-primary shrink-0" size={32} />}
                           </div>
                           <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-bold text-sm">
                              <span className="flex items-center gap-2"><MapPin size={18} /> {selected?.location}</span>
                              <span className="flex items-center gap-2"><Clock size={18} /> ID: VERIF-{selected?.id}</span>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <Button 
                             variant="outline" 
                             className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-500/10 border-border p-0"
                             onClick={handleReject}
                             title="Tolak Pendaftaran"
                           >
                              <XCircle size={24} />
                           </Button>
                           <Button 
                             className="h-12 w-12 rounded-xl bg-primary text-primary-foreground p-0"
                             onClick={handleApprove}
                             title="Setujui Pendaftaran"
                           >
                              <CheckCircle2 size={24} />
                           </Button>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-muted/20 p-8 rounded-[2rem] border border-border/30 space-y-6">
                           <h3 className="text-lg font-black flex items-center gap-3">
                              <FileText className="text-primary" size={20} />
                              Checklist Dokumen NIB/NPWP
                           </h3>
                           <div className="space-y-4">
                              {selected?.documents.map((docItem: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-border/30 group cursor-pointer hover:border-primary/40">
                                   <span className="text-xs font-bold text-muted-foreground">{docItem.name}</span>
                                   <div className="flex items-center gap-3">
                                      <StatusBadge type={docItem.status === 'TAMPILKAN' ? 'success' : 'warning'} label={docItem.status} />
                                      <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>

                        <div className="bg-[#1B2632] p-8 rounded-[2rem] text-[#EEE9DF] space-y-6">
                           <h3 className="text-lg font-black flex items-center gap-3 text-primary">
                              <ShieldCheck size={20} />
                              Penilaian Lencana
                           </h3>
                           <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                              <p className="text-xs font-black uppercase text-white/40 tracking-widest">Lencana yang Diminta:</p>
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                    <ShieldCheck size={24} />
                                 </div>
                                 <span className="text-lg font-black italic">{selected?.requestedBadge}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                           <History className="text-primary" />
                           Catatan Audit Internal (Alasan Penolakan/Catatan Khusus)
                        </h3>
                        <textarea 
                          placeholder="Tuliskan catatan persetujuan atau alasan detail penolakan (wajib jika menolak)..." 
                          className="w-full h-32 bg-muted/20 border border-border/50 rounded-2xl p-6 text-sm font-medium outline-none focus:border-primary/40 transition-all resize-none"
                          value={auditNote}
                          onChange={(e) => setAuditNote(e.target.value)}
                        />
                     </div>

                     <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                          className="flex-1 h-16 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/30 flex gap-4 items-center justify-center"
                          onClick={handleApprove}
                        >
                           Setujui Verifikasi
                           <ShieldCheck size={24} />
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-16 px-10 rounded-2xl border-border bg-card font-black text-lg text-amber-500 hover:bg-amber-500/10"
                          onClick={handleEscalate}
                        >
                           Eskalasi ke Legal
                        </Button>
                     </div>
                  </motion.div>
                ) : (
                  <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-6 bg-muted/10 border border-dashed border-border/50 rounded-[3rem] p-6">
                     <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-20">
                        <Scale size={48} />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black italic">Tinjauan Hukum</h3>
                        <p className="text-muted-foreground font-medium max-w-sm">Pilih salah satu pengajuan distributor dari panel kiri untuk meninjau kecocokan dokumen NIB/NPWP serta profil perusahaan.</p>
                     </div>
                  </div>
                )}
             </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
