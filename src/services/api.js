import { normalizeDestination } from '../utils/promptParser';

/**
 * TripPilot AI — Backend API Client
 * Connects frontend to FastAPI backend endpoints.
 * Never stores or transmits API keys from frontend.
 */

export async function getBackendHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

export async function fetchScopePreview(tripBrief, selectedCategories) {
  const cleanDestination = normalizeDestination(tripBrief.destination, 'Kyoto, Japan');
  const payload = {
    trip_brief: {
      destination: cleanDestination,
      duration_days: Number(tripBrief.durationDays) || 5,
      budget_tier: tripBrief.travelStyle || tripBrief.budgetTier || 'Balanced Explorer',
      group_size: tripBrief.groupType || tripBrief.groupSize || 'Romantic Couple',
      transport_preference: tripBrief.transportPreference || 'Scenic Rail & Regional Transit',
      selected_interests: tripBrief.selectedInterests || [],
      prompt: tripBrief.originalPrompt || tripBrief.prompt || '',
      mode: tripBrief.mode || 'quick'
    },
    selected_categories: selectedCategories
  };

  const res = await fetch('/api/trips/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Preview error (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function executeTripResearch(tripBrief, selectedCategories) {
  const cleanDestination = normalizeDestination(tripBrief.destination, 'Kyoto, Japan');
  const payload = {
    trip_brief: {
      destination: cleanDestination,
      duration_days: Number(tripBrief.durationDays) || 5,
      budget_tier: tripBrief.travelStyle || tripBrief.budgetTier || 'Balanced Explorer',
      group_size: tripBrief.groupType || tripBrief.groupSize || 'Romantic Couple',
      transport_preference: tripBrief.transportPreference || 'Scenic Rail & Regional Transit',
      selected_interests: tripBrief.selectedInterests || [],
      prompt: tripBrief.originalPrompt || tripBrief.prompt || '',
      mode: tripBrief.mode || 'quick'
    },
    selected_categories: selectedCategories,
    confirmed: true // Required confirmation token
  };

  const res = await fetch('/api/trips/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const error = new Error(errData.detail || `Research failed (HTTP ${res.status})`);
    error.status = res.status;
    error.detail = errData.detail;
    throw error;
  }
  return await res.json();
}
