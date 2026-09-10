import React from 'react';
import { History, X } from 'lucide-react';
import { ItineraryVersion } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions?: ItineraryVersion[];
  currentVersionIndex?: number;
  onSelectVersion?: (index: number) => void;
  logs?: { time: string; icon: string; message: string }[];
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions = [],
  currentVersionIndex = 0,
  onSelectVersion = (_index: number) => {},
  logs = []
}) => {
  if (!isOpen) return null;

  const safeVersions = versions || [];
  const safeLogs = logs || [];
  const activeVersion = safeVersions[currentVersionIndex] || safeVersions[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">What Changed?</h3>
              <p className="text-xs text-slate-500">Adaptation history & plan version log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Versions Tabs */}
        <div className="flex items-center space-x-2 py-3 border-b border-slate-200 overflow-x-auto">
          {safeVersions.map((ver, idx) => (
            <button
              key={idx}
              onClick={() => onSelectVersion(idx)}
              className={`flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                currentVersionIndex === idx
                  ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Plan v{ver.version_number}</span>
              {currentVersionIndex === idx && (
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
              )}
            </button>
          ))}
        </div>

        {/* Timeline Event Log */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Chronological Decision Stream
          </h4>

          <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
            {safeLogs.map((log, idx) => (
              <div key={idx} className="relative group">
                {/* Node circle */}
                <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-300 text-xs shadow-2xs">
                  {log.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">{log.time}</span>
                  </div>
                  <p className="text-xs text-slate-800 mt-0.5 font-medium leading-relaxed">
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">Active: Plan v{activeVersion?.version_number || 1}</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
