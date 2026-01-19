import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, WifiOff } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  isOffline: boolean;
}

interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error: Error; retry: () => void; errorId: string }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
}

class ErrorBoundary extends Component<React.PropsWithChildren<ErrorBoundaryProps>, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isOffline: !navigator.onLine
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}`;

    console.error('Error caught by boundary:', error, errorInfo);
    console.error('Error ID:', errorId);

    // Report error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorId);
    }

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    this.setState({ errorInfo });
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    // Clear any pending timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  reportError = async (error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    try {
      // In a real app, you would send this to an error reporting service
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };

      // For now, just log to console
      console.error('Error report:', errorReport);

      // You could send to services like Sentry, LogRocket, etc.
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  categorizeError = (error: Error): {
    type: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown';
    severity: 'low' | 'medium' | 'high';
    userMessage: string;
  } => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'network',
        severity: 'medium',
        userMessage: 'Network connection issue. Please check your internet connection.'
      };
    }

    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('auth')) {
      return {
        type: 'auth',
        severity: 'high',
        userMessage: 'Authentication issue. Please sign in again.'
      };
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        type: 'validation',
        severity: 'low',
        userMessage: 'Please check your input and try again.'
      };
    }

    if (message.includes('500') || message.includes('server') || message.includes('internal')) {
      return {
        type: 'server',
        severity: 'high',
        userMessage: 'Server error occurred. Our team has been notified.'
      };
    }

    return {
      type: 'unknown',
      severity: 'medium',
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            retry={this.handleRetry}
            errorId={this.state.errorId!}
          />
        );
      }

      // Default error UI
      const errorCategory = this.state.error ? this.categorizeError(this.state.error) : null;

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center max-w-md">
            <div className="flex justify-center mb-4">
              {this.state.isOffline ? (
                <WifiOff size={48} className="text-orange-500" />
              ) : (
                <AlertTriangle size={48} className="text-rose-500" />
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {this.state.isOffline ? 'You\'re Offline' : 'Something went wrong'}
            </h2>

            <p className="text-slate-500 mb-4">
              {errorCategory?.userMessage || 'We encountered an unexpected error.'}
            </p>

            {this.state.isOffline && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800">
                  Some features may not work while offline. Please check your connection.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </button>

              <button
                onClick={this.handleRefresh}
                className="bg-slate-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-slate-100 hover:bg-slate-700 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Go Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-slate-400 flex items-center gap-2">
                  <Bug size={14} />
                  Error details (Dev Mode)
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong className="text-xs text-slate-500">Error ID:</strong>
                    <code className="text-xs text-rose-600 block">{this.state.errorId}</code>
                  </div>
                  <div>
                    <strong className="text-xs text-slate-500">Message:</strong>
                    <pre className="text-xs text-rose-600 mt-1 whitespace-pre-wrap">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong className="text-xs text-slate-500">Stack:</strong>
                      <pre className="text-xs text-rose-600 mt-1 whitespace-pre-wrap max-h-32 overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div>
                      <strong className="text-xs text-slate-500">Component Stack:</strong>
                      <pre className="text-xs text-rose-600 mt-1 whitespace-pre-wrap max-h-32 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;