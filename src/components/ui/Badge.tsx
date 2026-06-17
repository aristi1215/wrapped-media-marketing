import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'yellow' | 'blue' | 'red' | 'gray' | 'orange';
  className?: string;
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  const variantClasses = {
    green: 'badge-green',
    yellow: 'badge-yellow',
    blue: 'badge-blue',
    red: 'badge-red',
    gray: 'badge-gray',
    orange: 'badge-orange',
  };

  return (
    <span className={cn('badge', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
