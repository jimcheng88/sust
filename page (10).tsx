import React from 'react';
import { useRouter } from 'next/navigation';

export default function MfaVerificationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mfaCode, setMfaCode] = React.useState('');
  
  // Get user ID from session storage
  const userId = typeof window !== 'undefined' ? sessionStorage.getItem('mfaUserId') : null;
  
  // If no user ID, redirect to login
  React.useEffect(() => {
    if (!userId && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, [userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-mfa',
          userId,
          mfaCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify MFA code');
      }

      // Store token in local storage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userType', data.user.user_type);
      
      // Clear session storage
      sessionStorage.removeItem('mfaUserId');
      
      // Redirect based on user type
      if (data.user.user_type === 'sme') {
        router.push('/sme/dashboard');
      } else {
        router.push('/consultant/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Two-Factor Authentication</h1>
        <p className="mb-4 text-gray-600">
          Please enter the verification code from your authenticator app.
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              id="mfaCode"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter 6-digit code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-primary hover:underline focus:outline-none"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
