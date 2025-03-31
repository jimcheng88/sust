import React from 'react';
import { useRouter } from 'next/navigation';
import { ConsultantProfileForm } from '@/components/forms/consultant-profile-form';

export default function ConsultantProfileSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Get user ID from local storage
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const userType = typeof window !== 'undefined' ? localStorage.getItem('userType') : null;
  
  // If no user ID or wrong user type, redirect to login
  React.useEffect(() => {
    if ((!userId || userType !== 'consultant') && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, [userId, userType, router]);

  const handleSubmit = async (values: any, profileImage?: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // First, upload profile image if provided
      let imageUrl = null;
      if (profileImage) {
        const formData = new FormData();
        formData.append('file', profileImage);
        formData.append('upload_preset', 'sustainability_marketplace');
        
        // In a real implementation, you would upload to your storage service
        // This is a placeholder for the file upload logic
        imageUrl = `/uploads/${profileImage.name}`;
      }
      
      // Create profile
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          action: 'create-consultant-profile',
          userId,
          profileData: {
            full_name: values.fullName,
            headline: values.headline,
            bio: values.bio,
            expertise: values.expertise,
            experience_years: values.experienceYears,
            hourly_rate: parseFloat(values.hourlyRate),
            location: values.location,
            languages: values.languages,
            profile_image: imageUrl,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile');
      }

      // Redirect to dashboard
      router.push('/consultant/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ConsultantProfileForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        error={error || undefined} 
      />
    </div>
  );
}
