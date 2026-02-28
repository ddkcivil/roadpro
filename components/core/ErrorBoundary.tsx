import React, { ReactNode } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Terminal } from 'lucide-react';


// NOTE: This is a refactored version of the ErrorBoundary component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

class ErrorBoundary extends React.Component<Props, State> {
  public readonly props: Props;
  public state: State;
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a dynamic import failure (common after new deployments)
    if (error.message && (
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed")
    )) {
      console.warn("Detected dynamic import failure. Attempting to reload page to get latest assets...");
      window.location.reload();
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Also log to a more visible place
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
          <Card className="max-w-xl w-full p-6 text-center">
            <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">An error occurred while rendering the application.</p>
            {this.state.error && (
              <Alert variant="destructive" className="mb-4 text-left">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error: {this.state.error.message}</AlertTitle>
                {this.state.error.stack && (
                  <AlertDescription>
                    <pre className="mt-2 w-full whitespace-pre-wrap word-break-all text-xs">
                      {this.state.error.stack}
                    </pre>
                  </AlertDescription>
                )}
              </Alert>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={() => (this as React.Component<Props, State>).setState({ hasError: false, error: undefined })}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
