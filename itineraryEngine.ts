import { Activity, DestinationId, Place, UserPreferences } from '../types';
import { DESTINATIONS, estimateTravelMinutes, PLACES_DATABASE } from '../data/destinations';

/**
 * Helper to format minutes from midnight to "HH:MM" string
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = Math.max(0, minutes) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = Math.floor(normalized % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Helper to parse "HH:MM" string into minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 9 * 60;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats "HH:MM" into "12-hour AM/PM" string e.g. "02:30 PM"
 */
export function format12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 === 0 ? 12 : h % 12;
  return `${displayHours}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generates an initial realistic itinerary based on user preferences and constraints
 */
export function generateItinerary(prefs: UserPreferences): Activity[] {
  const destId = prefs.destination;
  const availablePlaces = [...(PLACES_DATABASE[destId] || [])];
  const startMins = timeStringToMinutes(prefs.start_time || '09:00');
  const endMins = timeStringToMinutes(prefs.end_time || '21:30');

  // Categorize must-visit, preferred, and optional
  const selectedPlaces: Place[] = [];

  // 1. First prioritize must-visit places requested by user
  for (const mvId of prefs.must_visit_places || []) {
    const found = availablePlaces.find(p => p.id === mvId || p.name.toLowerCase().includes(mvId.toLowerCase()));
    if (found && !selectedPlaces.some(p => p.id === found.id)) {
      selectedPlaces.push({ ...found, priority: 'must_do' });
    }
  }

  // 2. Add lunch/dinner food slots if food preference or default lunch is missing
  const lunchPlace = availablePlaces.find(p => p.category === 'food' && p.bestTimeOfDay === 'afternoon');
  if (lunchPlace && !selectedPlaces.some(p => p.id === lunchPlace.id)) {
    selectedPlaces.push(lunchPlace);
  }

  // 3. Score remaining places by user interests
  const remainingCandidates = availablePlaces.filter(p => !selectedPlaces.some(sp => sp.id === p.id));
  const scoredCandidates = remainingCandidates.map(p => {
    let score = 0;
    if (prefs.interests.some(interest => p.tags.includes(interest.toLowerCase()) || p.category === interest.toLowerCase())) {
      score += 30;
    }
    if (prefs.walking_preference === 'low' && p.indoor) {
      score += 15;
    }
    if (prefs.avoid.some(avoidWord => p.name.toLowerCase().includes(avoidWord.toLowerCase()) || p.tags.includes(avoidWord.toLowerCase()))) {
      score -= 50;
    }
    if (p.priority === 'must_do') score += 25;
    if (p.priority === 'preferred') score += 10;
    return { place: p, score };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  // Fill up available slots
  for (const candidate of scoredCandidates) {
    if (candidate.score < 0) continue;
    selectedPlaces.push(candidate.place);
    if (selectedPlaces.length >= 6) break; // Typical comfortable day itinerary
  }

  // If we still need dinner, add evening dinner venue
  const dinnerPlace = availablePlaces.find(p => p.category === 'food' && p.bestTimeOfDay === 'evening');
  if (dinnerPlace && !selectedPlaces.some(p => p.id === dinnerPlace.id)) {
    selectedPlaces.push({ ...dinnerPlace, priority: 'must_do' });
  }

  // Sequence activities logically by time of day: morning -> afternoon -> evening
  const morningList: Place[] = [];
  const afternoonList: Place[] = [];
  const eveningList: Place[] = [];

  for (const p of selectedPlaces) {
    if (p.bestTimeOfDay === 'morning' || p.bestTimeOfDay === 'sunrise') {
      morningList.push(p);
    } else if (p.bestTimeOfDay === 'evening' || p.bestTimeOfDay === 'sunset' || p.id.includes('dinner')) {
      eveningList.push(p);
    } else {
      afternoonList.push(p);
    }
  }

  const sequencedPlaces = [...morningList, ...afternoonList, ...eveningList];

  // Schedule activities chronologically with calculated realistic travel times
  const activities: Activity[] = [];
  let currentClock = startMins;

  for (let i = 0; i < sequencedPlaces.length; i++) {
    const place = sequencedPlaces[i];
    let travelMins = 0;

    if (i > 0) {
      const prevPlace = sequencedPlaces[i - 1];
      travelMins = estimateTravelMinutes(destId, prevPlace.latitude, prevPlace.longitude, place.latitude, place.longitude);
    } else {
      travelMins = 15; // transit from hotel
    }

    const activityStartMins = currentClock + travelMins;
    const duration = place.estimated_duration_minutes;
    const activityEndMins = activityStartMins + duration;

    // Check if within bounds
    if (activityEndMins > endMins + 45 && activities.length >= 3) {
      break;
    }

    const isLockedDinner = place.id.includes('dinner') || place.category === 'food' && place.bestTimeOfDay === 'evening';

    activities.push({
      id: `act_${place.id}_${i}`,
      placeId: place.id,
      name: place.name,
      location: {
        latitude: place.latitude,
        longitude: place.longitude,
        address: `${place.name}, ${place.city}`
      },
      start_time: minutesToTimeString(activityStartMins),
      end_time: minutesToTimeString(activityEndMins),
      duration_minutes: duration,
      travel_time_minutes: travelMins,
      priority: isLockedDinner ? 'LOCKED' : (place.priority === 'must_do' ? 'MUST_DO' : place.priority === 'preferred' ? 'PREFERRED' : 'OPTIONAL'),
      status: 'SCHEDULED',
      locked: isLockedDinner,
      indoor: place.indoor,
      outdoor: place.outdoor,
      category: place.category,
      costEstimateINR: place.costEstimateINR,
      notes: place.description
    });

    currentClock = activityEndMins;
  }

  return activities;
}

/**
 * Creates the standard deterministic demo itinerary for each city
 */
export function getDemoTripActivities(destId: DestinationId): Activity[] {
  const dest = DESTINATIONS[destId];
  const placeIds = dest.demoScenario.defaultTripPlaces;
  const places = PLACES_DATABASE[destId];

  const orderedPlaces = placeIds.map(id => places.find(p => p.id === id)).filter((p): p is Place => !!p);

  const activities: Activity[] = [];
  let clock = 9 * 60; // 09:00 AM

  for (let i = 0; i < orderedPlaces.length; i++) {
    const p = orderedPlaces[i];
    let travelMins = 0;
    if (i > 0) {
      const prev = orderedPlaces[i - 1];
      travelMins = estimateTravelMinutes(destId, prev.latitude, prev.longitude, p.latitude, p.longitude);
    } else {
      travelMins = 10;
    }

    const start = clock + travelMins;
    const duration = p.estimated_duration_minutes;
    const end = start + duration;

    const isDinner = p.id.includes('dinner') || (p.category === 'food' && p.bestTimeOfDay === 'evening');

    activities.push({
      id: `act_${p.id}_demo`,
      placeId: p.id,
      name: p.name,
      location: {
        latitude: p.latitude,
        longitude: p.longitude,
        address: `${p.name}, ${p.city}`
      },
      start_time: minutesToTimeString(start),
      end_time: minutesToTimeString(end),
      duration_minutes: duration,
      travel_time_minutes: travelMins,
      priority: isDinner ? 'LOCKED' : p.priority === 'must_do' ? 'MUST_DO' : p.priority === 'preferred' ? 'PREFERRED' : 'OPTIONAL',
      status: i === 0 ? 'COMPLETED' : i === 1 ? 'IN_PROGRESS' : 'SCHEDULED',
      locked: isDinner,
      indoor: p.indoor,
      outdoor: p.outdoor,
      category: p.category,
      costEstimateINR: p.costEstimateINR,
      notes: p.description
    });

    clock = end;
  }

  return activities;
}

export const generateDemoItinerary = getDemoTripActivities;
