import React from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/forms/register-form';

export default function RegisterPage() {
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
          action: 'register',
          email: values.email,
          name: values.name,
          password: values.password,
          userType: values.userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      // Store token in local storage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userType', data.user.user_type);
      
      // Redirect to profile setup based on user type
      if (data.user.user_type === 'sme') {
        router.push('/sme/profile-setup');
      } else {
        router.push('/consultant/profile-setup');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <RegisterForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        error={error || undefined} 
      />
    </div>
  );
}
