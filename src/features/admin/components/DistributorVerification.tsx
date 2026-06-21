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
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../services/adminService';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { formatDateTime } from '../../../lib/dateUtils';

import { useSearchParams, useNavigate } from 'react-router-dom';

export const DistributorVerification = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'DISTRIBUTOR' | 'UMKM'>('DISTRIBUTOR');
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
        if (data.role === 'DISTRIBUTOR') {
          list.push({
            id: doc.id,
            role: 'DISTRIBUTOR',
            company: data.organization_name || data.full_name || 'PT. Tanpa Nama',
            type: 'DISTRIBUTOR PERUSAHAAN',
            submitted: formatDateTime(data.updated_at || data.created_at),
            status: data.is_verified ? 'VERIFIED' : (data.verification_status || 'PENDING_REVIEW'),
            is_verified: data.is_verified || false,
            documents: [
              { name: 'Nomor Induk Berusaha (NIB)', status: data.nib ? 'APPROVED' : 'MISSING', url: data.nib_url || null },
              { name: 'NPWP Perusahaan', status: data.npwp ? 'APPROVED' : 'MISSING', url: data.npwp_url || null },
              { name: 'Izin Operasional Gudang', status: data.warehouse_permit ? 'APPROVED' : 'MISSING', url: data.warehouse_permit_url || null }
            ],
            requestedBadge: data.requested_badge || null,
            submittedAt: data.updated_at || data.created_at || null,
            location: data.business_district || data.address || 'Balikpapan, Kalimantan Timur',
            nib: data.nib || null,
            npwp: data.npwp || null,
            warehouse_permit: data.warehouse_permit || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            organization_name: data.organization_name || null,
            verification_status: data.verification_status || 'PENDING_REVIEW',
            verification_notes: data.verification_notes || null,
            rejection_reason: data.rejection_reason || null,
            audit_note: data.audit_note || null,
            // New Balikpapan-scoped verification fields
            business_type: data.business_type || null,
            business_district: data.business_district || null,
            business_address: data.business_address || data.address || null,
            business_document_url: data.business_document_url || null
          });
        } else if (data.role === 'UMKM') {
          list.push({
            id: doc.id,
            role: 'UMKM',
            company: data.organization_name || data.full_name || 'Toko UMKM',
            type: 'MITRA UMKM',
            submitted: formatDateTime(data.updated_at || data.created_at),
            status: data.is_verified ? 'VERIFIED' : (data.verification_status || 'PENDING_REVIEW'),
            is_verified: data.is_verified || false,
            business_type: data.business_type || 'Belum Diisi',
            business_address: data.business_address || data.address || 'Belum Diisi',
            business_district: data.business_district || 'Belum Diisi',
            business_document_url: data.business_document_url || null,
            submittedAt: data.updated_at || data.created_at || null,
            location: data.address || 'Balikpapan',
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            organization_name: data.organization_name || null,
            verification_status: data.verification_status || 'PENDING_REVIEW',
            verification_notes: data.verification_notes || null,
            rejection_reason: data.rejection_reason || null,
            audit_note: data.audit_note || null
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
      const app = applications.find(a => a.id === urlUserId);
      if (app) {
        setActiveTab(app.role);
      }
      setSelectedId(urlUserId);
    } else {
      const tabApps = applications.filter(app => app.role === activeTab);
      if (tabApps.length > 0 && !selectedId) {
        setSelectedId(tabApps[0].id);
      }
    }
  }, [urlUserId, applications, activeTab]);

  const selected = applications.find(v => v.id === selectedId);

  const handleApprove = async () => {
    if (!selectedId) return;

    // Guard: do not allow re-approving an already-verified account
    if (selected?.is_verified) {
      toast.error('Akun ini sudah terverifikasi.');
      return;
    }

    if (!window.confirm(`Yakin ingin menyetujui verifikasi ${selected?.role === 'UMKM' ? 'UMKM' : 'distributor'} ini?`)) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      const timestamp = new Date().toISOString();
      const updateData: any = {
        is_verified: true,
        verification_status: 'VERIFIED',
        verification_notes: auditNote || null,
        audit_note: auditNote || null,
        verified_at: timestamp,
        verified_by: currentUser?.email || currentUser?.id || 'System Admin',
        updated_at: timestamp
      };

      await updateDoc(docRef, updateData);

      if (selected?.role === 'DISTRIBUTOR') {
        // Update separate verification request doc status if it exists
        try {
          const reqQuery = query(
            collection(db, 'verification_requests'),
            where('distributor_id', '==', selectedId),
            where('status', '==', 'PENDING_REVIEW')
          );
          const reqSnap = await getDocs(reqQuery);
          if (!reqSnap.empty) {
            for (const reqDoc of reqSnap.docs) {
              await updateDoc(doc(db, 'verification_requests', reqDoc.id), {
                status: 'VERIFIED',
                reviewed_at: timestamp,
                reviewer_id: currentUser?.id || 'System Admin',
                updated_at: timestamp
              });
            }
          }
        } catch (reqErr) {
          console.error('Error updating verification request status:', reqErr);
        }
      }

      await createAuditLog({
        event: selected?.role === 'UMKM' ? 'UMKM_VERIFICATION_APPROVED' : 'DISTRIBUTOR_VERIFICATION_APPROVED',
        status: 'SUCCESS',
        user: currentUser?.email || 'System Admin',
        details: `Menyetujui verifikasi ${selected?.role === 'UMKM' ? 'UMKM' : 'distributor'} ${selected?.company || ''} (ID: ${selectedId})${auditNote ? ` — Catatan: ${auditNote}` : ''}`,
        targetCollection: 'profiles',
        targetId: selectedId
      });

      toast.success(`${selected?.role === 'UMKM' ? 'UMKM' : 'Distributor'} berhasil diverifikasi!`);
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
      toast.error('Catatan wajib diisi untuk penolakan.');
      return;
    }
    if (!window.confirm('Yakin ingin menolak pengajuan verifikasi ini?')) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      const timestamp = new Date().toISOString();
      const updateData: any = {
        is_verified: false,
        verification_status: 'REJECTED',
        rejection_reason: auditNote,
        verification_notes: auditNote,
        audit_note: auditNote,
        updated_at: timestamp
      };

      await updateDoc(docRef, updateData);

      if (selected?.role === 'DISTRIBUTOR') {
        // Update separate verification request doc status if it exists
        try {
          const reqQuery = query(
            collection(db, 'verification_requests'),
            where('distributor_id', '==', selectedId),
            where('status', '==', 'PENDING_REVIEW')
          );
          const reqSnap = await getDocs(reqQuery);
          if (!reqSnap.empty) {
            for (const reqDoc of reqSnap.docs) {
              await updateDoc(doc(db, 'verification_requests', reqDoc.id), {
                status: 'REJECTED',
                rejection_reason: auditNote,
                reviewed_at: timestamp,
                reviewer_id: currentUser?.id || 'System Admin',
                updated_at: timestamp
              });
            }
          }
        } catch (reqErr) {
          console.error('Error updating verification request status:', reqErr);
        }
      }

      await createAuditLog({
        event: selected?.role === 'UMKM' ? 'UMKM_VERIFICATION_REJECTED' : 'DISTRIBUTOR_VERIFICATION_REJECTED',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Menolak verifikasi ${selected?.role === 'UMKM' ? 'UMKM' : 'distributor'} ${selected?.company || ''} (ID: ${selectedId}) — Alasan: ${auditNote}`,
        targetCollection: 'profiles',
        targetId: selectedId
      });

      toast.success('Pengajuan ditolak.');
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

  const handleRequestRevision = async () => {
    if (!selectedId) return;
    if (!auditNote.trim()) {
      toast.error('Catatan wajib diisi untuk meminta revisi.');
      return;
    }
    if (!window.confirm('Yakin ingin meminta revisi untuk pengajuan ini?')) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      const timestamp = new Date().toISOString();
      await updateDoc(docRef, {
        is_verified: false,
        verification_status: 'NEEDS_REVISION',
        verification_notes: auditNote,
        audit_note: auditNote,
        updated_at: timestamp
      });

      await createAuditLog({
        event: selected?.role === 'UMKM' ? 'UMKM_VERIFICATION_REVISION_REQUESTED' : 'DISTRIBUTOR_VERIFICATION_REVISION_REQUESTED',
        status: 'WARNING',
        user: currentUser?.email || 'System Admin',
        details: `Meminta revisi verifikasi ${selected?.role === 'UMKM' ? 'UMKM' : 'distributor'} ${selected?.company || ''} (ID: ${selectedId}) — Catatan: ${auditNote}`,
        targetCollection: 'profiles',
        targetId: selectedId
      });

      toast.success('Permintaan revisi berhasil dikirim.');
      setAuditNote('');
      setSelectedId(null);
      fetchApplications();
    } catch (err) {
      console.error('Gagal meminta revisi:', err);
      toast.error('Gagal meminta revisi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedId) return;
    if (!auditNote.trim()) {
      toast.error('Catatan wajib diisi untuk eskalasi.');
      return;
    }
    if (!window.confirm('Yakin ingin mengeskalasi pengajuan ini ke tim legal?')) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'profiles', selectedId);
      const timestamp = new Date().toISOString();
      await updateDoc(docRef, {
        verification_status: 'ESCALATED',
        audit_note: auditNote,
        updated_at: timestamp
      });

      if (selected?.role === 'DISTRIBUTOR') {
        try {
          const reqQuery = query(
            collection(db, 'verification_requests'),
            where('distributor_id', '==', selectedId),
            where('status', '==', 'PENDING_REVIEW')
          );
          const reqSnap = await getDocs(reqQuery);
          if (!reqSnap.empty) {
            for (const reqDoc of reqSnap.docs) {
              await updateDoc(doc(db, 'verification_requests', reqDoc.id), {
                status: 'ESCALATED',
                reviewed_at: timestamp,
                reviewer_id: currentUser?.id || 'System Admin',
                updated_at: timestamp
              });
            }
          }
        } catch (reqErr) {
          console.error('Error updating verification request status:', reqErr);
        }
      }

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
    app.role === activeTab &&
    app.company.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusType = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING_REVIEW': return 'warning';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'danger';
      case 'NEEDS_REVISION': return 'danger';
      case 'ESCALATED': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'Terverifikasi';
      case 'PENDING_REVIEW': return 'Menunggu Review';
      case 'PENDING': return 'Menunggu Review';
      case 'REJECTED': return 'Ditolak';
      case 'NEEDS_REVISION': return 'Perlu Revisi';
      case 'ESCALATED': return 'Dieskalasikan';
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
    <div className="space-y-6 w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Verifikasi</span>
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="space-y-1 border-l-4 border-amber-500 pl-6 py-1">
            <h1 className="text-3xl font-black tracking-tighter">
              {activeTab === 'DISTRIBUTOR' ? 'Verifikasi Distributor' : 'Verifikasi UMKM'}
            </h1>
            <p className="text-muted-foreground font-medium text-sm">
              {activeTab === 'DISTRIBUTOR' 
                ? 'Tinjau dan validasi dokumen legal perusahaan distributor sebelum diaktifkan.' 
                : 'Tinjau dan validasi data profil usaha UMKM sebelum diizinkan bertransaksi.'}
            </p>
         </div>
         <div className="flex items-center gap-3 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 self-start sm:self-auto shrink-0">
            <Clock className="text-amber-500 shrink-0" size={18} />
            <div>
               <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest leading-none mb-0.5">Rata-rata Peninjauan</p>
               <p className="text-sm font-black italic leading-none">4.2 Jam</p>
            </div>
         </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-border/50 gap-6">
        <button
          onClick={() => { setActiveTab('DISTRIBUTOR'); setSelectedId(null); }}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer",
            activeTab === 'DISTRIBUTOR' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Verifikasi Distributor
        </button>
        <button
          onClick={() => { setActiveTab('UMKM'); setSelectedId(null); }}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer",
            activeTab === 'UMKM' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Verifikasi UMKM
        </button>
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
                  placeholder={activeTab === 'DISTRIBUTOR' ? "Cari pengajuan distributor..." : "Cari pengajuan UMKM..."}
                  className="w-full h-11 bg-card border border-border/50 rounded-xl px-10 text-sm font-bold shadow-sm outline-none focus:border-primary/40 transition-all text-foreground"
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
                      {applications.filter(app => app.role === activeTab).length === 0
                        ? `Belum ada pengajuan verifikasi ${activeTab === 'DISTRIBUTOR' ? 'distributor' : 'UMKM'}.`
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
                     {/* Header */}
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

                      {/* Business Details */}
                      <div className="px-6 md:px-8 pt-5 pb-4 space-y-4 border-b border-border/30 bg-muted/5">
                         <h3 className="text-sm font-black flex items-center gap-2">
                            <Building2 className="text-primary" size={15} />
                            Detail Profil Usaha
                         </h3>
                         <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                               <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">
                                 {selected?.role === 'UMKM' ? 'Nama Toko' : 'Nama Perusahaan'}
                               </span>
                               <span className="text-foreground">{selected?.organization_name || selected?.company || '-'}</span>
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                               <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Email Kontak</span>
                               <span className="text-foreground">{selected?.email || '-'}</span>
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                               <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">No. Telepon</span>
                               <span className="text-foreground">{selected?.phone || '-'}</span>
                            </div>
                            {selected?.role === 'UMKM' ? (
                              <>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                   <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Tipe Usaha</span>
                                   <span className="text-foreground">{selected?.business_type || '-'}</span>
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                   <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Kecamatan (Balikpapan)</span>
                                   <span className="text-foreground">{selected?.business_district || '-'}</span>
                                </div>
                                <div className="space-y-1 col-span-2">
                                   <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Alamat Usaha di Balikpapan</span>
                                   <span className="text-foreground">{selected?.business_address || selected?.address || '-'}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                 <div className="space-y-1 col-span-2 sm:col-span-1">
                                    <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Tipe Distributor</span>
                                    <span className="text-foreground">{selected?.business_type || '-'}</span>
                                 </div>
                                 <div className="space-y-1 col-span-2 sm:col-span-1">
                                    <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Kecamatan (Balikpapan)</span>
                                    <span className="text-foreground">{selected?.business_district || '-'}</span>
                                 </div>
                                 <div className="space-y-1 col-span-2">
                                    <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Alamat Usaha / Gudang</span>
                                    <span className="text-foreground">{selected?.business_address || selected?.address || '-'}</span>
                                 </div>
                                 {/* Legacy legal document fields (backward compatibility) */}
                                 {(selected?.nib || selected?.npwp || selected?.warehouse_permit) && (
                                   <div className="col-span-2 pt-2 border-t border-border/20 space-y-2">
                                     <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Dokumen Legal (Lama)</span>
                                     <div className="grid grid-cols-2 gap-3">
                                       {selected?.nib && (
                                         <div className="space-y-0.5">
                                           <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">NIB</span>
                                           <span className="text-foreground font-mono text-[11px]">{selected.nib}</span>
                                         </div>
                                       )}
                                       {selected?.npwp && (
                                         <div className="space-y-0.5">
                                           <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">NPWP</span>
                                           <span className="text-foreground font-mono text-[11px]">{selected.npwp}</span>
                                         </div>
                                       )}
                                       {selected?.warehouse_permit && (
                                         <div className="space-y-0.5 col-span-2">
                                           <span className="text-muted-foreground block uppercase text-[10px] tracking-wider">Izin Gudang</span>
                                           <span className="text-foreground font-mono text-[11px]">{selected.warehouse_permit}</span>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 )}
                              </>
                            )}
                         </div>
                      </div>

                      {/* Document/evidence checklist */}
                      <div className="px-6 md:px-8 pt-5 pb-4 space-y-3">
                         <h3 className="text-sm font-black flex items-center gap-2">
                            <FileText className="text-primary" size={15} />
                            {selected?.role === 'UMKM' ? 'Bukti Pendukung Usaha' : 'Dokumen Legal'}
                         </h3>
                         {selected?.role === 'UMKM' || selected?.role === 'DISTRIBUTOR' ? (
                            <div className="p-4 bg-muted/20 rounded-xl border border-border/30">
                              {selected?.business_document_url ? (
                                <div className="space-y-2 text-left">
                                  <span className="text-xs font-bold text-muted-foreground block">Teks / Tautan Bukti:</span>
                                  <p className="text-xs font-bold text-foreground break-all">{selected.business_document_url}</p>
                                  {(selected.business_document_url.startsWith('http://') || selected.business_document_url.startsWith('https://')) && (
                                    <a
                                      href={selected.business_document_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-black text-primary hover:underline flex items-center gap-1.5 mt-2"
                                    >
                                      Buka Dokumen Pendukung <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground font-medium">Tidak ada dokumen pendukung yang dilampirkan.</p>
                              )}
                              {/* Legacy document checklist (for distributors that submitted the old way) */}
                              {selected?.role === 'DISTRIBUTOR' && selected?.documents && selected.documents.some((d: any) => d.status !== 'MISSING') && (
                                <div className="mt-4 space-y-2 border-t border-border/20 pt-3">
                                  <span className="text-xs font-black text-muted-foreground uppercase tracking-wider block">Dokumen Legal (Pengajuan Lama)</span>
                                  {selected.documents.map((docItem: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 bg-card rounded-lg border border-border/30">
                                      <span className="text-xs font-bold text-foreground/80 truncate pr-2">{docItem.name}</span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <StatusBadge type={getDocStatusType(docItem.status)} label={getDocStatusLabel(docItem.status)} />
                                        {docItem.url && (
                                          <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                            <ExternalLink size={12} />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
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
                          )}
                      </div>

                      {/* Package/badge assessment (Only for Distributor) */}
                      {selected?.role === 'DISTRIBUTOR' && (
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
                      )}

                      {/* Decision area: audit notes + actions */}
                      <div className="px-6 md:px-8 pb-6 md:pb-8 pt-4 space-y-4 border-t border-border/40 bg-muted/10">
                         {/* Internal audit notes */}
                         <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               <History className="text-primary shrink-0" size={14} />
                               <h3 className="text-sm font-black">Catatan Audit Internal</h3>
                            </div>
                            <textarea
                              placeholder="Tuliskan catatan persetujuan, alasan penolakan, atau permintaan revisi..."
                              className="w-full min-h-[80px] bg-background border border-border/50 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-primary/40 transition-all resize-y text-foreground"
                              value={auditNote}
                              onChange={(e) => setAuditNote(e.target.value)}
                              disabled={isProcessing}
                            />
                            <p className="text-[11px] text-muted-foreground font-medium">
                              Wajib diisi jika pengajuan ditolak atau diminta revisi.
                            </p>
                         </div>

                         {/* Action buttons */}
                         <div className="flex flex-col sm:flex-row gap-2.5">
                            <Button
                              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20 flex gap-2 items-center justify-center disabled:opacity-60"
                              onClick={handleApprove}
                              disabled={isProcessing || isLoading || selected?.is_verified}
                              title={selected?.is_verified ? 'Sudah terverifikasi' : 'Setujui verifikasi'}
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
                            {selected?.role === 'UMKM' ? (
                              <Button
                                variant="outline"
                                className="h-11 px-5 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-black text-sm flex gap-2 items-center justify-center disabled:opacity-60"
                                onClick={handleRequestRevision}
                                disabled={isProcessing || isLoading}
                              >
                                 {isProcessing ? (
                                   <>Memproses... <Loader2 className="animate-spin text-amber-500" size={16} /></>
                                 ) : (
                                   <><Gavel size={16} /> Minta Revisi</>
                                 )}
                              </Button>
                            ) : (
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
                            )}
                         </div>
                      </div>
                  </motion.div>
                ) : (
                  <div className="min-h-[320px] flex flex-col items-center justify-center text-center space-y-3 bg-muted/10 border border-dashed border-border/50 rounded-3xl p-8">
                     <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground opacity-20">
                        <Scale size={24} />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-base font-black">Pilih Pengajuan</h3>
                        <p className="text-muted-foreground font-medium max-w-xs text-sm">
                          Pilih pengajuan {activeTab === 'DISTRIBUTOR' ? 'distributor' : 'UMKM'} untuk ditinjau.
                        </p>
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
