import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Compass,
  Check,
  Building2,
  CloudSun,
  X,
  ArrowRight,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { DestinationId, UserPreferences } from '../types';
import { DESTINATIONS, PLACES_DATABASE } from '../data/destinations';
import { useLanguage } from '../i18n/LanguageContext';

interface CreateTripPageProps {
  initialDestination: DestinationId;
  onGenerateItinerary: (prefs: UserPreferences) => void;
}

export const CreateTripPage: React.FC<CreateTripPageProps> = ({
  initialDestination,
  onGenerateItinerary
}) => {
  const { t, getDestinationName } = useLanguage();
  // Free-form natural language input
  const [nlInput, setNlInput] = useState('');
  const [isParsingNl, setIsParsingNl] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [understoodNotice, setUnderstoodNotice] = useState<string | null>(null);

  // Structured trip form state
  const [destination, setDestination] = useState<DestinationId>(initialDestination);
  const [date, setDate] = useState('2026-09-10');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:30');
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(5000);

  // Preferences
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'history',
    'nature',
    'food'
  ]);
  const [travelStyle, setTravelStyle] = useState<'relaxed' | 'balanced' | 'fast_paced'>('balanced');
  const [walkingPreference, setWalkingPreference] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [transportPreference, setTransportPreference] = useState<'walking' | 'cab' | 'public' | 'rental'>('cab');
  const [foodPreferences, setFoodPreferences] = useState<string[]>(['Bengali Traditional']);

  // Must Visit Places
  const [mustVisitPlaces, setMustVisitPlaces] = useState<string[]>([]);

  // Avoid list
  const [avoidList, setAvoidList] = useState<string[]>(["Don't want too much walking"]);
  const [newAvoidText, setNewAvoidText] = useState('');

  const availablePlaces = PLACES_DATABASE[destination] || [];

  // Voice Input Handler (Speech-to-Text)
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your request.');
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
        setNlInput(transcript);
        handleUnderstandTrip(transcript);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

