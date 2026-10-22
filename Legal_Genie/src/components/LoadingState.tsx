interface LoadingStateProps {
  message: string;
  className?: string;
}

export default function LoadingState({ message, className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`}>
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-ink-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
      <p className="mt-4 text-sm font-medium text-ink-500">{message}</p>
    </div>
  );
}
