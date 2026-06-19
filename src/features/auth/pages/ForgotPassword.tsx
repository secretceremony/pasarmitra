import { Mail, Loader2, KeyRound } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { 
  AuthCard, 
  AuthHeader, 
  AuthInput, 
  AuthError, 
  AuthSuccess, 
  AuthBackButton 
} from '../components';

export default function ForgotPassword() {
  const {
    email,
    setEmail,
    loading,
    error,
    success,
    handleSubmit,
    resetSuccess,
  } = useForgotPassword();

  return (
    <AuthCard>
      <AuthBackButton to="/login" label="Kembali ke Halaman Masuk" />

      <AuthHeader 
        title="Lupa Kata Sandi?" 
        description="Jangan khawatir, kami akan mengirimkan instruksi untuk mengatur ulang kata sandi Anda." 
        icon={KeyRound} 
      />

      {success ? (
        <AuthSuccess 
          title="Periksa kotak masuk Anda"
          message={<>Kami telah mengirimkan tautan atur ulang kata sandi ke <span className="font-bold">{email}</span>.</>}
          onAction={resetSuccess}
          actionLabel="Kembali ke Lupa Kata Sandi"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput 
            label="Alamat Email"
            type="email"
            placeholder="nama@perusahaan.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <AuthError message={error} />}

          <Button disabled={loading} type="submit" className="w-full h-12 text-lg rounded-xl">
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim Tautan...</>
            ) : (
              'Atur Ulang Kata Sandi'
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}