'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Step 1 State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // MFA state. `mfaRequired` is the forced second step the backend asks for when a 2FA
  // account signs in without a code; `showMfaField` is the user opting to supply the code
  // upfront so the whole sign-in completes in a single request.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showMfaField, setShowMfaField] = useState(false);
  const [mfaToken, setMfaToken] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [notice, setNotice] = useState('');

  // Surface friendly messages from redirects: a failed Google callback (?error=oauth)
  // or a completed password reset (?reset=1).
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('error') === 'oauth') {
      setError('We could not sign you in with Google. Please try again or use your email and password.');
    }
    if (query.get('reset') === '1') {
      setNotice('Your password has been reset. Please sign in with your new password.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Send the code whenever we have one — either because the user supplied it upfront or
    // because the backend already asked for it. Omitted entirely otherwise, so accounts
    // without 2FA are unaffected.
    const suppliedToken = mfaRequired || showMfaField ? mfaToken.trim() : '';
    const result = await login(email, password, suppliedToken || undefined);

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
        <div className="flex flex-col items-center gap-4">
          <Link href="/" aria-label="Album home">
            <Logo variant="icon" size="lg" priority />
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-center text-foreground">Sign In</h1>
        </div>

        {notice && (
          <div className="p-3 text-sm text-success bg-success/10 border border-success/40 rounded-lg">
            {notice}
          </div>
        )}

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
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-muted">Password</label>
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs font-medium text-accent transition-colors duration-300 ease-out hover:text-accent-hover"
                  >
                    Forgot password?
                  </button>
                </div>
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

              {/* Optional upfront code: lets anyone with 2FA enabled finish sign-in in a
                  single submit instead of waiting for the backend to ask for it. */}
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={showMfaField}
                    onChange={(e) => {
                      setShowMfaField(e.target.checked);
                      if (!e.target.checked) setMfaToken('');
                    }}
                    className="h-4 w-4 rounded border-hairline accent-accent"
                  />
                  I have an authenticator code
                </label>

                {showMfaField ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    aria-label="Authenticator app code"
                    autoFocus
                    className="mt-3 w-full p-3 text-center text-2xl tracking-[0.5em] bg-surface-raised border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-300 ease-out outline-none"
                  />
                ) : null}
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
