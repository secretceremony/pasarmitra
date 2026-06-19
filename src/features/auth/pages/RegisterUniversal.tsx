import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button } from '../../../components/ui/button';
import { motion } from 'motion/react';
import { Store, UserPlus, Mail, Lock, User, ShieldCheck, Loader2, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types/auth.types';
import { 
  AuthInput, 
  AuthError, 
  AuthCard, 
  AuthSuccess 
} from '../components';

export default function RegisterUniversal() {
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

    const trimmedEmail = email.trim();
    console.log('Mencoba pendaftaran dengan email:', trimmedEmail, 'dan peran:', role);
    
    try {
      await authService.register(trimmedEmail, password, {
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
      <div className="hidden lg:flex bg-slate-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 p-1 shadow-md">
              <img src="/logo-PM.png" alt="Logo PasarMitra" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold">PasarMitra</span>
          </div>
          <h1 className="text-5xl font-black leading-tight mb-6 tracking-tighter">
            Portal Akses <br /> Universal.
          </h1>
          <p className="text-xl text-slate-400 max-w-md">
            Pendaftaran akun lanjutan untuk administrator sistem, distributor strategis, dan mitra UMKM terverifikasi.
          </p>
        </div>

        <div className="relative z-10 p-8 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Pemberitahuan Keamanan</p>
          <p className="text-slate-300">
            Akun administratif memerlukan verifikasi sekunder dari pemilik platform setelah pendaftaran.
          </p>
        </div>

        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-8 bg-card">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-tight mb-2">Buat Akun</h2>
            <p className="text-muted-foreground font-medium">Pilih tingkat akses Anda di dalam ekosistem.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRole(UserRole.UMKM)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  role === UserRole.UMKM 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/20'
                }`}
              >
                <Store size={20} className={role === UserRole.UMKM ? 'text-primary' : 'text-muted-foreground'} />
                <span className="font-bold text-[10px] uppercase tracking-wider">UMKM</span>
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.DISTRIBUTOR)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  role === UserRole.DISTRIBUTOR 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/20'
                }`}
              >
                <User size={20} className={role === UserRole.DISTRIBUTOR ? 'text-primary' : 'text-muted-foreground'} />
                <span className="font-bold text-[10px] uppercase tracking-wider">Distributor</span>
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.ADMIN)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  role === UserRole.ADMIN 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/20'
                }`}
              >
                <ShieldAlert size={20} className={role === UserRole.ADMIN ? 'text-primary' : 'text-muted-foreground'} />
                <span className="font-bold text-[10px] uppercase tracking-wider">Admin</span>
              </button>
            </div>

            <AuthInput 
              label="Nama Entitas / Nama Lengkap"
              type="text"
              placeholder="mis. PT. Global Logistik"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <AuthInput 
              label="Alamat Email"
              type="email"
              placeholder="nama@pasarmitra.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <AuthInput 
              label="Kata Sandi Aman"
              type="password"
              placeholder="Min. 8 karakter"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && <AuthError message={error} />}

            <Button disabled={loading} type="submit" className="w-full h-12 text-lg rounded-xl font-black tracking-tight">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Inisialisasi Akun
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
            Sudah terdaftar?{' '}
            <Link to="/login" className="text-primary font-black hover:underline tracking-tight">
              Masuk
            </Link>
          </p>

          <div className="mt-6 flex items-center gap-2 p-4 bg-muted/50 rounded-xl text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
            <ShieldCheck size={14} className="text-primary shrink-0" />
            <span>Transmisi Data Terenkripsi • SECUREv4.1</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
