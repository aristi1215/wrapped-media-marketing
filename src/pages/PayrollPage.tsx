import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, CheckCircle, DollarSign, Users, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, payrollStatusConfig, generateCsvBlob } from '@/lib/utils';
import type { Campaign, Driver, PayrollStatus } from '@/types';
import toast from 'react-hot-toast';

interface PayrollRow {
  id: string;
  driver_id: string;
  campaign_id: string;
  driver_name: string;
  driver_email: string;
  driver_city: string;
  campaign_name: string;
  period_start: string;
  period_end: string;
  days_active: number;
  monthly_rate: number;
  amount_cad: number;
  override_amount_cad: number | null;
  status: PayrollStatus;
  approved_by: string | null;
  approved_at: string | null;
}

export function PayrollPage() {
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-payroll'],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id, name, driver_pay_monthly, start_date, end_date')
        .order('name');
      return (data ?? []) as Campaign[];
    },
  });

  const { data: payrollData = [], isLoading, refetch } = useQuery({
    queryKey: ['payroll-data', selectedCampaign],
    queryFn: async (): Promise<PayrollRow[]> => {
      // Get driver-campaign assignments
      let dcQuery = supabase
        .from('driver_campaigns')
        .select('*, driver:drivers(id, name, email, city), campaign:campaigns(id, name, driver_pay_monthly, start_date, end_date)')
        .neq('status', 'removed')
        .order('assigned_at', { ascending: false });

      if (selectedCampaign !== 'all') {
        dcQuery = dcQuery.eq('campaign_id', selectedCampaign);
      }

      const { data: dcs } = await dcQuery;
      if (!dcs) return [];

      // Get sessions to count active days
      const { data: sessions } = await supabase
        .from('gps_sessions')
        .select('driver_id, campaign_id, started_at, total_km');

      const rows: PayrollRow[] = dcs.map((dc: any) => {
        const driver = dc.driver as Driver;
        const campaign = dc.campaign as Campaign;
        const driverSessions = (sessions ?? []).filter(
          s => s.driver_id === dc.driver_id && s.campaign_id === dc.campaign_id
        );
        const daysActive = new Set(driverSessions.map((s: any) => s.started_at?.split('T')[0])).size;
        const daysInMonth = 30;
        const monthlyRate = Number(campaign?.driver_pay_monthly ?? 0);
        const calculated = Math.round(monthlyRate * (daysActive / daysInMonth) * 100) / 100;

        return {
          id: dc.id,
          driver_id: dc.driver_id,
          campaign_id: dc.campaign_id,
          driver_name: driver?.name ?? '—',
          driver_email: driver?.email ?? '—',
          driver_city: driver?.city ?? '—',
          campaign_name: campaign?.name ?? '—',
          period_start: campaign?.start_date ?? '',
          period_end: campaign?.end_date ?? '',
          days_active: daysActive,
          monthly_rate: monthlyRate,
          amount_cad: calculated,
          override_amount_cad: null,
          status: 'pending' as PayrollStatus,
          approved_by: null,
          approved_at: null,
        };
      });

      return rows;
    },
  });

  const filtered = payrollData.filter(r =>
    statusFilter === 'all' || r.status === statusFilter
  );

  const totalPayout = filtered.reduce((sum, r) => sum + (r.override_amount_cad ?? r.amount_cad), 0);
  const pendingCount = filtered.filter(r => r.status === 'pending').length;

  function handleExportCSV() {
    if (filtered.length === 0) return toast.error('No data to export');
    generateCsvBlob(
      filtered.map(r => ({
        driver_name: r.driver_name,
        email: r.driver_email,
        city: r.driver_city,
        campaign: r.campaign_name,
        period_start: r.period_start,
        period_end: r.period_end,
        days_active: r.days_active,
        monthly_rate: r.monthly_rate,
        calculated_payout_cad: r.override_amount_cad ?? r.amount_cad,
        status: r.status,
        bank_info_placeholder: '',
      })),
      `wrapped_media_payroll_${new Date().toISOString().split('T')[0]}.csv`
    );
    toast.success('CSV exported');
  }

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Driver payout calculations across all campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Payout</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPayout)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Driver Count</p>
            <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Pending Approval</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={selectedCampaign}
          onChange={e => setSelectedCampaign(e.target.value)}
          className="form-select text-sm w-60"
        >
          <option value="all">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {['all', 'pending', 'approved', 'paid'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-brand-orange text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr>
              {['Driver', 'Campaign', 'Period', 'Days Active', 'Monthly Rate', 'Payout', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No payroll data. Assign drivers to campaigns to generate payroll.
                </td>
              </tr>
            ) : filtered.map(row => {
              const payout = row.override_amount_cad ?? row.amount_cad;
              const cfg = payrollStatusConfig(row.status);
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.driver_name}</p>
                    <p className="text-xs text-slate-400">{row.driver_city}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{row.campaign_name}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(row.period_start, 'MMM d')} – {formatDate(row.period_end, 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.days_active}</td>
                  <td className="px-4 py-3">{formatCurrency(row.monthly_rate)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(payout)}</td>
                  <td className="px-4 py-3"><span className={cfg.className}>{cfg.label}</span></td>
                  <td className="px-4 py-3">
                    {row.status === 'pending' && (
                      <button
                        onClick={() => toast.success(`Approved payout for ${row.driver_name}`)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 font-semibold text-slate-700 text-right">Total:</td>
                <td className="px-4 py-3 font-bold text-slate-900 text-lg">{formatCurrency(totalPayout)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
