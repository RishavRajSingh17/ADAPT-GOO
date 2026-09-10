import React, { useState, useEffect } from 'react';
import { DestinationId, Activity, UserPreferences, ItineraryVersion } from './types';
import { DESTINATIONS } from './data/destinations';
import { generateItinerary, generateDemoItinerary } from './services/itineraryEngine';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CreateTripPage } from './pages/CreateTripPage';
import { ReviewTripPage } from './pages/ReviewTripPage';
import { LiveTripPage } from './pages/LiveTripPage';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'review' | 'live'>('home');
  const [activeDestination, setActiveDestination] = useState<DestinationId>('kolkata');
  const [activities, setActivities] = useState<Activity[]>(() => generateDemoItinerary('kolkata'));
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [hasActiveTrip, setHasActiveTrip] = useState<boolean>(true);
  const [planVersion, setPlanVersion] = useState<number>(1);
  const [versionHistory, setVersionHistory] = useState<ItineraryVersion[]>([
    {
      version_number: 1,
      reason: 'Initial generated plan',
      created_at: new Date().toISOString(),
      activities: generateDemoItinerary('kolkata')
    }
  ]);

  // Ensure scroll position resets to top on every view navigation
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentView]);

  // Handle Generating a new custom trip
  const handleGenerateCustomTrip = (prefs: UserPreferences) => {
    setActiveDestination(prefs.destination);
    setUserPreferences(prefs);
    const newActs = generateItinerary(prefs);
    setActivities(newActs);
    setPlanVersion(1);
    setVersionHistory([
      {
        version_number: 1,
        reason: 'Initial custom plan generation',
        created_at: new Date().toISOString(),
        activities: newActs
      }
    ]);
    setHasActiveTrip(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setCurrentView('review');
  };

  // Launch deterministic 1-Click Demo for any of the 4 supported cities
  const handleLaunchDemo = (destId: DestinationId) => {
    setActiveDestination(destId);
    const demoActs = generateDemoItinerary(destId);
    setActivities(demoActs);
    setPlanVersion(1);
    setVersionHistory([
      {
        version_number: 1,
        reason: `Demo initialized for ${DESTINATIONS[destId].name}`,
        created_at: new Date().toISOString(),
        activities: demoActs
      }
    ]);
    setHasActiveTrip(true);
    setCurrentView('live');
  };

  // Lock / Unlock Toggle
  const handleToggleLock = (id: string) => {
    setActivities(prev =>
      prev.map(act => (act.id === id ? { ...act, locked: !act.locked } : act))
    );
  };

  // Remove Activity
  const handleRemoveActivity = (id: string) => {
    setActivities(prev => prev.filter(act => act.id !== id));
  };

  // Move Activity Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setActivities(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Move Activity Down
  const handleMoveDown = (index: number) => {
    if (index >= activities.length - 1) return;
    setActivities(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Plan Version Bump on Accepted Replan
  const handlePlanVersionBump = (newVersionOrActivities: ItineraryVersion | Activity[], reason?: string) => {
    if (Array.isArray(newVersionOrActivities)) {
      const nextVer = planVersion + 1;
      setPlanVersion(nextVer);
      setActivities(newVersionOrActivities);
      setVersionHistory(prev => [
        ...prev,
        {
          version_number: nextVer,
          reason: reason || 'Plan updated',
          created_at: new Date().toISOString(),
          activities: newVersionOrActivities
        }
      ]);
    } else {
      setPlanVersion(newVersionOrActivities.version_number);
      setActivities(newVersionOrActivities.activities);
      setVersionHistory(prev => [...prev, newVersionOrActivities]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Global Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        activeDestination={activeDestination}
        onSelectDestination={dest => {
          setActiveDestination(dest);
          setActivities(generateDemoItinerary(dest));
        }}
        onLaunchDemo={handleLaunchDemo}
        hasActiveTrip={hasActiveTrip}
        planVersion={planVersion}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onStartPlanning={() => setCurrentView('create')}
            onExploreDemo={handleLaunchDemo}
            onSelectDestination={dest => {
              setActiveDestination(dest);
              setActivities(generateDemoItinerary(dest));
            }}
          />
        )}

        {currentView === 'create' && (
          <CreateTripPage
            initialDestination={activeDestination}
            onGenerateItinerary={handleGenerateCustomTrip}
          />
        )}

        {currentView === 'review' && (
          <ReviewTripPage
            destination={activeDestination}
            activities={activities}
            onStartTrip={() => setCurrentView('live')}
            onToggleLock={handleToggleLock}
            onRemoveActivity={handleRemoveActivity}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        )}

        {currentView === 'live' && (
          <LiveTripPage
            destination={activeDestination}
            activities={activities}
            userPreferences={userPreferences}
            onUpdateActivities={setActivities}
            onToggleLock={handleToggleLock}
            onPlanVersionBump={handlePlanVersionBump}
            versions={versionHistory}
            currentPlanVersion={planVersion}
          />
        )}
      </main>
    </div>
  );
}