// Local heuristic parser for instant response and offline/fallback resilience
function parseTripPromptLocally(prompt: string) {
  const lower = prompt.toLowerCase();
  let destination: DestinationId = 'kolkata';
  if (lower.includes('nainital')) destination = 'nainital';
  else if (lower.includes('darjeeling')) destination = 'darjeeling';
  else if (lower.includes('kashmir') || lower.includes('srinagar') || lower.includes('gulmarg') || lower.includes('pahalgam')) destination = 'kashmir';

  let travelers = 2;
  const travelersMatch = lower.match(/(\d+)\s*(people|person|traveler|adult|friend)/i) ||
    lower.match(/with\s*(my\s*)?(parents|family|friends|partner|wife|husband)/i);
  if (travelersMatch) {
    if (travelersMatch[2]?.includes('parent')) travelers = 3;
    else if (travelersMatch[2]?.includes('family')) travelers = 4;
    else if (travelersMatch[1]) travelers = Math.max(1, Math.min(10, parseInt(travelersMatch[1], 10)));
  }

  let durationDays = 1;
  const durationMatch = lower.match(/(\d+)\s*day/i);
  if (durationMatch) durationDays = Math.max(1, Math.min(7, parseInt(durationMatch[1], 10)));

  let budget = 5000;
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr|budget\s*(?:of|is|:)?)\s*(\d+[\d,]*)/i) || lower.match(/\b(\d{4,6})\b/);
  if (budgetMatch) {
    const parsedB = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsedB) && parsedB >= 1000 && parsedB <= 100000) budget = parsedB;
  }

  let walking_preference: 'low' | 'moderate' | 'high' = 'moderate';
  if (
    lower.includes('no walking') ||
    lower.includes("don't want much walking") ||
    lower.includes("don't want too much walking") ||
    lower.includes('low walking') ||
    lower.includes('less walking') ||
    lower.includes('tired') ||
    lower.includes('senior') ||
    lower.includes('elderly')
  ) {
    walking_preference = 'low';
  } else if (lower.includes('trek') || lower.includes('hike') || lower.includes('walking tour')) {
    walking_preference = 'high';
  }

  const interests: string[] = [];
  if (lower.includes('history') || lower.includes('monument') || lower.includes('heritage') || lower.includes('museum')) interests.push('history');
  if (lower.includes('scenic') || lower.includes('view') || lower.includes('nature') || lower.includes('mountain') || lower.includes('lake') || lower.includes('garden')) interests.push('nature');
  if (lower.includes('food') || lower.includes('bengali') || lower.includes('wazwan') || lower.includes('tea') || lower.includes('dine') || lower.includes('street food')) interests.push('food');
  if (lower.includes('shop') || lower.includes('market') || lower.includes('mall road') || lower.includes('bazaar')) interests.push('shopping');
  if (interests.length === 0) interests.push('sightseeing', 'culture');

  const food_preferences: string[] = [];
  if (lower.includes('bengali') || lower.includes('kolkata')) food_preferences.push('Bengali');
  if (lower.includes('kashmiri') || lower.includes('wazwan') || lower.includes('kashmir')) food_preferences.push('Kashmiri Wazwan');
  if (lower.includes('tea') || lower.includes('darjeeling')) food_preferences.push('Darjeeling Tea');
  if (lower.includes('veg') || lower.includes('vegetarian')) food_preferences.push('Vegetarian');

  const avoid: string[] = [];
  if (lower.includes("don't want too much walking") || lower.includes('no walking') || lower.includes('less walking')) {
    avoid.push('Excessive walking / steep climbs');
  }
  if (lower.includes('crowd') || lower.includes('noisy')) avoid.push('Crowded markets');

  return {
    destination,
    duration_days: durationDays,
    travelers,
    interests,
    food_preferences: food_preferences.length > 0 ? food_preferences : ['Local Specialties'],
    walking_preference,
    budget,
    must_visit_places: [],
    avoid
  };
}

  // Helper to apply structured travel preferences to form state
  const applyExtractedTrip = (ext: any) => {
    if (ext.destination && ['kolkata', 'nainital', 'darjeeling', 'kashmir'].includes(ext.destination)) {
      setDestination(ext.destination as DestinationId);
    }
    if (ext.travelers) setTravelers(ext.travelers);
    if (ext.budget) setBudget(ext.budget);
    if (ext.walking_preference) setWalkingPreference(ext.walking_preference);
    if (ext.interests && ext.interests.length > 0) setSelectedInterests(ext.interests);
    if (ext.food_preferences && ext.food_preferences.length > 0) setFoodPreferences(ext.food_preferences);
    if (ext.avoid && ext.avoid.length > 0) setAvoidList(ext.avoid);

    const destName = DESTINATIONS[ext.destination as DestinationId]?.name || ext.destination;
    setUnderstoodNotice(
      `We extracted your trip: ${destName}, ${ext.travelers || 2} travelers, ₹${ext.budget || 5000} budget, ${ext.walking_preference || 'moderate'} walking.`
    );
  };

  // Natural Language Understand My Trip API
  const handleUnderstandTrip = async (textToParse = nlInput) => {
    if (!textToParse.trim()) return;
    setIsParsingNl(true);
    setUnderstoodNotice(null);

    // Immediately parse locally so the user has zero lag
    const localExt = parseTripPromptLocally(textToParse);
    applyExtractedTrip(localExt);

    // Also call backend endpoint with a strict timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch('/api/nlp/understand-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToParse }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.extracted) {
          applyExtractedTrip(data.extracted);
        }
      }
    } catch {
      clearTimeout(timeoutId);
      // Gracefully uses localExtracted values already applied
    } finally {
      setIsParsingNl(false);
    }
  };

  // Toggle Interests
  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  // Toggle Must Visit
  const toggleMustVisit = (placeId: string) => {
    setMustVisitPlaces(prev =>
      prev.includes(placeId) ? prev.filter(p => p !== placeId) : [...prev, placeId]
    );
  };

  // Add Avoid item
  const handleAddAvoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvoidText.trim()) return;
    setAvoidList(prev => [...prev, newAvoidText.trim()]);
    setNewAvoidText('');
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Submit & Generate Itinerary
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const prefs: UserPreferences = {
      destination,
      date,
      start_time: startTime,
      end_time: endTime,
      travelers,
      budget,
      interests: selectedInterests,
      travel_style: travelStyle,
      walking_preference: walkingPreference,
      transport_preference: transportPreference,
      food_preference: foodPreferences,
      must_visit_places: mustVisitPlaces,
      avoid: avoidList
    };
    onGenerateItinerary(prefs);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">
            Step 1: Journey Requirements
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {t('create_title')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('create_subtitle')}
          </p>
        </div>

        {/* Section: Natural Language Input Hero Box */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/60 to-white p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-teal-900 flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>{t('nl_input_label')}</span>
            </label>
            <span className="text-[11px] text-slate-500 font-medium">AI Structured Extraction</span>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              placeholder={t('nl_input_placeholder')}
              className="w-full rounded-xl bg-white border border-slate-300 p-3.5 pr-14 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none leading-relaxed shadow-2xs"
            />

            {/* Voice Input Microphone Button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute right-3 top-3 p-2 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={isListening ? 'Listening...' : 'Voice Input'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="text-[10px] text-slate-500 font-medium">Try:</span>
              <button
                type="button"
                onClick={() => {
                  const example =
                    "I'm visiting Kolkata for one day with my parents. I like history and Bengali food, don't want much walking and have a budget of ₹5000.";
                  setNlInput(example);
                  handleUnderstandTrip(example);
                }}
                className="text-[11px] text-teal-700 hover:text-teal-900 underline underline-offset-2 font-medium"
              >
                "Kolkata 1 day with parents, Bengali food, low walking"
              </button>
            </div>

            <button
              type="button"
              disabled={isParsingNl || !nlInput.trim()}
              onClick={() => handleUnderstandTrip()}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              {isParsingNl ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('nl_parsing')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('nl_parse_btn')}</span>
                </>
              )}
            </button>
          </div>

          {/* We Understood Notice */}
          {understoodNotice && (
            <div className="mt-4 rounded-xl bg-teal-50 border border-teal-200 p-3.5 flex items-start space-x-2 text-xs text-teal-900 animate-in fade-in">
              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-teal-950">We understood your trip: </span>
                <span>{understoodNotice} Editable fields have been updated below.</span>
              </div>
            </div>
          )}
        </div>

        {/* Structured Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Destination Selection (ONLY 4) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
              1. {t('section_destinations')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('section_destinations_desc')}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['kolkata', 'nainital', 'darjeeling', 'kashmir'] as DestinationId[]).map(destId => {
                const isSelected = destination === destId;
                const dest = DESTINATIONS[destId];
                return (
                  <button
                    key={destId}
                    type="button"
                    onClick={() => {
                      setDestination(destId);
                      setMustVisitPlaces([]);
                    }}
                    className={`relative rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 shadow-xs ring-1 ring-teal-400 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                    <p className="font-bold text-sm text-slate-900">{getDestinationName(destId)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{dest.state}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Basic Parameters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
              2. {t('section_logistics')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('label_trip_date')}</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Start & End Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('label_start_time')}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none font-mono shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('label_end_time')}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none font-mono shadow-2xs"
                />
              </div>

              {/* Travelers */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('label_travelers')}</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={travelers}
                  onChange={e => setTravelers(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Budget */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">{t('label_budget')}</label>
                <span className="font-mono text-sm font-bold text-teal-800">₹{budget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={30000}
                step={500}
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Section: Preferences */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
              3. {t('section_preferences')}
            </h3>

            {/* Interests */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                {t('label_interests')}
              </label>
              <div className="flex flex-wrap gap-2">
                {['history', 'nature', 'food', 'shopping', 'culture', 'spiritual', 'scenic'].map(
                  cat => {
                    const isSelected = selectedInterests.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border border-teal-300 text-teal-900 font-semibold shadow-2xs'
                            : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {cat}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Walking Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('label_walking')}
                </label>
                <select
                  value={walkingPreference}
                  onChange={e => setWalkingPreference(e.target.value as any)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none shadow-2xs"
                >
                  <option value="low">{t('walking_low')}</option>
                  <option value="moderate">{t('walking_moderate')}</option>
                  <option value="high">{t('walking_high')}</option>
                </select>
              </div>

              {/* Travel Style */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('label_style')}</label>
                <select
                  value={travelStyle}
                  onChange={e => setTravelStyle(e.target.value as any)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none shadow-2xs"
                >
                  <option value="relaxed">{t('style_relaxed')}</option>
                  <option value="balanced">{t('style_balanced')}</option>
                  <option value="fast_paced">{t('style_fast_paced')}</option>
                </select>
              </div>

              {/* Transport Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('label_transport')}
                </label>
                <select
                  value={transportPreference}
                  onChange={e => setTransportPreference(e.target.value as any)}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none shadow-2xs"
                >
                  <option value="cab">{t('transport_cab')}</option>
                  <option value="rental">{t('transport_rental')}</option>
                  <option value="walking">{t('transport_transit')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Must Visit Places */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                4. {t('section_must_visit')}
              </h3>
              <span className="text-xs text-teal-700 font-semibold">
                {mustVisitPlaces.length} selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select key highlights in {getDestinationName(destination)} that must be scheduled.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {availablePlaces.map(place => {
                const isSelected = mustVisitPlaces.includes(place.id);
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => toggleMustVisit(place.id)}
                    className={`flex items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{place.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize mt-0.5 font-medium">
                        {place.category} • {place.estimated_duration_minutes}m
                      </p>
                    </div>
                    <span
                      className={`text-xs ml-2 font-bold ${
                        isSelected ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {isSelected ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Avoid Constraints */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
              5. {t('section_avoid')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('section_avoid_desc')}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {avoidList.map((avoid, index) => (
                <span
                  key={index}
                  className="flex items-center space-x-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-800 font-medium"
                >
                  <span>{avoid}</span>
                  <button
                    type="button"
                    onClick={() => setAvoidList(prev => prev.filter((_, i) => i !== index))}
                    className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAvoidText}
                onChange={e => setNewAvoidText(e.target.value)}
                placeholder="e.g. No steep stairs, avoid crowded hours"
                className="flex-1 rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAddAvoid}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Bottom Action CTA */}
          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <span>{t('btn_generate_itinerary')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
