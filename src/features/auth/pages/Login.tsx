import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button } from '../../../components/ui/button';
import { motion } from 'motion/react';
import { Store, LogIn, Mail, Lock, Loader2 } from 'lucide-react';
import { UserRole } from '../types/auth.types';
import { useAuthStore } from '../../../store/use-auth-store';

import { AuthInput, AuthError } from '../components';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Detail kesalahan login:', err);
      setError(err instanceof Error ? err.message : 'Kredensial login tidak valid');
    } finally {
      setLoading(false);
    }
  };

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
            Menghubungkan Distributor <br /> dengan UMKM Modern.
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md">
            Marketplace B2B paling terpercaya untuk mengembangkan bisnis rantai pasok Anda di seluruh Indonesia.
          </p>
        </div>
        
        <div className="relative z-10 flex gap-12 text-sm opacity-80">
          <div>
            <h3 className="font-bold mb-2">5.000+</h3>
            <p>Distributor Aktif</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">50.000+</h3>
            <p>UMKM Terverifikasi</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">12Jt+</h3>
            <p>Pesanan Bulanan</p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-8 bg-card">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden border border-border p-1 shadow-sm">
              <img src="/logo-PM.png" alt="Logo PasarMitra" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold">PasarMitra</span>
          </div>
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Selamat Datang Kembali</h2>
            <p className="text-muted-foreground mt-2">Silakan masuk ke akun PasarMitra Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Alamat Email</label>
              <AuthInput 
                label=""
                type="email"
                placeholder="nama@perusahaan.com"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold">Kata Sandi</label>
                <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                  Lupa kata sandi?
                </Link>
              </div>
              <AuthInput 
                label=""
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <AuthError message={error} />}

            <Button disabled={loading} type="submit" className="w-full h-12 text-lg rounded-xl">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Masuk...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Masuk
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-10 border-t text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Buat Akun
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
