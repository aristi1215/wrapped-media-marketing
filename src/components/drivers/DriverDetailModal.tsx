import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, XCircle, PauseCircle, Car, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { driverStatusConfig, formatDate, formatKm } from '@/lib/utils';
import type { Driver, DriverStatus } from '@/types';

interface Props {
  driver: Driver | null;
  onClose: () => void;
  onStatusChange: (status: DriverStatus, reason?: string) => void;
}

export function DriverDetailModal({ driver, onClose, onStatusChange }: Props) {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['driver-campaigns', driver?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('driver_campaigns')
        .select('*, campaign:campaigns(name, status, start_date, end_date)')
        .eq('driver_id', driver!.id)
        .order('assigned_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!driver,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['driver-sessions', driver?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gps_sessions')
        .select('*')
        .eq('driver_id', driver!.id)
        .order('started_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!driver,
  });

  if (!driver) return null;

  const statusCfg = driverStatusConfig(driver.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] bg-white h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-600">
              {driver.name[0]}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{driver.name}</h2>
              <span className={statusCfg.className}>{statusCfg.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Contact info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</p>
            <p className="text-sm text-slate-700">{driver.email}</p>
            {driver.phone && <p className="text-sm text-slate-700">{driver.phone}</p>}
            {driver.city && (
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                {driver.city}
              </div>
            )}
          </div>

          {/* Vehicle */}
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle</p>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {[driver.vehicle_year, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ') || 'Not specified'}
            </p>
            {driver.vehicle_color && <p className="text-xs text-slate-500">{driver.vehicle_color}</p>}
          </div>

          {/* Platforms */}
          {driver.gig_platforms.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Platforms</p>
              <div className="flex flex-wrap gap-2">
                {driver.gig_platforms.map(p => (
                  <span key={p} className="badge-gray">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-slate-900">{formatKm(driver.total_km_lifetime)}</p>
              <p className="text-xs text-slate-400">Lifetime Km</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
              <p className="text-xs text-slate-400">Campaigns</p>
            </div>
          </div>

          {/* Past campaigns */}
          {campaigns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Campaign History</p>
              <div className="space-y-2">
                {campaigns.map((dc: any) => (
                  <div key={dc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{dc.campaign?.name}</p>
                      <p className="text-xs text-slate-400">{formatDate(dc.assigned_at)}</p>
                    </div>
                    <span className="badge-gray text-xs">{dc.status.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {driver.status === 'pending' && (
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => onStatusChange('rejected')}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button
              className="flex-1"
              onClick={() => onStatusChange('approved')}
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </Button>
          </div>
        )}
        {driver.status === 'approved' && (
          <div className="p-4 border-t border-slate-200">
            <Button
              variant="secondary"
              className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => onStatusChange('suspended')}
            >
              <PauseCircle className="w-4 h-4" />
              Suspend Driver
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
