'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Step 1 State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 State (MFA)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Surface a friendly message when the Google callback bounced back with an error
  // (e.g. a suspended account) via ?error=oauth.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'oauth') {
      setError('We could not sign you in with Google. Please try again or use your email and password.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Task 2: MFA Login UI Flow
    // Step 1: Attempt standard login or Step 2: Attempt login with MFA token
    const result = await login(email, password, mfaRequired ? mfaToken : undefined);

    if (result.success) {
      // On success, the backend sets HttpOnly cookies (we don't receive raw JWTs).
      // Honor a ?next= target from the edge auth guard, but only same-origin paths
      // (must start with a single "/") so it can't be used as an open redirect.
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      router.push(safeNext);
    } else if (result.mfaRequired) {
      setMfaRequired(true);
    } else {
      setError(result.message || 'Login failed. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-surface rounded-2xl shadow-2xl border border-hairline">
        <h1 className="font-serif text-3xl font-semibold text-center text-foreground">Sign In</h1>

        {error && (
          <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/40 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {!mfaRequired ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-surface-raised border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-300 ease-out outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-surface-raised border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-300 ease-out outline-none pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors duration-300 ease-out hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-sm font-medium mb-1 text-accent">
                Authenticator App Code
              </label>
              <p className="text-xs text-muted mb-3">
                Two-factor authentication is required to secure your account.
              </p>
              <input
                type="text"
                maxLength={6}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="000000"
                className="w-full p-3 text-center text-2xl tracking-[0.5em] bg-surface-raised border border-accent/50 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:bg-accent-hover focus:ring-4 focus:ring-accent/40 text-background font-semibold rounded-lg shadow-md transition-colors duration-300 ease-out disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : mfaRequired ? 'Verify & Sign In' : 'Sign In'}
          </button>
        </form>

        {!mfaRequired && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-hairline" />
              <span className="text-xs uppercase tracking-wide text-muted">or</span>
              <span className="h-px flex-1 bg-hairline" />
            </div>
            <GoogleSignInButton />
          </>
        )}

        <p className="text-center text-sm text-muted mt-4">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={() => router.push('/register')} className="text-accent transition-colors duration-300 ease-out hover:text-accent-hover font-medium">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
