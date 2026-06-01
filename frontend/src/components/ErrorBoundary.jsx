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
    console.error("UI Render Exception Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#070b0e] flex items-center justify-center p-4 font-mono">
          <div className="max-w-2xl w-full border border-red-500/30 bg-red-950/10 rounded-xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="text-red-500 font-bold tracking-widest text-sm mb-4 uppercase">System Panic: Component Crash</div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              The operational interface encountered a fatal rendering exception. This usually occurs if a scenario configuration payload is corrupted or missing required fields.
            </p>
            <div className="bg-black/50 border border-slate-800 p-4 rounded text-xs text-slate-500 font-sans mb-6 overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded text-xs tracking-wider uppercase transition-colors border border-slate-700"
            >
              Reboot Telemetry Interface
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
