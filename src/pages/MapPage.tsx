import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Map, { Source, Layer, Popup, type MapRef } from 'react-map-gl';
import type { CircleLayer, HeatmapLayer } from 'react-map-gl';
import { Layers, Activity, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import type { Campaign } from '@/types';
import { formatDate } from '@/lib/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Calgary city center fallback
const DEFAULT_VIEWPORT = { longitude: -114.0719, latitude: 51.0447, zoom: 11 };

const circleLayer: CircleLayer = {
  id: 'vehicle-dots',
  type: 'circle',
  source: 'vehicles',
  paint: {
    'circle-radius': 8,
    'circle-color': ['get', 'color'],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.9,
  },
};

const heatmapLayer: HeatmapLayer = {
  id: 'gps-heatmap',
  type: 'heatmap',
  source: 'gps-points',
  paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'speed'], 0, 0.5, 120, 1.5],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 15, 2],
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)',
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 25],
    'heatmap-opacity': 0.85,
  },
};

const CITY_COLORS = [
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4',
];

export function MapPage() {
  const [viewMode, setViewMode] = useState<'live' | 'heatmap'>('live');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [popup, setPopup] = useState<{ lng: number; lat: number; data: any } | null>(null);
  const mapRef = useRef<MapRef>(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-simple'],
    queryFn: async () => {
      const { data } = await supabase.from('campaigns').select('id, name, cities, status').order('name');
      return (data ?? []) as Campaign[];
    },
  });

  const { data: gpsPoints = [], isLoading: pointsLoading } = useQuery({
    queryKey: ['gps-points-map', selectedCampaign],
    queryFn: async () => {
      let query = supabase
        .from('gps_points')
        .select('lat, lng, speed_kmh, driver_id, campaign_id, recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(50000);
      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }
      const { data } = await query;
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  const { data: latestPositions = [] } = useQuery({
    queryKey: ['latest-positions', selectedCampaign],
    queryFn: async () => {
      let query = supabase
        .from('gps_points')
        .select('lat, lng, speed_kmh, driver_id, campaign_id, recorded_at')
        .order('recorded_at', { ascending: false });

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data } = await query.limit(200);
      if (!data) return [];

      // Get latest per driver
      const seen = new Set<string>();
      return data.filter(p => {
        if (seen.has(p.driver_id)) return false;
        seen.add(p.driver_id);
        return true;
      });
    },
    refetchInterval: 60000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-map'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('id, name, city').eq('status', 'approved');
      return data ?? [];
    },
  });

  const campaignColorMap: Record<string, string> = {};
  campaigns.forEach((c, i) => {
    campaignColorMap[c.id] = CITY_COLORS[i % CITY_COLORS.length];
  });

  const vehicleGeoJSON = {
    type: 'FeatureCollection' as const,
    features: latestPositions.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(p.lng), Number(p.lat)] },
      properties: {
        color: campaignColorMap[p.campaign_id] ?? '#F97316',
        driver_id: p.driver_id,
        campaign_id: p.campaign_id,
        speed: p.speed_kmh,
        recorded_at: p.recorded_at,
      },
    })),
  };

  const heatmapGeoJSON = {
    type: 'FeatureCollection' as const,
    features: gpsPoints.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(p.lng), Number(p.lat)] },
      properties: { speed: Number(p.speed_kmh) || 0 },
    })),
  };

  const hasMapboxToken = MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('demo_token');

  if (!hasMapboxToken) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Live GPS Map</h1>
          <p className="page-subtitle">Real-time vehicle tracking and heatmap visualization</p>
        </div>

        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Mapbox Token Required</h2>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            To display the live GPS map and heatmap, add your Mapbox public token to the <code className="bg-slate-100 px-1 rounded">.env</code> file:
          </p>
          <pre className="bg-slate-900 text-green-400 text-sm p-4 rounded-xl text-left max-w-md mx-auto">
            VITE_MAPBOX_TOKEN=pk.eyJ1Ijoi...
          </pre>
          <p className="text-xs text-slate-400">
            Get a free token at <a href="https://mapbox.com" target="_blank" rel="noreferrer" className="text-brand-orange underline">mapbox.com</a>
          </p>

          {/* GPS Stats without map */}
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-lg mx-auto">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{latestPositions.length}</p>
              <p className="text-xs text-slate-400">Active Vehicles</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{gpsPoints.length.toLocaleString()}</p>
              <p className="text-xs text-slate-400">GPS Points</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-900">{campaigns.filter(c => c.status === 'active').length}</p>
              <p className="text-xs text-slate-400">Active Campaigns</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Live GPS Map</h1>
          <p className="page-subtitle">
            {latestPositions.length} active vehicles · {gpsPoints.length.toLocaleString()} total GPS points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('live')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'live' ? 'bg-brand-orange text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              Live View
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'heatmap' ? 'bg-brand-orange text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Heatmap
            </button>
          </div>

          <select
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            className="form-select text-sm w-52"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden" style={{ height: 600 }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={DEFAULT_VIEWPORT}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          onClick={e => {
            const features = e.features;
            if (features && features.length > 0) {
              const f = features[0];
              const driver = drivers.find((d: any) => d.id === f.properties?.driver_id);
              setPopup({
                lng: (f.geometry as any).coordinates[0],
                lat: (f.geometry as any).coordinates[1],
                data: { ...f.properties, driverName: driver?.name ?? 'Unknown Driver' },
              });
            }
          }}
          interactiveLayerIds={['vehicle-dots']}
          cursor={viewMode === 'live' ? 'pointer' : 'crosshair'}
        >
          {viewMode === 'live' && (
            <Source id="vehicles" type="geojson" data={vehicleGeoJSON}>
              <Layer {...circleLayer} />
            </Source>
          )}

          {viewMode === 'heatmap' && (
            <Source id="gps-points" type="geojson" data={heatmapGeoJSON}>
              <Layer {...heatmapLayer} />
            </Source>
          )}

          {popup && viewMode === 'live' && (
            <Popup
              longitude={popup.lng}
              latitude={popup.lat}
              anchor="bottom"
              onClose={() => setPopup(null)}
              closeButton={true}
              className="z-50"
            >
              <div className="p-2 min-w-[160px]">
                <p className="font-semibold text-slate-900 text-sm">{popup.data.driverName}</p>
                <p className="text-xs text-slate-500">Speed: {Number(popup.data.speed ?? 0).toFixed(0)} km/h</p>
                <p className="text-xs text-slate-500">Updated: {popup.data.recorded_at ? new Date(popup.data.recorded_at).toLocaleTimeString() : '—'}</p>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Legend */}
      {viewMode === 'live' && campaigns.length > 0 && (
        <div className="card p-4 mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Campaign Legend</p>
          <div className="flex flex-wrap gap-4">
            {campaigns.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }} />
                <span className="text-sm text-slate-700">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'heatmap' && (
        <div className="card p-4 mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Density Legend</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Low</span>
            <div className="h-3 w-48 rounded-full" style={{ background: 'linear-gradient(to right, rgb(103,169,207), rgb(209,229,240), rgb(253,219,199), rgb(239,138,98), rgb(178,24,43))' }} />
            <span className="text-xs text-slate-500">High</span>
          </div>
        </div>
      )}
    </div>
  );
}
