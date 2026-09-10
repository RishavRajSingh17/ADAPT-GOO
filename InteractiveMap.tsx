import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Activity, DestinationId } from '../types';
import { DESTINATIONS } from '../data/destinations';

interface InteractiveMapProps {
  destination: DestinationId;
  activities: Activity[];
  currentActivityId?: string | null;
  userLocation?: {
    latitude: number;
    longitude: number;
    isSimulated: boolean;
  };
  onSelectActivity?: (activityId: string) => void;
  heightClass?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  destination,
  activities = [],
  currentActivityId,
  userLocation,
  onSelectActivity,
  heightClass = 'h-[400px] lg:h-full'
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const destMeta = DESTINATIONS[destination];
      const map = L.map(mapContainerRef.current, {
        center: destMeta.center,
        zoom: destMeta.zoom,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Voyager tiles for crisp, modern light UI
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Add custom zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Resize observer to handle container changes
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Update center when destination changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const destMeta = DESTINATIONS[destination];
    mapInstanceRef.current.setView(destMeta.center, destMeta.zoom);
  }, [destination]);

  // Update Markers and Polyline Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const latLngs: [number, number][] = [];

    // 1. Add User Location Marker
    if (userLocation) {
      const isSim = userLocation.isSimulated;
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full ${
              isSim ? 'bg-amber-400' : 'bg-teal-400'
            } opacity-50"></span>
            <span class="relative inline-flex h-5 w-5 rounded-full ${
              isSim ? 'bg-amber-500 border-2 border-white' : 'bg-teal-600 border-2 border-white'
            } shadow-md items-center justify-center">
              <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
        .bindPopup(`
          <div class="p-2 text-xs font-sans">
            <p class="font-bold text-slate-900">${isSim ? 'Demo Location (Simulated)' : 'You are here'}</p>
            <p class="text-slate-500 text-[10px] mt-0.5">${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}</p>
            ${isSim ? '<span class="inline-block mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold text-[9px]">DEMO SIMULATION</span>' : '<span class="inline-block mt-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded font-semibold text-[9px]">GPS LIVE</span>'}
          </div>
        `)
        .addTo(markersLayer);
    }

    // 2. Add Activity Markers
    activities.forEach((activity, index) => {
      const isCurrent = activity.id === currentActivityId || activity.status === 'IN_PROGRESS';
      const isCompleted = activity.status === 'COMPLETED';
      const isLocked = activity.locked;

      latLngs.push([activity.location.latitude, activity.location.longitude]);

      // Badge Color & Styling
      let badgeBg = 'bg-teal-600 border-white text-white shadow-md';
      let pingEffect = '';
      if (isCurrent) {
        badgeBg = 'bg-emerald-600 border-white text-white font-bold ring-4 ring-emerald-400/40 shadow-lg';
        pingEffect = '<span class="absolute -inset-1 rounded-full bg-emerald-500 opacity-60 animate-ping"></span>';
      } else if (isCompleted) {
        badgeBg = 'bg-slate-400 border-white text-white opacity-80';
      } else if (isLocked) {
        badgeBg = 'bg-amber-600 border-white text-white shadow-md';
      }

      const icon = L.divIcon({
        className: 'custom-activity-marker',
        html: `
          <div class="relative group cursor-pointer transition-transform hover:scale-110">
            ${pingEffect}
            <div class="flex h-7 w-7 items-center justify-center rounded-full ${badgeBg} border-2 text-xs font-bold">
              ${isCompleted ? '✓' : isLocked ? '🔒' : index + 1}
            </div>
            <div class="absolute left-1/2 -translate-x-1/2 top-8 whitespace-nowrap rounded-md bg-white/95 backdrop-blur-xs border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-md pointer-events-none opacity-95">
              ${activity.name.length > 20 ? activity.name.substring(0, 18) + '...' : activity.name}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([activity.location.latitude, activity.location.longitude], { icon })
        .bindPopup(`
          <div class="p-2 text-xs font-sans max-w-[200px]">
            <div class="flex items-center justify-between space-x-2">
              <span class="font-bold text-slate-900">${activity.name}</span>
              ${isLocked ? '<span class="text-amber-700 text-[10px] font-bold">🔒 LOCKED</span>' : ''}
            </div>
            <p class="text-teal-700 font-bold text-[11px] mt-0.5">${activity.start_time} – ${activity.end_time}</p>
            <p class="text-slate-600 text-[11px] mt-1">${activity.location.address}</p>
            <div class="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>${activity.duration_minutes} mins</span>
              <span class="capitalize px-1.5 py-0.5 rounded bg-slate-100 font-medium">${activity.indoor ? 'Indoor' : 'Outdoor'}</span>
            </div>
          </div>
        `)
        .addTo(markersLayer);

      marker.on('click', () => {
        onSelectActivity?.(activity.id);
      });
    });

    // 3. Draw Route Polyline
    if (latLngs.length > 1) {
      routeLayerRef.current = L.polyline(latLngs, {
        color: '#0d9488',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 6'
      }).addTo(map);

      try {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch {
        // Ignore edge cases during rapid view transitions
      }
    }
  }, [activities, currentActivityId, userLocation, onSelectActivity]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100 shadow-sm ${heightClass}`}>
      {/* Map Element */}
      <div ref={mapContainerRef} className="h-full w-full z-10" />

      {/* Map Overlay Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center space-x-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 px-3 py-1.5 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
        <span className="text-[11px] font-bold tracking-wide text-slate-800 uppercase">
          {DESTINATIONS[destination].name} Live Map
        </span>
        <span className="text-[10px] text-slate-500 font-medium">({(activities || []).length} stops)</span>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center space-x-3 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm font-medium">
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Current</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-teal-600" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Locked 🔒</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
};
