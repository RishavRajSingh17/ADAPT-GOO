import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/types';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'pills';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = languages.find(l => l.code === language) || languages[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (variant === 'pills') {
    return (
      <div className={`inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-medium ${className}`}>
        {languages.map(opt => {
          const isActive = opt.code === language;
          return (
            <button
              key={opt.code}
              onClick={() => setLanguage(opt.code)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`${opt.label} (${opt.nativeLabel})`}
            >
              <span>{opt.nativeLabel}</span>
              <span className="ml-1 text-[10px] opacity-75 font-mono uppercase">({opt.shortLabel})</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Language / भाषा बदलें / ভাষা পরিবর্তন / भाषा बदला"
      >
        <Globe className="h-3.5 w-3.5 text-teal-600" />
        <span className="font-medium text-slate-900">{currentOption.nativeLabel}</span>
        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({currentOption.shortLabel})</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Choose Language
          </div>
          {languages.map(opt => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50 font-bold text-teal-800'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-900">{opt.nativeLabel}</span>
                  <span className="text-[10px] text-slate-500">
                    {opt.label} • {opt.shortLabel}
                  </span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
