import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { CampaignStatus, DriverStatus, DriverCampaignStatus, PayrollStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, fmt = 'MMM d, yyyy') {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    try {
      return format(new Date(dateStr), fmt);
    } catch {
      return dateStr;
    }
  }
}

export function formatCurrency(amount: number | null | undefined, currency = 'CAD') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-CA').format(Math.round(n));
}

export function formatKm(km: number | null | undefined) {
  if (km == null) return '—';
  return `${formatNumber(km)} km`;
}

export function campaignDurationDays(startDate: string, endDate: string) {
  try {
    return differenceInDays(parseISO(endDate), parseISO(startDate));
  } catch {
    return 0;
  }
}

export function estimatedImpressions(totalKm: number, impressionsPerKm: number) {
  return Math.round(totalKm * impressionsPerKm);
}

export function campaignStatusConfig(status: CampaignStatus) {
  const configs = {
    draft: { label: 'Draft', className: 'badge-gray' },
    active: { label: 'Active', className: 'badge-green' },
    paused: { label: 'Paused', className: 'badge-yellow' },
    completed: { label: 'Completed', className: 'badge-blue' },
  };
  return configs[status] ?? configs.draft;
}

export function driverStatusConfig(status: DriverStatus) {
  const configs = {
    pending: { label: 'Pending', className: 'badge-yellow' },
    approved: { label: 'Approved', className: 'badge-green' },
    rejected: { label: 'Rejected', className: 'badge-red' },
    suspended: { label: 'Suspended', className: 'badge-gray' },
  };
  return configs[status] ?? configs.pending;
}

export function driverCampaignStatusConfig(status: DriverCampaignStatus) {
  const configs = {
    assigned: { label: 'Assigned', className: 'badge-blue' },
    install_scheduled: { label: 'Install Scheduled', className: 'badge-yellow' },
    wrapped: { label: 'Wrapped', className: 'badge-green' },
    completed: { label: 'Completed', className: 'badge-gray' },
    removed: { label: 'Removed', className: 'badge-red' },
  };
  return configs[status] ?? configs.assigned;
}

export function payrollStatusConfig(status: PayrollStatus) {
  const configs = {
    pending: { label: 'Pending', className: 'badge-yellow' },
    approved: { label: 'Approved', className: 'badge-blue' },
    paid: { label: 'Paid', className: 'badge-green' },
  };
  return configs[status] ?? configs.pending;
}

export function truncate(str: string, maxLen: number) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function generateCsvBlob(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0] ?? {});
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val == null ? '' : String(val);
        return str.includes(',') ? `"${str}"` : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
