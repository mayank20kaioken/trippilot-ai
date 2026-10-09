import React, { useState } from 'react';
import { 
  X, Check, ArrowRight, ArrowLeft, MapPin, Calendar, 
  DollarSign, Users, Train, Sparkles, Compass, Heart 
} from 'lucide-react';

const POPULAR_DESTINATIONS = [
  "Kyoto, Japan", "Amalfi Coast, Italy", "Oaxaca, Mexico", 
  "Reykjavik, Iceland", "Banff, Canada", "Mallorca, Spain"
];

const BUDGET_TIERS = [
  { id: 'Backpacker', label: 'Backpacker / Value', range: '$50 - $120 / day', desc: 'Hostels, local transit, market stalls' },
  { id: 'Balanced Explorer', label: 'Balanced Explorer (Recommended)', range: '$180 - $350 / day', desc: 'Boutique hotels, rail passes, mixed dining' },
  { id: 'Luxury Comfort', label: 'Luxury Comfort', range: '$450 - $800 / day', desc: 'Heritage ryokans & villas, fine dining, private transfers' },
  { id: 'Bespoke Haute-Luxe', label: 'Bespoke Haute-Luxe', range: '$1000+ / day', desc: '5-star suites, private guides, Michelin tables' }
];

const GROUP_SIZES = [
  { id: 'Solo Explorer', label: 'Solo Explorer', desc: '1 Traveler' },
  { id: 'Romantic Couple', label: 'Romantic Couple', desc: '2 Adults' },
  { id: 'Family with Kids', label: 'Family with Kids', desc: 'Parents + Children' },
  { id: 'Friends Squad', label: 'Friends Squad', desc: '3-6 Adults' }
];

const TRANSPORT_PREFERENCES = [
  { id: 'Scenic Rail & High-Speed Shinkansen', label: 'Scenic Trains & Rail', desc: 'Passes, metro, zero highway driving' },
  { id: 'Self-Drive Rental Roadtrip', label: 'Self-Drive Rental', desc: 'Total freedom, scenic pull-offs' },
  { id: 'Private Shuttles & Ferries', label: 'Private Shuttles & Ferries', desc: 'Water taxis, door-to-door comfort' },
  { id: 'Eco-Transit & Walking Focus', label: 'Eco-Transit & Walking', desc: 'Low-carbon, bikes & footpaths' }
];

const INTEREST_TAGS = [
  "Zen Sanctuaries & Shrines", "Secret Dining & Hidden Bars", 
  "Alpine Hiking & Nature", "Wellness, Spas & Onsen", 
  "Cinematic Photography", "Artisan Markets & Ceramics", 
  "Historic Architecture", "Local Street Food Crawls"
];

export default function QuestionnaireModal({
  isOpen,
  onClose,
  initialData,
  onSaveAndProceed
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialData || {
    destination: "Kyoto, Japan",
    durationDays: 5,
    budgetTier: "Balanced Explorer",
    groupSize: "Romantic Couple",
    transportPreference: "Scenic Rail & High-Speed Shinkansen",
    selectedInterests: ["Zen Sanctuaries & Shrines", "Secret Dining & Hidden Bars", "Cinematic Photography"]
  });

  if (!isOpen) return null;

  const toggleInterest = (interest) => {
    setFormData(prev => {
      const exists = prev.selectedInterests.includes(interest);
      return {
        ...prev,
        selectedInterests: exists 
          ? prev.selectedInterests.filter(i => i !== interest)
          : [...prev.selectedInterests, interest]
      };
    });
  };

  const handleFinish = () => {
    onSaveAndProceed(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0b1747] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with step counter */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#FFE600] uppercase mb-1">
              <span>Personalised Trip Architect</span>
              <span>•</span>
              <span>Step {step} of 4</span>
            </div>
            <h2 className="text-2xl font-black text-white font-editorial">
              {step === 1 && "Where & How Long?"}
              {step === 2 && "Budget & Group Dynamic"}
              {step === 3 && "Transit & Pacing Style"}
              {step === 4 && "Interests & Secret Desires"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-white/10 h-1">
          <div 
            className="bg-[#FFE600] h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* STEP 1: Destination & Duration */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-2">
                  Destination
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-[#FFE600]" />
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="Enter city, region, or country (e.g. Kyoto, Japan)"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFE600]"
                  />
                </div>
                {/* Destination suggestions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setFormData({ ...formData, destination: dest })}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all border ${
                        formData.destination === dest
                          ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]'
                          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/15'
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-white/70">
                    Trip Duration: <span className="text-[#FFE600] font-bold text-sm">{formData.durationDays} Days</span>
                  </label>
                  <span className="text-xs text-white/50">Optimal research window: 3-14 days</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                  className="w-full accent-[#FFE600] h-2 bg-white/20 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-white/50 mt-1">
                  <span>2 Days (Weekend)</span>
                  <span>5 Days (Balanced)</span>
                  <span>14 Days (Immersion)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Budget & Group */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-3">
                  Budget Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUDGET_TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setFormData({ ...formData, budgetTier: tier.id })}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        formData.budgetTier === tier.id
                          ? 'bg-[#FFE600]/15 border-[#FFE600] ring-1 ring-[#FFE600]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{tier.label}</span>
                        {formData.budgetTier === tier.id && (
                          <Check className="w-4 h-4 text-[#FFE600]" />
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#FFE600] block mb-1">{tier.range}</span>
                      <p className="text-xs text-white/60">{tier.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-3">
                  Group Dynamic
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {GROUP_SIZES.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => setFormData({ ...formData, groupSize: group.id })}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        formData.groupSize === group.id
                          ? 'bg-[#FFE600]/15 border-[#FFE600] text-white'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <Users className="w-4 h-4 mx-auto mb-1 text-[#FFE600]" />
                      <div className="font-bold text-xs">{group.label}</div>
                      <div className="text-[10px] text-white/50">{group.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Transport Preference */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                Preferred Transit Mode
              </label>
              <div className="space-y-3">
                {TRANSPORT_PREFERENCES.map((pref) => (
                  <div
                    key={pref.id}
                    onClick={() => setFormData({ ...formData, transportPreference: pref.id })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      formData.transportPreference === pref.id
                        ? 'bg-[#FFE600]/15 border-[#FFE600] ring-1 ring-[#FFE600]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm mb-0.5">{pref.label}</h4>
                      <p className="text-xs text-white/60">{pref.desc}</p>
                    </div>
                    {formData.transportPreference === pref.id && (
                      <div className="w-6 h-6 rounded-full bg-[#FFE600] flex items-center justify-center text-black">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Interests */}
          {step === 4 && (
            <div className="space-y-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                Select your trip passions (Pick 2 or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INTEREST_TAGS.map((tag) => {
                  const isSelected = formData.selectedInterests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#FFE600]/20 border-[#FFE600] text-white font-semibold'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs">{tag}</span>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                        isSelected ? 'bg-[#FFE600] text-black border-[#FFE600]' : 'border-white/30 text-transparent'
                      }`}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 border-t border-white/10 bg-[#081238] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-2 px-7 py-3 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg transition-all transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Configure Research Scope</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
