import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/use-auth-store';
import { profileService } from '../services/profileService';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { UserRole, UserProfile } from '../types/auth.types';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Shield, 
  Phone, 
  MapPin, 
  Building2, 
  FileText, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle,
  Lock,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../../components/ui/button';


export const ProfileSettings = () => {
  const { user, setUser } = useAuthStore();


  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [profileDistrict, setProfileDistrict] = useState('');

  // UMKM Verification Form States
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessDistrict, setBusinessDistrict] = useState('');
  const [verificationPhone, setVerificationPhone] = useState('');
  const [businessDocumentUrl, setBusinessDocumentUrl] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Distributor Verification Form States (mirrors UMKM)
  const [distBusinessType, setDistBusinessType] = useState('');
  const [distBusinessAddress, setDistBusinessAddress] = useState('');
  const [distBusinessDistrict, setDistBusinessDistrict] = useState('');
  const [distVerificationPhone, setDistVerificationPhone] = useState('');
  const [distBusinessDocumentUrl, setDistBusinessDocumentUrl] = useState('');
  const [isSubmittingDistVerification, setIsSubmittingDistVerification] = useState(false);

  // Fetch real profile data on mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await profileService.getProfile(user.id);
        
        // Populate form states
        setFullName(data.full_name || '');
        setPhoneNumber(data.phone || '');
        setOrganizationName(data.organization_name || '');
        setAddress(data.address || '');
        setDescription(data.description || '');
        setProfileDistrict(data.business_district || '');

        // Populate UMKM verification fields if UMKM
        if (data.role === UserRole.UMKM) {
          setBusinessType(data.business_type || '');
          setBusinessAddress(data.business_address || data.address || '');
          setBusinessDistrict(data.business_district || '');
          setVerificationPhone(data.phone || data.phone || '');
          setBusinessDocumentUrl(data.business_document_url || '');
        }

        // Populate Distributor verification fields if DISTRIBUTOR
        if (data.role === UserRole.DISTRIBUTOR) {
          setDistBusinessType(data.business_type || '');
          setDistBusinessAddress(data.business_address || data.address || '');
          setDistBusinessDistrict(data.business_district || '');
          setDistVerificationPhone(data.phone || '');
          setDistBusinessDocumentUrl(data.business_document_url || '');
        }

        // Update local store just in case it is out of sync
        setUser(data);
      } catch (err: any) {
        console.error('Gagal memuat profil:', err);
        setError(err.message || 'Gagal memuat profil.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [user?.id, setUser]);

  const handleApplyUMKMVerification = async () => {
    if (!user?.id) return;
    if (!businessType) {
      toast.error('Silakan pilih tipe usaha Anda.');
      return;
    }
    if (!verificationPhone.trim()) {
      toast.error('Nomor telepon toko wajib diisi.');
      return;
    }
    if (!businessDistrict) {
      toast.error('Silakan pilih kecamatan toko di Balikpapan.');
      return;
    }
    if (!businessAddress.trim()) {
      toast.error('Alamat lengkap toko wajib diisi.');
      return;
    }

    setIsSubmittingVerification(true);
    try {
      const docRef = doc(db, 'profiles', user.id);
      const updateData = {
        is_verified: false,
        verification_status: 'PENDING_REVIEW',
        business_type: businessType,
        phone: verificationPhone.trim(),
        business_district: businessDistrict,
        business_address: businessAddress.trim(),
        address: businessAddress.trim(), // sync main address too
        business_document_url: businessDocumentUrl.trim() || '',
        updated_at: new Date().toISOString()
      };

      await updateDoc(docRef, updateData);

      // Update state in useAuthStore
      setUser({
        ...user,
        ...updateData
      });

      toast.success('Pengajuan verifikasi UMKM berhasil dikirim. Menunggu review admin.');
    } catch (err: any) {
      console.error('Failed to submit UMKM verification:', err);
      toast.error(err.message || 'Gagal mengirimkan pengajuan verifikasi.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleApplyDistributorVerification = async () => {
    if (!user?.id) return;
    if (!distBusinessType) {
      toast.error('Silakan pilih tipe distributor Anda.');
      return;
    }
    if (!distVerificationPhone.trim()) {
      toast.error('Nomor telepon usaha wajib diisi.');
      return;
    }
    if (!distBusinessDistrict) {
      toast.error('Silakan pilih kecamatan usaha di Balikpapan.');
      return;
    }
    if (!distBusinessAddress.trim()) {
      toast.error('Alamat usaha/gudang wajib diisi.');
      return;
    }

    setIsSubmittingDistVerification(true);
    try {
      const docRef = doc(db, 'profiles', user.id);
      const updateData = {
        is_verified: false,
        verification_status: 'PENDING_REVIEW',
        business_type: distBusinessType,
        phone: distVerificationPhone.trim(),
        business_district: distBusinessDistrict,
        business_address: distBusinessAddress.trim(),
        address: distBusinessAddress.trim(), // sync main address too
        business_document_url: distBusinessDocumentUrl.trim() || '',
        updated_at: new Date().toISOString()
      };

      await updateDoc(docRef, updateData);

      setUser({
        ...user,
        ...updateData
      });

      toast.success('Pengajuan verifikasi distributor berhasil dikirim. Menunggu review admin.');
    } catch (err: any) {
      console.error('Failed to submit Distributor verification:', err);
      toast.error(err.message || 'Gagal mengirimkan pengajuan verifikasi.');
    } finally {
      setIsSubmittingDistVerification(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-rose-500 font-bold">
        Akses Ditolak. Silakan login terlebih dahulu.
      </div>
    );
  }

  // Get role-specific dashboard path
  const getDashboardPath = () => {
    if (user.role === UserRole.ADMIN) return '/admin/dashboard';
    if (user.role === UserRole.DISTRIBUTOR) return '/distributor/dashboard';
    return '/umkm/dashboard';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate common required fields
      if (!fullName.trim()) {
        toast.error('Nama lengkap tidak boleh kosong');
        setIsSaving(false);
        return;
      }

      // Role-specific validations
      if (user.role === UserRole.UMKM || user.role === UserRole.DISTRIBUTOR) {
        if (!organizationName.trim()) {
          toast.error(user.role === UserRole.UMKM ? 'Nama toko tidak boleh kosong' : 'Nama bisnis tidak boleh kosong');
          setIsSaving(false);
          return;
        }
        if (!profileDistrict) {
          toast.error('Silakan pilih kecamatan di Balikpapan');
          setIsSaving(false);
          return;
        }
      }

      await profileService.updateProfile(user.id, user.role, {
        full_name: fullName,
        phone: phoneNumber,
        organization_name: user.role !== UserRole.ADMIN ? organizationName : undefined,
        address: user.role !== UserRole.ADMIN ? address : undefined,
        description: user.role !== UserRole.ADMIN ? description : undefined,
        business_district: user.role !== UserRole.ADMIN ? profileDistrict : undefined,
      });

      // Update local store state instantly so UI updates without page reload
      setUser({
        ...user,
        full_name: fullName,
        phone: phoneNumber,
        organization_name: user.role !== UserRole.ADMIN ? organizationName : undefined,
        address: user.role !== UserRole.ADMIN ? address : undefined,
        description: user.role !== UserRole.ADMIN ? description : undefined,
        business_district: user.role !== UserRole.ADMIN ? profileDistrict : undefined,
        updated_at: new Date().toISOString()
      });

      toast.success('Profil berhasil diperbarui.');
    } catch (err: any) {
      console.error('Gagal memperbarui profil:', err);
      toast.error(err.message || 'Gagal memperbarui profil.');
    } finally {
      setIsSaving(false);
    }
  };

  // const handleLogout removed – logout is now only via sidebar


  // Helper labels for Indonesia role display
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'System Admin';
      case 'DISTRIBUTOR': return 'Distributor Pro';
      case 'UMKM': return 'Mitra UMKM';
      default: return role;
    }
  };

  // Helper status display
  const getVerificationBadge = () => {
    if (user.role === UserRole.ADMIN) return null;

    const status = user.verification_status || 'NOT_SUBMITTED';
    switch (status) {
      case 'VERIFIED':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Terverifikasi</span>;
      case 'PENDING_REVIEW':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Menunggu Review Admin</span>;
      case 'REJECTED':
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Ditolak</span>;
      case 'NEEDS_REVISION':
        return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Perlu Revisi</span>;
      case 'ESCALATED':
        return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Audit Khusus</span>;
      default:
        return <span className="bg-muted text-muted-foreground border border-border px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Belum Diverifikasi</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={28} />
          <p className="text-muted-foreground font-semibold text-lg">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center bg-card border border-border/50 rounded-[2.5rem] space-y-4">
        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-1">
          <p className="text-xl font-black">Gagal memuat profil.</p>
          <p className="text-sm font-bold text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-black">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Link to={getDashboardPath()}>
              <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-border bg-card/40 flex items-center justify-center">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <h1 className="text-4xl font-black tracking-tighter">Profil & Pengaturan</h1>
          </div>
          <p className="text-muted-foreground font-medium text-lg ml-14">
            Kelola informasi akun, data bisnis, dan pengaturan keamanan Anda.
          </p>
        </div>
      </div>

      {/* Distributor Verification Panel — replaces amber banner */}
      {user.role === UserRole.DISTRIBUTOR && (
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 border-b border-border/30 pb-4">
            <ShieldCheck className="text-primary" size={24} />
            Verifikasi Usaha Distributor
          </h3>

          {/* Status Banner */}
          <div className="p-6 bg-muted/20 rounded-2xl border border-border/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground">Status Verifikasi Saat Ini:</span>
              {getVerificationBadge()}
            </div>
            {user.verification_notes && (
              <div className="mt-2 text-xs font-semibold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <span className="font-black block uppercase mb-1">Catatan Admin:</span>
                {user.verification_notes}
              </div>
            )}
            {user.rejection_reason && (
              <div className="mt-2 text-xs font-semibold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <span className="font-black block uppercase mb-1">Alasan Penolakan:</span>
                {user.rejection_reason}
              </div>
            )}
          </div>

          {/* Show form if not VERIFIED or PENDING_REVIEW */}
          {(user.verification_status !== 'VERIFIED' && user.verification_status !== 'PENDING_REVIEW') ? (
            <div className="space-y-6">
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                PasarMitra saat ini hanya melayani wilayah Balikpapan. Pilih kecamatan usaha Anda dan isi alamat lengkap secara manual.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Business Type */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Tipe Distributor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={distBusinessType}
                    onChange={(e) => setDistBusinessType(e.target.value)}
                    disabled={isSubmittingDistVerification}
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                  >
                    <option value="">Pilih Tipe Distributor</option>
                    <option value="Sembako" className="bg-card text-foreground">Sembako</option>
                    <option value="F&B" className="bg-card text-foreground">F&B</option>
                    <option value="Sayur & Buah" className="bg-card text-foreground">Sayur & Buah</option>
                    <option value="Daging / Protein" className="bg-card text-foreground">Daging / Protein</option>
                    <option value="Frozen Food" className="bg-card text-foreground">Frozen Food</option>
                    <option value="Perlengkapan Usaha" className="bg-card text-foreground">Perlengkapan Usaha</option>
                    <option value="Lainnya" className="bg-card text-foreground">Lainnya</option>
                  </select>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Nomor Telepon Usaha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={distVerificationPhone}
                    onChange={(e) => setDistVerificationPhone(e.target.value)}
                    disabled={isSubmittingDistVerification}
                    placeholder="Contoh: 081234567890"
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                  />
                </div>

                {/* District Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Kecamatan di Balikpapan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={distBusinessDistrict}
                    onChange={(e) => setDistBusinessDistrict(e.target.value)}
                    disabled={isSubmittingDistVerification}
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                  >
                    <option value="">Pilih Kecamatan</option>
                    <option value="Balikpapan Kota" className="bg-card text-foreground">Balikpapan Kota</option>
                    <option value="Balikpapan Selatan" className="bg-card text-foreground">Balikpapan Selatan</option>
                    <option value="Balikpapan Tengah" className="bg-card text-foreground">Balikpapan Tengah</option>
                    <option value="Balikpapan Utara" className="bg-card text-foreground">Balikpapan Utara</option>
                    <option value="Balikpapan Barat" className="bg-card text-foreground">Balikpapan Barat</option>
                    <option value="Balikpapan Timur" className="bg-card text-foreground">Balikpapan Timur</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    PasarMitra saat ini hanya melayani wilayah Balikpapan.
                  </p>
                </div>

                {/* Business Address */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Alamat Usaha / Gudang di Balikpapan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={distBusinessAddress}
                    onChange={(e) => setDistBusinessAddress(e.target.value)}
                    disabled={isSubmittingDistVerification}
                    placeholder="Contoh: Jl. MT Haryono No. 10, Damai, Balikpapan Selatan"
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                  />
                </div>

                {/* Business Document URL / Note */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Dokumen Pendukung (NIB / SIUP / Foto Gudang / URL)
                  </label>
                  <input
                    type="text"
                    value={distBusinessDocumentUrl}
                    onChange={(e) => setDistBusinessDocumentUrl(e.target.value)}
                    disabled={isSubmittingDistVerification}
                    placeholder="Contoh: NIB 12345678 atau link google drive foto gudang..."
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleApplyDistributorVerification}
                disabled={isSubmittingDistVerification}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase shadow-xl shadow-primary/20"
              >
                {isSubmittingDistVerification ? 'Mengirim Pengajuan...' : 'Ajukan Verifikasi Distributor'}
              </Button>
            </div>
          ) : (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4">
              <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-black text-sm text-emerald-800">
                  {user.verification_status === 'VERIFIED' ? 'Akun Distributor Anda Terverifikasi' : 'Menunggu Peninjauan Admin'}
                </h4>
                <p className="text-xs font-semibold text-emerald-700/80 leading-relaxed mt-1">
                  {user.verification_status === 'VERIFIED'
                    ? 'Akun distributor Anda sudah aktif. Produk Anda dapat tampil di marketplace.'
                    : 'Data verifikasi berhasil dikirim. Admin kami sedang meninjau pengajuan Anda. Proses ini biasanya memakan waktu kurang dari 24 jam.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Card 1: Account Information */}
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 border-b border-border/30 pb-4">
              <User className="text-primary" size={24} />
              Informasi Akun
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSaving}
                  placeholder="Masukkan nama lengkap Anda..."
                  className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isSaving}
                  placeholder="Contoh: 081234567890"
                  className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                />
              </div>

              {/* Email (Read-Only) */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Mail size={12} /> Email (Tidak dapat diubah)
                </label>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={user.email}
                  className="w-full h-14 bg-muted/10 border border-border/20 rounded-2xl px-6 text-sm font-bold text-muted-foreground/60 cursor-not-allowed opacity-80"
                />
              </div>

              {/* Role (Read-Only) */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Shield size={12} /> Peran Pengguna
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={getRoleLabel(user.role)}
                  className="w-full h-14 bg-muted/10 border border-border/20 rounded-2xl px-6 text-sm font-black text-primary/70 cursor-not-allowed opacity-80"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Business/Store Information (Distributor and UMKM only) */}
          {(user.role === UserRole.DISTRIBUTOR || user.role === UserRole.UMKM) && (
            <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 border-b border-border/30 pb-4">
                <Building2 className="text-primary" size={24} />
                {user.role === UserRole.DISTRIBUTOR ? 'Informasi Bisnis Distribusi' : 'Informasi Toko / UMKM'}
              </h3>
              
              <div className="space-y-6">
                {/* Business Name */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {user.role === UserRole.DISTRIBUTOR ? 'Nama Perusahaan/Bisnis' : 'Nama Toko'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={isSaving}
                    placeholder={user.role === UserRole.DISTRIBUTOR ? "Contoh: PT Distribusi Sembako Raya" : "Contoh: Toko Sembako Kelontong Barokah"}
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                  />
                </div>

                {/* Business District */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin size={12} /> Kecamatan di Balikpapan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={profileDistrict}
                    onChange={(e) => setProfileDistrict(e.target.value)}
                    disabled={isSaving}
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground font-sans cursor-pointer"
                  >
                    <option value="">Pilih Kecamatan</option>
                    <option value="Balikpapan Kota" className="bg-card text-foreground">Balikpapan Kota</option>
                    <option value="Balikpapan Selatan" className="bg-card text-foreground">Balikpapan Selatan</option>
                    <option value="Balikpapan Tengah" className="bg-card text-foreground">Balikpapan Tengah</option>
                    <option value="Balikpapan Utara" className="bg-card text-foreground">Balikpapan Utara</option>
                    <option value="Balikpapan Barat" className="bg-card text-foreground">Balikpapan Barat</option>
                    <option value="Balikpapan Timur" className="bg-card text-foreground">Balikpapan Timur</option>
                  </select>
                </div>

                {/* Business Address */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin size={12} /> {user.role === UserRole.DISTRIBUTOR ? 'Alamat Gudang Utama' : 'Alamat Pengiriman Toko'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isSaving}
                    placeholder="Masukkan alamat lengkap di Balikpapan..."
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Saat ini PasarMitra hanya melayani area Balikpapan.
                  </p>
                </div>

                {/* Business Description */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FileText size={12} /> {user.role === UserRole.DISTRIBUTOR ? 'Deskripsi Perusahaan' : 'Catatan Toko / Deskripsi Singkat'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSaving}
                    placeholder="Masukkan deskripsi singkat profil usaha Anda..."
                    rows={4}
                    className="w-full bg-muted/20 border border-border/60 rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card: UMKM Verification */}
          {user.role === UserRole.UMKM && (
            <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 border-b border-border/30 pb-4">
                <ShieldCheck className="text-primary" size={24} />
                Verifikasi Usaha UMKM
              </h3>

              {/* Status Banner */}
              <div className="p-6 bg-muted/20 rounded-2xl border border-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground">Status Verifikasi Saat Ini:</span>
                  {getVerificationBadge()}
                </div>
                {user.verification_notes && (
                  <div className="mt-2 text-xs font-semibold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <span className="font-black block uppercase mb-1">Catatan Admin:</span>
                    {user.verification_notes}
                  </div>
                )}
                {user.rejection_reason && (
                  <div className="mt-2 text-xs font-semibold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <span className="font-black block uppercase mb-1">Alasan Penolakan:</span>
                    {user.rejection_reason}
                  </div>
                )}
              </div>

              {/* Only show verification form if not already verified or pending, or if rejected/needs revision */}
              {(user.verification_status !== 'VERIFIED' && user.verification_status !== 'PENDING_REVIEW') ? (
                <div className="space-y-6">
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    Lengkapi formulir verifikasi di bawah ini untuk mengaktifkan fitur pembelian. Jangkauan layanan saat ini hanya tersedia untuk area Balikpapan.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Business Type */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Tipe Usaha <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        disabled={isSubmittingVerification}
                        className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                      >
                        <option value="">Pilih Tipe Usaha</option>
                        <option value="Warung" className="bg-card text-foreground">Warung</option>
                        <option value="Toko Kelontong" className="bg-card text-foreground">Toko Kelontong</option>
                        <option value="Kafe / F&B" className="bg-card text-foreground">Kafe / F&B</option>
                        <option value="Catering" className="bg-card text-foreground">Catering</option>
                        <option value="Retail kecil" className="bg-card text-foreground">Retail kecil</option>
                        <option value="Lainnya" className="bg-card text-foreground">Lainnya</option>
                      </select>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Nomor Telepon Toko <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={verificationPhone}
                        onChange={(e) => setVerificationPhone(e.target.value)}
                        disabled={isSubmittingVerification}
                        placeholder="Contoh: 081234567890"
                        className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                      />
                    </div>

                    {/* District Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Kecamatan di Balikpapan <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={businessDistrict}
                        onChange={(e) => setBusinessDistrict(e.target.value)}
                        disabled={isSubmittingVerification}
                        className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                      >
                        <option value="">Pilih Kecamatan</option>
                        <option value="Balikpapan Kota" className="bg-card text-foreground">Balikpapan Kota</option>
                        <option value="Balikpapan Selatan" className="bg-card text-foreground">Balikpapan Selatan</option>
                        <option value="Balikpapan Tengah" className="bg-card text-foreground">Balikpapan Tengah</option>
                        <option value="Balikpapan Utara" className="bg-card text-foreground">Balikpapan Utara</option>
                        <option value="Balikpapan Barat" className="bg-card text-foreground">Balikpapan Barat</option>
                        <option value="Balikpapan Timur" className="bg-card text-foreground">Balikpapan Timur</option>
                      </select>
                    </div>

                    {/* Business Address */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Alamat Lengkap Toko di Balikpapan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        disabled={isSubmittingVerification}
                        placeholder="Contoh: Jl. Jend. Sudirman No. 12, Balikpapan Kota, Balikpapan"
                        className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Saat ini PasarMitra hanya melayani area Balikpapan.
                      </p>
                    </div>

                    {/* Business Document URL / Note */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Teks Bukti Usaha / URL Dokumen (NIB / SKU / Foto Toko)
                      </label>
                      <input
                        type="text"
                        value={businessDocumentUrl}
                        onChange={(e) => setBusinessDocumentUrl(e.target.value)}
                        disabled={isSubmittingVerification}
                        placeholder="Contoh: NIB 123456789 atau link google drive foto toko..."
                        className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all text-foreground"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleApplyUMKMVerification}
                    disabled={isSubmittingVerification}
                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase shadow-xl shadow-primary/20"
                  >
                    {isSubmittingVerification ? 'Mengirim Pengajuan...' : 'Ajukan Verifikasi UMKM'}
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-black text-sm text-emerald-800">
                      {user.verification_status === 'VERIFIED' ? 'Pendaftaran Anda Disetujui' : 'Menunggu Peninjauan Admin'}
                    </h4>
                    <p className="text-xs font-semibold text-emerald-700/80 leading-relaxed mt-1">
                      {user.verification_status === 'VERIFIED' 
                        ? 'Akun UMKM Anda sudah aktif sepenuhnya dan dapat melakukan checkout pesanan.' 
                        : 'Pengisian data berhasil dikirim. Admin kami sedang meninjau dokumen usaha Anda. Proses ini biasanya memakan waktu kurang dari 24 jam.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-4">
            <Link to={getDashboardPath()} className="flex-1">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                className="w-full h-14 rounded-2xl border-border font-black text-sm uppercase"
              >
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase shadow-xl shadow-primary/20"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>

        {/* Sidebar Panel: Security & Account Status */}
        <div className="space-y-10">
          {/* Card 3: Account Status */}
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 space-y-6 shadow-xl">
            <h3 className="text-xl font-black tracking-tight border-b border-border/30 pb-3 flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} />
              Status Akun
            </h3>

            <div className="space-y-4 text-sm font-bold text-muted-foreground">
              {/* Account Status suspension */}
              <div className="flex justify-between items-center">
                <span>Status Akun:</span>
                {user.is_suspended ? (
                  <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-black uppercase">Ditangguhkan</span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-black uppercase">Aktif</span>
                )}
              </div>

              {/* Verification status (for non-admin) */}
              {user.role !== UserRole.ADMIN && (
                <div className="flex justify-between items-center border-t border-border/30 pt-3">
                  <span>Status Verifikasi:</span>
                  {getVerificationBadge()}
                </div>
              )}

              {/* Created Date */}
              {user.created_at && (
                <div className="flex justify-between items-center border-t border-border/30 pt-3 text-xs">
                  <span>Terdaftar Sejak:</span>
                  <span className="text-foreground">
                    {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}

              {/* Last Updated Date */}
              {user.updated_at && (
                <div className="flex justify-between items-center border-t border-border/30 pt-3 text-xs">
                  <span>Terakhir Diperbarui:</span>
                  <span className="text-foreground">
                    {new Date(user.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Password Security (Disabled for UAT) */}
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 space-y-6 shadow-xl">
            <h3 className="text-xl font-black tracking-tight border-b border-border/30 pb-3 flex items-center gap-2">
              <Lock className="text-primary" size={20} />
              Keamanan Akun
            </h3>

            <div className="space-y-4">
              <div className="space-y-2 opacity-50 cursor-not-allowed">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Kata Sandi Baru</label>
                <input
                  type="password"
                  disabled
                  placeholder="••••••••"
                  className="w-full h-12 bg-muted/10 border border-border/20 rounded-xl px-4 text-sm font-bold cursor-not-allowed"
                />
              </div>
              <div className="space-y-2 opacity-50 cursor-not-allowed">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Konfirmasi Kata Sandi</label>
                <input
                  type="password"
                  disabled
                  placeholder="••••••••"
                  className="w-full h-12 bg-muted/10 border border-border/20 rounded-xl px-4 text-sm font-bold cursor-not-allowed"
                />
              </div>
              
              <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex items-start gap-3">
                <Lock className="text-muted-foreground shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Fitur pembaruan kata sandi dinonaktifkan untuk UAT. Gunakan opsi "Lupa Sandi" di halaman masuk untuk mengatur ulang.
                </p>
              </div>
            </div>
          </div>

          {/* Logout button removed – handled by sidebar */}
        </div>
      </form>
    </div>
  );
};
