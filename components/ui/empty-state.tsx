import React from 'react';
import { LucideIcon, Database } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Database,
  title,
  description,
  actionLabel,
  onAction,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 ${className}`}>
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-primary opacity-60" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
