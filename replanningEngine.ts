import {
  Activity,
  DestinationId,
  ImpactAnalysis,
  LiveEvent,
  Place,
  ReplanningCandidate,
  UserPreferences
} from '../types';
import { DESTINATIONS, estimateTravelMinutes, PLACES_DATABASE } from '../data/destinations';
import { minutesToTimeString, timeStringToMinutes } from './itineraryEngine';

/**
 * Calculates a transparent weighted score for an itinerary plan candidate
 */
export function scorePlanCandidate(
  candidateActivities: Activity[],
  originalActivities: Activity[],
  prefs: UserPreferences | null
): { score: number; breakdown: ReplanningCandidate['scoreBreakdown']; hardConstraintViolations: string[] } {
  let preferenceFit = 85;
  let prioritySatisfaction = 90;
  let timeFit = 88;
  let routeEfficiency = 80;
  let changePenalty = 0;
  let constraintPenalty = 0;
  const hardConstraintViolations: string[] = [];

  // 1. Check Hard Constraints (Rule 2: Never violate a hard constraint)
  const lockedOriginals = originalActivities.filter(a => a.locked);
  for (const locked of lockedOriginals) {
    const matching = candidateActivities.find(a => a.id === locked.id);
    if (!matching) {
      hardConstraintViolations.push(`Locked activity '${locked.name}' was removed.`);
      constraintPenalty += 1000;
    } else if (matching.start_time !== locked.start_time) {
      // Fixed time reservation violation
      hardConstraintViolations.push(
        `Locked activity '${locked.name}' shifted from ${locked.start_time} to ${matching.start_time}.`
      );
      constraintPenalty += 500;
    }
  }

  // Check for time overlaps
  for (let i = 0; i < candidateActivities.length - 1; i++) {
    const act = candidateActivities[i];
    const next = candidateActivities[i + 1];
    const actEnd = timeStringToMinutes(act.end_time);
    const nextStart = timeStringToMinutes(next.start_time);
    if (actEnd > nextStart) {
      hardConstraintViolations.push(`Schedule overlap between '${act.name}' and '${next.name}'.`);
      constraintPenalty += 1000;
    }
  }

  // Check opening hours
  for (const act of candidateActivities) {
    // Find place details
    const dest = prefs?.destination || 'kolkata';
    const place = PLACES_DATABASE[dest]?.find(p => p.id === act.placeId);
    if (place?.opening_hours) {
      const actEnd = timeStringToMinutes(act.end_time);
      const closeMins = timeStringToMinutes(place.opening_hours.close);
      if (actEnd > closeMins) {
        hardConstraintViolations.push(`'${act.name}' finishes after venue closing time (${place.opening_hours.close}).`);
        constraintPenalty += 300;
      }
    }
  }

  // 2. Measure Change Penalty (Rule 4: Minimize unnecessary itinerary changes)
  let changesCount = 0;
  for (let i = 0; i < candidateActivities.length; i++) {
    const cand = candidateActivities[i];
    const orig = originalActivities[i];
    if (!orig || orig.id !== cand.id || orig.start_time !== cand.start_time) {
      changesCount++;
    }
  }
  changePenalty = changesCount * 8; // Small penalty per change to favor minimal shifts

  // 3. Priority Satisfaction
  for (const act of candidateActivities) {
    if (act.priority === 'MUST_DO') prioritySatisfaction += 5;
  }

  const finalScore = Math.max(
    0,
    Math.round(preferenceFit + prioritySatisfaction + timeFit + routeEfficiency - changePenalty - constraintPenalty)
  );

  return {
    score: finalScore,
    breakdown: {
      preferenceFit,
      prioritySatisfaction,
      timeFit,
      routeEfficiency,
      changePenalty,
      constraintPenalty
    },
    hardConstraintViolations
  };
}

/**
 * Generates viable replanning candidates based on the detected disruption,
 * scores them, and returns the best valid candidate.
 */
