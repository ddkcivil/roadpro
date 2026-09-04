import React from 'react';
import { motion, easeOut } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * A wrapper component that provides smooth fade and slide transitions
 * when switching between different views/tabs.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: easeOut }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
};
