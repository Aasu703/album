"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Client-side error boundary that avoids blank screens on runtime exceptions. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled UI error", { error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="max-w-md space-y-3 rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900 dark:bg-gray-900">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Please refresh and try again.</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
