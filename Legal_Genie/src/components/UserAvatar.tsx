import { initials as getInitials } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function UserAvatar({ name, size = 'md', className = '' }: UserAvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 font-semibold text-white ${sizes[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
