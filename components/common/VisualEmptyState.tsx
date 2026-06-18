import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '~/lib/utils';

interface VisualEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
}

export const VisualEmptyState: React.FC<VisualEmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  className,
  action 
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-500",
      className
    )}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/5 rounded-full scale-150 blur-2xl" />
        <div className="relative w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary rotate-3 hover:rotate-0 transition-transform duration-500">
          <Icon size={40} />
        </div>
      </div>
      <h3 className="text-xl font-black tracking-tight text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};