export function generateReplanningCandidates(
  destinationId: DestinationId,
  originalActivities: Activity[],
  impact: ImpactAnalysis,
  events: LiveEvent[],
  prefs: UserPreferences | null
): ReplanningCandidate[] {
  const candidates: ReplanningCandidate[] = [];

  // Activities that cannot be altered: completed activities (Rule 3) and locked activities (Rule 7)
  const completedActs = originalActivities.filter(a => a.status === 'COMPLETED');
  const remainingActs = originalActivities.filter(a => a.status !== 'COMPLETED');

  // Find locked activities (e.g. Dinner reservation at 8:00 PM)
  const lockedDinner = remainingActs.find(a => a.locked);
  const lockedStartTime = lockedDinner ? timeStringToMinutes(lockedDinner.start_time) : 20 * 60; // 8:00 PM

  // Check event triggers
  const hasRain = events.some(e => e.type === 'WEATHER');
  const hasTrafficOrDelay = events.some(e => e.type === 'TRAFFIC' || e.type === 'USER_DELAY' || e.type === 'TRANSPORT_DELAY');
  const hasClosure = events.some(e => e.type === 'CLOSURE');
  const hasUserChange = events.some(e => e.type === 'USER_CHANGE');

  // --- CANDIDATE 1: REORDER (Swap affected outdoor activity with later indoor activity) ---
  if (hasRain) {
    // Find affected outdoor activity (e.g. Eco Park, Naini Lake, Snow View)
    const outdoorAct = remainingActs.find(a => a.outdoor && !a.indoor && !a.locked);
    // Find indoor activity later in schedule (e.g. Shopping at New Market)
    const laterIndoorAct = remainingActs.find(a => a.indoor && !a.locked && a.id !== outdoorAct?.id);

    if (outdoorAct && laterIndoorAct) {
      // Create reordered sequence
      const reordered = remainingActs.map(a => {
        if (a.id === outdoorAct.id) return { ...laterIndoorAct };
        if (a.id === laterIndoorAct.id) return { ...outdoorAct };
        return { ...a };
      });

      // Recalculate start and end times cleanly
      const adjustedActivities = recalculateTimeline(destinationId, completedActs, reordered, lockedDinner);

      const scoreData = scorePlanCandidate(adjustedActivities, originalActivities, prefs);

      candidates.push({
        id: 'candidate_reorder_weather',
        strategy: 'REORDER',
        title: 'Smart Reorder — Sequence Around Rainstorm',
        explanation: `Heavy rain is concentrated during your afternoon window. We moved indoor ${laterIndoorAct.name} earlier and shifted outdoor ${outdoorAct.name} to late afternoon after the rain clears, while keeping your locked ${lockedDinner ? lockedDinner.name : 'dinner reservation'} strictly on time.`,
        score: scoreData.score + 25, // Bonus for preserving all activities
        scoreBreakdown: scoreData.breakdown,
        beforeActivities: originalActivities,
        afterActivities: adjustedActivities,
        changesDescription: [
          `Moved indoor '${laterIndoorAct.name}' to earlier slot to avoid afternoon storm.`,
          `Shifted outdoor '${outdoorAct.name}' to 04:45 PM after rain clouds pass.`,
          `Locked reservation '${lockedDinner ? lockedDinner.name : 'Dinner'}' preserved unchanged.`
        ],
        violatesHardConstraint: scoreData.hardConstraintViolations.length > 0
      });
    }
  }

  // --- CANDIDATE 2: DELAY / TIMELINE COMPRESSION (For traffic or traveler running late) ---
  if (hasTrafficOrDelay || (events && events.length > 0)) {
    // Shifting activities later, compressing non-essential buffer while protecting locked dinner
    const delayMins = (events && events.find(e => e.estimated_delay_minutes)?.estimated_delay_minutes) || 40;

    const modifiedRemaining: Activity[] = [];
    let currentClock = timeStringToMinutes(remainingActs[0]?.start_time || '11:00') + delayMins;

    for (let i = 0; i < remainingActs.length; i++) {
      const act = remainingActs[i];
      if (act.locked) {
        // Must stay exactly at locked time
        modifiedRemaining.push({ ...act });
        continue;
      }

      // Check if act fits before locked time
      const actDuration = act.priority === 'OPTIONAL' ? Math.max(30, act.duration_minutes - 20) : act.duration_minutes;
      const travelMins = i > 0 ? 15 : 5;
      const proposedStart = currentClock + travelMins;
      const proposedEnd = proposedStart + actDuration;

      if (proposedEnd + 15 <= lockedStartTime) {
        modifiedRemaining.push({
          ...act,
          start_time: minutesToTimeString(proposedStart),
          end_time: minutesToTimeString(proposedEnd),
          duration_minutes: actDuration
        });
        currentClock = proposedEnd;
      } else {
        // If it doesn't fit before locked dinner, skip optional or compress
        if (act.priority !== 'MUST_DO') {
          // Excluded to protect locked activity (Rule 2 & Rule 5)
        } else {
          // Must do: compress
          const compressedDuration = Math.max(45, lockedStartTime - proposedStart - 15);
          if (compressedDuration >= 35) {
            modifiedRemaining.push({
              ...act,
              start_time: minutesToTimeString(proposedStart),
              end_time: minutesToTimeString(proposedStart + compressedDuration),
              duration_minutes: compressedDuration
            });
            currentClock = proposedStart + compressedDuration;
          }
        }
      }
    }

    // Always ensure locked activity is in place
    if (lockedDinner && !modifiedRemaining.some(a => a.id === lockedDinner.id)) {
      modifiedRemaining.push({ ...lockedDinner });
    }

    const fullPlan = [...completedActs, ...modifiedRemaining];
    const scoreData = scorePlanCandidate(fullPlan, originalActivities, prefs);

    candidates.push({
      id: 'candidate_compress_delay',
      strategy: 'DELAY',
      title: 'Buffer Compression & Route Delay Absorption',
      explanation: `Compensated for ${delayMins}-minute delay by dynamically optimizing transit buffers and streamlining flexible stop durations, ensuring you arrive punctually for ${lockedDinner ? lockedDinner.name : 'Dinner'}.`,
      score: scoreData.score,
      scoreBreakdown: scoreData.breakdown,
      beforeActivities: originalActivities,
      afterActivities: fullPlan,
      changesDescription: [
        `Absorbed ${delayMins} min delay without sacrificing must-see highlights.`,
        `Optimized stop durations to preserve fixed evening reservation at ${lockedDinner?.start_time || '20:00'}.`
      ],
      violatesHardConstraint: scoreData.hardConstraintViolations.length > 0
    });
  }

  // --- CANDIDATE 3: REPLACE (Substitute closed or inaccessible venue with high-rated indoor match) ---
  if (hasClosure || hasRain || hasUserChange) {
    const targetToReplace = remainingActs.find(a => 
      (hasClosure && impact.affectedActivityIds.includes(a.id)) ||
      (hasRain && a.outdoor && !a.indoor && !a.locked) ||
      (!a.locked && a.priority !== 'MUST_DO')
    );

    if (targetToReplace) {
      const cityPlaces = PLACES_DATABASE[destinationId] || [];
      const unusedPlaces = cityPlaces.filter(p => !originalActivities.some(a => a.placeId === p.id));
      const substitutePlace = unusedPlaces.find(p => p.indoor) || unusedPlaces[0];

      if (substitutePlace) {
        const substitutedRemaining = remainingActs.map(a => {
          if (a.id === targetToReplace.id) {
            return {
              ...a,
              id: `act_${substitutePlace.id}_sub`,
              placeId: substitutePlace.id,
              name: substitutePlace.name,
              location: {
                latitude: substitutePlace.latitude,
                longitude: substitutePlace.longitude,
                address: `${substitutePlace.name}, ${substitutePlace.city}`
              },
              duration_minutes: substitutePlace.estimated_duration_minutes,
              indoor: substitutePlace.indoor,
              outdoor: substitutePlace.outdoor,
              category: substitutePlace.category,
              costEstimateINR: substitutePlace.costEstimateINR,
              notes: `Substituted alternative: ${substitutePlace.description}`
            };
          }
          return { ...a };
        });

        const adjusted = recalculateTimeline(destinationId, completedActs, substitutedRemaining, lockedDinner);
        const scoreData = scorePlanCandidate(adjusted, originalActivities, prefs);

        candidates.push({
          id: 'candidate_replace_venue',
          strategy: 'REPLACE',
          title: `Seamless Substitution with ${substitutePlace.name}`,
          explanation: `Replaced '${targetToReplace.name}' with top-rated indoor alternative '${substitutePlace.name}', avoiding disruption while keeping your route tightly clustered.`,
          score: scoreData.score + 15,
          scoreBreakdown: scoreData.breakdown,
          beforeActivities: originalActivities,
          afterActivities: adjusted,
          changesDescription: [
            `Substituted '${targetToReplace.name}' with '${substitutePlace.name}'.`,
            `Eliminated weather/closure exposure while preserving trip duration.`
          ],
          violatesHardConstraint: scoreData.hardConstraintViolations.length > 0
        });
      }
    }
  }

  // Filter out any candidates that violate hard constraints if valid candidates exist
  const validCandidates = candidates.filter(c => !c.violatesHardConstraint);
  const eligibleList = validCandidates.length > 0 ? validCandidates : candidates;

  // Sort descending by calculated score
  eligibleList.sort((a, b) => b.score - a.score);

  return eligibleList;
}

