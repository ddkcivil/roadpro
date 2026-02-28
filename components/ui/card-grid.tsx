import React from 'react';
import { cn } from '~/lib/utils';

interface CardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

/**
 * A responsive grid component for displaying cards.
 * Default is 1 column on mobile, 2 on medium, 3 on large screens.
 */
export const CardGrid: React.FC<CardGridProps> = ({ 
  children, 
  className,
  columns = 3 
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn(
      "grid gap-4",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
};
