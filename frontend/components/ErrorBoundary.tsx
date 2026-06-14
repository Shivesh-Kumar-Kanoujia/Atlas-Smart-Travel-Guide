// @ts-nocheck
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sand-50 flex items-center justify-center p-6">
          <div className="bg-white border border-sand-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="font-display text-xl font-semibold text-sand-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-sand-500 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sand-500 text-white rounded-xl text-sm font-medium hover:bg-sand-600 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
