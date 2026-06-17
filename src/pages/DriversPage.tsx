import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, XCircle, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { DriverFormModal } from '@/components/drivers/DriverFormModal';
import { DriverDetailModal } from '@/components/drivers/DriverDetailModal';
import { formatDate, driverStatusConfig, formatKm } from '@/lib/utils';
import type { Driver, DriverStatus } from '@/types';
import toast from 'react-hot-toast';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export function DriversPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [rejectingDriver, setRejectingDriver] = useState<Driver | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Driver[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: DriverStatus; reason?: string }) => {
      const update: any = { status };
      if (reason) update.rejection_reason = reason;
      const { error } = await supabase.from('drivers').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(`Driver ${status}`);
      setRejectingDriver(null);
      setRejectionReason('');
    },
    onError: () => toast.error('Failed to update driver status'),
  });

  const cities = [...new Set(drivers.map(d => d.city).filter(Boolean) as string[])].sort();

  const filtered = drivers.filter(d => {
    const matchSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      (d.vehicle_make ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    const matchCity = !cityFilter || d.city === cityFilter;
    return matchSearch && matchStatus && matchCity;
  });

  const pendingCount = drivers.filter(d => d.status === 'pending').length;

  const columns = [
    {
      key: 'name',
      header: 'Driver',
      render: (d: Driver) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">
            {d.name[0]}
          </div>
          <div>
            <p className="font-medium text-slate-900">{d.name}</p>
            <p className="text-xs text-slate-400">{d.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (d: Driver) => <span className="text-sm">{d.city ?? '—'}</span>,
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (d: Driver) => (
        <div>
          <p className="text-sm">{[d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || '—'}</p>
          <p className="text-xs text-slate-400">{d.vehicle_color}</p>
        </div>
      ),
    },
    {
      key: 'platforms',
      header: 'Platforms',
      render: (d: Driver) => <span className="text-sm">{d.gig_platforms.join(', ') || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d: Driver) => {
        const cfg = driverStatusConfig(d.status);
        return <span className={cfg.className}>{cfg.label}</span>;
      },
    },
    {
      key: 'km',
      header: 'Lifetime Km',
      render: (d: Driver) => <span className="text-sm font-medium">{formatKm(d.total_km_lifetime)}</span>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (d: Driver) => <span className="text-sm text-slate-500">{formatDate(d.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (d: Driver) => {
        if (d.status === 'pending') {
          return (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => updateStatusMutation.mutate({ id: d.id, status: 'approved' })}
                className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 hover:text-emerald-600 transition-colors"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRejectingDriver(d)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-500 transition-colors"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">
            {drivers.length} total drivers
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                {pendingCount} pending review
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Add Driver
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, vehicle…" className="w-72" />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {STATUS_FILTERS.map(opt => (
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
        {cities.length > 0 && (
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="form-select w-44 text-sm"
          >
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <span className="ml-auto text-sm text-slate-400">{filtered.length} results</span>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && !statusFilter && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <span className="text-amber-700 font-bold text-sm">{pendingCount}</span>
          </div>
          <p className="text-sm text-amber-700">
            <strong>{pendingCount} driver{pendingCount > 1 ? 's' : ''}</strong> pending approval.{' '}
            <button
              onClick={() => setStatusFilter('pending')}
              className="underline font-medium hover:text-amber-800"
            >
              Review now
            </button>
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          loading={isLoading}
          keyExtractor={d => d.id}
          onRowClick={d => setSelectedDriver(d)}
          emptyMessage="No drivers found"
        />
      </div>

      {/* Modals */}
      <DriverFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        }}
      />

      <DriverDetailModal
        driver={selectedDriver}
        onClose={() => setSelectedDriver(null)}
        onStatusChange={(status, reason) => {
          if (!selectedDriver) return;
          if (status === 'rejected') {
            setRejectingDriver(selectedDriver);
            setSelectedDriver(null);
          } else {
            updateStatusMutation.mutate({ id: selectedDriver.id, status, reason });
            setSelectedDriver(null);
          }
        }}
      />

      {/* Rejection modal */}
      <Modal
        isOpen={!!rejectingDriver}
        onClose={() => { setRejectingDriver(null); setRejectionReason(''); }}
        title="Reject Driver"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectingDriver(null); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!rejectingDriver) return;
                updateStatusMutation.mutate({ id: rejectingDriver.id, status: 'rejected', reason: rejectionReason });
              }}
              loading={updateStatusMutation.isPending}
            >
              Reject Driver
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting <strong>{rejectingDriver?.name}</strong>. This will be sent to the driver.
          </p>
          <div>
            <label className="form-label">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              className="form-textarea"
              placeholder="e.g. Vehicle does not meet requirements…"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
