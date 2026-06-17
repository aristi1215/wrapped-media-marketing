import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CANADIAN_CITIES, GIG_PLATFORMS } from '@/types';
import type { Driver } from '@/types';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.coerce.number().int().min(2000).max(2030).optional(),
  vehicle_color: z.string().optional(),
  gig_platforms: z.array(z.string()).default([]),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).default('pending'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driver?: Driver;
}

export function DriverFormModal({ isOpen, onClose, onSuccess, driver }: Props) {
  const isEdit = !!driver;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', city: '', vehicle_make: '', vehicle_model: '', vehicle_year: undefined, vehicle_color: '', gig_platforms: [], status: 'pending' },
  });

  useEffect(() => {
    if (driver) {
      reset({
        name: driver.name,
        email: driver.email,
        phone: driver.phone ?? '',
        city: driver.city ?? '',
        vehicle_make: driver.vehicle_make ?? '',
        vehicle_model: driver.vehicle_model ?? '',
        vehicle_year: driver.vehicle_year ?? undefined,
        vehicle_color: driver.vehicle_color ?? '',
        gig_platforms: driver.gig_platforms,
        status: driver.status,
      });
    } else {
      reset({ name: '', email: '', phone: '', city: '', vehicle_make: '', vehicle_model: '', vehicle_year: undefined, vehicle_color: '', gig_platforms: [], status: 'pending' });
    }
  }, [driver, reset, isOpen]);

  const selectedPlatforms = watch('gig_platforms');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) {
        const { error } = await supabase.from('drivers').update(values).eq('id', driver!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('drivers').insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Driver updated' : 'Driver added');
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Driver' : 'Add Driver'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(v => mutation.mutate(v))} loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Add Driver'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Full Name *" {...register('name')} error={errors.name?.message} />
          </div>
          <Input label="Email *" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Phone" type="tel" {...register('phone')} />

          <Select
            label="City *"
            {...register('city')}
            options={CANADIAN_CITIES.map(c => ({ value: c, label: c }))}
            placeholder="Select city…"
            error={errors.city?.message}
          />

          <Select
            label="Status"
            {...register('status')}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Vehicle Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Make" {...register('vehicle_make')} placeholder="e.g. Toyota" />
            <Input label="Model" {...register('vehicle_model')} placeholder="e.g. Corolla" />
            <Input label="Year" type="number" {...register('vehicle_year')} min={2000} max={2030} placeholder="2020" />
            <Input label="Color" {...register('vehicle_color')} placeholder="e.g. White" />
          </div>
        </div>

        <div>
          <label className="form-label">Gig Platforms</label>
          <div className="flex flex-wrap gap-2">
            {GIG_PLATFORMS.map(platform => (
              <label key={platform} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                selectedPlatforms.includes(platform)
                  ? 'border-brand-orange bg-orange-50 text-brand-orange'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={e => {
                    if (e.target.checked) setValue('gig_platforms', [...selectedPlatforms, platform]);
                    else setValue('gig_platforms', selectedPlatforms.filter(p => p !== platform));
                  }}
                />
                {platform}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
