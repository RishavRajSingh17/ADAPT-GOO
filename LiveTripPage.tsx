import React, { useState, useEffect } from 'react';
import {
  Clock,
  Car,
  CloudSun,
  ShieldCheck,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  MapPin,
  Compass,
  Sparkles,
  Lock
} from 'lucide-react';
import {
  Activity,
  DestinationId,
  EventType,
  ItineraryVersion,
  LiveEvent,
  ReplanningCandidate,
  WeatherInfo
} from '../types';
import { ActivityCard } from '../components/ActivityCard';
import { InteractiveMap } from '../components/InteractiveMap';
import { DemoControlBar } from '../components/DemoControlBar';
import { ReplanningModal } from '../components/ReplanningModal';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { DESTINATIONS } from '../data/destinations';
import { analyzeImpact } from '../services/impactEngine';
import { generateReplanningCandidates } from '../services/replanningEngine';
import { AdaptGoLogo } from '../components/AdaptGoLogo';
import { useLanguage } from '../i18n/LanguageContext';

interface LiveTripPageProps {
  destination: DestinationId;
  activities?: Activity[];
  onUpdateActivities?: (activities: Activity[]) => void;
  onToggleLock?: (id: string) => void;
  onPlanVersionBump?: (newVersion: ItineraryVersion) => void;
  versions?: ItineraryVersion[];
  currentPlanVersion?: number;
  userPreferences?: any;
}

