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
      <AuthBackButton to="/login" label="Back to Sign In" />

      <AuthHeader 
        title="Forgot Password?" 
        description="No worries, we'll send you reset instructions." 
        icon={KeyRound} 
      />

      {success ? (
        <AuthSuccess 
          title="Check your inbox"
          message={<>We've sent a password reset link to <span className="font-bold">{email}</span>.</>}
          onAction={resetSuccess}
          actionLabel="Back to Forgot Password"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput 
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <AuthError message={error} />}

          <Button disabled={loading} type="submit" className="w-full h-12 text-lg rounded-xl">
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Link...</>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}