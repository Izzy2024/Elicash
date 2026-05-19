import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="bg-red-50 p-4 rounded-full text-red-500">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Algo salió mal</h2>
          <p className="text-slate-500 text-sm max-w-xs">
            Ha ocurrido un error inesperado en la aplicación. Por favor, intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 active:scale-95 transition-all"
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
