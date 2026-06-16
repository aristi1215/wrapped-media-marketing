import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, subtext, icon: Icon, iconColor = 'text-brand-orange', trend, className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-2', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl bg-orange-50', iconColor === 'text-brand-orange' && 'bg-orange-50')}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </div>
  );
}
