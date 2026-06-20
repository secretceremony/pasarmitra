import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/use-auth-store';
import { profileService } from '../services/profileService';

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
      }

      await profileService.updateProfile(user.id, user.role, {
        full_name: fullName,
        phone: phoneNumber,
        organization_name: user.role !== UserRole.ADMIN ? organizationName : undefined,
        address: user.role !== UserRole.ADMIN ? address : undefined,
        description: user.role !== UserRole.ADMIN ? description : undefined,
      });

      // Update local store state instantly so UI updates without page reload
      setUser({
        ...user,
        full_name: fullName,
        phone: phoneNumber,
        organization_name: user.role !== UserRole.ADMIN ? organizationName : undefined,
        address: user.role !== UserRole.ADMIN ? address : undefined,
        description: user.role !== UserRole.ADMIN ? description : undefined,
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

    if (user.role === UserRole.DISTRIBUTOR) {
      const status = user.verification_status || 'NOT_SUBMITTED';
      switch (status) {
        case 'VERIFIED':
          return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Terverifikasi</span>;
        case 'PENDING_REVIEW':
          return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Menunggu Review</span>;
        case 'REJECTED':
          return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Ditolak</span>;
        case 'ESCALATED':
          return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Audit Khusus</span>;
        default:
          return <span className="bg-muted text-muted-foreground border border-border px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Belum Diverifikasi</span>;
      }
    }

    // For UMKM
    return user.is_verified ? (
      <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Mitra Terverifikasi</span>
    ) : (
      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Belum Diverifikasi</span>
    );
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

      {/* Distributor Verification Alert Banner */}
      {user.role === UserRole.DISTRIBUTOR && user.verification_status !== 'VERIFIED' && (
        <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl shadow-amber-500/5 ml-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
               <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-amber-800">
                Lengkapi Verifikasi Legalitas
              </h3>
              <p className="text-sm font-semibold text-amber-700/80 leading-relaxed mt-1">
                Akun distributor Anda belum terverifikasi resmi. Lengkapi berkas legalitas usaha Anda agar dapat mulai mengunggah dan menjual produk.
              </p>
            </div>
          </div>
          <Link to="/distributor/legal-docs">
            <Button className="h-14 px-8 rounded-2xl bg-amber-600 text-white font-black hover:bg-amber-700 shadow-lg shadow-amber-600/20 whitespace-nowrap">
              Ajukan Verifikasi Legalitas
            </Button>
          </Link>
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
                    placeholder="Masukkan alamat lengkap..."
                    className="w-full h-14 bg-muted/20 border border-border/60 rounded-2xl px-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all"
                  />
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
                    className="w-full bg-muted/20 border border-border/60 rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:border-primary/40 focus:bg-card transition-all resize-none"
                  />
                </div>
              </div>
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
