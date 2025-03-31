import React from 'react';
import { useRouter } from 'next/navigation';
import { SMEProfileForm } from '@/components/forms/sme-profile-form';

export default function SMEProfileSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Get user ID from local storage
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const userType = typeof window !== 'undefined' ? localStorage.getItem('userType') : null;
  
  // If no user ID or wrong user type, redirect to login
  React.useEffect(() => {
    if ((!userId || userType !== 'sme') && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, [userId, userType, router]);

  const handleSubmit = async (values: any, companyLogo?: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // First, upload company logo if provided
      let logoUrl = null;
      if (companyLogo) {
        const formData = new FormData();
        formData.append('file', companyLogo);
        formData.append('upload_preset', 'sustainability_marketplace');
        
        // In a real implementation, you would upload to your storage service
        // This is a placeholder for the file upload logic
        logoUrl = `/uploads/${companyLogo.name}`;
      }
      
      // Create profile
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          action: 'create-sme-profile',
          userId,
          profileData: {
            company_name: values.companyName,
            industry: values.industry,
            company_size: values.companySize,
            location: values.location,
            sustainability_goals: values.sustainabilityGoals,
            budget_range: values.budgetRange,
            contact_person: values.contactPerson,
            contact_email: values.contactEmail,
            contact_phone: values.contactPhone,
            logo_url: logoUrl,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile');
      }

      // Redirect to dashboard
      router.push('/sme/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SMEProfileForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        error={error || undefined} 
      />
    </div>
  );
}
