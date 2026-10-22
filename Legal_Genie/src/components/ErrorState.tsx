import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({ title, message, onRetry, className = '' }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50 text-error-400">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h3 className="font-display text-lg font-bold text-ink-800">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{message}</p>
      {onRetry && (
        <div className="mt-6">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
