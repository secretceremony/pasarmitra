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

    // Demo Mode Bypass
    if (email === 'admin@demo.com' || email === 'distributor@demo.com' || email === 'umkm@demo.com') {
      setTimeout(() => {
        const role = email.includes('admin') ? UserRole.ADMIN : 
                     email.includes('distributor') ? UserRole.DISTRIBUTOR : UserRole.UMKM;
        
        useAuthStore.getState().setUser({
          id: 'demo-user',
          email: email,
          role: role,
          is_verified: true,
          created_at: new Date().toISOString(),
        });
        useAuthStore.getState().setSession({ user: { id: 'demo-user' } });
        useAuthStore.getState().setLoading(false);
        navigate('/dashboard');
      }, 1000);
      return;
    }

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error details:', err);
      setError(err instanceof Error ? err.message : 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-primary flex-col justify-between p-12 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <Store size={32} />
            <span className="text-2xl font-bold">PasarMitra</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Connecting Distributors <br /> with Modern UMKM.
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md">
            The most reliable B2B marketplace to grow your supply chain business across Indonesia.
          </p>
        </div>
        
        <div className="relative z-10 flex gap-12 text-sm opacity-80">
          <div>
            <h3 className="font-bold mb-2">5,000+</h3>
            <p>Active Distributors</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">50,000+</h3>
            <p>Verified UMKM</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">12M+</h3>
            <p>Monthly Orders</p>
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
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Store size={24} className="text-primary" />
            <span className="text-xl font-bold">PasarMitra</span>
          </div>
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <AuthInput 
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <AuthInput 
                label="" // Label handled above for forgot password link
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
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl border-dashed"
              onClick={() => {
                setEmail('distributor@demo.com');
                setPassword('password');
              }}
            >
              Use Demo Credentials
            </Button>
          </div>

          <div className="mt-10 pt-10 border-t text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
