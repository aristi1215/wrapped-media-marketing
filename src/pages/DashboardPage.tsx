import { useQuery } from '@tanstack/react-query';
import {
  Megaphone, Users, Map, TrendingUp, Car, CheckCircle2, Clock, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { format, subDays, parseISO } from 'date-fns';
import type { Campaign, Driver } from '@/types';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6'];

function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [campaignsRes, driversRes, sessionsRes, pointsRes] = await Promise.all([
        supabase.from('campaigns').select('*, client:clients(company_name)'),
        supabase.from('drivers').select('*'),
        supabase.from('gps_sessions').select('total_km, started_at, campaign_id'),
        supabase.from('gps_points').select('id', { count: 'exact', head: true }),
      ]);

      const campaigns = (campaignsRes.data ?? []) as Campaign[];
      const drivers = (driversRes.data ?? []) as Driver[];
      const sessions = sessionsRes.data ?? [];
      const pointCount = pointsRes.count ?? 0;

      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      const pendingDrivers = drivers.filter(d => d.status === 'pending');
      const approvedDrivers = drivers.filter(d => d.status === 'approved');
      const totalKm = sessions.reduce((sum, s) => sum + (Number(s.total_km) || 0), 0);
      const totalImpressions = totalKm * 1000;

      // KM per day (last 14 days)
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const day = subDays(new Date(), 13 - i);
        const key = format(day, 'MMM d');
        const km = sessions
          .filter(s => {
            try { return format(parseISO(s.started_at), 'MMM d') === key; } catch { return false; }
          })
          .reduce((sum, s) => sum + (Number(s.total_km) || 0), 0);
        return { date: key, km: Math.round(km) };
      });

      // Campaign status breakdown
      const statusCounts = [
        { name: 'Active', value: campaigns.filter(c => c.status === 'active').length },
        { name: 'Draft', value: campaigns.filter(c => c.status === 'draft').length },
        { name: 'Paused', value: campaigns.filter(c => c.status === 'paused').length },
        { name: 'Completed', value: campaigns.filter(c => c.status === 'completed').length },
      ].filter(d => d.value > 0);

      // Driver status breakdown
      const driverStatus = [
        { name: 'Approved', value: approvedDrivers.length },
        { name: 'Pending', value: pendingDrivers.length },
        { name: 'Rejected', value: drivers.filter(d => d.status === 'rejected').length },
        { name: 'Suspended', value: drivers.filter(d => d.status === 'suspended').length },
      ].filter(d => d.value > 0);

      // Top campaigns by km
      const kmByCampaign: Record<string, { name: string; km: number }> = {};
      for (const s of sessions) {
        if (!s.campaign_id) continue;
        const campaign = campaigns.find(c => c.id === s.campaign_id);
        if (!campaign) continue;
        if (!kmByCampaign[s.campaign_id]) {
          kmByCampaign[s.campaign_id] = { name: campaign.name.slice(0, 20), km: 0 };
        }
        kmByCampaign[s.campaign_id].km += Number(s.total_km) || 0;
      }
      const topCampaigns = Object.values(kmByCampaign)
        .sort((a, b) => b.km - a.km)
        .slice(0, 5)
        .map(c => ({ ...c, km: Math.round(c.km) }));

      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: activeCampaigns.length,
        totalDrivers: drivers.length,
        approvedDrivers: approvedDrivers.length,
        pendingDrivers: pendingDrivers.length,
        totalKm: Math.round(totalKm),
        totalImpressions,
        pointCount,
        last14,
        statusCounts,
        driverStatus,
        topCampaigns,
        recentCampaigns: campaigns.slice(0, 5),
      };
    },
  });
}

export function DashboardPage() {
  const { data, isLoading } = useStats();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of campaigns, drivers, and performance metrics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Campaigns"
          value={isLoading ? '—' : data?.activeCampaigns ?? 0}
          subtext={`${data?.totalCampaigns ?? 0} total campaigns`}
          icon={Megaphone}
          iconColor="text-brand-orange"
          trend={{ value: 50, label: 'YoY growth' }}
        />
        <StatCard
          title="Approved Drivers"
          value={isLoading ? '—' : formatNumber(data?.approvedDrivers ?? 0)}
          subtext={`${data?.pendingDrivers ?? 0} pending review`}
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Total Km Driven"
          value={isLoading ? '—' : formatNumber(data?.totalKm ?? 0)}
          subtext="lifetime across all campaigns"
          icon={Car}
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Est. Impressions"
          value={isLoading ? '—' : formatNumber(Math.round((data?.totalImpressions ?? 0) / 1000) * 1000)}
          subtext="@ 1,000 impressions/km"
          icon={TrendingUp}
          iconColor="text-purple-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* KM driven chart */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Daily Km Driven</h2>
            <span className="text-xs text-slate-400">Last 14 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.last14 ?? []}>
              <defs>
                <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="km" stroke="#F97316" strokeWidth={2} fill="url(#kmGrad)" name="Km" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign status */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Campaign Status</h2>
          {(data?.statusCounts ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data?.statusCounts ?? []}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(data?.statusCounts ?? []).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No campaigns yet</div>
          )}
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Top campaigns */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Top Campaigns by Km</h2>
          {(data?.topCampaigns ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.topCampaigns ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="km" fill="#F97316" radius={[0, 4, 4, 0]} name="Km" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No GPS data yet</div>
          )}
        </div>

        {/* Driver activity summary */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Driver Summary</h2>
          <div className="space-y-4">
            {[
              { label: 'Approved Drivers', value: data?.approvedDrivers ?? 0, icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
              { label: 'Pending Review', value: data?.pendingDrivers ?? 0, icon: Clock, color: 'text-amber-500 bg-amber-50' },
              { label: 'Total GPS Points', value: formatNumber(data?.pointCount ?? 0), icon: Map, color: 'text-blue-500 bg-blue-50' },
              { label: 'Total Km (All Time)', value: `${formatNumber(data?.totalKm ?? 0)} km`, icon: Activity, color: 'text-purple-500 bg-purple-50' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
                <p className="text-lg font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Driver Approvals', value: data?.pendingDrivers ?? 0, icon: Users, href: '/drivers?status=pending', color: 'border-amber-200 bg-amber-50' },
          { label: 'Active Campaigns', value: data?.activeCampaigns ?? 0, icon: Megaphone, href: '/campaigns?status=active', color: 'border-green-200 bg-green-50' },
          { label: 'Total GPS Points', value: formatCurrency(data?.pointCount ?? 0, 'CAD').replace('CA$', '') + ' pts', icon: Map, href: '/map', color: 'border-blue-200 bg-blue-50' },
        ].map(item => (
          <a
            key={item.label}
            href={item.href}
            className={`card p-5 border-2 ${item.color} hover:shadow-md transition-all flex items-center gap-4 group`}
          >
            <item.icon className="w-8 h-8 text-slate-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
