import { Activity, ImpactAnalysis, LiveEvent } from '../types';
import { timeStringToMinutes } from './itineraryEngine';

/**
 * Evaluates live real-world events against the remaining activities to determine
 * whether a disruption meaningfully affects the itinerary.
 *
 * Adheres strictly to Product Rule 1: "Don't replan for insignificant changes."
 */
export function analyzeImpact(
  events: LiveEvent[],
  activities: Activity[],
  currentActivityId: string | null
): ImpactAnalysis {
  if (!events || events.length === 0) {
    return {
      hasMeaningfulImpact: false,
      affectedActivityIds: [],
      reasons: [],
      severity: 'LOW',
      detectedEvents: [],
      recommendedStrategy: 'KEEP',
      summary: 'All conditions normal. Itinerary is on schedule.'
    };
  }

  const affectedActivityIds = new Set<string>();
  const reasons: string[] = [];
  let maxSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  // Only consider remaining and current activities (Rule 3: Don't modify completed activities)
  const nonCompletedActivities = activities.filter(a => a.status !== 'COMPLETED');

  for (const event of events) {
    switch (event.type) {
      case 'WEATHER': {
        // Heavy rain or severe storm directly affects outdoor activities
        const isSevere = event.severity === 'HIGH' || event.severity === 'CRITICAL' || (event.precipitationProbability ?? 0) > 70;
        
        if (isSevere) {
          const outdoorActs = nonCompletedActivities.filter(a => a.outdoor && !a.indoor);
          const hybridActs = nonCompletedActivities.filter(a => a.outdoor && a.indoor);

          if (outdoorActs.length > 0) {
            outdoorActs.forEach(a => affectedActivityIds.add(a.id));
            reasons.push(
              `${event.title}: Heavy precipitation directly impacts strictly outdoor activity '${outdoorActs.map(a => a.name).join(', ')}'.`
            );
            maxSeverity = 'HIGH';
          } else if (hybridActs.length > 0 && event.severity === 'CRITICAL') {
            hybridActs.forEach(a => affectedActivityIds.add(a.id));
            reasons.push(`${event.title}: Severe squall limits garden access at '${hybridActs.map(a => a.name).join(', ')}'.`);
            maxSeverity = 'MEDIUM';
          }
        } else {
          // Light drizzle or insignificant cloud cover (Rule 1)
          reasons.push(`${event.title}: Mild weather conditions detected. No impact on schedule.`);
        }
        break;
      }

      case 'TRAFFIC':
      case 'TRANSPORT_DELAY': {
        const delayMins = event.estimated_delay_minutes ?? 0;
        // Check Rule 1: Delay under 10 minutes is insignificant and can be absorbed by transit buffer
        if (delayMins <= 12) {
          reasons.push(`${event.title}: Minor delay of ${delayMins} mins absorbed by buffer. No replanning required.`);
          if (maxSeverity === 'LOW') maxSeverity = 'LOW';
          continue;
        }

        // Significant traffic delay (> 15 mins)
        // Find next upcoming activity
        const targetAct = event.affectedActivityId 
          ? nonCompletedActivities.find(a => a.id === event.affectedActivityId)
          : nonCompletedActivities.find(a => a.id !== currentActivityId);

        if (targetAct) {
          affectedActivityIds.add(targetAct.id);
          reasons.push(
            `${event.title}: Severe transit congestion (+${delayMins} mins) causes late arrival at '${targetAct.name}'.`
          );
          maxSeverity = delayMins > 30 ? 'HIGH' : 'MEDIUM';

          // Check if delay cascades into locked dinner or closing hours
          const lockedActs = nonCompletedActivities.filter(a => a.locked);
          if (lockedActs.length > 0) {
            reasons.push(`Compounded delay threatens hard constraint on fixed reservation '${lockedActs[0].name}'.`);
            maxSeverity = 'CRITICAL';
          }
        }
        break;
      }

      case 'CLOSURE': {
        // Specific venue closed
        const closedAct = nonCompletedActivities.find(a => 
          (event.affectedActivityId && a.id === event.affectedActivityId) ||
          event.description.toLowerCase().includes(a.name.toLowerCase()) ||
          event.title.toLowerCase().includes(a.name.toLowerCase())
        );

        if (closedAct) {
          affectedActivityIds.add(closedAct.id);
          reasons.push(
            `Venue Closure: '${closedAct.name}' is temporarily closed. Activity is completely unavailable.`
          );
          maxSeverity = 'CRITICAL';
        }
        break;
      }

      case 'USER_DELAY': {
        const delayMins = event.estimated_delay_minutes ?? 40;
        if (delayMins > 15) {
          // Shifting schedule forward affects subsequent stops
          nonCompletedActivities.slice(0, 2).forEach(a => affectedActivityIds.add(a.id));
          reasons.push(
            `Traveler running ${delayMins} minutes behind schedule. Timeline requires compression or shifting.`
          );
          maxSeverity = 'HIGH';
        }
        break;
      }

      case 'USER_CHANGE': {
        // Natural language instruction like "I'm tired", "Skip shopping", "Add café"
        if (event.affectedActivityId) {
          affectedActivityIds.add(event.affectedActivityId);
        } else {
          // General change request
          const firstScheduled = nonCompletedActivities.find(a => a.status === 'SCHEDULED');
          if (firstScheduled) affectedActivityIds.add(firstScheduled.id);
        }
        reasons.push(`Traveler preference update: ${event.description}`);
        maxSeverity = 'MEDIUM';
        break;
      }

      case 'TIME_SHORTAGE': {
        reasons.push(`Remaining trip window shortened: ${event.description}`);
        maxSeverity = 'HIGH';
        break;
      }
    }
  }

  const hasMeaningfulImpact = affectedActivityIds.size > 0 && (maxSeverity === 'HIGH' || maxSeverity === 'CRITICAL' || maxSeverity === 'MEDIUM');

  let recommendedStrategy: 'KEEP' | 'REORDER' | 'DELAY' | 'REPLACE' | 'REMOVE' | 'ADD' = 'KEEP';
  if (hasMeaningfulImpact) {
    if (events.some(e => e.type === 'WEATHER')) {
      recommendedStrategy = 'REORDER'; // swap outdoor with later indoor slot
    } else if (events.some(e => e.type === 'CLOSURE')) {
      recommendedStrategy = 'REPLACE'; // substitute alternative venue
    } else if (events.some(e => e.type === 'TRAFFIC' || e.type === 'USER_DELAY')) {
      recommendedStrategy = 'DELAY'; // shift or optimize order
    } else if (events.some(e => e.type === 'USER_CHANGE')) {
      recommendedStrategy = 'REMOVE';
    }
  }

  return {
    hasMeaningfulImpact,
    affectedActivityIds: Array.from(affectedActivityIds),
    reasons,
    severity: maxSeverity,
    detectedEvents: events,
    recommendedStrategy,
    summary: hasMeaningfulImpact
      ? `${reasons[0]} Adaptive replanning recommended.`
      : 'Conditions assessed: No changes necessary to keep itinerary on track.'
  };
}
