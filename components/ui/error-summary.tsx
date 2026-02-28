import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { cn } from '~/lib/utils';

interface ErrorSummaryProps {
  errors: Record<string, string>;
  title?: string;
  className?: string;
  onClear?: () => void;
}

/**
 * A component to display a summary of multiple validation errors.
 */
export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors,
  title = "There were errors with your submission",
  className,
  onClear
}) => {
  const errorEntries = Object.entries(errors);
  
  if (errorEntries.length === 0) return null;

  return (
    <Alert variant="destructive" className={cn("relative", className)} data-testid="error-summary">
      <AlertCircle className="h-4 w-4" />
      {onClear && (
        <button 
          onClick={onClear}
          className="absolute right-2 top-2 p-1 rounded-full hover:bg-destructive/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <AlertTitle className="font-bold">{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside mt-2 space-y-1">
          {errorEntries.map(([field, message]) => (
            <li key={field} className="text-xs">
              <span className="font-semibold capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span> {message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
