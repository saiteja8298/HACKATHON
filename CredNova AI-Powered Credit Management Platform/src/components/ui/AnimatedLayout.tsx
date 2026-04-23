import React from 'react'
import { motion } from 'framer-motion'

interface AnimatedLayoutProps {
  children: React.ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale' | 'rotate'
}

const AnimatedLayout: React.FC<AnimatedLayoutProps> = ({ 
  children, 
  className = '',
  variant = 'fade'
}) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { x: -100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 100, opacity: 0 }
    },
    scale: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 }
    },
    rotate: {
      initial: { rotate: -5, opacity: 0 },
      animate: { rotate: 0, opacity: 1 },
      exit: { rotate: 5, opacity: 0 }
    }
  }

  return (
    <motion.div
      className={className}
      variants={variants[variant]}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedLayout
