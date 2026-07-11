'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

export type AnimatedCardVariant = 'fadeUp' | 'slideInRight' | 'fadeIn';

const VARIANTS: Record<AnimatedCardVariant, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

export interface AnimatedCardProps {
  /** Stagger delay in milliseconds (default 0). */
  delay?: number;
  className?: string;
  children: ReactNode;
  /** Motion preset. Defaults to `fadeUp`. */
  variant?: AnimatedCardVariant;
  /** Animation duration in milliseconds (default 400). */
  duration?: number;
}

/**
 * Shared framer-motion wrapper. Animates in once on mount.
 * `fadeUp` is the default; `slideInRight` is used for slide-in detail panels.
 */
export default function AnimatedCard({
  delay = 0,
  className,
  children,
  variant = 'fadeUp',
  duration = 400,
}: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      variants={VARIANTS[variant]}
      initial="hidden"
      animate="visible"
      transition={{ duration: duration / 1000, delay: delay / 1000, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
