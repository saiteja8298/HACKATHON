import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VibrantCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'orange' | 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'red'
  glow?: boolean
  animated?: boolean
  children: React.ReactNode
}

const VibrantCard = React.forwardRef<HTMLDivElement, VibrantCardProps>(
  ({ className, variant = 'orange', glow = true, animated = false, children, ...props }, ref) => {
    const variantClasses = {
      orange: 'border-vibrant-orange/30 shadow-vibrant-glow',
      pink: 'border-vibrant-pink/30 shadow-vibrant-glow',
      purple: 'border-vibrant-purple/30 shadow-vibrant-glow',
      blue: 'border-vibrant-blue/30 shadow-vibrant-glow',
      green: 'border-vibrant-green/30 shadow-vibrant-glow',
      yellow: 'border-vibrant-yellow/30 shadow-vibrant-glow',
      red: 'border-vibrant-red/30 shadow-vibrant-glow',
    }

    const glowClasses = {
      orange: 'hover:shadow-[0_0_40px_-10px_hsl(28_100%_60%/_0.4)]',
      pink: 'hover:shadow-[0_0_40px_-10px_hsl(330_85%_65%/_0.4)]',
      purple: 'hover:shadow-[0_0_40px_-10px_hsl(260_80%_60%/_0.4)]',
      blue: 'hover:shadow-[0_0_40px_-10px_hsl(200_85%_55%/_0.4)]',
      green: 'hover:shadow-[0_0_40px_-10px_hsl(142_70%_50%/_0.4)]',
      yellow: 'hover:shadow-[0_0_40px_-10px_hsl(45_90%_55%/_0.4)]',
      red: 'hover:shadow-[0_0_40px_-10px_hsl(0_85%_60%/_0.4)]',
    }

    return (
      <Card
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden transition-all duration-300',
          
          // Dark theme background
          'bg-card/90 backdrop-blur-md',
          
          // Border styles
          'border-2',
          variantClasses[variant],
          
          // Glow effect
          glow && glowClasses[variant],
          
          // Animation
          animated && 'animate-vibrant-glow',
          
          className
        )}
        {...props}
      >
        {/* Gradient overlay */}
        <div 
          className={cn(
            'absolute inset-0 opacity-10 pointer-events-none',
            variant === 'orange' && 'bg-gradient-to-br from-vibrant-orange to-transparent',
            variant === 'pink' && 'bg-gradient-to-br from-vibrant-pink to-transparent',
            variant === 'purple' && 'bg-gradient-to-br from-vibrant-purple to-transparent',
            variant === 'blue' && 'bg-gradient-to-br from-vibrant-blue to-transparent',
            variant === 'green' && 'bg-gradient-to-br from-vibrant-green to-transparent',
            variant === 'yellow' && 'bg-gradient-to-br from-vibrant-yellow to-transparent',
            variant === 'red' && 'bg-gradient-to-br from-vibrant-red to-transparent',
          )}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </Card>
    )
  }
)

VibrantCard.displayName = 'VibrantCard'

export { VibrantCard }
