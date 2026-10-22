import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-ink-800">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
