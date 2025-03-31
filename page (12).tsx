import React from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          loginEmail: values.email,
          loginPassword: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      if (data.requiresMfa) {
        // Store user ID in session storage for MFA verification
        sessionStorage.setItem('mfaUserId', data.user.id);
        router.push('/mfa-verification');
      } else {
        // Store token in local storage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userType', data.user.user_type);
        
        // Redirect based on user type
        if (data.user.user_type === 'sme') {
          router.push('/sme/dashboard');
        } else {
          router.push('/consultant/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <LoginForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        error={error || undefined} 
      />
    </div>
  );
}
