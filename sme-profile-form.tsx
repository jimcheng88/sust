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
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters" }),
  industry: z.string().min(1, { message: "Please select an industry" }),
  companySize: z.string().min(1, { message: "Please select company size" }),
  location: z.string().min(2, { message: "Location must be at least 2 characters" }),
  sustainabilityGoals: z.string().min(20, { message: "Sustainability goals must be at least 20 characters" }),
  budgetRange: z.string().min(1, { message: "Please select a budget range" }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters" }),
  contactEmail: z.string().email({ message: "Please enter a valid email address" }),
  contactPhone: z.string().min(5, { message: "Please enter a valid phone number" }),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
  onSubmit: (values: ProfileFormValues, companyLogo?: File) => void
  isLoading?: boolean
  error?: string
  defaultValues?: Partial<ProfileFormValues>
}

export function SMEProfileForm({ onSubmit, isLoading = false, error, defaultValues }: ProfileFormProps) {
  const [companyLogo, setCompanyLogo] = React.useState<File | undefined>(undefined)
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultValues || {
      industry: "",
      companySize: "",
      budgetRange: "",
    },
  })

  const handleCompanyLogoChange = (files: File[]) => {
    if (files.length > 0) {
      setCompanyLogo(files[0])
    }
  }

  const handleFormSubmit = (data: ProfileFormValues) => {
    onSubmit(data, companyLogo)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Company Profile</h2>
        <p className="text-muted-foreground">
          Complete your company profile to find the right sustainability consultants
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
            <Label>Company Logo</Label>
            <FileUpload
              onFilesSelected={handleCompanyLogoChange}
              maxFiles={1}
              accept="image/*"
              preview={true}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Your Company Name"
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select 
                onValueChange={(value) => setValue("industry", value)}
                defaultValue={defaultValues?.industry}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.industry && (
                <p className="text-sm text-destructive">{errors.industry.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size</Label>
              <Select 
                onValueChange={(value) => setValue("companySize", value)}
                defaultValue={defaultValues?.companySize}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
              {errors.companySize && (
                <p className="text-sm text-destructive">{errors.companySize.message}</p>
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
            <Label htmlFor="sustainabilityGoals">Sustainability Goals & Challenges</Label>
            <Textarea
              id="sustainabilityGoals"
              placeholder="Describe your company's sustainability goals, challenges, and what you hope to achieve"
              rows={5}
              {...register("sustainabilityGoals")}
            />
            {errors.sustainabilityGoals && (
              <p className="text-sm text-destructive">{errors.sustainabilityGoals.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="budgetRange">Annual Sustainability Budget Range</Label>
            <Select 
              onValueChange={(value) => setValue("budgetRange", value)}
              defaultValue={defaultValues?.budgetRange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under_10k">Under $10,000</SelectItem>
                <SelectItem value="10k_50k">$10,000 - $50,000</SelectItem>
                <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                <SelectItem value="100k_250k">$100,000 - $250,000</SelectItem>
                <SelectItem value="250k_500k">$250,000 - $500,000</SelectItem>
                <SelectItem value="500k_1m">$500,000 - $1 million</SelectItem>
                <SelectItem value="over_1m">Over $1 million</SelectItem>
              </SelectContent>
            </Select>
            {errors.budgetRange && (
              <p className="text-sm text-destructive">{errors.budgetRange.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Primary Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  placeholder="Full Name"
                  {...register("contactPerson")}
                />
                {errors.contactPerson && (
                  <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  placeholder="email@company.com"
                  {...register("contactEmail")}
                />
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="+1 (555) 123-4567"
                  {...register("contactPhone")}
                />
                {errors.contactPhone && (
                  <p className="text-sm text-destructive">{errors.contactPhone.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving profile..." : "Save Profile"}
        </Button>
      </form>
    </div>
  )
}
