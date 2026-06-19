import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button } from '../../../components/ui/button';
import { motion } from 'motion/react';
import { Store, UserPlus, Mail, Lock, User, ShieldCheck, Loader2 } from 'lucide-react';
import { UserRole } from '../types/auth.types';
import { 
  AuthInput, 
  AuthError, 
  AuthCard, 
  AuthSuccess 
} from '../components';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.UMKM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.register(email, password, {
        full_name: fullName,
        role: role,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCard>
        <AuthSuccess 
          title="Periksa email Anda"
          message={<>Kami telah mengirimkan tautan verifikasi ke <span className="font-semibold text-foreground">{email}</span>. Silakan verifikasi email Anda untuk mengaktifkan akun.</>}
          onAction={() => navigate('/login')}
          actionLabel="Kembali ke Login"
        />
      </AuthCard>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-primary flex-col justify-between p-12 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 p-1 shadow-md">
              <img src="/logo-PM.png" alt="Logo PasarMitra" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold">PasarMitra</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Bergabung dengan <br /> Jaringan B2B Terbesar.
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md">
            Memberdayakan bisnis lokal melalui rantai pasok terverifikasi dan kemitraan langsung.
          </p>
        </div>

        <div className="relative z-10 p-8 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10">
          <p className="italic text-lg mb-4">
            "PasarMitra mengubah cara kami mengelola inventaris. Sambungan langsung ke distributor menghemat 15% biaya pengadaan kami."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20" />
            <div>
              <p className="font-bold">Budi Santoso</p>
              <p className="text-sm opacity-60">Pemilik, Toko Kelontong Sejahtera</p>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-8 bg-card">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-2">Buat Akun</h2>
            <p className="text-muted-foreground">Pilih peran bisnis Anda untuk memulai.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole(UserRole.UMKM)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  role === UserRole.UMKM 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <Store size={24} className={role === UserRole.UMKM ? 'text-primary' : 'text-muted-foreground'} />
                <span className="font-bold text-sm">UMKM</span>
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.DISTRIBUTOR)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  role === UserRole.DISTRIBUTOR 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <User size={24} className={role === UserRole.DISTRIBUTOR ? 'text-primary' : 'text-muted-foreground'} />
                <span className="font-bold text-sm">Distributor</span>
              </button>
            </div>

            <AuthInput 
              label="Nama Lengkap / Nama Entitas"
              type="text"
              placeholder="mis. Budi Santoso atau PT. Mitra Jaya"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <AuthInput 
              label="Alamat Email"
              type="email"
              placeholder="nama@perusahaan.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <AuthInput 
              label="Kata Sandi"
              type="password"
              placeholder="Min. 8 karakter"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && <AuthError message={error} />}

            <Button disabled={loading} type="submit" className="w-full h-12 text-lg rounded-xl">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Membuat Akun...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Daftar PasarMitra
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Masuk
            </Link>
          </p>

          <div className="mt-6 flex items-center gap-2 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
            <ShieldCheck size={16} className="text-primary shrink-0" />
            <span>Dengan bergabung, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
