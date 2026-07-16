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
          <div className="max-w-md space-y-3 rounded-2xl border border-hairline bg-surface p-6 text-center shadow-sm">
            <h1 className="font-serif text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted">Please refresh and try again.</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
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
