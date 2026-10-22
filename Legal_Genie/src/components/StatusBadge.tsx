import type { DocStatus } from '@/types';
import Badge from './Badge';

interface StatusBadgeProps {
  status: DocStatus;
}

const config: Record<DocStatus, { tone: 'success' | 'warning' | 'error'; label: string; dot: boolean }> = {
  analysed: { tone: 'success', label: 'Analysed', dot: true },
  processing: { tone: 'warning', label: 'Processing', dot: true },
  failed: { tone: 'error', label: 'Failed', dot: true },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { tone, label, dot } = config[status];
  return <Badge tone={tone} dot={dot}>{label}</Badge>;
}
