import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Algo deu errado</h1>
            <p className="text-slate-600 mb-6">
              Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
            </p>
            <pre className="text-xs text-left bg-slate-100 p-4 rounded-lg overflow-auto mb-6 text-red-600">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
            >
              Recarregar Página
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="block w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
            >
              Limpar dados e recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
