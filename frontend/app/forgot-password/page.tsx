'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  // 'request' = ask for the email; 'reset' = enter the emailed code + a new password.
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setNotice(res.data?.message || 'If an account exists for that email, a reset code has been sent.');
      setStep('reset');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      router.push('/login?reset=1');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full p-3 bg-surface-raised border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-300 ease-out outline-none';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-surface rounded-2xl shadow-2xl border border-hairline">
        <div className="flex flex-col items-center gap-4">
          <Link href="/" aria-label="Album home">
            <Logo variant="icon" size="lg" priority />
          </Link>
          <div className="text-center space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-foreground">Reset password</h1>
            <p className="text-sm text-muted">
              {step === 'request'
                ? 'Enter your email and we’ll send you a 6-digit reset code.'
                : 'Enter the code we sent and choose a new password.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/40 rounded-lg">{error}</div>
        )}
        {notice && step === 'reset' && (
          <div className="p-3 text-sm text-success bg-success/10 border border-success/40 rounded-lg">{notice}</div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover focus:ring-4 focus:ring-accent/40 text-background font-semibold rounded-lg shadow-md transition-colors duration-300 ease-out disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className={`${inputClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors duration-300 ease-out hover:text-foreground"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover focus:ring-4 focus:ring-accent/40 text-background font-semibold rounded-lg shadow-md transition-colors duration-300 ease-out disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setError('');
              }}
              className="w-full text-sm text-muted transition-colors duration-300 ease-out hover:text-accent"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted">
          Remembered it?{' '}
          <Link href="/login" className="text-accent transition-colors duration-300 ease-out hover:text-accent-hover font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
