import type { ReactNode } from 'react';

type Tone = 'brand' | 'accent' | 'success' | 'warning' | 'error' | 'neutral' | 'ink';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  accent: 'bg-accent-50 text-accent-700 border-accent-100',
  success: 'bg-success-50 text-success-700 border-success-100',
  warning: 'bg-warning-50 text-warning-700 border-warning-100',
  error: 'bg-error-50 text-error-700 border-error-100',
  neutral: 'bg-ink-50 text-ink-600 border-ink-100',
  ink: 'bg-ink-900 text-white border-ink-900',
};

const dotColors: Record<Tone, string> = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  neutral: 'bg-ink-400',
  ink: 'bg-white',
};

export default function Badge({ children, tone = 'neutral', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />}
      {children}
    </span>
  );
}
