import { Component, ReactNode } from 'react';

interface Props {
  /** Wrapped subtree. Errors thrown during render of these children are caught. */
  children: ReactNode;
  /** Optional override for the fallback UI. Receives the error and a reset fn. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React error boundary. A render error in any descendant unmounts that subtree
 * and renders the fallback instead of crashing the entire SPA. Without this
 * wrapper, an uncaught render error in (say) the BloodBank page would blank
 * the whole shell — sidebar and all — until a hard reload.
 *
 * Logs to Sentry if window.Sentry is present (set up by the index.html shim
 * or whatever observability layer you wire up); otherwise console.error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    const w = window as any;
    if (w.Sentry?.captureException) {
      w.Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
    } else {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-slate-600 max-w-md mb-2">
          An unexpected error happened on this page. The rest of the app is still usable —
          you can go back, refresh, or try again.
        </p>
        {import.meta.env.DEV && (
          <pre className="text-xs text-left text-rose-700 bg-rose-50 p-3 rounded max-w-2xl overflow-auto mb-4">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        )}
        <div className="flex gap-2">
          <button
            onClick={this.reset}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
