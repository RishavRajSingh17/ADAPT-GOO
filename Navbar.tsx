import React from 'react';
import { Sparkles, Activity as ActivityIcon, Play, RefreshCw } from 'lucide-react';
import { DestinationId } from '../types';
import { DESTINATIONS } from '../data/destinations';
import { AdaptGoLogo } from './AdaptGoLogo';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  currentView: 'home' | 'create' | 'review' | 'live';
  onNavigate: (view: 'home' | 'create' | 'review' | 'live') => void;
  activeDestination: DestinationId;
  onSelectDestination: (dest: DestinationId) => void;
  onLaunchDemo: (dest: DestinationId) => void;
  hasActiveTrip: boolean;
  tripStatusBadge?: 'ON_TRACK' | 'MINOR_DELAY' | 'ACTION_NEEDED';
  onOpenHistory?: () => void;
  planVersion?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeDestination,
  onSelectDestination,
  onLaunchDemo,
  hasActiveTrip,
  tripStatusBadge,
  onOpenHistory,
  planVersion = 1
}) => {
  const { t, getDestinationName } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo - ADAPTGO */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none group shrink-0" onClick={() => onNavigate('home')}>
          <AdaptGoLogo size="sm" className="h-8 sm:h-9 transition-transform group-hover:scale-[1.02]" />
          <span className="rounded-md bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 hidden md:inline-block">
            {t('adaptive_badge')}
          </span>
        </div>

        {/* Navigation / Quick Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Destination Selector Pill */}
          <div className="hidden lg:flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1 text-xs">
            {(['kolkata', 'nainital', 'darjeeling', 'kashmir'] as DestinationId[]).map(dest => (
              <button
                key={dest}
                onClick={() => {
                  onSelectDestination(dest);
                  if (currentView === 'home') onNavigate('create');
                }}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all cursor-pointer ${
                  activeDestination === dest
                    ? 'bg-white text-teal-700 font-semibold shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {getDestinationName(dest)}
              </button>
            ))}
          </div>

          {/* Quick Demo Launch Button */}
          <button
            onClick={() => onLaunchDemo(activeDestination)}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors cursor-pointer"
            title="Load ready-to-run demo trip"
          >
            <Play className="h-3.5 w-3.5 fill-emerald-700 text-emerald-700 shrink-0" />
            <span className="hidden sm:inline">{t('nav_demo')}:</span>
            <span>{getDestinationName(activeDestination)}</span>
          </button>

          {/* Version badge if in live mode */}
          {currentView === 'live' && onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
              <span>{t('nav_plan_version', { version: planVersion })}</span>
            </button>
          )}

          {/* Status Badge in Live Mode */}
          {currentView === 'live' && tripStatusBadge && (
            <div
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border ${
                tripStatusBadge === 'ON_TRACK'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : tripStatusBadge === 'MINOR_DELAY'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current shrink-0" />
              <span className="font-semibold text-[11px]">
                {tripStatusBadge === 'ON_TRACK'
                  ? t('status_on_track')
                  : tripStatusBadge === 'MINOR_DELAY'
                  ? t('status_minor_delay')
                  : t('status_action_needed')}
              </span>
            </div>
          )}

          {/* Main Action Navigation */}
          {currentView !== 'create' && (
            <button
              onClick={() => onNavigate('create')}
              className="flex items-center space-x-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-medium text-white shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{t('nav_new_trip')}</span>
            </button>
          )}

          {hasActiveTrip && currentView !== 'live' && (
            <button
              onClick={() => onNavigate('live')}
              className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <ActivityIcon className="h-3.5 w-3.5" />
              <span>{t('nav_live_mode')}</span>
            </button>
          )}

          {/* Multilingual Selector */}
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
};

