import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit, Trash2, Users, Map, DollarSign, FileText, UserPlus, Car
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { CampaignFormModal } from '@/components/campaigns/CampaignFormModal';
import { AssignDriversPanel } from '@/components/campaigns/AssignDriversPanel';
import { ReportModal } from '@/components/campaigns/ReportModal';
import {
  formatDate, campaignStatusConfig, formatCurrency, formatKm,
  driverCampaignStatusConfig, estimatedImpressions,
} from '@/lib/utils';
import type { Campaign, Driver, DriverCampaign } from '@/types';
import { WRAP_TYPE_LABELS } from '@/types';
import toast from 'react-hot-toast';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'payroll'>('overview');

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(*), driver_campaigns(*, driver:drivers(*))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Campaign;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['campaign-sessions', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gps_sessions')
        .select('*')
        .eq('campaign_id', id!);
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign deleted');
      navigate('/campaigns');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const removeDriverMutation = useMutation({
    mutationFn: async (dcId: string) => {
      const { error } = await supabase
        .from('driver_campaigns')
        .update({ status: 'removed' })
        .eq('id', dcId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success('Driver removed');
    },
  });

  const updateDriverStatusMutation = useMutation({
    mutationFn: async ({ dcId, status }: { dcId: string; status: string }) => {
      const { error } = await supabase
        .from('driver_campaigns')
        .update({ status })
        .eq('id', dcId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) return <div className="text-center py-20 text-slate-400">Campaign not found</div>;

  const driverCampaigns = (campaign.driver_campaigns as DriverCampaign[] ?? []);
  const activeDrivers = driverCampaigns.filter(dc => dc.status !== 'removed');
  const totalKm = sessions.reduce((sum, s) => sum + (Number(s.total_km) || 0), 0);
  const totalImpressions = estimatedImpressions(totalKm, campaign.impressions_per_km);
  const statusCfg = campaignStatusConfig(campaign.status);

  const driverColumns = [
    {
      key: 'driver',
      header: 'Driver',
      render: (dc: DriverCampaign) => (
        <div>
          <p className="font-medium text-slate-900">{(dc.driver as Driver)?.name}</p>
          <p className="text-xs text-slate-400">{(dc.driver as Driver)?.city}</p>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (dc: DriverCampaign) => {
        const d = dc.driver as Driver;
        return <span className="text-sm">{[d?.vehicle_year, d?.vehicle_make, d?.vehicle_model].filter(Boolean).join(' ') || '—'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (dc: DriverCampaign) => {
        const cfg = driverCampaignStatusConfig(dc.status);
        return (
          <select
            value={dc.status}
            onChange={e => updateDriverStatusMutation.mutate({ dcId: dc.id, status: e.target.value })}
            onClick={e => e.stopPropagation()}
            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${cfg.className}`}
          >
            {['assigned', 'install_scheduled', 'wrapped', 'completed', 'removed'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'assigned_at',
      header: 'Assigned',
      render: (dc: DriverCampaign) => <span className="text-sm">{formatDate(dc.assigned_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (dc: DriverCampaign) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => { e.stopPropagation(); removeDriverMutation.mutate(dc.id); }}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/campaigns')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
              <span className={statusCfg.className}>{statusCfg.label}</span>
            </div>
            <p className="text-slate-500 text-sm">
              {(campaign.client as any)?.company_name} · {campaign.cities.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(campaign.status === 'active' || campaign.status === 'completed') && (
              <Button variant="secondary" onClick={() => setShowReport(true)}>
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowEdit(true)}>
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Drivers Assigned', value: `${activeDrivers.length}/${campaign.vehicle_count_target}`, icon: Users, color: 'text-blue-500' },
          { label: 'Km Driven', value: formatKm(totalKm), icon: Car, color: 'text-emerald-500' },
          { label: 'Est. Impressions', value: Intl.NumberFormat('en-CA').format(totalImpressions), icon: Map, color: 'text-purple-500' },
          { label: 'Campaign Budget', value: formatCurrency(campaign.budget), icon: DollarSign, color: 'text-brand-orange' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-50 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-lg font-bold text-slate-900">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          {(['overview', 'drivers', 'payroll'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-brand-orange border-brand-orange'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="section-title mb-4">Campaign Details</h2>
            <dl className="space-y-3">
              {[
                { label: 'Client', value: (campaign.client as any)?.company_name },
                { label: 'Wrap Type', value: WRAP_TYPE_LABELS[campaign.wrap_type] },
                { label: 'Start Date', value: formatDate(campaign.start_date) },
                { label: 'End Date', value: formatDate(campaign.end_date) },
                { label: 'Driver Monthly Pay', value: formatCurrency(campaign.driver_pay_monthly) },
                { label: 'Impressions/Km', value: campaign.impressions_per_km.toLocaleString() },
                { label: 'Cities', value: campaign.cities.join(', ') },
                { label: 'Status', value: <span className={statusCfg.className}>{statusCfg.label}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-900 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {campaign.internal_notes && (
            <div className="card p-6">
              <h2 className="section-title mb-4">Internal Notes</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{campaign.internal_notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Assigned Drivers ({activeDrivers.length})</h2>
            <Button onClick={() => setShowAssign(true)}>
              <UserPlus className="w-4 h-4" />
              Assign Drivers
            </Button>
          </div>
          <div className="card overflow-hidden">
            <Table
              columns={driverColumns}
              data={activeDrivers}
              keyExtractor={dc => dc.id}
              emptyMessage="No drivers assigned yet"
            />
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <PayrollTab campaignId={id!} campaign={campaign} driverCampaigns={activeDrivers} sessions={sessions} />
      )}

      {/* Modals */}
      <CampaignFormModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        campaign={campaign}
        onSuccess={() => {
          setShowEdit(false);
          queryClient.invalidateQueries({ queryKey: ['campaign', id] });
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        }}
      />

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Campaign"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending}>
              Delete Campaign
            </Button>
          </>
        }
      >
        <p className="text-slate-600">Are you sure you want to delete <strong>{campaign.name}</strong>? This action cannot be undone.</p>
      </Modal>

      <AssignDriversPanel
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        campaign={campaign}
        assignedDriverIds={activeDrivers.map(dc => (dc.driver as Driver)?.id ?? dc.driver_id)}
        onSuccess={() => {
          setShowAssign(false);
          queryClient.invalidateQueries({ queryKey: ['campaign', id] });
        }}
      />

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        campaign={campaign}
        sessions={sessions}
        driverCampaigns={activeDrivers}
      />
    </div>
  );
}

function PayrollTab({ campaignId, campaign, driverCampaigns, sessions }: {
  campaignId: string;
  campaign: Campaign;
  driverCampaigns: DriverCampaign[];
  sessions: any[];
}) {
  const { generateCsvBlob, formatCurrency } = {
    generateCsvBlob: (rows: any[], name: string) => {
      const headers = Object.keys(rows[0] ?? {});
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },
    formatCurrency: (n: number) => `$${n.toFixed(2)} CAD`,
  };

  const rows = driverCampaigns.map(dc => {
    const driver = dc.driver as Driver;
    const driverSessions = sessions.filter(s => s.driver_id === dc.driver_id);
    const daysActive = new Set(driverSessions.map((s: any) => s.started_at?.split('T')[0])).size;
    const daysInMonth = 30;
    const payout = Number((campaign.driver_pay_monthly * (daysActive / daysInMonth)).toFixed(2));
    return {
      driver_name: driver?.name ?? '—',
      email: driver?.email ?? '—',
      city: driver?.city ?? '—',
      days_active: daysActive,
      monthly_rate: campaign.driver_pay_monthly,
      calculated_payout: payout,
      status: 'pending',
    };
  });

  const total = rows.reduce((sum, r) => sum + r.calculated_payout, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Payroll Summary</h2>
          <p className="text-sm text-slate-500 mt-1">Monthly rate: {formatCurrency(campaign.driver_pay_monthly)} per driver</p>
        </div>
        <Button variant="secondary" onClick={() => generateCsvBlob(rows, `payroll_${campaign.name.replace(/\s+/g, '_')}.csv`)}>
          Export CSV
        </Button>
      </div>

      <div className="card overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr>
              {['Driver', 'City', 'Days Active', 'Monthly Rate', 'Calculated Payout', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No drivers assigned</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{row.driver_name}</td>
                <td className="px-4 py-3 text-slate-500">{row.city}</td>
                <td className="px-4 py-3">{row.days_active}</td>
                <td className="px-4 py-3">{formatCurrency(row.monthly_rate)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(row.calculated_payout)}</td>
                <td className="px-4 py-3"><span className="badge-yellow">Pending</span></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-semibold text-slate-700 text-right">Total Payout:</td>
                <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
