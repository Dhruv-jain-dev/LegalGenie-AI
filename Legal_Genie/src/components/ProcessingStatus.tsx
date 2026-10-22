import { CheckCircle2, Loader2 } from 'lucide-react';

interface ProcessingStatusProps {
  step: number;
  steps: string[];
}

export default function ProcessingStatus({ step, steps }: ProcessingStatusProps) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
      <div className="space-y-4">
        {steps.map((label, i) => {
          const isComplete = i < step;
          const isActive = i === step;
          return (
            <div key={i} className="flex items-center gap-3.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                {isComplete ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100">
                    <CheckCircle2 className="h-5 w-5 text-success-600" />
                  </div>
                ) : isActive ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-100 bg-ink-50">
                    <span className="text-xs font-medium text-ink-300">{i + 1}</span>
                  </div>
                )}
                {i < steps.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-full h-4 w-0.5 -translate-x-1/2 ${
                      isComplete ? 'bg-success-300' : 'bg-ink-100'
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isComplete
                    ? 'text-ink-500'
                    : isActive
                      ? 'text-ink-900'
                      : 'text-ink-300'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
