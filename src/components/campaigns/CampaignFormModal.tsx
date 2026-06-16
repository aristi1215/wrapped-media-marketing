import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CANADIAN_CITIES, WRAP_TYPE_LABELS } from '@/types';
import type { Campaign } from '@/types';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1, 'Required').max(80),
  client_id: z.string().min(1, 'Client is required'),
  cities: z.array(z.string()).min(1, 'Select at least one city'),
  vehicle_count_target: z.coerce.number().int().min(1),
  wrap_type: z.enum(['full_wrap', 'partial_wrap', 'tablet_only', 'combination']),
  start_date: z.string().min(1, 'Required'),
  end_date: z.string().min(1, 'Required'),
  driver_pay_monthly: z.coerce.number().min(0),
  budget: z.coerce.number().min(0).optional(),
  impressions_per_km: z.coerce.number().min(1).default(1000),
  internal_notes: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign?: Campaign;
}

export function CampaignFormModal({ isOpen, onClose, onSuccess, campaign }: Props) {
  const isEdit = !!campaign;

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-simple'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, company_name').order('company_name');
      return data ?? [];
    },
  });

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      client_id: '',
      cities: [],
      vehicle_count_target: 10,
      wrap_type: 'full_wrap',
      start_date: '',
      end_date: '',
      driver_pay_monthly: 350,
      budget: undefined,
      impressions_per_km: 1000,
      internal_notes: '',
      status: 'draft',
    },
  });

  useEffect(() => {
    if (campaign) {
      reset({
        name: campaign.name,
        client_id: campaign.client_id ?? '',
        cities: campaign.cities,
        vehicle_count_target: campaign.vehicle_count_target,
        wrap_type: campaign.wrap_type,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        driver_pay_monthly: campaign.driver_pay_monthly,
        budget: campaign.budget ?? undefined,
        impressions_per_km: campaign.impressions_per_km,
        internal_notes: campaign.internal_notes ?? '',
        status: campaign.status,
      });
    } else {
      reset({
        name: '',
        client_id: '',
        cities: [],
        vehicle_count_target: 10,
        wrap_type: 'full_wrap',
        start_date: '',
        end_date: '',
        driver_pay_monthly: 350,
        budget: undefined,
        impressions_per_km: 1000,
        internal_notes: '',
        status: 'draft',
      });
    }
  }, [campaign, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, budget: values.budget ?? null, internal_notes: values.internal_notes ?? null };
      if (isEdit) {
        const { error } = await supabase.from('campaigns').update(payload).eq('id', campaign!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campaigns').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Campaign updated' : 'Campaign created');
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCities = watch('cities');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Campaign' : 'Create Campaign'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(v => mutation.mutate(v))} loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </>
      }
    >
      <form className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Campaign Name" {...register('name')} error={errors.name?.message} maxLength={80} />
          </div>

          <div>
            <label className="form-label">Client *</label>
            <select {...register('client_id')} className="form-select">
              <option value="">Select client…</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            {errors.client_id && <p className="mt-1 text-xs text-red-500">{errors.client_id.message}</p>}
          </div>

          <Select
            label="Status"
            {...register('status')}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'completed', label: 'Completed' },
            ]}
            error={errors.status?.message}
          />

          <div>
            <Input label="Start Date" type="date" {...register('start_date')} error={errors.start_date?.message} />
          </div>
          <div>
            <Input label="End Date" type="date" {...register('end_date')} error={errors.end_date?.message} />
          </div>

          <Select
            label="Wrap Type"
            {...register('wrap_type')}
            options={Object.entries(WRAP_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            error={errors.wrap_type?.message}
          />

          <Input
            label="Vehicle Count Target"
            type="number"
            min={1}
            {...register('vehicle_count_target')}
            error={errors.vehicle_count_target?.message}
          />

          <Input
            label="Monthly Driver Pay (CAD)"
            type="number"
            min={0}
            step={50}
            {...register('driver_pay_monthly')}
            error={errors.driver_pay_monthly?.message}
          />

          <Input
            label="Campaign Budget (CAD)"
            type="number"
            min={0}
            step={1000}
            {...register('budget')}
            error={errors.budget?.message}
          />

          <Input
            label="Impressions per Km"
            type="number"
            min={1}
            {...register('impressions_per_km')}
            hint="Default: 1,000"
            error={errors.impressions_per_km?.message}
          />
        </div>

        {/* Cities multi-select */}
        <div>
          <label className="form-label">Markets (Cities) *</label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
            <Controller
              name="cities"
              control={control}
              render={({ field }) => (
                <>
                  {CANADIAN_CITIES.map(city => (
                    <label key={city} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value.includes(city)}
                        onChange={e => {
                          if (e.target.checked) {
                            field.onChange([...field.value, city]);
                          } else {
                            field.onChange(field.value.filter((c: string) => c !== city));
                          }
                        }}
                        className="accent-brand-orange"
                      />
                      <span className="text-sm text-slate-700">{city}</span>
                    </label>
                  ))}
                </>
              )}
            />
          </div>
          {selectedCities.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">{selectedCities.length} cities selected</p>
          )}
          {errors.cities && <p className="mt-1 text-xs text-red-500">{errors.cities.message}</p>}
        </div>

        {/* Internal notes */}
        <div>
          <label className="form-label">Internal Notes</label>
          <textarea {...register('internal_notes')} rows={3} className="form-textarea" placeholder="Ops notes, not visible to drivers or clients…" />
        </div>
      </form>
    </Modal>
  );
}
