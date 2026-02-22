import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../lib/utils';

interface MotionCardProps extends HTMLMotionProps<'div'> {
  variant?: 'glass' | 'glass-dark' | 'solid' | 'outlined';
  hoverEffect?: boolean;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, variant = 'solid', hoverEffect = true, children, ...props }, ref) => {
    
    const variants = {
      glass: 'glass',
      'glass-dark': 'glass-dark text-white',
      solid: 'bg-card text-card-foreground shadow-sm border',
      outlined: 'bg-transparent border shadow-none'
    };

    const hoverClasses = hoverEffect ? 'hover-lift transition-all duration-300' : '';

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'rounded-xl p-6',
          variants[variant],
          hoverClasses,
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';
