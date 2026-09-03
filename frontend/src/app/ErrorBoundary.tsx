import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("StudyPilot interface failed", error, info); }
  render() {
    if (this.state.failed) {
      return <main className="fatal-state" role="alert"><h1>StudyPilot could not render</h1><p>Reload to restore the planning workspace.</p><button type="button" onClick={() => window.location.reload()}>Reload workspace</button></main>;
    }
    return this.props.children;
  }
}
