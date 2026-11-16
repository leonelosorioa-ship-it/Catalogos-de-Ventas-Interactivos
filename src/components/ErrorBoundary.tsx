import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Ocurrió un error inesperado en la aplicación.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary captured error:', error, errorInfo);
  }

  private formatFriendlyError(raw: string | null): string {
    if (!raw) return 'No pudimos completar la operación solicitada.';
    if (raw.includes('Missing or insufficient permissions') || raw.includes('permission-denied')) {
      return 'Tu sesión no tiene permisos suficientes para completar esta operación en Firestore.';
    }
    if (raw.includes('Quota exceeded')) {
      return 'Se alcanzó el límite diario gratuito de lecturas o escrituras en Firestore. La cuota se restablecerá mañana.';
    }
    return raw.length > 260 ? `${raw.slice(0, 260)}...` : raw;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060B19] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[#0A1124] p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold text-white">
                Se detectó un problema de conexión o permisos
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {this.formatFriendlyError(this.state.errorMessage)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Recargar Leps Commerce</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
