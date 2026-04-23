import React from 'react'
import { VibrantCard } from './VibrantCard'
import { Button } from './button'
import { Badge } from './badge'
import { Card, CardContent, CardHeader, CardTitle } from './card'

const VibrantShowcase = () => {
  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-vibrant-orange via-vibrant-pink to-vibrant-purple bg-clip-text text-transparent animate-color-shift">
          Vibrant Dark Theme Showcase
        </h1>
        <p className="text-muted-foreground text-lg">
          Experience the power of vibrant colors in a dark theme environment
        </p>
      </div>

      {/* Color Palette */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { color: 'orange', name: 'Electric Orange', class: 'bg-vibrant-orange' },
            { color: 'pink', name: 'Hot Pink', class: 'bg-vibrant-pink' },
            { color: 'purple', name: 'Deep Purple', class: 'bg-vibrant-purple' },
            { color: 'blue', name: 'Electric Blue', class: 'bg-vibrant-blue' },
            { color: 'green', name: 'Vibrant Green', class: 'bg-vibrant-green' },
            { color: 'yellow', name: 'Golden Yellow', class: 'bg-vibrant-yellow' },
            { color: 'red', name: 'Electric Red', class: 'bg-vibrant-red' },
          ].map(({ color, name, class: bgClass }) => (
            <VibrantCard key={color} variant={color as 'orange' | 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'red'} className="p-4 text-center">
              <div className={`w-12 h-12 ${bgClass} rounded-full mx-auto mb-2 animate-float`} />
              <h3 className="font-semibold text-sm">{name}</h3>
              <p className="text-xs text-muted-foreground">{color}</p>
            </VibrantCard>
          ))}
        </div>
      </div>

      {/* Card Variants */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Card Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VibrantCard variant="orange" glow animated>
            <CardHeader>
              <CardTitle className="text-vibrant-orange">Primary Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Electric orange for primary actions and important elements.
              </p>
              <Button className="w-full bg-vibrant-orange hover:bg-vibrant-orange/90 text-black">
                Primary Button
              </Button>
            </CardContent>
          </VibrantCard>

          <VibrantCard variant="purple" glow>
            <CardHeader>
              <CardTitle className="text-vibrant-purple">Secondary Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Deep purple for secondary information and navigation.
              </p>
              <Button variant="outline" className="w-full border-vibrant-purple text-vibrant-purple hover:bg-vibrant-purple/10">
                Secondary Button
              </Button>
            </CardContent>
          </VibrantCard>

          <VibrantCard variant="green" glow>
            <CardHeader>
              <CardTitle className="text-vibrant-green">Success State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vibrant green for success messages and positive feedback.
              </p>
              <Badge className="bg-vibrant-green text-black">Success</Badge>
            </CardContent>
          </VibrantCard>

          <VibrantCard variant="red" glow>
            <CardHeader>
              <CardTitle className="text-vibrant-red">Error Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Electric red for errors and critical warnings.
              </p>
              <Badge variant="destructive" className="bg-vibrant-red">Error</Badge>
            </CardContent>
          </VibrantCard>

          <VibrantCard variant="blue" glow>
            <CardHeader>
              <CardTitle className="text-vibrant-blue">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Electric blue for informational content and links.
              </p>
              <Badge className="bg-vibrant-blue text-white">Info</Badge>
            </CardContent>
          </VibrantCard>

          <VibrantCard variant="yellow" glow>
            <CardHeader>
              <CardTitle className="text-vibrant-yellow">Warning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Golden yellow for warnings and caution messages.
              </p>
              <Badge className="bg-vibrant-yellow text-black">Warning</Badge>
            </CardContent>
          </VibrantCard>
        </div>
      </div>

      {/* Interactive Elements */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Interactive Elements</h2>
        <VibrantCard variant="pink" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="bg-vibrant-orange hover:bg-vibrant-orange/90 text-black font-semibold">
              Orange Primary
            </Button>
            <Button className="bg-vibrant-pink hover:bg-vibrant-pink/90 text-white">
              Pink Action
            </Button>
            <Button className="bg-vibrant-purple hover:bg-vibrant-purple/90 text-white">
              Purple Secondary
            </Button>
            <Button className="bg-vibrant-blue hover:bg-vibrant-blue/90 text-white">
              Blue Info
            </Button>
            <Button className="bg-vibrant-green hover:bg-vibrant-green/90 text-black">
              Green Success
            </Button>
            <Button className="bg-vibrant-yellow hover:bg-vibrant-yellow/90 text-black">
              Yellow Warning
            </Button>
            <Button className="bg-vibrant-red hover:bg-vibrant-red/90 text-white">
              Red Danger
            </Button>
            <Button variant="outline" className="border-vibrant-orange text-vibrant-orange hover:bg-vibrant-orange/10">
              Orange Outline
            </Button>
          </div>
        </VibrantCard>
      </div>

      {/* Status Badges */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Status Indicators</h2>
        <VibrantCard variant="green" className="p-6">
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-vibrant-green text-black animate-pulse">Active</Badge>
            <Badge className="bg-vibrant-orange text-black">Processing</Badge>
            <Badge className="bg-vibrant-yellow text-black">Pending</Badge>
            <Badge className="bg-vibrant-blue text-white">Info</Badge>
            <Badge className="bg-vibrant-purple text-white">Premium</Badge>
            <Badge className="bg-vibrant-pink text-white">Special</Badge>
            <Badge className="bg-vibrant-red text-white animate-fraud-pulse">Critical</Badge>
          </div>
        </VibrantCard>
      </div>
    </div>
  )
}

export { VibrantShowcase }
