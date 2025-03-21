import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  isOtherUniverses?: boolean;
}

export function PageTransition({ children, isOtherUniverses = false }: PageTransitionProps) {
  const variants = isOtherUniverses ? {
    initial: {
      opacity: 0,
      scale: 0.9,
      filter: 'blur(10px)',
      background: 'rgba(255, 87, 51, 0)',
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      background: 'rgba(255, 87, 51, 1)',
      transition: {
        duration: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
    exit: {
      opacity: 0,
      scale: 1.1,
      filter: 'blur(10px)',
      transition: {
        duration: 0.4,
      },
    },
  } : {
    initial: { 
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}