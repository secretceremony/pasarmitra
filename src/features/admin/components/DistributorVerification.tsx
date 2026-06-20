import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2,
  MapPin,
  ExternalLink,
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
import { toast } from 'sonner';

import { useSearchParams } from 'react-router-dom';

export const DistributorVerification = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditNote, setAuditNote] = useState('');
  const [search, setSearch] = useState('');
  const { user: currentUser } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get('userId');

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
              { name: 'Nomor Induk Berusaha (NIB)', status: data.nib ? 'APPROVED' : 'MISSING', url: data.nib_url || null },
              { name: 'NPWP Perusahaan', status: data.npwp ? 'APPROVED' : 'MISSING', url: data.npwp_url || null },
              { name: 'Izin Operasional Gudang', status: data.warehouse_permit ? 'APPROVED' : 'MISSING', url: data.warehouse_permit_url || null }
            ],
            requestedBadge: data.requested_badge || null,
            submittedAt: data.created_at || null,
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

  useEffect(() => {
    if (urlUserId && applications.some(app => app.id === urlUserId)) {
      setSelectedId(urlUserId);
    } else if (applications.length > 0 && !selectedId) {
      setSelectedId(applications[0].id);
    }
  }, [urlUserId, applications]);

  const selected = applications.find(v => v.id === selectedId);

  const handleApprove = async () => {
    if (!selectedId) return;

    // Guard: do not allow re-approving an already-verified distributor
    if (selected?.is_verified) {
      toast.error('Distributor ini sudah terverifikasi.');
      return;
    }

    if (!window.confirm('Yakin ingin menyetujui verifikasi distributor ini?')) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      await updateDoc(docRef, {
        is_verified: true,
        verification_status: 'VERIFIED',
        audit_note: auditNote || null
      });

      await createAuditLog({
        event: 'DISTRIBUTOR_VERIFICATION_APPROVED',
        status: 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `Menyetujui verifikasi distributor ${selected?.company || ''} (ID: ${selectedId})${auditNote ? ` — Catatan: ${auditNote}` : ''}`,
        targetCollection: 'profiles',
        targetId: selectedId
      });

      toast.success('Distributor berhasil diverifikasi!');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error('Gagal menyetujui verifikasi:', err);
      toast.error('Gagal menyetujui verifikasi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    if (!auditNote.trim()) {
      toast.error('Catatan wajib diisi untuk penolakan atau eskalasi.');
      return;
    }
    if (!window.confirm('Yakin ingin menolak pengajuan verifikasi ini?')) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      await updateDoc(docRef, {
        is_verified: false,
        verification_status: 'REJECTED',
        rejection_reason: auditNote,
        audit_note: auditNote
      });

      await createAuditLog({
        event: 'DISTRIBUTOR_VERIFICATION_REJECTED',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Menolak verifikasi distributor ${selected?.company || ''} (ID: ${selectedId}) — Alasan: ${auditNote}`,
        targetCollection: 'profiles',
        targetId: selectedId
      });

      toast.success('Pengajuan distributor ditolak.');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error('Gagal menolak verifikasi:', err);
      toast.error('Gagal menolak verifikasi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedId) return;
    if (!auditNote.trim()) {
      toast.error('Catatan wajib diisi untuk penolakan atau eskalasi.');
      return;
    }
    if (!window.confirm('Yakin ingin mengeskalasi pengajuan ini ke tim legal?')) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      await updateDoc(docRef, {
        verification_status: 'ESCALATED',
        audit_note: auditNote
      });

      await createAuditLog({
        event: 'DISTRIBUTOR_VERIFICATION_ESCALATED',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Mengeskalasi verifikasi distributor ${selected?.company || ''} (ID: ${selectedId}) ke Tim Legal — Catatan: ${auditNote}`,
        targetCollection: 'profiles',
        targetId: selectedId
      });

      toast.success('Kasus berhasil diteruskan ke Tim Legal.');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error('Gagal meneruskan kasus ke Tim Legal:', err);
      toast.error('Gagal meneruskan kasus ke Tim Legal');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredApplications = applications.filter(app => 
    app.company.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusType = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING_REVIEW': return 'warning';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'danger';
      case 'ESCALATED': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'Diverifikasi';
      case 'PENDING_REVIEW': return 'Menunggu Verifikasi';
      case 'PENDING': return 'Menunggu Verifikasi';
      case 'REJECTED': return 'Ditolak';
      case 'ESCALATED': return 'Eskalasi Legal';
      default: return status || '-';
    }
  };

  const getDocStatusType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'NEEDS_REVIEW': return 'warning';
      case 'REJECTED': return 'danger';
      case 'MISSING': return 'neutral';
      default: return 'neutral';
    }
  };

  const getDocStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Disetujui';
      case 'PENDING': return 'Menunggu';
      case 'NEEDS_REVIEW': return 'Perlu Review';
      case 'REJECTED': return 'Ditolak';
      case 'MISSING': return 'Belum Ada';
      default: return 'Belum Ada';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="space-y-1 border-l-4 border-amber-500 pl-6 py-1">
            <h1 className="text-3xl font-black tracking-tighter">Verifikasi Distributor</h1>
            <p className="text-muted-foreground font-medium text-sm">Tinjau dan validasi dokumen legal perusahaan distributor sebelum diaktifkan.</p>
         </div>
         <div className="flex items-center gap-3 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 self-start sm:self-auto shrink-0">
            <Clock className="text-amber-500 shrink-0" size={18} />
            <div>
               <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest leading-none mb-0.5">Rata-rata Peninjauan</p>
               <p className="text-sm font-black italic leading-none">4.2 Jam</p>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground bg-card border border-border/50 rounded-3xl shadow-xl">
           <Loader2 className="animate-spin text-primary" size={40} />
           <p className="font-black text-xs uppercase tracking-widest">Sinkronisasi Berkas Pendaftaran...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left panel — fixed width on desktop */}
          <div className="w-full lg:w-[360px] shrink-0 space-y-3">
             {/* Search */}
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Cari pengajuan distributor..."
                  className="w-full h-11 bg-card border border-border/50 rounded-xl px-10 text-sm font-bold shadow-sm outline-none focus:border-primary/40 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>

             {/* Application list */}
             <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-14rem)] pr-0.5 custom-scrollbar">
                {filteredApplications.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-card border border-dashed border-border/50 rounded-2xl">
                    <Building2 className="mx-auto text-muted-foreground/30 mb-3" size={28} />
                    <p className="font-bold text-muted-foreground text-sm">
                      {applications.length === 0
                        ? 'Belum ada pengajuan verifikasi distributor.'
                        : 'Tidak ada pengajuan yang sesuai pencarian.'}
                    </p>
                  </div>
                ) : (
                  filteredApplications.map((app) => (
                    <motion.div
                      key={app.id}
                      onClick={() => setSelectedId(app.id)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 bg-card border rounded-2xl cursor-pointer transition-all relative overflow-hidden group",
                        selectedId === app.id
                          ? "border-primary ring-2 ring-primary/20 shadow-lg"
                          : "border-border/50 hover:border-primary/30 hover:shadow-md"
                      )}
                    >
                       {/* Selected indicator bar */}
                       {selectedId === app.id && <div className="absolute top-0 right-0 w-1 h-full bg-primary" />}

                       <div className="flex items-center justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                             <div className={cn(
                               "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                               selectedId === app.id ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                             )}>
                                <Building2 size={16} />
                             </div>
                             <div className="min-w-0">
                                <h4 className={cn(
                                  "font-black text-sm tracking-tight leading-tight truncate transition-colors",
                                  selectedId === app.id ? "text-primary" : "group-hover:text-primary"
                                )}>{app.company}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{app.type}</p>
                             </div>
                          </div>
                          <StatusBadge
                            type={getStatusType(app.status)}
                            label={getStatusLabel(app.status)}
                          />
                       </div>

                       <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground border-t border-border/30 pt-2.5">
                          <Clock size={11} />
                          <span>Terdaftar: {app.submitted}</span>
                       </div>
                    </motion.div>
                  ))
                )}
             </div>
          </div>

          {/* Right panel — fluid */}
          <div className="flex-1 min-w-0">
             <AnimatePresence mode="wait">
                {selectedId ? (
                  <motion.div
                    key={selectedId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
                  >
                     {/* Distributor header */}
                     <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-border/40">
                        <div className="flex items-start gap-4">
                           <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Building2 size={22} />
                           </div>
                           <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                 <h2 className="text-lg font-black tracking-tight leading-tight">{selected?.company}</h2>
                                 {selected?.is_verified && <ShieldCheck className="text-primary shrink-0" size={16} />}
                                 <StatusBadge
                                   type={getStatusType(selected?.status || '')}
                                   label={getStatusLabel(selected?.status || '')}
                                 />
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground font-medium text-xs">
                                 <span className="flex items-center gap-1.5"><MapPin size={12} /> {selected?.location || 'Lokasi tidak tersedia'}</span>
                                 <span className="flex items-center gap-1.5"><Clock size={12} /> Terdaftar: {selected?.submitted || '-'}</span>
                                 <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide">ID: {selected?.id?.slice(0, 12)}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Document checklist */}
                     <div className="px-6 md:px-8 pt-5 pb-4 space-y-3">
                        <h3 className="text-sm font-black flex items-center gap-2">
                           <FileText className="text-primary" size={15} />
                           Dokumen Legal
                        </h3>
                        <div className="space-y-2">
                           {(!selected?.documents || selected.documents.length === 0) ? (
                             <p className="text-xs text-muted-foreground font-medium py-3 px-4 bg-muted/20 rounded-xl border border-border/30">
                               Dokumen belum tersedia.
                             </p>
                           ) : (
                             selected.documents.map((docItem: any, i: number) => (
                               <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/30 transition-colors hover:border-border/60">
                                  <span className="text-xs font-bold text-foreground/80 truncate pr-2">{docItem.name}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                     <StatusBadge
                                       type={getDocStatusType(docItem.status)}
                                       label={getDocStatusLabel(docItem.status)}
                                     />
                                     {docItem.url ? (
                                       <a
                                         href={docItem.url}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="text-muted-foreground hover:text-primary transition-colors"
                                         title="Lihat dokumen"
                                       >
                                         <ExternalLink size={13} />
                                       </a>
                                     ) : (
                                       <ExternalLink size={13} className="text-muted-foreground/20" />
                                     )}
                                  </div>
                               </div>
                             ))
                           )}
                        </div>
                     </div>

                     {/* Package/badge assessment */}
                     <div className="px-6 md:px-8 bg-muted/30 mx-0 border-y border-border/30 py-4 space-y-2.5">
                        <h3 className="text-sm font-black flex items-center gap-2">
                           <ShieldCheck className="text-primary" size={15} />
                           Penilaian Paket Distributor
                        </h3>
                        {selected?.requestedBadge ? (
                          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/40">
                             <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                <ShieldCheck size={16} />
                             </div>
                             <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Paket/Lencana yang Diajukan</p>
                                <span className="text-sm font-black">{selected.requestedBadge}</span>
                             </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground font-medium py-2 px-3 bg-card rounded-xl border border-border/30">
                            Tidak ada paket yang diajukan.
                          </p>
                        )}
                     </div>

                     {/* Decision area: audit notes + actions */}
                     <div className="px-6 md:px-8 pb-6 md:pb-8 pt-4 space-y-4 border-t border-border/40 bg-muted/10">
                        {/* Internal audit notes */}
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <History className="text-primary shrink-0" size={14} />
                              <h3 className="text-sm font-black">Catatan Audit Internal</h3>
                           </div>
                           <textarea
                             placeholder="Tuliskan catatan persetujuan atau alasan detail penolakan..."
                             className="w-full min-h-[80px] bg-background border border-border/50 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-primary/40 transition-all resize-y"
                             value={auditNote}
                             onChange={(e) => setAuditNote(e.target.value)}
                             disabled={isProcessing}
                           />
                           <p className="text-[11px] text-muted-foreground font-medium">
                             Wajib diisi jika pengajuan ditolak atau dieskalasi.
                           </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2.5">
                           <Button
                             className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20 flex gap-2 items-center justify-center disabled:opacity-60"
                             onClick={handleApprove}
                             disabled={isProcessing || isLoading || selected?.is_verified}
                             title={selected?.is_verified ? 'Distributor sudah terverifikasi' : 'Setujui verifikasi'}
                           >
                              {isProcessing ? (
                                <>Memproses... <Loader2 className="animate-spin" size={16} /></>
                              ) : (
                                <><CheckCircle2 size={16} /> Setujui Verifikasi</>
                              )}
                           </Button>
                           <Button
                             variant="outline"
                             className="h-11 px-5 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-black text-sm flex gap-2 items-center justify-center disabled:opacity-60"
                             onClick={handleReject}
                             disabled={isProcessing || isLoading}
                           >
                              {isProcessing ? (
                                <>Memproses... <Loader2 className="animate-spin text-rose-500" size={16} /></>
                              ) : (
                                <><XCircle size={16} /> Tolak Pengajuan</>
                              )}
                           </Button>
                           <Button
                             variant="outline"
                             className="h-11 px-5 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-black text-sm flex gap-2 items-center justify-center disabled:opacity-60"
                             onClick={handleEscalate}
                             disabled={isProcessing || isLoading}
                           >
                              {isProcessing ? (
                                <>Memproses... <Loader2 className="animate-spin text-amber-500" size={16} /></>
                              ) : (
                                <><Gavel size={16} /> Eskalasi Legal</>
                              )}
                           </Button>
                        </div>
                     </div>
                  </motion.div>
                ) : (
                  <div className="min-h-[320px] flex flex-col items-center justify-center text-center space-y-3 bg-muted/10 border border-dashed border-border/50 rounded-3xl p-8">
                     <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-20">
                        <Scale size={24} />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-base font-black">Pilih Pengajuan</h3>
                        <p className="text-muted-foreground font-medium max-w-xs text-sm">Pilih pengajuan distributor untuk ditinjau.</p>
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
