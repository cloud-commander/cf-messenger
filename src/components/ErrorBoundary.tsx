import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#3a6ea5] p-4 text-white font-sans">
          <div className="bg-white text-black p-6 rounded shadow-lg max-w-md w-full">
            <h1 className="text-xl font-bold mb-4 text-red-600">
              Application Error
            </h1>
            <p className="mb-4">
              Something went wrong and the application could not be rendered.
            </p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mb-4 border border-gray-300">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="bg-[#0078d7] text-white px-4 py-2 rounded hover:bg-[#005a9e] transition-colors"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
