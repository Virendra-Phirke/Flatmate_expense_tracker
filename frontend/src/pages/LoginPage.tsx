import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Eye, EyeOff, Loader2, AlertCircle, Shield, Fingerprint, Lock } from '@/components/ui/icons';
import { AppLogo } from '@/components/ui/AppLogo';
import {
  isBiometricAvailable,
  getRegisteredBiometric,
  authenticateWithBiometrics,
  StoredBiometricCredential,
} from '@/lib/biometrics';

const PrivacyPolicyPage = React.lazy(() => import('@/pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = React.lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const SecurityPage = React.lazy(() => import('@/pages/SecurityPage').then((m) => ({ default: m.SecurityPage })));

export function LoginPage() {
  const { login, biometricLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [registeredBiometric, setRegisteredBiometric] = useState<StoredBiometricCredential | null>(null);
  const [legalView, setLegalView] = useState<'login' | 'privacy' | 'terms' | 'security'>('login');

  React.useEffect(() => {
    async function checkBio() {
      const avail = await isBiometricAvailable();
      setBiometricAvailable(avail);
      setRegisteredBiometric(getRegisteredBiometric());
    }
    checkBio();
  }, []);

  const handleBiometricLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const bio = await authenticateWithBiometrics();
      await biometricLogin(bio.username, bio.credentialId, bio.deviceToken);
    } catch (err: any) {
      setError(err.message || 'Fingerprint verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  if (legalView === 'privacy') {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <PrivacyPolicyPage onBack={() => setLegalView('login')} />
      </React.Suspense>
    );
  }
  if (legalView === 'terms') {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <TermsPage onBack={() => setLegalView('login')} />
      </React.Suspense>
    );
  }
  if (legalView === 'security') {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <SecurityPage onBack={() => setLegalView('login')} />
      </React.Suspense>
    );
  }

  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-3 xs:px-4 py-8 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <Card className="border-border bg-card shadow-sm rounded-lg">
          <CardHeader className="text-center pb-3 xs:pb-4 pt-5 xs:pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <AppLogo size={52} className="h-12 w-12 xs:h-14 xs:w-14" />
            </div>
            <CardTitle className="text-xl xs:text-2xl font-serif font-bold tracking-tight text-foreground">
              Sign in to your household
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Private access for household members
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 xs:px-5 pb-5 xs:pb-6">
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-negative/30 bg-negative-soft p-3 text-xs text-negative flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-foreground"
                >
                  Username
                </label>
                <Input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. virendra, saurav"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground pr-10 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* Biometric / Fingerprint Quick Unlock for Mobile Devices */}
            {biometricAvailable && registeredBiometric && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full h-11 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Fingerprint className="h-5 w-5" />
                  <span>Unlock with Fingerprint (@{registeredBiometric.username})</span>
                </Button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Household data is private to active members</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>Enforced HTTPS TLS 1.3 Encryption</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal & Compliance Footer Links */}
        <div className="mt-4 flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setLegalView('privacy')}
            className="hover:text-primary transition-colors hover:underline"
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setLegalView('terms')}
            className="hover:text-primary transition-colors hover:underline"
          >
            Terms of Service
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setLegalView('security')}
            className="hover:text-primary transition-colors hover:underline"
          >
            Security
          </button>
        </div>
      </div>
    </main>
  );
}

