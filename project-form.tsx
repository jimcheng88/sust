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
import { DatePicker } from "@/components/ui/date-picker"

const projectSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z.string().min(20, { message: "Description must be at least 20 characters" }),
  requirements: z.string().min(20, { message: "Requirements must be at least 20 characters" }),
  industry: z.string().min(1, { message: "Please select an industry" }),
  budget: z.string().min(1, { message: "Please enter a budget" }),
  deadline: z.date().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  onSubmit: (values: ProjectFormValues) => void
  isLoading?: boolean
  error?: string
  defaultValues?: Partial<ProjectFormValues>
}

export function ProjectForm({ onSubmit, isLoading = false, error, defaultValues }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultValues || {
      industry: "",
    },
  })

  const handleIndustryChange = (value: string) => {
    setValue("industry", value)
  }

  const handleDateChange = (date: Date | undefined) => {
    setValue("deadline", date)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Create New Sustainability Project</h2>
        <p className="text-muted-foreground">
          Describe your sustainability needs to find the perfect consultant match
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Project Title</Label>
          <Input
            id="title"
            placeholder="e.g., Carbon Footprint Assessment for Manufacturing Plant"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select 
            onValueChange={handleIndustryChange}
            defaultValue={watch("industry")}
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
          <Label htmlFor="description">Project Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your sustainability project in detail"
            rows={4}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="requirements">Requirements & Expectations</Label>
          <Textarea
            id="requirements"
            placeholder="What specific expertise, deliverables, or outcomes do you expect?"
            rows={4}
            {...register("requirements")}
          />
          {errors.requirements && (
            <p className="text-sm text-destructive">{errors.requirements.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budget">Budget Range</Label>
            <Select 
              onValueChange={(value) => setValue("budget", value)}
              defaultValue={watch("budget")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under_5k">Under $5,000</SelectItem>
                <SelectItem value="5k_10k">$5,000 - $10,000</SelectItem>
                <SelectItem value="10k_25k">$10,000 - $25,000</SelectItem>
                <SelectItem value="25k_50k">$25,000 - $50,000</SelectItem>
                <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                <SelectItem value="over_100k">Over $100,000</SelectItem>
              </SelectContent>
            </Select>
            {errors.budget && (
              <p className="text-sm text-destructive">{errors.budget.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deadline">Project Deadline</Label>
            <DatePicker 
              date={watch("deadline")} 
              setDate={handleDateChange}
              placeholder="Select deadline (optional)"
            />
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating project..." : "Create Project"}
        </Button>
      </form>
    </div>
  )
}
