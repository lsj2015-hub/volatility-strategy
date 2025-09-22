"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, disabled = false, className }, ref) => {
    const [isDragging, setIsDragging] = React.useState<'min' | 'max' | 'single' | null>(null)
    const sliderRef = React.useRef<HTMLDivElement>(null)

    // 단일 값인지 범위 값인지 판단
    const isRange = value.length === 2
    const currentValue = value[0] || 0
    const minValue = isRange ? (value[0] || 0) : 0
    const maxValue = isRange ? (value[1] || 0) : currentValue

    const getPercentage = (val: number) => {
      if (max === min) return 0
      return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))
    }

    const getValueFromPosition = (clientX: number) => {
      if (!sliderRef.current) return min

      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      const rawValue = min + (percentage / 100) * (max - min)

      // Round to nearest step
      return Math.max(min, Math.min(max, Math.round(rawValue / step) * step))
    }

    const handleMouseDown = (type: 'min' | 'max' | 'single') => (e: React.MouseEvent) => {
      if (disabled) return

      e.preventDefault()
      e.stopPropagation()
      setIsDragging(type)
    }

    const handleTrackClick = (e: React.MouseEvent) => {
      if (disabled || isDragging) return

      const newValue = getValueFromPosition(e.clientX)

      if (isRange) {
        // 범위 슬라이더: 더 가까운 thumb을 이동
        const distanceToMin = Math.abs(newValue - minValue)
        const distanceToMax = Math.abs(newValue - maxValue)

        if (distanceToMin < distanceToMax) {
          const newMin = Math.min(newValue, maxValue)
          onValueChange([newMin, maxValue])
        } else {
          const newMax = Math.max(newValue, minValue)
          onValueChange([minValue, newMax])
        }
      } else {
        // 단일 값 슬라이더
        onValueChange([newValue])
      }
    }

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
      if (!isDragging || disabled) return

      e.preventDefault()
      const newValue = getValueFromPosition(e.clientX)

      if (isRange) {
        if (isDragging === 'min') {
          const newMin = Math.min(newValue, maxValue)
          onValueChange([newMin, maxValue])
        } else if (isDragging === 'max') {
          const newMax = Math.max(newValue, minValue)
          onValueChange([minValue, newMax])
        }
      } else {
        onValueChange([newValue])
      }
    }, [isDragging, disabled, onValueChange, isRange, minValue, maxValue])

    const handleMouseUp = React.useCallback(() => {
      setIsDragging(null)
    }, [])

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove, { passive: false })
        document.addEventListener('mouseup', handleMouseUp, { passive: false })

        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, handleMouseMove, handleMouseUp])

    const minPercentage = getPercentage(minValue)
    const maxPercentage = isRange ? getPercentage(maxValue) : getPercentage(currentValue)

    return (
      <div
        ref={ref}
        className={cn("relative w-full py-2", className)}
      >
        {/* Track */}
        <div
          ref={sliderRef}
          className={cn(
            "relative h-2 w-full rounded-full cursor-pointer",
            disabled ? "bg-muted cursor-not-allowed" : "bg-secondary"
          )}
          onClick={handleTrackClick}
        >
          {/* Active range */}
          <div
            className={cn(
              "absolute h-full rounded-full transition-colors",
              disabled ? "bg-muted-foreground/50" : "bg-primary"
            )}
            style={{
              left: isRange ? `${minPercentage}%` : '0%',
              width: isRange ? `${Math.max(0, maxPercentage - minPercentage)}%` : `${maxPercentage}%`
            }}
          />

          {/* Range Slider: Min thumb */}
          {isRange && (
            <div
              className={cn(
                "absolute top-1/2 h-5 w-5 -mt-2.5 rounded-full shadow-md transition-all duration-150",
                disabled
                  ? "bg-muted-foreground cursor-not-allowed"
                  : "bg-background border-2 border-primary cursor-grab active:cursor-grabbing hover:scale-110",
                isDragging === 'min' && !disabled && "scale-110 ring-2 ring-primary/30"
              )}
              style={{
                left: `${minPercentage}%`,
                transform: 'translateX(-50%)',
                zIndex: isDragging === 'min' ? 20 : 10
              }}
              onMouseDown={handleMouseDown('min')}
            />
          )}

          {/* Range Slider: Max thumb OR Single Value thumb */}
          <div
            className={cn(
              "absolute top-1/2 h-5 w-5 -mt-2.5 rounded-full shadow-md transition-all duration-150",
              disabled
                ? "bg-muted-foreground cursor-not-allowed"
                : "bg-background border-2 border-primary cursor-grab active:cursor-grabbing hover:scale-110",
              ((isRange && isDragging === 'max') || (!isRange && isDragging === 'single')) && !disabled && "scale-110 ring-2 ring-primary/30"
            )}
            style={{
              left: `${maxPercentage}%`,
              transform: 'translateX(-50%)',
              zIndex: (isRange && isDragging === 'max') || (!isRange && isDragging === 'single') ? 20 : 10
            }}
            onMouseDown={handleMouseDown(isRange ? 'max' : 'single')}
          />
        </div>
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }