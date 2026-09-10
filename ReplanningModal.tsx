import React from 'react';
import {
  RefreshCw,
  Check,
  X,
  Sliders,
  AlertTriangle,
  Lock,
  TrendingUp,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { LiveEvent, ReplanningCandidate } from '../types';

interface ReplanningModalProps {
  isOpen: boolean;
  activeProposal: ReplanningCandidate | null;
  detectedEvents: LiveEvent[];
  onAccept: (candidate: ReplanningCandidate) => void;
  onReject: () => void;
  onManualEdit: () => void;
}

export const ReplanningModal: React.FC<ReplanningModalProps> = ({
  isOpen,
  activeProposal,
  detectedEvents,
  onAccept,
  onReject,
  onManualEdit
}) => {
  if (!isOpen || !activeProposal) return null;

  const beforeList = activeProposal.beforeActivities || [];
  const afterList = activeProposal.afterActivities || [];
  const safeEvents = detectedEvents || [];
  const primaryEvent = safeEvents[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white px-6 py-4 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20 animate-pulse">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Better Plan Found</h2>
                <span className="rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-[10px] font-bold text-teal-800">
                  OPTIMIZED
                </span>
              </div>
              <p className="text-xs text-teal-900 font-medium">
                {primaryEvent?.title || 'Real-world disruption detected'} affects your scheduled stops.
              </p>
            </div>
          </div>

          {/* Candidate Score Badge */}
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center space-x-1.5 rounded-lg bg-white border border-teal-200 px-3 py-1 text-xs shadow-2xs">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-slate-600 font-medium">Fit Score:</span>
              <span className="font-bold text-emerald-700 font-mono">{activeProposal.score}/100</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Disruption Alert Notice */}
          <div className="flex items-start space-x-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold text-amber-950 block mb-0.5">Live Disruption Impact:</span>
              {safeEvents.map((ev, idx) => (
                <p key={idx}>• {ev.description || ev.title}</p>
              ))}
            </div>
          </div>

          {/* BEFORE vs AFTER Columns (Hero Comparison) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: BEFORE */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Current Schedule (BEFORE)
                </span>
                <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Disrupted
                </span>
              </div>
              <div className="space-y-2">
                {beforeList.map((act, i) => {
                  const hasChanged = !afterList.some(
                    a => a.id === act.id && a.start_time === act.start_time
                  );
                  return (
                    <div
                      key={`before_${act.id}_${i}`}
                      className={`flex items-center justify-between rounded-lg p-2 text-xs border ${
                        hasChanged
                          ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500 font-semibold text-[11px] w-14">
                          {act.start_time}
                        </span>
                        <span className="font-semibold truncate max-w-[150px]">{act.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {act.locked && <Lock className="h-3 w-3 text-amber-600" />}
                        {hasChanged && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded font-bold">
                            Shifted
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: AFTER */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4">
              <div className="flex items-center justify-between border-b border-teal-200 pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  <span>Adaptive Plan (AFTER)</span>
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Feasible
                </span>
              </div>
              <div className="space-y-2">
                {afterList.map((act, i) => {
                  const wasModified = !beforeList.some(
                    b => b.id === act.id && b.start_time === act.start_time
                  );
                  return (
                    <div
                      key={`after_${act.id}_${i}`}
                      className={`flex items-center justify-between rounded-lg p-2 text-xs border ${
                        wasModified
                          ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-teal-700 font-bold text-[11px] w-14">
                          {act.start_time}
                        </span>
                        <span className="font-semibold truncate max-w-[150px]">{act.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {act.locked ? (
                          <span className="inline-flex items-center space-x-1 text-[9px] px-1.5 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 rounded font-bold">
                            <Lock className="h-2.5 w-2.5 text-amber-700" />
                            <span>Protected</span>
                          </span>
                        ) : wasModified ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-teal-100 text-teal-900 border border-teal-300 rounded font-bold">
                            Optimized
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* "Why?" Explanation Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Why is this plan better?
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
              {activeProposal.explanation}
            </p>

            {/* Change details bullet points */}
            {(activeProposal.changesDescription || []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                {(activeProposal.changesDescription || []).map((desc, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px] text-slate-600">
                    <span className="text-teal-600 font-bold mt-0.5">•</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:block font-medium">
            Rule 10: The system recommends; the traveler decides.
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {/* Reject / Keep Original */}
            <button
              onClick={onReject}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <X className="h-3.5 w-3.5" />
              <span>Keep Original</span>
            </button>

            {/* Edit Plan Manually */}
            <button
              onClick={onManualEdit}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Edit Plan</span>
            </button>

            {/* Accept Changes (Primary) */}
            <button
              onClick={() => onAccept(activeProposal)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>✓ Accept Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
