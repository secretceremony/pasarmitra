import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Here you would typically log to Sentry
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl border border-rose-100 text-center space-y-8">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-500">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tighter">System Interruption</h1>
              <p className="text-muted-foreground font-medium">An unexpected error occurred in the marketplace engine. Our engineers have been notified.</p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-muted/50 rounded-2xl text-left text-xs font-mono overflow-auto max-h-40 border border-border">
                {this.state.error?.toString()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => window.location.reload()}
                className="h-14 rounded-2xl bg-[#1B2632] text-white font-black uppercase text-xs tracking-widest flex gap-2"
              >
                <RefreshCw size={16} /> Retry
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="h-14 rounded-2xl border-border font-black uppercase text-xs tracking-widest flex gap-2"
              >
                <Home size={16} /> Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
