export type WrapType = 'full_wrap' | 'partial_wrap' | 'tablet_only' | 'combination';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DriverCampaignStatus = 'assigned' | 'install_scheduled' | 'wrapped' | 'completed' | 'removed';
export type PayrollStatus = 'pending' | 'approved' | 'paid';
export type UserRole = 'admin' | 'viewer';

export interface Client {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  client_id: string | null;
  cities: string[];
  vehicle_count_target: number;
  wrap_type: WrapType;
  start_date: string;
  end_date: string;
  driver_pay_monthly: number;
  budget: number | null;
  impressions_per_km: number;
  creative_wrap_url: string | null;
  creative_tablet_url: string | null;
  internal_notes: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  client?: Client;
  driver_campaigns?: DriverCampaign[];
}

export interface Driver {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_photo_url: string | null;
  gig_platforms: string[];
  status: DriverStatus;
  rejection_reason: string | null;
  total_km_lifetime: number;
  created_at: string;
  updated_at: string;
}

export interface DriverCampaign {
  id: string;
  driver_id: string;
  campaign_id: string;
  status: DriverCampaignStatus;
  assigned_at: string;
  completed_at: string | null;
  driver?: Driver;
  campaign?: Campaign;
}

export interface GpsSession {
  id: string;
  driver_id: string;
  campaign_id: string;
  started_at: string;
  ended_at: string | null;
  total_km: number;
  total_points: number;
  created_at: string;
}

export interface GpsPoint {
  id: string;
  session_id: string;
  driver_id: string;
  campaign_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  accuracy_m: number;
  recorded_at: string;
}

export interface PayrollEntry {
  id: string;
  driver_id: string;
  campaign_id: string;
  period_start: string;
  period_end: string;
  days_active: number;
  amount_cad: number;
  override_amount_cad: number | null;
  override_reason: string | null;
  status: PayrollStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  driver?: Driver;
  campaign?: Campaign;
}

export interface CampaignReport {
  id: string;
  campaign_id: string;
  generated_at: string;
  generated_by: string | null;
  storage_path: string | null;
  file_name: string | null;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export const CANADIAN_CITIES = [
  'Calgary, AB',
  'Edmonton, AB',
  'Vancouver, BC',
  'Victoria, BC',
  'Toronto, ON',
  'Ottawa, ON',
  'Mississauga, ON',
  'Brampton, ON',
  'Hamilton, ON',
  'Winnipeg, MB',
  'Halifax, NS',
  'Saskatoon, SK',
  'Regina, SK',
  'Québec City, QC',
  'Montréal, QC',
  'St. John\'s, NL',
  'London, ON',
  'Kitchener, ON',
  'Windsor, ON',
  'Kelowna, BC',
];

export const WRAP_TYPE_LABELS: Record<WrapType, string> = {
  full_wrap: 'Full Wrap',
  partial_wrap: 'Partial Wrap',
  tablet_only: 'Tablet Only',
  combination: 'Combination',
};

export const GIG_PLATFORMS = ['Uber', 'DoorDash', 'Skip the Dishes', 'Lyft', 'Instacart'];
