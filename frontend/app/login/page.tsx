'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  
  // Step 1 State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Step 2 State (MFA)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Task 2: MFA Login UI Flow
      // Step 1: Attempt standard login or Step 2: Attempt login with MFA token
      const payload = mfaRequired 
        ? { email, password, mfaToken } 
        : { email, password };

      const res = await api.post('/auth/login', payload);
      
      // On success, the backend sets HttpOnly cookies (we don't receive raw JWTs).
      // Redirect to the dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (!err.response) {
        setError(`Network Error: ${err.message}. Please check CORS or backend connection.`);
      } else if (err.response?.status === 401 && err.response?.data?.message === 'MFA token required.') {
        setMfaRequired(true);
      } else {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Login failed. Please check your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold text-center text-white">Sign In</h1>
        
        {error && (
          <div className="p-3 text-sm text-red-200 bg-red-900/50 border border-red-800 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {!mfaRequired ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
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
              <label className="block text-sm font-medium mb-1 text-indigo-300">
                Authenticator App Code
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Two-factor authentication is required to secure your account.
              </p>
              <input
                type="text"
                maxLength={6}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="000000"
                className="w-full p-3 text-center text-2xl tracking-[0.5em] bg-gray-900 border border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : mfaRequired ? 'Verify & Sign In' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Don't have an account?{' '}
          <button type="button" onClick={() => router.push('/register')} className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
