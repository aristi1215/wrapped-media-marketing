import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { CampaignFormModal } from '@/components/campaigns/CampaignFormModal';
import {
  formatDate, campaignStatusConfig, formatCurrency,
} from '@/lib/utils';
import type { Campaign, CampaignStatus } from '@/types';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export function CampaignsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '');
  const [showCreate, setShowCreate] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(company_name), driver_campaigns(id, status)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const { id, created_at, updated_at, client, driver_campaigns, start_date, end_date, ...rest } = campaign;
      void id; void created_at; void updated_at; void client; void driver_campaigns;
      void start_date; void end_date;
      const { error } = await supabase.from('campaigns').insert({
        ...rest,
        name: `${rest.name} (Copy)`,
        status: 'draft',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign cloned successfully');
    },
    onError: () => toast.error('Failed to clone campaign'),
  });

  const filtered = campaigns.filter(c => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.client as any)?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c: Campaign) => (
        <div>
          <p className="font-medium text-slate-900">{c.name}</p>
          <p className="text-xs text-slate-400">{(c.client as any)?.company_name ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'cities',
      header: 'Cities',
      render: (c: Campaign) => (
        <span className="text-sm">{c.cities.slice(0, 2).join(', ')}{c.cities.length > 2 ? ` +${c.cities.length - 2}` : ''}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: Campaign) => {
        const cfg = campaignStatusConfig(c.status);
        return <span className={cfg.className}>{cfg.label}</span>;
      },
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (c: Campaign) => (
        <span className="text-sm">{formatDate(c.start_date, 'MMM d')} – {formatDate(c.end_date, 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'drivers',
      header: 'Drivers',
      render: (c: Campaign) => {
        const active = (c.driver_campaigns as any[] ?? []).filter((dc: any) => dc.status !== 'removed').length;
        return (
          <span className={`font-medium ${active < c.vehicle_count_target ? 'text-amber-600' : 'text-emerald-600'}`}>
            {active}/{c.vehicle_count_target}
          </span>
        );
      },
    },
    {
      key: 'budget',
      header: 'Budget',
      render: (c: Campaign) => <span>{formatCurrency(c.budget)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (c: Campaign) => (
        <button
          onClick={e => { e.stopPropagation(); cloneMutation.mutate(c); }}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          title="Clone campaign"
        >
          <Copy className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">{campaigns.length} campaigns total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search campaigns or clients…"
          className="w-72"
        />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-brand-orange text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-slate-400">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          loading={isLoading}
          keyExtractor={c => c.id}
          onRowClick={c => navigate(`/campaigns/${c.id}`)}
          emptyMessage="No campaigns found. Create your first campaign."
        />
      </div>

      <CampaignFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        }}
      />
    </div>
  );
}
