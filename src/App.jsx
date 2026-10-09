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

export default function App() {
  // Navigation & Flow State: 'hero' | 'scope' | 'research' | 'results' | 'empty' | 'error' | 'loading'
  const [currentView, setCurrentView] = useState('hero');
  
  // Natural-language prompt & mode
  const [prompt, setPrompt] = useState(
    "5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and ryokan stays on a balanced budget."
  );
  const [planMode, setPlanMode] = useState('quick'); // 'quick' | 'personalised'
  
  // Selected categories for research scope
  const [selectedCategories, setSelectedCategories] = useState([
    'stays', 'transport', 'attractions', 'food', 'photo'
  ]);

  // Trip Brief parameters
  const [tripBrief, setTripBrief] = useState({
    destination: "Kyoto, Japan",
    durationDays: 5,
    budgetTier: "Balanced Explorer",
    groupSize: "Romantic Couple",
    transportPreference: "Scenic Rail & High-Speed Shinkansen",
    selectedInterests: ["Zen Sanctuaries & Shrines", "Secret Dining & Hidden Bars", "Cinematic Photography"]
  });

  // Selected sample dataset city
  const [selectedCity, setSelectedCity] = useState("Kyoto, Japan");

  // Modals
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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

  // Handler when user submits prompt from Hero
  const handleLaunchScope = () => {
    // If prompt mentions Amalfi, auto-switch sample city to Amalfi
    if (prompt.toLowerCase().includes("amalfi") || prompt.toLowerCase().includes("italy")) {
      setSelectedCity("Amalfi Coast, Italy");
      setTripBrief(prev => ({
        ...prev,
        destination: "Amalfi Coast, Italy",
        durationDays: 7,
        budgetTier: "Luxury Comfort"
      }));
    } else {
      setSelectedCity("Kyoto, Japan");
      setTripBrief(prev => ({
        ...prev,
        destination: "Kyoto, Japan",
        durationDays: 5,
        budgetTier: "Balanced Explorer"
      }));
    }
    setCurrentView('scope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler from Questionnaire
  const handleSaveQuestionnaire = (formData) => {
    setTripBrief(formData);
    setIsQuestionnaireOpen(false);
    // Update natural language prompt to reflect custom questionnaire
    const interestsStr = formData.selectedInterests.slice(0, 3).join(", ");
    setPrompt(
      `${formData.durationDays} days in ${formData.destination} tailored for a ${formData.groupSize} with focus on ${interestsStr} via ${formData.transportPreference} (${formData.budgetTier}).`
    );
    if (formData.destination.toLowerCase().includes("amalfi")) {
      setSelectedCity("Amalfi Coast, Italy");
    } else {
      setSelectedCity("Kyoto, Japan");
    }
    setCurrentView('scope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler from Scope confirmation
  const handleConfirmLaunch = () => {
    setIsConfirmModalOpen(false);
    setCurrentView('research');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler on Research pipeline completion
  const handleResearchComplete = () => {
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

  const handleSimulateError = () => {
    setCurrentView('error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetryResearch = () => {
    setCurrentView('research');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFeaturedDestination = (cityName) => {
    if (cityName.includes("Kyoto")) {
      setSelectedCity("Kyoto, Japan");
      setPrompt("5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and ryokan stays on a balanced budget.");
      setTripBrief(prev => ({ ...prev, destination: "Kyoto, Japan", durationDays: 5 }));
    } else if (cityName.includes("Amalfi")) {
      setSelectedCity("Amalfi Coast, Italy");
      setPrompt("7 days along the Amalfi Coast and Capri with lemon grove walks, clifftop aperitivos, and scenic ferry transfers for two.");
      setTripBrief(prev => ({ ...prev, destination: "Amalfi Coast, Italy", durationDays: 7, budgetTier: "Luxury Comfort" }));
    } else {
      setPrompt(`7 days exploring ${cityName} with scenic drives, nature trails, and boutique stays.`);
      setTripBrief(prev => ({ ...prev, destination: cityName, durationDays: 7 }));
    }
    setCurrentView('scope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active dataset
  const activeTripData = SAMPLE_TRIPS[selectedCity] || SAMPLE_TRIPS["Kyoto, Japan"];

  return (
    <div className="min-h-screen flex flex-col justify-between editorial-grid-bg relative selection:bg-[#FFE600] selection:text-black">
      {/* Top Navbar */}
      <Navbar
        onStartClick={() => {
          if (currentView === 'hero') {
            handleLaunchScope();
          } else {
            setCurrentView('hero');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        currentView={currentView}
        onResetToHome={() => {
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
            onOpenQuestionnaire={() => setIsQuestionnaireOpen(true)}
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
          />
        )}

        {/* VIEW 3: RESEARCH PROGRESS DASHBOARD */}
        {currentView === 'research' && (
          <ResearchDashboard
            selectedCategories={selectedCategories}
            tripBrief={tripBrief}
            onComplete={handleResearchComplete}
            onError={handleSimulateError}
          />
        )}

        {/* VIEW 4: RESULTS DASHBOARD */}
        {currentView === 'results' && (
          <ResultsDashboard
            tripData={activeTripData}
            onReset={() => {
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
