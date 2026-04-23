import React from 'react'
import { motion } from 'framer-motion'

interface AnimatedWordProps {
  children: string
  delay: number
  duration: number
  variant: 'default' | 'gradient' | 'glow' | 'float'
}

interface AnimatedTextProps {
  children: string
  delay?: number
  duration?: number
  variant?: 'default' | 'gradient' | 'glow' | 'float'
  className?: string
}

const AnimatedWord: React.FC<AnimatedWordProps> = ({ 
  children, 
  delay, 
  duration, 
  variant 
}) => {
  const variants = {
    default: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    },
    gradient: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 }
    },
    glow: {
      hidden: { opacity: 0, filter: 'blur(10px)' },
      visible: { opacity: 1, filter: 'blur(0px)' }
    },
    float: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: -10 }
    }
  }

  return (
    <motion.span
      variants={variants[variant]}
      initial="hidden"
      animate="visible"
      transition={{
        delay,
        duration,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.span>
  )
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({ 
  children, 
  delay = 0, 
  duration = 0.5, 
  variant = 'default',
  className = ''
}) => {
  const words = children.split(' ')
  
  return (
    <span className={className}>
      {words.map((word, index) => (
        <React.Fragment key={index}>
          <AnimatedWord
            delay={delay + index * 0.1}
            duration={duration}
            variant={variant}
          >
            {word}
          </AnimatedWord>
          {index < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </span>
  )
}

export default AnimatedText
