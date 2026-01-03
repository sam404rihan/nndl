'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LabOSIcon from '@/components/LabOSIcon';
import { signIn } from '@/app/auth/actions';

export default function LoginPage() {
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn(email, password);

      if (result?.error) {
        setErrorMessage(result.error);
        setShowError(true);
        setIsLoading(false);
      } else if (result?.success) {
        // Successful login
        router.push('/dashboard');
        // Don't set isLoading to false here to prevent flash of form before redirect
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setShowError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* Error Dialog */}
      {showError && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowError(false)}
        >
          <div
            className="bg-white rounded-lg p-8 max-w-md mx-4"
            style={{
              border: '2px solid #B91C1C',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: '#FEE2E2' }}
              >
                <span style={{ color: '#B91C1C', fontSize: '24px' }}>⚠</span>
              </div>
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Authentication Failed
                </h3>
                <p
                  className="mb-4"
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: '1.5'
                  }}
                >
                  {errorMessage || 'Invalid username or password. Please verify your credentials and try again.'}
                </p>
                <button
                  onClick={() => setShowError(false)}
                  className="px-6 py-2 font-medium"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-sm)',
                    border: '2px solid var(--color-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="border-b"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div className="flex items-center gap-2">
                <LabOSIcon className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h1 className="text-xl font-semibold" style={{ letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>LabOS</h1>
                  <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: '4px', letterSpacing: '0.01em' }}>
                    Laboratory Management System
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md px-6 py-16">

          <h2
            className="text-3xl lg:text-4xl font-semibold mb-8"
            style={{
              letterSpacing: '-0.025em',
              lineHeight: '1.15',
              fontWeight: 'var(--font-weight-semibold)'
            }}
          >
            Staff Authentication
          </h2>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Email Field */}
            <div>
              <label
                htmlFor="username"
                className="block mb-2"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '0.01em'
                }}
              >
                Email
              </label>
              <input
                type="email"
                id="username"
                name="username"
                className="w-full px-4 py-3"
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-base)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  transition: 'border-color var(--transition-fast)'
                }}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block mb-2"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '0.01em'
                }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className="w-full px-4 py-3 pr-12"
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-base)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    transition: 'border-color var(--transition-fast)'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none'
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-8 py-4 font-medium"
                style={{
                  background: isLoading ? 'var(--color-text-tertiary)' : 'var(--color-primary)',
                  color: 'white',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-base)',
                  letterSpacing: '-0.01em',
                  border: `2px solid ${isLoading ? 'var(--color-text-tertiary)' : 'var(--color-primary)'}`,
                  transition: 'all var(--transition-fast)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Authenticating...' : 'Authenticate & Enter'}
              </button>
            </div>

            {/* Help Text */}
            <p
              className="text-center"
              style={{
                color: '#B91C1C',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: '0.01em'
              }}
            >
              Authorized Personnel Only
            </p>

          </form>

        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }} suppressHydrationWarning>
            © {new Date().getFullYear()} LabOS Diagnostics. HIPAA Compliant System.
          </p>
        </div>
      </footer>

    </div>
  );
}