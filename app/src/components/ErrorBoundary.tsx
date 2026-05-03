import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 animate-fade-in-up p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center">
            <h3 className="text-body font-medium text-slate-200 mb-1">页面渲染出错</h3>
            <p className="text-caption text-slate-500 max-w-sm">
              {this.state.error?.message || '组件发生未知错误，请尝试刷新页面'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            重试
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary, ErrorBoundary as PageErrorBoundary };
