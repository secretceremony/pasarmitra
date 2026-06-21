import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  Download,
  HelpCircle,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/use-auth-store';
import { createAuditLog } from '../../admin/services/adminService';
import { toast } from 'sonner';
import { authService } from '../../auth/services/auth.service';
import { useNavigate } from 'react-router-dom';


export const LegalDocuments = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();


  // Form Fields State
  const [companyName, setCompanyName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [nibNumber, setNibNumber] = useState('');
  const [npwpNumber, setNpwpNumber] = useState('');
  const [warehousePermitNumber, setWarehousePermitNumber] = useState('');

  // Form files simulation state
  const [nibFile, setNibFile] = useState<File | null>(null);
  const [npwpFile, setNpwpFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditingAfterRejection, setIsEditingAfterRejection] = useState(false);

  // Sync state with current user profile
  useEffect(() => {
    if (user) {
      setCompanyName(user.organization_name || user.full_name || '');
      setBusinessAddress(user.address || '');
      setBusinessPhone(user.phone || '');
      setNibNumber(user.nib || '');
      setNpwpNumber(user.npwp || '');
      setWarehousePermitNumber(user.warehouse_permit || '');
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
      toast.success(`Berkas ${e.target.files[0].name} siap diunggah.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Guard duplicate submissions
    if ((user.verification_status === 'PENDING_REVIEW' || user.verification_status === 'ESCALATED') && !isEditingAfterRejection) {
      toast.error("Pengajuan verifikasi Anda sedang dalam proses peninjauan.");
      return;
    }

    if (!nibNumber || !npwpNumber) {
      toast.error("Nomor NIB dan NPWP wajib diisi.");
      return;
    }

    // Validate NIB only contains numbers
    if (!/^\d+$/.test(nibNumber)) {
      toast.error("Nomor NIB hanya boleh berisi angka.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      // Simulate file upload progress
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(40);
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(80);
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      const payload = {
        company_name: companyName,
        nib: nibNumber,
        npwp: npwpNumber,
        business_address: businessAddress,
        phone: businessPhone,
        warehouse_permit: warehousePermitNumber || '',
        email: user.email
      };

      await authService.submitDistributorVerification(user.id, payload);

      // Write audit log
      await createAuditLog({
        event: 'DISTRIBUTOR_VERIFICATION_SUBMITTED',
        status: 'SUCCESS',
        user: user.email,
        details: `Distributor ${companyName} (ID: ${user.id}) mengajukan berkas verifikasi legalitas usaha.`,
        targetCollection: 'profiles',
        targetId: user.id
      });

      // Update Zustand local store with current timestamp so it renders instantly
      const mockNibUrl = `https://pasarmitra.com/docs/nib-${user.id}.pdf`;
      const mockNpwpUrl = `https://pasarmitra.com/docs/npwp-${user.id}.pdf`;
      const mockWarehousePermitUrl = warehousePermitNumber 
        ? `https://pasarmitra.com/docs/permit-${user.id}.pdf` 
        : '';
        
      const currentIsoTime = new Date().toISOString();

      setUser({
        ...user,
        organization_name: companyName,
        address: businessAddress,
        phone: businessPhone,
        nib: nibNumber,
        nib_url: mockNibUrl,
        npwp: npwpNumber,
        npwp_url: mockNpwpUrl,
        warehouse_permit: warehousePermitNumber || '',
        warehouse_permit_url: mockWarehousePermitUrl,
        is_verified: false,
        verification_status: 'PENDING_REVIEW',
        updated_at: currentIsoTime,
        legal_info: {
          company_name: companyName,
          nib: nibNumber,
          npwp: npwpNumber,
          business_address: businessAddress,
          phone: businessPhone,
          submitted_at: currentIsoTime
        }
      });

      toast.success("Pengajuan verifikasi berhasil dikirim.");
      setIsEditingAfterRejection(false);
    } catch (err: any) {
      console.error("Gagal mengirim dokumen legalitas:", err);
      toast.error(err.message || "Gagal mengirim pengajuan verifikasi.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getComplianceScore = () => {
    if (user?.is_verified) return '100%';
    if (user?.verification_status === 'PENDING_REVIEW') return '75%';
    if (user?.verification_status === 'ESCALATED') return '75%';
    return '0%';
  };

  const getComplianceTier = () => {
    if (user?.is_verified) return 'Terverifikasi';
    if (user?.verification_status === 'PENDING_REVIEW') return 'Menunggu Review';
    if (user?.verification_status === 'ESCALATED') return 'Dieskalasikan';
    if (user?.verification_status === 'REJECTED') return 'Ditolak';
    return 'Belum Mengajukan';
  };

  const vStatus = user?.is_verified ? 'VERIFIED' : (user?.verification_status || 'NOT_SUBMITTED');

  return (
    <div className="space-y-12 pb-20 max-w-6xl w-full max-w-full overflow-hidden px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex-wrap min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground">Dokumen Legal</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-6 border-b-2 border-border/50">
        <div className="space-y-2">
           <div className="flex items-center gap-3 text-primary">
              <ShieldCheck size={28} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Verifikasi & Onboarding</span>
           </div>
           <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">Portofolio Dokumen Legal</h1>
           <p className="text-muted-foreground font-medium text-base sm:text-lg">Jaga status verifikasi usaha Anda agar dapat mengakses fitur penuh PasarMitra.</p>
        </div>
        <div className="p-6 md:p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] flex items-center gap-6">
           <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-2xl shadow-xl shadow-primary/20">
              {getComplianceScore()}
           </div>
           <div>
              <p className="text-xs font-black text-primary uppercase tracking-widest">Status Verifikasi</p>
              <p className="text-lg font-black tracking-tight text-foreground">{getComplianceTier()}</p>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
           
           <AnimatePresence mode="wait">
              {/* STATE 1 & 4: Pending Review or Escalated */}
              {((vStatus === 'PENDING_REVIEW' || vStatus === 'ESCALATED') && !isEditingAfterRejection) && (
                <motion.div 
                  key="pending-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 sm:p-10 bg-amber-500/5 border border-amber-500/20 rounded-[3rem] space-y-6 shadow-xl"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center animate-pulse">
                         <Clock size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tight text-amber-800 dark:text-amber-400">Dokumen Sedang Ditinjau</h3>
                         <p className="text-sm font-semibold text-amber-700/80 dark:text-amber-300/85">Pengajuan verifikasi Anda sedang diperiksa oleh tim admin.</p>
                      </div>
                   </div>

                   <div className="border-t border-amber-500/10 pt-6 space-y-4 text-sm font-bold text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      <p>
                         Terima kasih atas kesabaran Anda. Kami sedang memverifikasi NIB dan NPWP yang Anda kirimkan untuk menjamin keamanan transaksi di ekosistem PasarMitra. Proses verifikasi biasanya memakan waktu 2-4 jam kerja.
                      </p>
                      {vStatus === 'ESCALATED' && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex gap-3 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="shrink-0 text-amber-600" />
                          <p className="text-xs font-black uppercase tracking-wide">Status: Pengajuan Dieskalasi ke Tim Legal untuk validasi khusus.</p>
                        </div>
                      )}
                      {user?.audit_note && (
                        <div className="p-4 bg-muted/40 rounded-xl text-xs border border-border/50 text-foreground">
                          <span className="font-black">Catatan Pemeriksa:</span> {user.audit_note}
                        </div>
                      )}
                   </div>

                   <div className="pt-4 grid gap-3">
                      <div className="p-4 bg-white/40 border border-amber-500/10 rounded-2xl flex justify-between items-center text-xs font-black">
                         <span>NIB: {user?.nib}</span>
                         <a href={user?.nib_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1">Lihat Berkas <Eye size={12} /></a>
                      </div>
                      <div className="p-4 bg-white/40 border border-amber-500/10 rounded-2xl flex justify-between items-center text-xs font-black">
                         <span>NPWP: {user?.npwp}</span>
                         <a href={user?.npwp_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1">Lihat Berkas <Eye size={12} /></a>
                      </div>
                      {user?.warehouse_permit && (
                        <div className="p-4 bg-white/40 border border-amber-500/10 rounded-2xl flex justify-between items-center text-xs font-black">
                           <span>Izin Gudang: {user?.warehouse_permit}</span>
                           <a href={user?.warehouse_permit_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1">Lihat Berkas <Eye size={12} /></a>
                        </div>
                      )}
                   </div>
                </motion.div>
              )}

              {/* STATE 2: Verified */}
              {(vStatus === 'VERIFIED') && (
                <motion.div 
                  key="verified-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 sm:p-10 bg-emerald-500/5 border border-emerald-500/20 rounded-[3rem] space-y-6 shadow-xl"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                         <CheckCircle2 size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tight text-emerald-800 dark:text-emerald-300">Verifikasi Terpenuhi</h3>
                         <p className="text-sm font-semibold text-emerald-700/80 dark:text-emerald-200/80">Akun distributor Anda berstatus aktif dan terverifikasi.</p>
                      </div>
                   </div>

                    <div className="border-t border-emerald-500/10 pt-6 space-y-4 text-sm font-bold text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
                      <p>
                         Selamat! Dokumen compliance Anda telah diverifikasi oleh sistem. Anda sekarang memiliki hak akses penuh untuk menerbitkan katalog produk grosir, bernegosiasi harga, dan melakukan transaksi termin kredit secara resmi di PasarMitra.
                      </p>
                      {user?.audit_note && (
                        <div className="p-4 bg-muted/40 rounded-xl text-xs border border-border/50 text-foreground">
                          <span className="font-black">Catatan Auditor:</span> {user.audit_note}
                        </div>
                      )}
                   </div>

                   <div className="pt-4 grid gap-3">
                      <div className="p-4 bg-white/40 border border-emerald-500/10 rounded-2xl flex justify-between items-center text-xs font-black">
                         <span>NIB: {user?.nib}</span>
                         <a href={user?.nib_url} target="_blank" rel="noreferrer" className="text-emerald-600 flex items-center gap-1">Lihat Berkas <Eye size={12} /></a>
                      </div>
                      <div className="p-4 bg-white/40 border border-emerald-500/10 rounded-2xl flex justify-between items-center text-xs font-black">
                         <span>NPWP: {user?.npwp}</span>
                         <a href={user?.npwp_url} target="_blank" rel="noreferrer" className="text-emerald-600 flex items-center gap-1">Lihat Berkas <Eye size={12} /></a>
                      </div>
                      {user?.warehouse_permit && (
                        <div className="p-4 bg-white/40 border border-emerald-500/10 rounded-2xl flex justify-between items-center text-xs font-black">
                           <span>Izin Gudang: {user?.warehouse_permit}</span>
                           <a href={user?.warehouse_permit_url} target="_blank" rel="noreferrer" className="text-emerald-600 flex items-center gap-1">Lihat Berkas <Eye size={12} /></a>
                        </div>
                      )}
                   </div>
                </motion.div>
              )}

              {/* STATE 3: Rejected */}
              {(vStatus === 'REJECTED' && !isEditingAfterRejection) && (
                <motion.div 
                  key="rejected-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 sm:p-10 bg-rose-500/5 border border-rose-500/20 rounded-[3rem] space-y-6 shadow-xl"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
                         <AlertCircle size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black tracking-tight text-rose-800 dark:text-rose-300">Verifikasi Ditolak</h3>
                         <p className="text-sm font-semibold text-rose-700/80 dark:text-rose-200/80">Dokumen legalitas ditolak karena alasan ketidaksesuaian data.</p>
                      </div>
                   </div>

                   <div className="border-t border-rose-500/10 pt-6 space-y-4 text-sm font-bold text-rose-800/80 dark:text-rose-200/80 leading-relaxed">
                      <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                         <p className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-widest mb-1.5 flex items-center gap-1"><AlertCircle size={14} /> Alasan Penolakan Admin:</p>
                         <p className="font-bold text-sm text-rose-700 dark:text-rose-300">{user?.rejection_reason || user?.audit_note || "Dokumen yang dilampirkan tidak sesuai, atau nomor identitas salah."}</p>
                      </div>
                      <p>
                         Silakan ajukan kembali verifikasi Anda dengan memeriksa keabsahan dokumen legalitas perusahaan. Pastikan nomor NIB dan NPWP yang ditulis sesuai dan tidak dalam kondisi kedaluwarsa.
                      </p>
                   </div>

                   <div className="pt-4 flex gap-4">
                      <Button 
                        onClick={() => setIsEditingAfterRejection(true)}
                        className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base shadow-lg shadow-rose-600/20"
                      >
                         Perbaiki & Ajukan Ulang
                      </Button>
                   </div>
                </motion.div>
              )}

              {/* FORM VIEW: Not Submitted or Editing after Rejection */}
              {((vStatus === 'NOT_SUBMITTED' || isEditingAfterRejection) && !(vStatus === 'PENDING_REVIEW' || vStatus === 'ESCALATED' || vStatus === 'VERIFIED') || (vStatus === 'REJECTED' && isEditingAfterRejection)) && (
                <motion.div 
                  key="form-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                   <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black tracking-tight">
                        {isEditingAfterRejection ? 'Ajukan Ulang Verifikasi' : 'Formulir Legalitas Bisnis'}
                      </h3>
                      {isEditingAfterRejection && (
                        <Button variant="ghost" className="h-10 rounded-xl font-bold" onClick={() => setIsEditingAfterRejection(false)}>Batal</Button>
                      )}
                   </div>

                   <form onSubmit={handleSubmit} className="p-8 sm:p-10 bg-card border border-border/50 rounded-[3rem] shadow-xl space-y-8">
                      {/* Step 1: Profil Perusahaan */}
                      <div className="space-y-6">
                         <h4 className="text-lg font-black text-primary border-l-4 border-primary pl-4">1. Identitas Perusahaan</h4>
                         
                         <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-3 flex items-center gap-1.5"><Building2 size={13} /> Nama Perusahaan / Badan Usaha</label>
                               <input required type="text" placeholder="mis. PT. Sembako Nusantara Sejahtera" className="w-full h-14 bg-muted/20 border border-border rounded-xl px-5 font-bold focus:border-primary focus:outline-none" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-3 flex items-center gap-1.5"><Phone size={13} /> Nomor Telepon Bisnis</label>
                               <input required type="text" placeholder="mis. 02188219902" className="w-full h-14 bg-muted/20 border border-border rounded-xl px-5 font-bold focus:border-primary focus:outline-none" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} />
                            </div>
                         </div>
                         
                         <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-3 flex items-center gap-1.5"><MapPin size={13} /> Alamat Legal Perusahaan (Kantor/Gudang Utama)</label>
                            <input required type="text" placeholder="mis. Jl. Soekarno-Hatta KM 5 No. 88, Balikpapan Selatan, Balikpapan" className="w-full h-14 bg-muted/20 border border-border rounded-xl px-5 font-bold focus:border-primary focus:outline-none" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} />
                         </div>
                      </div>

                      {/* Step 2: Nomor Dokumen Legal */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                         <h4 className="text-lg font-black text-primary border-l-4 border-primary pl-4">2. Nomor Identitas Hukum</h4>
                         
                         <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-3">NIB (Nomor Induk Berusaha)</label>
                               <input required type="text" placeholder="13 digit angka NIB perusahaan" className="w-full h-14 bg-muted/20 border border-border rounded-xl px-5 font-bold focus:border-primary focus:outline-none" value={nibNumber} onChange={e => setNibNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-3">NPWP Perusahaan</label>
                               <input required type="text" placeholder="Format NPWP perusahaan" className="w-full h-14 bg-muted/20 border border-border rounded-xl px-5 font-bold focus:border-primary focus:outline-none" value={npwpNumber} onChange={e => setNpwpNumber(e.target.value)} />
                            </div>
                         </div>
                         
                         <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-3">Izin Operasional Gudang (Opsional)</label>
                            <input type="text" placeholder="Kode Izin Operasional Gudang/Kawasan Industri" className="w-full h-14 bg-muted/20 border border-border rounded-xl px-5 font-bold focus:border-primary focus:outline-none" value={warehousePermitNumber} onChange={e => setWarehousePermitNumber(e.target.value)} />
                         </div>
                      </div>

                      {/* Step 3: Lampiran Berkas (Simulasi) */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                         <h4 className="text-lg font-black text-primary border-l-4 border-primary pl-4">3. Unggah Berkas Dokumen (PDF/JPG)</h4>
                         
                         <div className="grid sm:grid-cols-3 gap-6">
                            {/* NIB Uploader */}
                            <div className="p-6 bg-muted/20 border border-border border-dashed rounded-2xl flex flex-col items-center justify-center text-center relative hover:bg-muted/30 transition-colors group cursor-pointer">
                               <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileChange(e, setNibFile)} />
                               <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", nibFile ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")}>
                                  {nibFile ? <Check size={20} /> : <Upload size={20} />}
                                </div>
                               <p className="text-xs font-black leading-tight truncate w-full max-w-[120px]">{nibFile ? nibFile.name : 'NIB Perusahaan'}</p>
                               <span className="text-[10px] font-bold text-muted-foreground mt-1 group-hover:text-primary transition-colors">Pilih Berkas</span>
                            </div>

                            {/* NPWP Uploader */}
                            <div className="p-6 bg-muted/20 border border-border border-dashed rounded-2xl flex flex-col items-center justify-center text-center relative hover:bg-muted/30 transition-colors group cursor-pointer">
                               <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileChange(e, setNpwpFile)} />
                               <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", npwpFile ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")}>
                                  {npwpFile ? <Check size={20} /> : <Upload size={20} />}
                               </div>
                               <p className="text-xs font-black leading-tight truncate w-full max-w-[120px]">{npwpFile ? npwpFile.name : 'NPWP Perusahaan'}</p>
                               <span className="text-[10px] font-bold text-muted-foreground mt-1 group-hover:text-primary transition-colors">Pilih Berkas</span>
                            </div>

                            {/* Permit Uploader */}
                            <div className="p-6 bg-muted/20 border border-border border-dashed rounded-2xl flex flex-col items-center justify-center text-center relative hover:bg-muted/30 transition-colors group cursor-pointer">
                               <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileChange(e, setPermitFile)} />
                               <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", permitFile ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")}>
                                  {permitFile ? <Check size={20} /> : <Upload size={20} />}
                               </div>
                               <p className="text-xs font-black leading-tight truncate w-full max-w-[120px]">{permitFile ? permitFile.name : 'Izin Gudang (Opsional)'}</p>
                               <span className="text-[10px] font-bold text-muted-foreground mt-1 group-hover:text-primary transition-colors">Pilih Berkas</span>
                            </div>
                         </div>
                      </div>

                      {/* Submit Area */}
                      <div className="pt-6 border-t border-border/50 space-y-4">
                         {isSubmitting && (
                           <div className="space-y-2">
                              <div className="flex justify-between text-xs font-black text-primary">
                                 <span>Mengunggah dokumen dan menyelaraskan berkas...</span>
                                 <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                 <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                           </div>
                         )}

                         <Button 
                           type="submit" 
                           disabled={isSubmitting}
                           className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                         >
                            {isSubmitting ? 'Mengirim Data...' : 'Kirim Berkas Verifikasi'}
                         </Button>
                      </div>
                   </form>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-8">
           <div className="p-6 sm:p-10 bg-[#06110B] border border-primary/20 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                 <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20">
                    <ShieldCheck size={28} />
                 </div>
                 <div>
                    <h4 className="text-2xl font-black tracking-tighter text-white leading-tight">Status Hak: <span className="text-primary italic">Distributor Resmi</span></h4>
                 </div>
                 <div className="space-y-4">
                    {[
                      'Menerbitkan Katalog Produk Grosir',
                      'Melakukan Transaksi Termin Kredit',
                      'Mendapat Label Distributor Terverifikasi',
                      'Negosiasi Harga Secara Eksklusif'
                    ].map((perk, i) => (
                      <div key={i} className="flex items-center gap-4 text-white/70 text-sm font-medium">
                         <CheckCircle2 size={16} className="text-primary" />
                         {perk}
                      </div>
                    ))}
                 </div>
              </div>
              <ShieldCheck className="absolute -bottom-10 -right-10 text-primary/5 w-64 h-64 transform rotate-12" />
           </div>

           <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] space-y-6">
              <div className="flex items-center gap-4">
                 <HelpCircle className="text-muted-foreground" />
                 <h4 className="font-black text-lg">Mengapa Perlu Verifikasi?</h4>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                 Distributor yang terverifikasi mendapatkan prioritas penayangan produk di halaman utama dan dipercaya oleh lebih dari 10.000 mitra UMKM aktif di platform PasarMitra.
              </p>
              <Button variant="link" className="text-primary font-black p-0 h-auto">Ketentuan Compliance Usaha</Button>
           </div>
        </div>
      </div>
    </div>
  );
};
