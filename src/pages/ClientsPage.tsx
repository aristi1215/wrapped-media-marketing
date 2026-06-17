import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Mail, Phone, Edit, Trash2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Client } from '@/types';
import toast from 'react-hot-toast';

interface ClientWithStats extends Client {
  campaign_count: number;
  total_budget: number;
  last_campaign_date: string | null;
}

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data: clientsData } = await supabase.from('clients').select('*').order('company_name');
      const { data: campaignsData } = await supabase.from('campaigns').select('client_id, budget, start_date, status');

      return (clientsData ?? []).map((c): ClientWithStats => {
        const campaigns = (campaignsData ?? []).filter(camp => camp.client_id === c.id);
        return {
          ...c,
          campaign_count: campaigns.length,
          total_budget: campaigns.reduce((sum, camp) => sum + (Number(camp.budget) || 0), 0),
          last_campaign_date: campaigns.sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.start_date ?? null,
        };
      });
    },
  });

  const { data: clientCampaigns = [] } = useQuery({
    queryKey: ['client-campaigns', selectedClient?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', selectedClient!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedClient,
  });

  const filtered = clients.filter(c =>
    !search ||
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeletingClient(null);
      toast.success('Client deleted');
    },
    onError: () => toast.error('Failed to delete client'),
  });

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} clients</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <div className="card p-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company or contact…" className="w-72" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-slate-100 rounded mb-3 w-3/4" />
              <div className="h-4 bg-slate-100 rounded mb-2 w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-400">No clients found</div>
        ) : filtered.map(client => (
          <div
            key={client.id}
            className="card p-5 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setSelectedClient(client)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{client.company_name}</h3>
                  {client.contact_name && <p className="text-sm text-slate-400">{client.contact_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setEditingClient(client); setShowForm(true); }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeletingClient(client); }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {client.contact_email && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  {client.contact_email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
              <span className="text-slate-500">{client.campaign_count} {client.campaign_count === 1 ? 'campaign' : 'campaigns'}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(client.total_budget)}</span>
            </div>
            {client.last_campaign_date && (
              <p className="text-xs text-slate-400 mt-1">Last campaign: {formatDate(client.last_campaign_date)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Client Detail Side Panel */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedClient(null)} />
          <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{selectedClient.company_name}</h2>
                  <p className="text-sm text-slate-400">{selectedClient.contact_name}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setEditingClient(selectedClient); setShowForm(true); }}>
                <Edit className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Contact info */}
              <div className="space-y-2">
                {selectedClient.contact_email && (
                  <a href={`mailto:${selectedClient.contact_email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand-orange">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {selectedClient.contact_email}
                  </a>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {selectedClient.phone}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-xl font-bold text-slate-900">{selectedClient.campaign_count}</p>
                  <p className="text-xs text-slate-400">Campaigns</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedClient.total_budget)}</p>
                  <p className="text-xs text-slate-400">Total Spend</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-xl font-bold text-slate-900">
                    {selectedClient.last_campaign_date ? formatDate(selectedClient.last_campaign_date, 'MMM yyyy') : '—'}
                  </p>
                  <p className="text-xs text-slate-400">Last Campaign</p>
                </div>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{selectedClient.notes}</p>
                </div>
              )}

              {/* Campaigns */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Campaign History</p>
                {clientCampaigns.length === 0 ? (
                  <p className="text-sm text-slate-400">No campaigns yet</p>
                ) : (
                  <div className="space-y-2">
                    {clientCampaigns.map((c: any) => (
                      <a
                        key={c.id}
                        href={`/campaigns/${c.id}`}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{formatDate(c.start_date)} – {formatDate(c.end_date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge badge-${c.status === 'active' ? 'green' : c.status === 'completed' ? 'blue' : 'gray'}`}>
                            {c.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      <ClientFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingClient(null); }}
        client={editingClient ?? undefined}
        onSuccess={() => {
          setShowForm(false);
          setEditingClient(null);
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }}
      />

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        title="Delete Client"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingClient(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate(deletingClient!.id)} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-slate-600 text-sm">
          Are you sure you want to delete <strong>{deletingClient?.company_name}</strong>? Campaigns linked to this client will have their client reference removed.
        </p>
      </Modal>
    </div>
  );
}

function ClientFormModal({ isOpen, onClose, client, onSuccess }: {
  isOpen: boolean; onClose: () => void; client?: Client; onSuccess: () => void;
}) {
  const isEdit = !!client;
  const [formData, setFormData] = useState({
    company_name: '', contact_name: '', contact_email: '', phone: '', notes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        company_name: client.company_name,
        contact_name: client.contact_name ?? '',
        contact_email: client.contact_email ?? '',
        phone: client.phone ?? '',
        notes: client.notes ?? '',
      });
    } else {
      setFormData({ company_name: '', contact_name: '', contact_email: '', phone: '', notes: '' });
    }
  }, [client, isOpen]);

  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!formData.company_name.trim()) return toast.error('Company name is required');
    setLoading(true);
    try {
      const payload = {
        company_name: formData.company_name,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        phone: formData.phone || null,
        notes: formData.notes || null,
      };
      if (isEdit) {
        await supabase.from('clients').update(payload).eq('id', client!.id);
      } else {
        await supabase.from('clients').insert(payload);
      }
      toast.success(isEdit ? 'Client updated' : 'Client added');
      onSuccess();
    } catch {
      toast.error('Failed to save client');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Client' : 'Add Client'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Save Changes' : 'Add Client'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Company Name *" value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Contact Name" value={formData.contact_name} onChange={e => setFormData(p => ({ ...p, contact_name: e.target.value }))} />
          <Input label="Phone" type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <Input label="Contact Email" type="email" value={formData.contact_email} onChange={e => setFormData(p => ({ ...p, contact_email: e.target.value }))} />
        <div>
          <label className="form-label">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="form-textarea" />
        </div>
      </div>
    </Modal>
  );
}

import { useEffect } from 'react';
