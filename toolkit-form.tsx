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
import { RichTextEditor } from "@/components/ui/rich-text-editor"

const toolkitSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z.string().min(20, { message: "Description must be at least 20 characters" }),
  category: z.string().min(1, { message: "Please select a category" }),
  price: z.string().min(1, { message: "Please enter a price" }),
})

type ToolkitFormValues = z.infer<typeof toolkitSchema>

interface ToolkitFormProps {
  onSubmit: (values: ToolkitFormValues, files?: File[]) => void
  isLoading?: boolean
  error?: string
  defaultValues?: Partial<ToolkitFormValues>
}

export function ToolkitForm({ onSubmit, isLoading = false, error, defaultValues }: ToolkitFormProps) {
  const [files, setFiles] = React.useState<File[]>([])
  const [description, setDescription] = React.useState(defaultValues?.description || "")
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ToolkitFormValues>({
    resolver: zodResolver(toolkitSchema),
    defaultValues: {
      ...defaultValues,
      description,
    },
  })

  React.useEffect(() => {
    setValue("description", description)
  }, [description, setValue])

  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
  }

  const handleFormSubmit = (data: ToolkitFormValues) => {
    onSubmit(data, files)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Create Sustainability Toolkit</h2>
        <p className="text-muted-foreground">
          Share your expertise by creating a toolkit for SMEs to implement sustainability practices
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Toolkit Title</Label>
            <Input
              id="title"
              placeholder="e.g., Carbon Footprint Reduction Guide for Retail Businesses"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              onValueChange={(value) => setValue("category", value)}
              defaultValue={defaultValues?.category}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select toolkit category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carbon">Carbon Management</SelectItem>
                <SelectItem value="energy">Energy Efficiency</SelectItem>
                <SelectItem value="waste">Waste Reduction</SelectItem>
                <SelectItem value="water">Water Conservation</SelectItem>
                <SelectItem value="supply_chain">Sustainable Supply Chain</SelectItem>
                <SelectItem value="reporting">ESG Reporting</SelectItem>
                <SelectItem value="certification">Green Certification</SelectItem>
                <SelectItem value="strategy">Sustainability Strategy</SelectItem>
                <SelectItem value="circular">Circular Economy</SelectItem>
                <SelectItem value="social">Social Impact</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Toolkit Description</Label>
            <RichTextEditor
              initialValue={description}
              onValueChange={setDescription}
              placeholder="Describe what your toolkit includes, who it's for, and how it helps with sustainability"
              minHeight="200px"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              placeholder="e.g., 49.99"
              {...register("price")}
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Toolkit Files</Label>
            <FileUpload
              onFilesSelected={handleFilesChange}
              maxFiles={5}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              preview={false}
            />
            <p className="text-xs text-muted-foreground">
              Upload PDF, Word, Excel, PowerPoint files or ZIP archives (max 5 files)
            </p>
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating toolkit..." : "Create Toolkit"}
        </Button>
      </form>
    </div>
  )
}
