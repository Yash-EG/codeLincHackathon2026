import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Keeps the dashboard usable if WebGL is unavailable or the 3D chunk fails to load. */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D scene failed to render', error, info.componentStack)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
