export const SCOPE_CATEGORIES = [
  {
    id: 'stays',
    name: 'Boutique Stays & Ryokans',
    shortName: 'Stays',
    description: 'Scans verified boutique hotels, heritage stays, and design ryokans matching noise & walking comfort criteria.',
    queriesEstimate: 14,
    sourcesCount: 8,
    icon: 'Hotel',
    recommended: true,
    dataPoints: ['Transit walking score < 10min', 'Boutique aesthetic rating', 'Quiet district filter']
  },
  {
    id: 'transport',
    name: 'Optimized Transit & Rail',
    shortName: 'Transport',
    description: 'Calculates high-speed rail passes, regional transit passes, airport express routes, and daily step pacing.',
    queriesEstimate: 22,
    sourcesCount: 12,
    icon: 'Train',
    recommended: true,
    dataPoints: ['JR Pass vs IC card arbitrage', 'Walking fatigue pacing', 'Optimal transfer junctions']
  },
  {
    id: 'attractions',
    name: 'Attractions & Hidden Sanctuaries',
    shortName: 'Attractions',
    description: 'Identifies cultural landmarks alongside crowd-free neighborhood gems and timed entrance slots.',
    queriesEstimate: 28,
    sourcesCount: 16,
    icon: 'Compass',
    recommended: true,
    dataPoints: ['Crowd avoidance time-windows', 'UNESCO cultural context', 'Historic relevance notes']
  },
  {
    id: 'food',
    name: 'Culinary & Secret Dining',
    shortName: 'Food & Dining',
    description: 'Maps reservation-worthy local kitchens, hidden matcha tea houses, and authentic regional specialty spots.',
    queriesEstimate: 31,
    sourcesCount: 19,
    icon: 'UtensilsCrossed',
    recommended: true,
    dataPoints: ['Reservation lead times', 'Dietary accommodation tags', 'Locals-favored breakfast spots']
  },
  {
    id: 'photo',
    name: 'Cinematic Photo Vantage Points',
    shortName: 'Photo Spots',
    description: 'Pinpoints golden-hour viewpoints, architectural perspectives, and serene early morning photo compositions.',
    queriesEstimate: 16,
    sourcesCount: 9,
    icon: 'Camera',
    recommended: true,
    dataPoints: ['Solar azimuth & golden hour calculation', 'Tripod allowance rules', 'Unobstructed perspective pins']
  }
];
