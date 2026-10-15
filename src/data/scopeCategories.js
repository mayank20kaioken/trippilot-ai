export const SCOPE_CATEGORIES = [
  {
    id: 'stays',
    name: 'Boutique Stays & Heritage Hotels',
    shortName: 'Stays',
    description: 'Scans verified boutique hotels, heritage lodges, and neighborhood accommodations matching comfort and transit criteria.',
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
    description: 'Calculates regional rail passes, local transit options, airport express routes, and daily walking pacing.',
    queriesEstimate: 22,
    sourcesCount: 12,
    icon: 'Train',
    recommended: true,
    dataPoints: ['Rail passes vs local ticketing', 'Walking fatigue pacing', 'Optimal transfer junctions']
  },
  {
    id: 'attractions',
    name: 'Attractions & Cultural Sights',
    shortName: 'Attractions',
    description: 'Identifies cultural landmarks alongside crowd-free neighborhood gems and timed entrance slots.',
    queriesEstimate: 28,
    sourcesCount: 16,
    icon: 'Compass',
    recommended: true,
    dataPoints: ['Crowd avoidance time-windows', 'Cultural context', 'Historic relevance notes']
  },
  {
    id: 'food',
    name: 'Culinary & Regional Dining',
    shortName: 'Food & Dining',
    description: 'Maps reservation-worthy local kitchens, neighborhood bakeries, and authentic regional culinary specialties.',
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
