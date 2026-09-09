import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors anywhere below it so a bug (or an external service misbehaving,
 * e.g. Firebase returning something unexpected) shows a recoverable message instead of a blank
 * page with no explanation.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in DraftBoard tree:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md space-y-3 p-8 text-center">
          <p className="text-sm font-semibold text-red-400">Something went wrong.</p>
          <p className="text-xs text-slate-400">{this.state.error.message}</p>
          <Button variant="outline" compact onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
