import React, { ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Terminal } from '@/components/icons';
import { ErrorReportingService } from '~/services/error/errorReportingService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isImportError: boolean;
}

/**
 * Standard React Error Boundary component.
 * Catches rendering errors, reports them, and displays a fallback UI.
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      isImportError: false 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const isImportError = error.message && (
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed")
    );
    return { hasError: true, error, isImportError: !!isImportError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to centralized error service
    ErrorReportingService.captureError(error, errorInfo);

    // Auto-reload on dynamic import failures (assets out of sync after deployment)
    // Only attempt to reload once to avoid infinite loops
    if (this.state.isImportError) {
      const lastReload = sessionStorage.getItem('last-error-reload');
      const now = Date.now();
      
      // If we haven't reloaded in the last 10 seconds, try it
      if (!lastReload || (now - parseInt(lastReload)) > 10000) {
        sessionStorage.setItem('last-error-reload', now.toString());
        console.warn('Dynamic import failure detected. Reloading application to fetch latest assets...');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isImportError = this.state.isImportError;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4 bg-background text-foreground w-full">
          <Card className="max-w-xl w-full p-8 text-center shadow-lg border-border/50 bg-card">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Terminal className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-black mb-2">
              {isImportError ? 'New Version Available' : 'Operation Halted'}
            </h1>
            <p className="text-muted-foreground mb-6 font-medium">
              {isImportError 
                ? 'A newer version of the application has been deployed. Please update to continue.' 
                : 'The system encountered an unexpected exception in this module.'}
            </p>
            
            {this.state.error && (
              <Alert variant="destructive" className="mb-6 text-left border-destructive/20 bg-destructive/5">
                <AlertTitle className="font-bold text-xs uppercase tracking-widest opacity-70">Diagnostic Payload</AlertTitle>
                <AlertDescription className="mt-2 font-mono text-[10px] break-all leading-tight opacity-90">
                  {this.state.error.message}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-3 justify-center">
              {isImportError ? (
                <Button 
                  className="font-bold px-8"
                  onClick={() => window.location.reload()}
                >
                  Update Application
                </Button>
              ) : (
                <>
                  <Button 
                    className="font-bold"
                    onClick={() => this.setState({ hasError: false, error: undefined, isImportError: false })}
                  >
                    Reset Component
                  </Button>
                  <Button 
                    variant="outline" 
                    className="font-bold"
                    onClick={() => window.location.reload()}
                  >
                    Reload Application
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
