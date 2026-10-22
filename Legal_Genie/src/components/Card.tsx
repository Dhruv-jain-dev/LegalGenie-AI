import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-ink-100 bg-white shadow-soft ${hover ? 'transition-all duration-300 hover:shadow-card hover:border-ink-200 hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
