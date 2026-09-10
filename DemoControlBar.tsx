import React, { useState } from 'react';
import {
  CloudRain,
  Car,
  AlertOctagon,
  Clock,
  Zap,
  RotateCcw,
  Mic,
  MicOff,
  Send
} from 'lucide-react';
import { EventType } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface DemoControlBarProps {
  onTriggerSimulation: (type: EventType, customTitle?: string) => void;
  onResetSimulation: () => void;
  onSendLiveCommand: (command: string) => void;
  isSimulating: boolean;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  onTriggerSimulation,
  onResetSimulation,
  onSendLiveCommand,
  isSimulating
}) => {
  const { t } = useLanguage();
  const [commandText, setCommandText] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Quick preset pills for live commands
  const quickSuggestions = [
    "I'm tired",
    "Skip shopping",
    "Find a café near me",
    "Running 30m late",
    "Don't change dinner 🔒"
  ];

  // Speech Recognition integration for live commands
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your command.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCommandText(transcript);
        onSendLiveCommand(transcript);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    onSendLiveCommand(commandText.trim());
    setCommandText('');
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Demo Controls */}
        <div className="w-full lg:w-auto">
          <div className="flex items-center space-x-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              {t('demo_simulator')}
            </span>
            <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold">
              HACKATHON MODE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => onTriggerSimulation('WEATHER', 'Simulate Heavy Rain')}
              className="flex items-center space-x-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-900 transition-colors cursor-pointer shadow-2xs"
            >
              <CloudRain className="h-3.5 w-3.5 text-sky-600" />
              <span>{t('simulate_rain')}</span>
            </button>

            <button
              onClick={() => onTriggerSimulation('TRAFFIC', 'Simulate Traffic Congestion (+45m)')}
              className="flex items-center space-x-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900 transition-colors cursor-pointer shadow-2xs"
            >
              <Car className="h-3.5 w-3.5 text-amber-600" />
              <span>{t('simulate_traffic')}</span>
            </button>

            <button
              onClick={() => onTriggerSimulation('CLOSURE', 'Simulate Attraction Closure')}
              className="flex items-center space-x-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-900 transition-colors cursor-pointer shadow-2xs"
            >
              <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
              <span>{t('simulate_closure')}</span>
            </button>

            <button
              onClick={() => onTriggerSimulation('USER_DELAY', 'Simulate 40-Minute Delay')}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-900 transition-colors cursor-pointer shadow-2xs"
            >
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              <span>{t('simulate_delay')}</span>
            </button>

            <button
              onClick={() => onTriggerSimulation('TIME_SHORTAGE', 'Simulate Early Finish')}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-900 transition-colors cursor-pointer shadow-2xs"
            >
              <Zap className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t('simulate_early')}</span>
            </button>

            <button
              onClick={onResetSimulation}
              className="flex items-center space-x-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              title="Reset itinerary to original schedule"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>{t('reset')}</span>
            </button>
          </div>
        </div>

        {/* Right: Natural Language Live Commands ("What do you want to change?") */}
        <div className="w-full lg:w-[420px] shrink-0">
          <form onSubmit={handleCommandSubmit} className="relative flex items-center">
            <input
              type="text"
              value={commandText}
              onChange={e => setCommandText(e.target.value)}
              placeholder={t('nl_live_placeholder')}
              className="w-full rounded-xl bg-slate-50 border border-slate-300 pl-3 pr-20 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none shadow-2xs"
            />

            <div className="absolute right-1.5 flex items-center space-x-1">
              {/* Voice button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Voice command"
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>

              {/* Submit button */}
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer shadow-xs"
                title="Submit command"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* Quick pills */}
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Quick:</span>
            {quickSuggestions.map((pill, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setCommandText(pill);
                  onSendLiveCommand(pill);
                }}
                className="text-[10px] rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-slate-600 hover:text-teal-700 font-medium transition-colors cursor-pointer"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
