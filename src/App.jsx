import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import StateInspectorBar from './components/layout/StateInspectorBar';
import HeroSection from './components/hero/HeroSection';
import QuestionnaireModal from './components/questionnaire/QuestionnaireModal';
import ScopeSelector from './components/scope/ScopeSelector';
import ScopeConfirmModal from './components/scope/ScopeConfirmModal';
import ResearchDashboard from './components/research/ResearchDashboard';
import ResultsDashboard from './components/results/ResultsDashboard';
import EmptyState from './components/states/EmptyState';
import ErrorState from './components/states/ErrorState';
import LoadingSkeleton from './components/states/LoadingSkeleton';

import { SAMPLE_TRIPS } from './data/mockTrips';
import { SCOPE_CATEGORIES } from './data/scopeCategories';
import { getBackendHealth } from './services/api';
import { parseTripPrompt, normalizeDestination } from './utils/promptParser';
import { buildActiveTripData } from './utils/tripBuilder';

export default function App() {
  // Navigation & Flow State: 'hero' | 'scope' | 'research' | 'results' | 'empty' | 'error' | 'loading'
  const [currentView, setCurrentView] = useState('hero');
  
  // Natural-language prompt & mode
  const [prompt, setPrompt] = useState(
    "5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and traditional stays on a balanced budget."
  );
  const [planMode, setPlanMode] = useState('quick'); // 'quick' | 'personalised'
  
  // Selected categories for research scope
  const [selectedCategories, setSelectedCategories] = useState([
    'attractions', 'stays', 'transport', 'food', 'photo'
  ]);

  // Structured Trip Brief parameters (strictly separated from raw originalPrompt)
  const [tripBrief, setTripBrief] = useState({
    originalPrompt: "5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and traditional stays on a balanced budget.",
    prompt: "5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and traditional stays on a balanced budget.",
    destination: "Kyoto, Japan",
    durationDays: 5,
    budgetTarget: null,
    budgetCurrency: "USD",
    travelStyle: "Balanced Explorer",
    budgetTier: "Balanced Explorer",
    groupType: "Romantic Couple",
    groupSize: "Romantic Couple",
    transportPreference: "Scenic Rail & Regional Transit",
    selectedInterests: ["Cultural Sanctuaries & Historic Sites", "Secret Dining & Hidden Bars", "Cinematic Photography"]
  });

  // Selected sample dataset city for fallback
  const [selectedCity, setSelectedCity] = useState("Kyoto, Japan");

  // Real research result from backend
  const [liveResearchResult, setLiveResearchResult] = useState(null);
  const [useDemoFallback, setUseDemoFallback] = useState(false);

  // Modals
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Backend health status
  const [backendHealth, setBackendHealth] = useState(null);

  // Reduced motion toggle
  const [reducedMotion, setReducedMotion] = useState(false);

  // Apply reduced motion class to root if enabled
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  // Check backend health on initial load
  useEffect(() => {
    async function checkHealth() {
      const health = await getBackendHealth();
      setBackendHealth(health);
    }
    checkHealth();
  }, []);

  // Helper to open questionnaire with parsed prompt fields pre-populated
  const handleOpenQuestionnaireFromPrompt = () => {
    const parsed = parseTripPrompt(prompt);
    setTripBrief(prev => ({
      ...prev,
      originalPrompt: parsed.originalPrompt || prompt,
      prompt: parsed.originalPrompt || prompt,
      destination: parsed.destination || prev.destination,
      durationDays: parsed.durationDays || prev.durationDays,
      budgetTarget: parsed.budgetTarget,
      budgetCurrency: parsed.budgetCurrency || "USD",
      travelStyle: parsed.travelStyle || prev.travelStyle || prev.budgetTier,
      budgetTier: parsed.travelStyle || prev.budgetTier,
      groupType: parsed.groupType || prev.groupType || prev.groupSize,
      groupSize: parsed.groupType || prev.groupSize
    }));
    setIsQuestionnaireOpen(true);
  };

  // Handler when user submits prompt from Hero
  const handleLaunchScope = () => {
    const parsed = parseTripPrompt(prompt);

    if (parsed.needsClarification) {
      // Prompt lacks a clear destination; prompt user via questionnaire modal
      setIsQuestionnaireOpen(true);
      return;
    }

    const cleanDestination = parsed.destination;
    const newDuration = parsed.durationDays;
    const newTravelStyle = parsed.travelStyle || "Balanced Explorer";
    const newGroupType = parsed.groupType || "Romantic Couple";

    if (cleanDestination.toLowerCase().includes("amalfi")) {
      setSelectedCity("Amalfi Coast, Italy");
    } else if (cleanDestination.toLowerCase().includes("kyoto")) {
      setSelectedCity("Kyoto, Japan");
    } else {
      setSelectedCity(cleanDestination);
    }

    // Reset any previous live results from an older research run so the new destination is clean
    setLiveResearchResult(null);

    setTripBrief(prev => ({
      ...prev,
      originalPrompt: parsed.originalPrompt,
      prompt: parsed.originalPrompt,
      destination: cleanDestination,
      durationDays: newDuration,
      budgetTarget: parsed.budgetTarget,
      budgetCurrency: parsed.budgetCurrency || "USD",
      travelStyle: newTravelStyle,
      budgetTier: newTravelStyle,
      groupType: newGroupType,
      groupSize: newGroupType,
      transportPreference: "Scenic Rail & Regional Transit",
      mode: planMode
    }));

    setCurrentView('scope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler from Questionnaire (sanitizes destination even if user typed a full sentence in the Destination field)
  const handleSaveQuestionnaire = (formData) => {
    const parsedFromField = parseTripPrompt(formData.destination || '');
    const parsedFromPrompt = parseTripPrompt(prompt || '');

    const cleanDestination = normalizeDestination(
      formData.destination,
      parsedFromPrompt.destination || "Kyoto, Japan"
    );

    const resolvedDuration = Number(
      formData.durationDays || parsedFromField.durationDays || parsedFromPrompt.durationDays || 5
    );
    const resolvedStyle =
      formData.budgetTier || formData.travelStyle || parsedFromField.travelStyle || "Balanced Explorer";
    const resolvedGroup =
      formData.groupSize || formData.groupType || parsedFromField.groupType || "Romantic Couple";
    const resolvedBudgetTarget =
      parsedFromField.budgetTarget ?? parsedFromPrompt.budgetTarget ?? tripBrief.budgetTarget ?? null;
    const resolvedBudgetCurrency =
      parsedFromField.budgetCurrency || parsedFromPrompt.budgetCurrency || tripBrief.budgetCurrency || "USD";

    const interestsStr = (formData.selectedInterests || []).slice(0, 3).join(", ");
    const synthesizedPrompt =
      prompt && prompt.trim().length > 0
        ? prompt.trim()
        : `${resolvedDuration} days in ${cleanDestination} tailored for ${resolvedGroup} with focus on ${interestsStr} via ${formData.transportPreference} (${resolvedStyle}).`;

    const updatedBrief = {
      ...formData,
      originalPrompt: synthesizedPrompt,
      prompt: synthesizedPrompt,
      destination: cleanDestination,
      durationDays: resolvedDuration,
      budgetTarget: resolvedBudgetTarget,
      budgetCurrency: resolvedBudgetCurrency,
      travelStyle: resolvedStyle,
      budgetTier: resolvedStyle,
      groupType: resolvedGroup,
      groupSize: resolvedGroup,
      mode: 'personalised'
    };

    setLiveResearchResult(null);
    setTripBrief(updatedBrief);
    setIsQuestionnaireOpen(false);

    if (cleanDestination.toLowerCase().includes("amalfi")) {
      setSelectedCity("Amalfi Coast, Italy");
    } else if (cleanDestination.toLowerCase().includes("kyoto")) {
      setSelectedCity("Kyoto, Japan");
    } else {
      setSelectedCity(cleanDestination);
    }

    setCurrentView('scope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler from Scope confirmation
  const handleConfirmLaunch = () => {
    setIsConfirmModalOpen(false);
    setLiveResearchResult(null);
    setUseDemoFallback(false);
    setCurrentView('research');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler on Research pipeline completion
  const handleResearchComplete = (realData) => {
    if (realData) {
      setLiveResearchResult(realData);
      setUseDemoFallback(false);
    }
    if (!reducedMotion) {
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFE600', '#2B59FF', '#FFFFFF']
        });
      } catch (e) {
        // Ignore confetti if not supported
      }
    }
    setCurrentView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler when user opts to fallback to demo prototype mode
  const handleFallbackToDemo = () => {
    setUseDemoFallback(true);
    setCurrentView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSimulateError = () => {
    setCurrentView('error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetryResearch = () => {
    setCurrentView('research');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFeaturedDestination = (cityName) => {
    setLiveResearchResult(null);
    if (cityName.includes("Kyoto")) {
      const p = "5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and traditional stays on a balanced budget.";
      setSelectedCity("Kyoto, Japan");
      setPrompt(p);
      setTripBrief(prev => ({
        ...prev,
        originalPrompt: p,
        prompt: p,
        destination: "Kyoto, Japan",
        durationDays: 5,
        budgetTarget: null,
        travelStyle: "Balanced Explorer",
        budgetTier: "Balanced Explorer"
      }));
    } else if (cityName.includes("Amalfi")) {
      const p = "7 days along the Amalfi Coast and Capri with lemon grove walks, clifftop aperitivos, and scenic ferry transfers for two.";
      setSelectedCity("Amalfi Coast, Italy");
      setPrompt(p);
      setTripBrief(prev => ({
        ...prev,
        originalPrompt: p,
        prompt: p,
        destination: "Amalfi Coast, Italy",
        durationDays: 7,
        budgetTarget: null,
        travelStyle: "Luxury Comfort",
        budgetTier: "Luxury Comfort",
        groupType: "Romantic Couple",
        groupSize: "Romantic Couple"
      }));
    } else {
      const p = `7 days exploring ${cityName} with scenic drives, nature trails, and boutique stays.`;
      setPrompt(p);
      setTripBrief(prev => ({
        ...prev,
        originalPrompt: p,
        prompt: p,
        destination: cityName,
        durationDays: 7,
        budgetTarget: null
      }));
    }
    setCurrentView('scope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Construct Active Dataset (Live findings prioritized when present)
  const activeTripData = buildActiveTripData({
    tripBrief,
    liveResearchResult,
    useDemoFallback,
    selectedCity
  });

  return (
    <div className="min-h-screen flex flex-col justify-between editorial-grid-bg relative selection:bg-[#FFE600] selection:text-black">
      {/* Top Navbar */}
      <Navbar
        onStartClick={() => {
          if (currentView === 'hero') {
            handleLaunchScope();
          } else {
            setLiveResearchResult(null);
            setUseDemoFallback(false);
            setCurrentView('hero');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        currentView={currentView}
        onResetToHome={() => {
          setLiveResearchResult(null);
          setUseDemoFallback(false);
          setCurrentView('hero');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* VIEW 1: HERO / LANDING */}
        {currentView === 'hero' && (
          <HeroSection
            prompt={prompt}
            setPrompt={setPrompt}
            planMode={planMode}
            setPlanMode={setPlanMode}
            onLaunchScope={handleLaunchScope}
            onOpenQuestionnaire={handleOpenQuestionnaireFromPrompt}
            onSelectDestination={handleSelectFeaturedDestination}
          />
        )}

        {/* VIEW 2: RESEARCH SCOPE PREVIEW */}
        {currentView === 'scope' && (
          <ScopeSelector
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            tripBrief={tripBrief}
            onOpenConfirmation={() => setIsConfirmModalOpen(true)}
            onBackToPrompt={() => {
              setCurrentView('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenQuestionnaire={() => setIsQuestionnaireOpen(true)}
          />
        )}

        {/* VIEW 3: REAL RESEARCH DASHBOARD */}
        {currentView === 'research' && (
          <ResearchDashboard
            selectedCategories={selectedCategories}
            tripBrief={tripBrief}
            onComplete={handleResearchComplete}
            onFallbackToDemo={handleFallbackToDemo}
          />
        )}

        {/* VIEW 4: RESULTS DASHBOARD */}
        {currentView === 'results' && (
          <ResultsDashboard
            tripData={activeTripData}
            onReset={() => {
              setLiveResearchResult(null);
              setUseDemoFallback(false);
              setCurrentView('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onModifyScope={() => {
              setCurrentView('scope');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 5: EMPTY STATE */}
        {currentView === 'empty' && (
          <EmptyState
            onSelectPreset={(presetPrompt) => {
              setPrompt(presetPrompt);
              setCurrentView('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToStudio={() => {
              setCurrentView('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 6: ERROR & RETRY STATE */}
        {currentView === 'error' && (
          <ErrorState
            onRetry={handleRetryResearch}
            onBackToScope={() => {
              setCurrentView('scope');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 7: LOADING SKELETON */}
        {currentView === 'loading' && (
          <div className="py-8">
            <div className="max-w-6xl mx-auto px-4 mb-4 text-left">
              <span className="text-xs font-mono uppercase text-[#FFE600]">
                DEMO PREVIEW • SHIMMER SKELETON STATE
              </span>
            </div>
            <LoadingSkeleton />
          </div>
        )}
      </main>

      {/* Personalised Questionnaire Modal */}
      <QuestionnaireModal
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        initialData={tripBrief}
        onSaveAndProceed={handleSaveQuestionnaire}
      />

      {/* Mandatory Scope Confirmation Modal */}
      <ScopeConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        tripBrief={tripBrief}
        selectedCategories={selectedCategories}
        onConfirmLaunch={handleConfirmLaunch}
      />

      {/* Hackathon State Inspector Floating Dock */}
      <StateInspectorBar
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        reducedMotion={reducedMotion}
        setReducedMotion={setReducedMotion}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
