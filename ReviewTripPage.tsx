import React, { useState, useEffect } from 'react';
import {
  Play,
  Clock,
  IndianRupee,
  Lock,
  Compass,
  Layers,
  Map as MapIcon
} from 'lucide-react';
import { Activity, DestinationId } from '../types';
import { ActivityCard } from '../components/ActivityCard';
import { InteractiveMap } from '../components/InteractiveMap';
import { DESTINATIONS } from '../data/destinations';
import { useLanguage } from '../i18n/LanguageContext';

interface ReviewTripPageProps {
  destination: DestinationId;
  activities: Activity[];
  onStartTrip: () => void;
  onToggleLock: (id: string) => void;
  onRemoveActivity: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const ReviewTripPage: React.FC<ReviewTripPageProps> = ({
  destination,
  activities = [],
  onStartTrip,
  onToggleLock,
  onRemoveActivity,
  onMoveUp,
  onMoveDown
}) => {
  const { t, getDestinationName } = useLanguage();
  const [activeTab, setActiveTab] = useState<'split' | 'timeline' | 'map'>('split');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const destMeta = DESTINATIONS[destination];
  const safeActivities = activities || [];

  // Calculate Summary metrics
  const totalCost = safeActivities.reduce((acc, act) => acc + (act.costEstimateINR || 0), 0);
  const totalDurationMinutes = safeActivities.reduce(
    (acc, act) => acc + (act.duration_minutes || 0) + (act.travel_time_minutes || 0),
    0
  );
  const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10;
  const lockedCount = safeActivities.filter(a => a.locked).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Banner Header */}
      <div className="border-b border-slate-200/90 bg-white py-6 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">
                Step 2: Plan Review & Calibration
              </span>
              <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 font-bold font-mono">
                Plan v1
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {getDestinationName(destination)} {t('review_itinerary_title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {t('review_itinerary_subtitle')}
            </p>
          </div>

          {/* Quick Metrics & Start Trip Action */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Pills */}
            <div className="flex items-center space-x-2 rounded-xl bg-slate-100 border border-slate-200 p-1.5 text-xs shadow-2xs">
              <div className="flex items-center space-x-1 px-2.5 border-r border-slate-200">
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                <span className="font-bold text-slate-800">{totalHours} {t('metric_hours')}</span>
              </div>
              <div className="flex items-center space-x-1 px-2.5 border-r border-slate-200">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800">₹{totalCost}</span>
              </div>
              <div className="flex items-center space-x-1 px-2.5">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-bold text-amber-800">{lockedCount} {t('metric_locked')}</span>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={onStartTrip}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{t('btn_start_trip')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* View Switcher (for small screens) */}
        <div className="flex lg:hidden items-center justify-center mb-6">
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1 text-xs shadow-2xs">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                activeTab === 'timeline'
                  ? 'bg-white text-teal-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{t('tab_timeline')} ({activities.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                activeTab === 'map'
                  ? 'bg-white text-teal-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>{t('tab_map')}</span>
            </button>
          </div>
        </div>

        {/* Responsive Dual Column Layout (Desktop: Map + Itinerary side-by-side) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Timeline & Activity Cards (5 cols) */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              activeTab === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                {t('timeline_stops')} ({activities.length})
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('lock_tooltip')}
              </span>
            </div>

            <div className="space-y-3">
              {activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === activities.length - 1}
                  onToggleLock={onToggleLock}
                  onRemove={onRemoveActivity}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                />
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Map (7 cols) */}
          <div
            className={`lg:col-span-7 sticky top-24 ${
              activeTab === 'timeline' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Compass className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  {t('map_route_title')}
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                Verified GPS Coordinates
              </span>
            </div>

            <InteractiveMap
              destination={destination}
              activities={activities}
              currentActivityId={selectedActivityId}
              onSelectActivity={setSelectedActivityId}
              heightClass="h-[520px] lg:h-[680px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
