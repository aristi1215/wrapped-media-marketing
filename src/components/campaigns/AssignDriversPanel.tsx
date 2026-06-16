import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserPlus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Campaign, Driver } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  assignedDriverIds: string[];
  onSuccess: () => void;
}

export function AssignDriversPanel({ isOpen, onClose, campaign, assignedDriverIds, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['available-drivers', campaign.id, campaign.cities],
    queryFn: async () => {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'approved')
        .order('name');
      return (data ?? []) as Driver[];
    },
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async (driverIds: string[]) => {
      const records = driverIds.map(driver_id => ({
        driver_id,
        campaign_id: campaign.id,
        status: 'assigned',
      }));
      const { error } = await supabase.from('driver_campaigns').insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selected.length} driver(s) assigned`);
      setSelected([]);
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = drivers.filter(d => {
    const notAssigned = !assignedDriverIds.includes(d.id);
    const inCity = campaign.cities.some(city => d.city === city);
    const matchesSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      (d.vehicle_make ?? '').toLowerCase().includes(search.toLowerCase());
    return notAssigned && matchesSearch && (inCity || campaign.cities.length === 0);
  });

  const allAvailable = drivers.filter(d => !assignedDriverIds.includes(d.id)).filter(d => {
    return !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase());
  });

  const displayDrivers = search ? allAvailable : available;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Drivers"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => assignMutation.mutate(selected)}
            disabled={selected.length === 0}
            loading={assignMutation.isPending}
          >
            <UserPlus className="w-4 h-4" />
            Assign {selected.length > 0 ? `${selected.length} Driver${selected.length > 1 ? 's' : ''}` : 'Drivers'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
          <UserPlus className="w-4 h-4 flex-shrink-0" />
          Showing approved drivers in {campaign.cities.join(', ')}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search drivers…"
            className="form-input pl-9"
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading drivers…</div>
          ) : displayDrivers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No available drivers in these cities</div>
          ) : (
            displayDrivers.map(driver => (
              <label
                key={driver.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selected.includes(driver.id)
                    ? 'border-brand-orange bg-orange-50'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(driver.id)}
                  onChange={e => {
                    if (e.target.checked) setSelected(prev => [...prev, driver.id]);
                    else setSelected(prev => prev.filter(id => id !== driver.id));
                  }}
                  className="accent-brand-orange w-4 h-4"
                />
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-semibold text-slate-600">
                  {driver.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{driver.name}</p>
                  <p className="text-xs text-slate-400">{driver.city} · {[driver.vehicle_year, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ')}</p>
                </div>
                <Badge variant="green">Approved</Badge>
              </label>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
