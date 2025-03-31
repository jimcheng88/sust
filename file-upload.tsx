import * as React from "react"
import { Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilesSelected?: (files: File[]) => void
  maxFiles?: number
  accept?: string
  preview?: boolean
  className?: string
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, onFilesSelected, maxFiles = 1, accept, preview = true, ...props }, ref) => {
    const [files, setFiles] = React.useState<File[]>([])
    const [previews, setPreviews] = React.useState<string[]>([])
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return

      const selectedFiles = Array.from(e.target.files).slice(0, maxFiles)
      setFiles(selectedFiles)
      
      if (preview) {
        const newPreviews = selectedFiles.map(file => {
          if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file)
          }
          return ''
        })
        setPreviews(newPreviews)
      }

      if (onFilesSelected) {
        onFilesSelected(selectedFiles)
      }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      
      if (!e.dataTransfer.files?.length) return
      
      const droppedFiles = Array.from(e.dataTransfer.files).slice(0, maxFiles)
      setFiles(droppedFiles)
      
      if (preview) {
        const newPreviews = droppedFiles.map(file => {
          if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file)
          }
          return ''
        })
        setPreviews(newPreviews)
      }

      if (onFilesSelected) {
        onFilesSelected(droppedFiles)
      }
    }

    const removeFile = (index: number) => {
      const newFiles = [...files]
      newFiles.splice(index, 1)
      setFiles(newFiles)
      
      if (preview) {
        const newPreviews = [...previews]
        if (newPreviews[index]) {
          URL.revokeObjectURL(newPreviews[index])
        }
        newPreviews.splice(index, 1)
        setPreviews(newPreviews)
      }

      if (onFilesSelected) {
        onFilesSelected(newFiles)
      }
    }

    const triggerFileInput = () => {
      inputRef.current?.click()
    }

    React.useEffect(() => {
      // Cleanup object URLs on unmount
      return () => {
        previews.forEach(preview => {
          if (preview) URL.revokeObjectURL(preview)
        })
      }
    }, [previews])

    return (
      <div className={cn("w-full", className)}>
        <div
          className="flex flex-col items-center justify-center w-full border-2 border-dashed rounded-md border-input p-6 cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            Drag and drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            {maxFiles > 1 ? `Up to ${maxFiles} files` : 'Single file'} 
            {accept ? ` (${accept.replace(/,/g, ', ')})` : ''}
          </p>
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            onChange={handleFileChange}
            multiple={maxFiles > 1}
            accept={accept}
            {...props}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center space-x-2">
                  {preview && previews[index] && file.type.startsWith('image/') && (
                    <img 
                      src={previews[index]} 
                      alt={file.name} 
                      className="h-10 w-10 object-cover rounded-md"
                    />
                  )}
                  <div className="text-sm truncate max-w-[200px]">{file.name}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
FileUpload.displayName = "FileUpload"

export { FileUpload }
