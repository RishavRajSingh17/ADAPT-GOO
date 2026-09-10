import React from 'react';
import {
  ArrowRight,
  RefreshCw,
  Play,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { DestinationId } from '../types';
import { DESTINATIONS } from '../data/destinations';
import { AdaptGoLogo } from '../components/AdaptGoLogo';
import { useLanguage } from '../i18n/LanguageContext';

interface HomePageProps {
  onStartPlanning: () => void;
  onExploreDemo: (dest: DestinationId) => void;
  onSelectDestination: (dest: DestinationId) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartPlanning,
  onExploreDemo,
  onSelectDestination
}) => {
  const { t, getDestinationName, getDestinationDesc } = useLanguage();
  const supportedCityKeys: DestinationId[] = ['kolkata', 'nainital', 'darjeeling', 'kashmir'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200/80 bg-white">
        {/* Subtle background ambiance */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-teal-100/40 via-emerald-100/30 to-transparent blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1 text-xs font-bold text-teal-800 mb-6 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
            <span>{t('hero_badge')}</span>
          </div>

          {/* Hero Headline with Official Logo */}
          <div className="flex flex-col items-center justify-center mb-2">
            <AdaptGoLogo size="xl" className="h-24 sm:h-32 drop-shadow-xs" />
            <h1 className="sr-only">ADAPTGO</h1>
          </div>

          {/* Subtitle */}
          <p className="mt-4 text-xl sm:text-2xl font-bold text-teal-700">
            {t('hero_subtitle')}
          </p>

          {/* Supporting Text */}
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('hero_description')}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartPlanning}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <span>{t('cta_start_planning')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => onExploreDemo('kolkata')}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-xs transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4 fill-slate-700 text-slate-700" />
              <span>{t('cta_explore_demo')} ({getDestinationName('kolkata')})</span>
            </button>
          </div>

          {/* Visual Core Loop Flow Banner */}
          <div className="mt-14 pt-8 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              The Adaptive Core Loop
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono">
              <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-slate-700 font-bold shadow-2xs">
                PLAN
              </span>
              <span className="text-teal-600 font-bold">→</span>
              <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-slate-700 font-bold shadow-2xs">
                MONITOR
              </span>
              <span className="text-teal-600 font-bold">→</span>
              <span className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 text-amber-900 font-bold shadow-2xs">
                DETECT
              </span>
              <span className="text-teal-600 font-bold">→</span>
              <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-slate-700 font-bold shadow-2xs">
                ANALYZE
              </span>
              <span className="text-teal-600 font-bold">→</span>
              <span className="rounded-lg bg-teal-50 border border-teal-300 px-3 py-1.5 text-teal-900 font-bold shadow-2xs">
                REPLAN
              </span>
              <span className="text-teal-600 font-bold">→</span>
              <span className="rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-emerald-900 font-bold shadow-2xs">
                APPROVE
              </span>
              <span className="text-teal-600 font-bold">→</span>
              <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-slate-700 font-bold shadow-2xs">
                CONTINUE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Destinations Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">
              {t('feature_destinations_title')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t('explore_destinations_title')}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {t('explore_destinations_subtitle')}
            </p>
          </div>
          <span className="text-xs text-slate-500 mt-2 sm:mt-0 font-mono font-medium">
            Exclusively 4 curated destinations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {supportedCityKeys.map(destId => {
            const dest = DESTINATIONS[destId];
            const localizedName = getDestinationName(destId);
            const localizedDesc = getDestinationDesc(destId) || dest.description;

            return (
              <div
                key={destId}
                className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-teal-400 transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
              >
                {/* Image & Header */}
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={dest.heroImage}
                      alt={dest.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="rounded-md bg-white/95 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-900 shadow-xs">
                        {dest.state}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {localizedName}
                    </h3>
                    <p className="text-xs text-teal-700 font-semibold mb-2">{dest.subtitle}</p>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {localizedDesc}
                    </p>

                    {/* Demo scenario badge */}
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block mb-0.5">
                        Demo Scenario:
                      </span>
                      <p className="text-[11px] text-slate-800 font-semibold">
                        {dest.demoScenario.title}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Trigger: <span className="text-teal-700 font-medium">{dest.demoScenario.triggerName}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-5 pt-0 flex items-center space-x-2">
                  <button
                    onClick={() => {
                      onSelectDestination(destId);
                      onStartPlanning();
                    }}
                    className="flex-1 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 py-2.5 text-xs font-bold text-teal-800 transition-colors cursor-pointer text-center"
                  >
                    {t('plan_destination_btn')}
                  </button>
                  <button
                    onClick={() => onExploreDemo(destId)}
                    className="flex items-center justify-center space-x-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    title="1-Click Demo"
                  >
                    <Play className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                    <span>{t('nav_demo')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Innovations Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">
              {t('why_adaptgo_title')}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {t('why_adaptgo_subtitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              {t('hero_description')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <ShieldCheck className="h-5 w-5 text-teal-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 mb-1">{t('why_point1_title')}</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t('why_point1_desc')}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <Zap className="h-5 w-5 text-amber-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 mb-1">{t('why_point2_title')}</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t('why_point2_desc')}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <RefreshCw className="h-5 w-5 text-emerald-600 mb-2" />
              <h4 className="text-xs font-bold text-slate-900 mb-1">{t('why_point3_title')}</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t('why_point3_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AdaptGoLogo size="sm" className="h-8" />
            <span className="text-xs text-slate-500 font-medium border-l border-slate-200 pl-3">
              {t('footer_motto')}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {t('footer_credits')}
          </p>
        </div>
      </footer>
    </div>
  );
};

