import React from 'react';
import {
  Clock,
  Car,
  Lock,
  Unlock,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  CloudSun,
  Building2,
  MapPin
} from 'lucide-react';
import { Activity, ActivityPriority } from '../types';

interface ActivityCardProps {
  activity: Activity;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onStatusChange?: (id: string, status: Activity['status']) => void;
  isLiveMode?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  index,
  isFirst,
  isLast,
  onToggleLock,
  onRemove,
  onMoveUp,
  onMoveDown,
  onStatusChange,
  isLiveMode = false
}) => {
  const isCompleted = activity.status === 'COMPLETED';
  const isInProgress = activity.status === 'IN_PROGRESS';

  // Priority badge styling
  const renderPriorityBadge = (priority: ActivityPriority, locked: boolean) => {
    if (locked) {
      return (
        <span className="inline-flex items-center space-x-1 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-800 shadow-2xs">
          <Lock className="h-3 w-3 text-amber-700" />
          <span>LOCKED</span>
        </span>
      );
    }
    switch (priority) {
      case 'MUST_DO':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>MUST DO</span>
          </span>
        );
      case 'PREFERRED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>PREFERRED</span>
          </span>
        );
      case 'OPTIONAL':
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>OPTIONAL</span>
          </span>
        );
    }
  };

  return (
    <div className="relative group">
      {/* Travel Time Indicator connector above item */}
      {activity.travel_time_minutes > 0 && !isFirst && (
        <div className="flex items-center space-x-2 pl-6 py-1.5 text-xs text-slate-500 font-mono">
          <div className="w-0.5 h-4 bg-slate-300 ml-1.5" />
          <div className="flex items-center space-x-1 rounded-md bg-white border border-slate-200 px-2.5 py-0.5 shadow-2xs">
            <Car className="h-3 w-3 text-teal-600" />
            <span className="font-semibold text-slate-700">{activity.travel_time_minutes} min transit</span>
          </div>
        </div>
      )}

      {/* Main Activity Card */}
      <div
        className={`relative rounded-xl border transition-all ${
          isInProgress
            ? 'bg-emerald-50/40 border-emerald-400 shadow-md ring-1 ring-emerald-300/60'
            : isCompleted
            ? 'bg-slate-50/80 border-slate-200 opacity-65'
            : 'bg-white border-slate-200/90 hover:border-teal-400 shadow-2xs hover:shadow-xs'
        } p-4`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left Column: Number & Details */}
          <div className="flex items-start space-x-3">
            {/* Step Index Circle */}
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                isInProgress
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                  : isCompleted
                  ? 'bg-slate-200 text-slate-600'
                  : activity.locked
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>

            <div>
              {/* Timing and Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-teal-800 flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-teal-600" />
                  <span>
                    {activity.start_time} – {activity.end_time}
                  </span>
                </span>
                {renderPriorityBadge(activity.priority, activity.locked)}

                {/* Indoor/Outdoor Tag */}
                <span className="inline-flex items-center space-x-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">
                  {activity.indoor && !activity.outdoor ? (
                    <>
                      <Building2 className="h-2.5 w-2.5 text-sky-600" />
                      <span>Indoor</span>
                    </>
                  ) : !activity.indoor && activity.outdoor ? (
                    <>
                      <CloudSun className="h-2.5 w-2.5 text-amber-600" />
                      <span>Outdoor</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-2.5 w-2.5 text-teal-600" />
                      <span>Mixed</span>
                    </>
                  )}
                </span>
              </div>

              {/* Place Name */}
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <span>{activity.name}</span>
                {activity.locked && <Lock className="h-3 w-3 text-amber-600" />}
              </h4>

              {/* Location & Estimated Duration */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span className="truncate max-w-[200px] font-medium text-slate-600">{activity.location.address}</span>
                </span>
                <span>•</span>
                <span>Duration: {activity.duration_minutes}m</span>
                {activity.costEstimateINR > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">₹{activity.costEstimateINR}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Controls */}
          <div className="flex items-center space-x-1">
            {/* Toggle Lock Button (Rule 7) */}
            <button
              onClick={() => onToggleLock(activity.id)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                activity.locked
                  ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={activity.locked ? 'Unlock activity (allows auto-replanning)' : 'Lock activity (prevents auto-moving)'}
            >
              {activity.locked ? <Lock className="h-3.5 w-3.5 text-amber-700" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>

            {/* Move Controls (if not in live completed state) */}
            {!isLiveMode && (
              <>
                <button
                  disabled={isFirst || activity.locked}
                  onClick={() => onMoveUp(index)}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Move earlier"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={isLast || activity.locked}
                  onClick={() => onMoveDown(index)}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Move later"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={activity.locked}
                  onClick={() => onRemove(activity.id)}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Remove activity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Live Mode Quick Status Toggle */}
            {isLiveMode && onStatusChange && (
              <div className="flex items-center space-x-1 pl-1">
                {activity.status !== 'COMPLETED' ? (
                  <button
                    onClick={() => onStatusChange(activity.id, 'COMPLETED')}
                    className="flex items-center space-x-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 transition-colors cursor-pointer"
                  >
                    <span>Done</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStatusChange(activity.id, 'SCHEDULED')}
                    className="flex items-center space-x-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 cursor-pointer"
                  >
                    <span>Undo</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