export const LiveTripPage: React.FC<LiveTripPageProps> = ({
  destination,
  activities = [],
  onUpdateActivities = (_acts: Activity[]) => {},
  onToggleLock = (_id: string) => {},
  onPlanVersionBump = (_ver: ItineraryVersion) => {},
  versions = [],
  currentPlanVersion = 1,
  userPreferences
}) => {
  const { t, getDestinationName } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Live State
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [elapsedMinutesInCurrent, setElapsedMinutesInCurrent] = useState(15);
  const [isSimulating, setIsSimulating] = useState(false);

  // Weather Information
  const [weather, setWeather] = useState<WeatherInfo>({
    city: DESTINATIONS[destination].name,
    temperatureC: 26,
    condition: 'Pleasant & Clear',
    precipitationProbability: 10,
    windSpeedKmH: 8,
    isLive: false,
    updatedAt: new Date().toISOString()
  });

  // User simulated/real GPS location
  const [userLocation, setUserLocation] = useState({
    latitude: DESTINATIONS[destination].center[0],
    longitude: DESTINATIONS[destination].center[1],
    isSimulated: true
  });

  // Modals & Adaptation state
  const [isReplanningModalOpen, setIsReplanningModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeProposal, setActiveProposal] = useState<ReplanningCandidate | null>(null);
  const [detectedEvents, setDetectedEvents] = useState<LiveEvent[]>([]);

  // Chronological event logs
  const [historyLogs, setHistoryLogs] = useState<{ time: string; icon: string; message: string }[]>([
    {
      time: '09:00',
      icon: '🟢',
      message: `Trip started at ${DESTINATIONS[destination].name}. Plan v1 initialized.`
    }
  ]);

  const currentActivity = activities[currentActivityIndex] || activities[0];
  const nextActivity = activities[currentActivityIndex + 1] || null;

  // Fetch real-time weather on mount or destination change
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const fetchWeather = async () => {
      try {
        const res = await fetch(`/api/weather/${destination}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch {
        clearTimeout(timeoutId);
        // Retains default destination weather without errors
      }
    };
    fetchWeather();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [destination]);

  // Update user location to match current activity
  useEffect(() => {
    if (currentActivity) {
      setUserLocation({
        latitude: currentActivity.location.latitude - 0.002,
        longitude: currentActivity.location.longitude - 0.001,
        isSimulated: true
      });
    }
  }, [currentActivityIndex, currentActivity]);

  // Handle deterministic simulation triggers
  const handleTriggerSimulation = (type: EventType, customTitle?: string) => {
    setIsSimulating(true);

    const destMeta = DESTINATIONS[destination];
    let liveEvent: LiveEvent;

    switch (type) {
      case 'WEATHER':
        liveEvent = {
          event_id: `ev_${Date.now()}`,
          type: 'WEATHER',
          severity: 'HIGH',
          title: customTitle || 'Sudden Heavy Downpour (85% Rain)',
          description: `Torrential rainfall detected in ${destMeta.name}. Outdoor activities unsafe or disrupted.`,
          detected_at: new Date().toISOString(),
          precipitationProbability: 90
        };
        // Update weather widget directly
        setWeather(prev => ({
          ...prev,
          condition: 'Heavy Rain / Downpour',
          precipitationProbability: 90
        }));
        break;

      case 'TRAFFIC':
        liveEvent = {
          event_id: `ev_${Date.now()}`,
          type: 'TRAFFIC',
          severity: 'HIGH',
          title: customTitle || 'Major Traffic Gridlock (+45 mins)',
          description: `Severe arterial congestion on route to ${nextActivity?.name || 'next stop'}.`,
          detected_at: new Date().toISOString(),
          estimated_delay_minutes: 45,
          affectedActivityId: nextActivity?.id
        };
        break;

      case 'CLOSURE':
        const closedTarget = activities.find(a => !a.locked && a.id !== currentActivity?.id) || activities[1];
        liveEvent = {
          event_id: `ev_${Date.now()}`,
          type: 'CLOSURE',
          severity: 'CRITICAL',
          title: customTitle || `${closedTarget?.name || 'Attraction'} Temporarily Closed`,
          description: 'Emergency maintenance / unexpected closure for the rest of today.',
          detected_at: new Date().toISOString(),
          affectedActivityId: closedTarget?.id
        };
        break;

      case 'USER_DELAY':
        liveEvent = {
          event_id: `ev_${Date.now()}`,
          type: 'USER_DELAY',
          severity: 'MEDIUM',
          title: customTitle || 'Traveler Running 40 Minutes Late',
          description: `Extended lunch/photo break at ${currentActivity?.name}.`,
          detected_at: new Date().toISOString(),
          estimated_delay_minutes: 40
        };
        break;

      case 'TIME_SHORTAGE':
      default:
        liveEvent = {
          event_id: `ev_${Date.now()}`,
          type: 'TIME_SHORTAGE',
          severity: 'LOW',
          title: customTitle || 'Finished Early (+30 mins surplus)',
          description: `Completed ${currentActivity?.name} ahead of schedule. Bonus window available.`,
          detected_at: new Date().toISOString(),
          estimated_delay_minutes: -30
        };
        break;
    }

    // Run Core Loop: MONITOR -> DETECT -> ANALYZE
    const analysis = analyzeImpact([liveEvent], activities, currentActivity?.id || null);

    // Add to event logs
    setHistoryLogs(prev => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: '⚠️',
        message: `Detected: ${liveEvent.title}`
      },
      ...prev
    ]);

    if (!analysis.hasMeaningfulImpact) {
      // Minor change filtered out by Rule 1
      alert(`Impact Analyzed: Minor fluctuation. ${analysis.summary}`);
      return;
    }

    // Run Core Loop: REPLAN -> Generate Candidates
    const candidates = generateReplanningCandidates(destination, activities, analysis, [liveEvent], null);

    if (candidates.length > 0) {
      const topProposal = candidates[0];
      setActiveProposal(topProposal);
      setDetectedEvents([liveEvent]);
      setIsReplanningModalOpen(true);
    }
  };

  // Reset itinerary to initial state
  const handleResetSimulation = () => {
    setIsSimulating(false);
    setWeather(prev => ({
      ...prev,
      condition: 'Pleasant & Clear',
      precipitationProbability: 10
    }));
    setHistoryLogs(prev => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: '🔄',
        message: 'Simulation reset back to base schedule.'
      },
      ...prev
    ]);
  };

  // Natural Language Live Command Execution
  const handleSendLiveCommand = async (commandText: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setHistoryLogs(prev => [
      {
        time: timeStr,
        icon: '💬',
        message: `Traveler command: "${commandText}"`
      },
      ...prev
    ]);

    // Lowercase match keywords to deterministic actions
    const lower = commandText.toLowerCase();
    if (lower.includes('tired') || lower.includes('rest') || lower.includes('slow')) {
      handleTriggerSimulation('USER_DELAY', 'Traveler requested rest / slower pace');
    } else if (lower.includes('rain') || lower.includes('weather') || lower.includes('storm')) {
      handleTriggerSimulation('WEATHER', 'Weather concern reported by traveler');
    } else if (lower.includes('traffic') || lower.includes('jam') || lower.includes('late')) {
      handleTriggerSimulation('TRAFFIC', 'Traveler reported traffic / delayed transit');
    } else if (lower.includes('skip') || lower.includes('remove') || lower.includes('cancel')) {
      handleTriggerSimulation('CLOSURE', `Traveler requested: ${commandText}`);
    } else {
      handleTriggerSimulation('USER_DELAY', `Adaptive request: "${commandText}"`);
    }
  };

  // Modal Action: APPROVE (Rule 10)
  const handleAcceptProposal = (proposal: ReplanningCandidate) => {
    setIsReplanningModalOpen(false);
    onUpdateActivities(proposal.afterActivities);

    const newVerNumber = currentPlanVersion + 1;
    const newVersion: ItineraryVersion = {
      version_number: newVerNumber,
      created_at: new Date().toISOString(),
      reason: proposal.explanation,
      activities: proposal.afterActivities
    };

    onPlanVersionBump(newVersion);

    setHistoryLogs(prev => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: '✓',
        message: `Plan v${newVerNumber} approved by traveler. ${proposal.explanation}`
      },
      ...prev
    ]);
  };

  // Modal Action: REJECT (Rule 6 & 10)
  const handleRejectProposal = () => {
    setIsReplanningModalOpen(false);
    setHistoryLogs(prev => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: '✕',
        message: 'Recommendation rejected by traveler. Kept original schedule.'
      },
      ...prev
    ]);
  };

  // Complete current activity and advance
  const handleCompleteCurrent = () => {
    if (!currentActivity) return;
    const updated = activities.map((a, idx) =>
      idx === currentActivityIndex ? { ...a, status: 'COMPLETED' as const } : a
    );
    onUpdateActivities(updated);
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(prev => prev + 1);
    }
  };

  // Countdown timer calculation
  const remainingMinutes = Math.max(
    0,
    (currentActivity?.duration_minutes || 60) - elapsedMinutesInCurrent
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top Live Status Bar */}
      <div className="border-b border-slate-200/90 bg-white py-4 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Trip Identification */}
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200/80 shadow-xs p-1">
              <AdaptGoLogo variant="icon-only" size="sm" className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base">
                  {getDestinationName(destination)} {t('live_itinerary_title')}
                </span>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>{t('live_gps')}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{t('monitoring_realtime')}</p>
            </div>
          </div>

          {/* Environmental Conditions & History Trigger */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Live Weather Widget */}
            <div className="flex items-center space-x-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs text-slate-700 shadow-2xs">
              <CloudSun className="h-4 w-4 text-amber-600" />
              <span className="font-bold text-slate-800">{weather.temperatureC}°C</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 font-medium truncate max-w-[120px]">{weather.condition}</span>
              {weather.precipitationProbability > 20 && (
                <span className="text-[10px] text-sky-800 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                  {weather.precipitationProbability}% {t('rain')}
                </span>
              )}
            </div>

            {/* Version History Button */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <History className="h-3.5 w-3.5 text-teal-600" />
              <span>{t('what_changed')} (v{currentPlanVersion})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Simulation Control Bar (Top) */}
        <DemoControlBar
          onTriggerSimulation={handleTriggerSimulation}
          onResetSimulation={handleResetSimulation}
          onSendLiveCommand={handleSendLiveCommand}
          isSimulating={isSimulating}
        />

        {/* Hero Active Stop Card + Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Current Stop & Timeline */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Activity Highlight Card */}
            {currentActivity && (
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900 tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                    <span>{t('current_activity')}</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-teal-800">
                    {currentActivity.start_time} – {currentActivity.end_time}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>{currentActivity.name}</span>
                  {currentActivity.locked && <Lock className="h-4 w-4 text-amber-600" />}
                </h3>

                <p className="text-xs text-slate-600 mt-1 flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate font-medium">{currentActivity.location.address}</span>
                </p>

                {/* Countdown & Progress */}
                <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-emerald-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {t('time_remaining')}
                    </span>
                    <div className="font-mono text-2xl font-extrabold text-emerald-800 mt-0.5">
                      ~{remainingMinutes}m
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {t('allocated_duration')}
                    </span>
                    <div className="font-mono text-2xl font-bold text-slate-700 mt-0.5">
                      {currentActivity.duration_minutes}m
                    </div>
                  </div>
                </div>

                {/* Complete Button */}
                <div className="mt-5">
                  <button
                    onClick={handleCompleteCurrent}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('mark_completed')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Next Activity Teaser Card */}
            {nextActivity && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold uppercase tracking-wider text-teal-800 text-[10px]">
                    {t('up_next_stop')}
                  </span>
                  <span className="font-mono font-semibold text-slate-600">{nextActivity.start_time}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{nextActivity.name}</h4>
                <div className="mt-2 flex items-center space-x-2 text-xs text-slate-500">
                  <Car className="h-3.5 w-3.5 text-teal-600" />
                  <span>
                    {nextActivity.travel_time_minutes > 0
                      ? `${nextActivity.travel_time_minutes} min transit window`
                      : 'Adjacent stop'}
                  </span>
                  <span>•</span>
                  <span>{nextActivity.duration_minutes}m visit</span>
                </div>
              </div>
            )}

            {/* Remaining Stops Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('remaining_itinerary')} ({activities.length - (currentActivityIndex + 1)} stops)
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Click 🔒 to protect</span>
              </div>

              <div className="space-y-2.5">
                {activities.map((act, index) => {
                  if (index <= currentActivityIndex) return null;
                  return (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === activities.length - 1}
                      onToggleLock={onToggleLock}
                      onRemove={() => {}}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                      isLiveMode={true}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Map & Real-World Context */}
          <div className="lg:col-span-7 sticky top-24 space-y-4">
            <InteractiveMap
              destination={destination}
              activities={activities}
              currentActivityId={currentActivity?.id}
              userLocation={userLocation}
              heightClass="h-[540px] lg:h-[700px]"
            />
          </div>
        </div>
      </div>

      {/* Hero Replanning Modal ("Better Plan Found") */}
      <ReplanningModal
        isOpen={isReplanningModalOpen}
        activeProposal={activeProposal}
        detectedEvents={detectedEvents}
        onAccept={handleAcceptProposal}
        onReject={handleRejectProposal}
        onManualEdit={() => {
          setIsReplanningModalOpen(false);
          alert('Manual plan calibrator opened. You can lock or reorder stops.');
        }}
      />

      {/* Version History Modal ("What Changed?") */}
      <VersionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        versions={versions || []}
        currentVersionIndex={Math.max(0, (versions?.length || 1) - 1)}
        onSelectVersion={() => {}}
        logs={historyLogs || []}
      />
    </div>
  );
};
