import * as React from "react"
import { Star, StarHalf } from "lucide-react"

import { cn } from "@/lib/utils"

interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  readOnly?: boolean
  onChange?: (value: number) => void
}

const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  ({ className, value, max = 5, readOnly = true, onChange, ...props }, ref) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null)
    
    const handleMouseEnter = (index: number) => {
      if (readOnly) return
      setHoverValue(index + 1)
    }
    
    const handleMouseLeave = () => {
      if (readOnly) return
      setHoverValue(null)
    }
    
    const handleClick = (index: number) => {
      if (readOnly) return
      onChange?.(index + 1)
    }
    
    const displayValue = hoverValue !== null ? hoverValue : value
    
    return (
      <div
        ref={ref}
        className={cn("flex items-center", className)}
        {...props}
      >
        {Array.from({ length: max }).map((_, index) => {
          const isFilled = index < Math.floor(displayValue)
          const isHalf = !isFilled && index < displayValue
          
          return (
            <span
              key={index}
              className={cn(
                "cursor-default text-yellow-400",
                !readOnly && "cursor-pointer"
              )}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(index)}
            >
              {isFilled ? (
                <Star className="h-5 w-5 fill-current" />
              ) : isHalf ? (
                <StarHalf className="h-5 w-5 fill-current" />
              ) : (
                <Star className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
          )
        })}
      </div>
    )
  }
)
Rating.displayName = "Rating"

export { Rating }