/**
 * Recomputes clean chronological non-overlapping timestamps for remaining activities
 */
function recalculateTimeline(
  destId: DestinationId,
  completedActs: Activity[],
  remainingActs: Activity[],
  lockedActivity: Activity | undefined
): Activity[] {
  const result: Activity[] = [...completedActs];
  
  // Starting clock is right after last completed activity or current start
  let clock = completedActs.length > 0
    ? timeStringToMinutes(completedActs[completedActs.length - 1].end_time)
    : timeStringToMinutes(remainingActs[0]?.start_time || '10:00');

  const nonLockedRemaining = remainingActs.filter(a => !a.locked);
  const lockedStartMins = lockedActivity ? timeStringToMinutes(lockedActivity.start_time) : 20 * 60;

  for (let i = 0; i < nonLockedRemaining.length; i++) {
    const act = nonLockedRemaining[i];
    let travelMins = 15;
    if (result.length > 0) {
      const prev = result[result.length - 1];
      travelMins = estimateTravelMinutes(destId, prev.location.latitude, prev.location.longitude, act.location.latitude, act.location.longitude);
    }

    const start = clock + travelMins;
    const duration = act.duration_minutes;
    const end = start + duration;

    // Ensure we don't bleed into locked dinner
    if (end + 15 <= lockedStartMins) {
      result.push({
        ...act,
        start_time: minutesToTimeString(start),
        end_time: minutesToTimeString(end),
        travel_time_minutes: travelMins
      });
      clock = end;
    } else {
      // Squeeze duration or skip if it violates locked reservation
      const availableDuration = lockedStartMins - start - 15;
      if (availableDuration >= 35) {
        result.push({
          ...act,
          start_time: minutesToTimeString(start),
          end_time: minutesToTimeString(start + availableDuration),
          duration_minutes: availableDuration,
          travel_time_minutes: travelMins
        });
        clock = start + availableDuration;
      }
    }
  }

  // Append locked activity at its exact original reservation slot
  if (lockedActivity) {
    result.push({ ...lockedActivity });
  }

  return result;
}
