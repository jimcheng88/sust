import * as React from "react"
import { Bold, Italic, Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Image } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface RichTextEditorProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void
  placeholder?: string
  initialValue?: string
  minHeight?: string
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ className, onValueChange, placeholder = "Write something...", initialValue = "", minHeight = "200px", ...props }, ref) => {
    const [value, setValue] = React.useState(initialValue)
    const [mode, setMode] = React.useState<"edit" | "preview">("edit")
    const editorRef = React.useRef<HTMLTextAreaElement>(null)

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setValue(newValue)
      onValueChange?.(newValue)
    }

    const insertText = (before: string, after: string = "") => {
      if (!editorRef.current) return

      const { selectionStart, selectionEnd } = editorRef.current
      const selectedText = value.substring(selectionStart, selectionEnd)
      const newValue = 
        value.substring(0, selectionStart) + 
        before + 
        selectedText + 
        after + 
        value.substring(selectionEnd)
      
      setValue(newValue)
      onValueChange?.(newValue)
      
      // Set cursor position after insertion
      setTimeout(() => {
        if (!editorRef.current) return
        const newPosition = selectionStart + before.length + selectedText.length + after.length
        editorRef.current.focus()
        editorRef.current.setSelectionRange(newPosition, newPosition)
      }, 0)
    }

    const formatBold = () => insertText("**", "**")
    const formatItalic = () => insertText("*", "*")
    const formatLink = () => {
      const url = prompt("Enter URL:")
      if (url) {
        if (editorRef.current) {
          const { selectionStart, selectionEnd } = editorRef.current
          const selectedText = value.substring(selectionStart, selectionEnd) || "link text"
          insertText(`[${selectedText}](${url})`, "")
        }
      }
    }
    const formatList = () => insertText("\n- ")
    const formatOrderedList = () => insertText("\n1. ")
    const formatImage = () => {
      const url = prompt("Enter image URL:")
      if (url) {
        const alt = prompt("Enter image description:") || ""
        insertText(`![${alt}](${url})`)
      }
    }

    // Simple Markdown to HTML converter for preview
    const markdownToHtml = (markdown: string) => {
      let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Images
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%;" />')
        // Lists
        .replace(/^\s*- (.*$)/gim, '<li>$1</li>')
        // Ordered Lists
        .replace(/^\s*\d+\. (.*$)/gim, '<li>$1</li>')
        // Paragraphs
        .replace(/^(?!<[hl]|<li)(.*$)/gim, '<p>$1</p>')
      
      // Wrap lists
      html = html.replace(/<li>.*?<\/li>/gs, match => {
        return `<ul>${match}</ul>`;
      });
      
      return html
    }

    return (
      <div ref={ref} className={cn("w-full border rounded-md", className)}>
        <div className="flex items-center gap-1 p-1 border-b bg-muted/50">
          <Button type="button" variant="ghost" size="sm" onClick={formatBold}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={formatItalic}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={formatLink}>
            <Link className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={formatList}>
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={formatOrderedList}>
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={formatImage}>
            <Image className="h-4 w-4" />
          </Button>
          <div className="ml-auto">
            <Tabs value={mode} onValueChange={(value) => setMode(value as "edit" | "preview")}>
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs px-2 py-1">Edit</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-2 py-1">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="relative">
          <TabsContent value="edit" className="mt-0">
            <textarea
              ref={editorRef}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className={cn(
                "w-full p-3 focus:outline-none resize-none",
                `min-h-[${minHeight}]`
              )}
              style={{ minHeight }}
              {...props}
            />
          </TabsContent>
          
          <TabsContent value="preview" className="mt-0">
            <div 
              className={cn(
                "w-full p-3 overflow-auto prose prose-sm max-w-none",
                `min-h-[${minHeight}]`
              )}
              style={{ minHeight }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
            />
          </TabsContent>
        </div>
      </div>
    )
  }
)
RichTextEditor.displayName = "RichTextEditor"

export { RichTextEditor }
