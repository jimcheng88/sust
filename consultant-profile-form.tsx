import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"

const profileSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  headline: z.string().min(5, { message: "Headline must be at least 5 characters" }),
  bio: z.string().min(20, { message: "Bio must be at least 20 characters" }),
  expertise: z.array(z.string()).min(1, { message: "Please select at least one area of expertise" }),
  experienceYears: z.string().min(1, { message: "Please select years of experience" }),
  hourlyRate: z.string().min(1, { message: "Please enter your hourly rate" }),
  location: z.string().min(2, { message: "Location must be at least 2 characters" }),
  languages: z.array(z.string()).min(1, { message: "Please select at least one language" }),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
  onSubmit: (values: ProfileFormValues, profileImage?: File) => void
  isLoading?: boolean
  error?: string
  defaultValues?: Partial<ProfileFormValues>
}

export function ConsultantProfileForm({ onSubmit, isLoading = false, error, defaultValues }: ProfileFormProps) {
  const [profileImage, setProfileImage] = React.useState<File | undefined>(undefined)
  const [selectedExpertise, setSelectedExpertise] = React.useState<string[]>(defaultValues?.expertise || [])
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(defaultValues?.languages || [])
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...defaultValues,
      expertise: selectedExpertise,
      languages: selectedLanguages,
    },
  })

  React.useEffect(() => {
    setValue("expertise", selectedExpertise)
  }, [selectedExpertise, setValue])

  React.useEffect(() => {
    setValue("languages", selectedLanguages)
  }, [selectedLanguages, setValue])

  const handleExpertiseChange = (value: string) => {
    if (selectedExpertise.includes(value)) {
      setSelectedExpertise(selectedExpertise.filter(item => item !== value))
    } else {
      setSelectedExpertise([...selectedExpertise, value])
    }
  }

  const handleLanguageChange = (value: string) => {
    if (selectedLanguages.includes(value)) {
      setSelectedLanguages(selectedLanguages.filter(item => item !== value))
    } else {
      setSelectedLanguages([...selectedLanguages, value])
    }
  }

  const handleProfileImageChange = (files: File[]) => {
    if (files.length > 0) {
      setProfileImage(files[0])
    }
  }

  const handleFormSubmit = (data: ProfileFormValues) => {
    onSubmit(data, profileImage)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Consultant Profile</h2>
        <p className="text-muted-foreground">
          Complete your profile to start matching with sustainability projects
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <Label>Profile Picture</Label>
            <FileUpload
              onFilesSelected={handleProfileImageChange}
              maxFiles={1}
              accept="image/*"
              preview={true}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="e.g., Sustainability Consultant with 10+ years in Carbon Footprint Analysis"
              {...register("headline")}
            />
            {errors.headline && (
              <p className="text-sm text-destructive">{errors.headline.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              placeholder="Describe your professional background, expertise, and approach to sustainability consulting"
              rows={5}
              {...register("bio")}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Areas of Expertise</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                "ESG Reporting",
                "Carbon Footprint Analysis",
                "Energy Efficiency",
                "Sustainable Supply Chain",
                "Green Certifications",
                "Climate Risk Assessment",
                "Circular Economy",
                "Waste Management",
                "Renewable Energy",
                "Sustainability Strategy",
                "Water Conservation",
                "Biodiversity",
                "Social Impact",
                "Sustainable Finance",
                "Green Building"
              ].map((expertise) => (
                <div key={expertise} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`expertise-${expertise}`}
                    checked={selectedExpertise.includes(expertise)}
                    onChange={() => handleExpertiseChange(expertise)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={`expertise-${expertise}`} className="text-sm font-normal">
                    {expertise}
                  </Label>
                </div>
              ))}
            </div>
            {errors.expertise && (
              <p className="text-sm text-destructive">{errors.expertise.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceYears">Years of Experience</Label>
              <Select 
                onValueChange={(value) => setValue("experienceYears", value)}
                defaultValue={defaultValues?.experienceYears}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select years of experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-3">1-3 years</SelectItem>
                  <SelectItem value="4-6">4-6 years</SelectItem>
                  <SelectItem value="7-10">7-10 years</SelectItem>
                  <SelectItem value="11-15">11-15 years</SelectItem>
                  <SelectItem value="15+">15+ years</SelectItem>
                </SelectContent>
              </Select>
              {errors.experienceYears && (
                <p className="text-sm text-destructive">{errors.experienceYears.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
              <Input
                id="hourlyRate"
                placeholder="e.g., 150"
                {...register("hourlyRate")}
              />
              {errors.hourlyRate && (
                <p className="text-sm text-destructive">{errors.hourlyRate.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City, Country"
              {...register("location")}
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Languages</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                "English",
                "Spanish",
                "French",
                "German",
                "Chinese",
                "Japanese",
                "Portuguese",
                "Italian",
                "Russian",
                "Arabic",
                "Hindi",
                "Dutch"
              ].map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`language-${language}`}
                    checked={selectedLanguages.includes(language)}
                    onChange={() => handleLanguageChange(language)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={`language-${language}`} className="text-sm font-normal">
                    {language}
                  </Label>
                </div>
              ))}
            </div>
            {errors.languages && (
              <p className="text-sm text-destructive">{errors.languages.message}</p>
            )}
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving profile..." : "Save Profile"}
        </Button>
      </form>
    </div>
  )
}
