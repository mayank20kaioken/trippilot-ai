import assert from 'node:assert/strict';
import { parseTripPrompt, normalizeDestination, formatDestinationTitle } from '../src/utils/promptParser.js';
import {
  buildActiveTripData,
  canonicalizeUrl,
  deduplicateSources,
  deduplicateAndCleanAttractions,
  classifyAttractionGeography,
  isPlausibleNamedPlace
} from '../src/utils/tripBuilder.js';

console.log('🧪 Starting TripPilot AI Destination Fidelity & Results Quality Verification...\n');

const KYOTO_PAGODA_URL_FRAGMENT = '1493976040374-85c8e12f0c0e';

// 1. Regression Check #1: "Plan a 3-day trip to Rishikesh for two people"
const rishikeshPrompt = "Plan a 3-day trip to Rishikesh for two people";
const parsedRishikesh = parseTripPrompt(rishikeshPrompt);
assert.equal(parsedRishikesh.originalPrompt, rishikeshPrompt);
assert.equal(parsedRishikesh.destination, "Rishikesh", "Destination must be 'Rishikesh'");
assert.equal(parsedRishikesh.durationDays, 3, "Duration must be 3 days");
assert.equal(parsedRishikesh.groupType, "Romantic Couple", "Group must be 'Romantic Couple'");
assert.equal(parsedRishikesh.needsClarification, false);

const rishikeshData = buildActiveTripData({
  tripBrief: parsedRishikesh,
  liveResearchResult: {
    status: "completed",
    destination: "Rishikesh",
    duration_days: 3,
    attractions: [
      {
        id: "att-r1",
        name: "15 Best Places to Visit in Rishikesh (2026 Travel Guide)",
        description: "Explore Laxman Jhula and Triveni Ghat along the sacred Ganges riverbanks in Rishikesh.",
        source_url: "https://uttarakhandtourism.gov.in/destination/rishikesh?utm_source=search#top",
        source_title: "Uttarakhand Tourism - Rishikesh Guide",
        is_live_result: true
      },
      {
        id: "att-r2",
        name: "Laxman Jhula - Iconic Suspension Bridge",
        description: "Historic suspension bridge across the river Ganges in Rishikesh.",
        source_url: "https://www.uttarakhandtourism.gov.in/destination/rishikesh/",
        source_title: "Uttarakhand Tourism - Rishikesh Guide",
        is_live_result: true
      }
    ],
    sources: [
      {
        id: "src-r1",
        title: "Uttarakhand Tourism - Rishikesh Guide",
        url: "https://uttarakhandtourism.gov.in/destination/rishikesh?utm_source=search#top",
        domain: "uttarakhandtourism.gov.in",
        is_live_result: true
      },
      {
        id: "src-r2",
        title: "Uttarakhand Tourism Duplicate Link",
        url: "https://www.uttarakhandtourism.gov.in/destination/rishikesh/",
        domain: "www.uttarakhandtourism.gov.in",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

const rishikeshJson = JSON.stringify(rishikeshData);
assert.equal(rishikeshData.meta.destination, "Rishikesh");
assert.equal(rishikeshData.days.length, 3);
assert.ok(!rishikeshJson.includes(KYOTO_PAGODA_URL_FRAGMENT), "Rishikesh must NEVER include the Kyoto pagoda image URL");
assert.ok(!rishikeshJson.includes("Kyoto"), "Rishikesh must NOT contain Kyoto");
assert.ok(!rishikeshJson.includes("Shinkansen"), "Rishikesh must NOT contain Shinkansen");
assert.ok(!rishikeshJson.includes("District 1"), "Rishikesh itinerary must NOT use templated 'District 1' placeholders");
assert.ok(!rishikeshJson.includes("District 2"), "Rishikesh itinerary must NOT use templated 'District 2' placeholders");
// Verify canonical URL deduplication collapsed the two duplicate Uttarakhand Tourism URLs into 1
assert.equal(rishikeshData.sourcesBibliography.length, 1, "Canonical URL deduplication must collapse duplicate URLs");
// Verify listicle title extracted Laxman Jhula & Triveni Ghat and deduplicated the second Laxman Jhula mention
const rishikeshAttractionNames = rishikeshData.attractions.map(a => a.name);
assert.ok(rishikeshAttractionNames.includes("Laxman Jhula"), "Extracted 'Laxman Jhula' from listicle");
assert.ok(rishikeshAttractionNames.includes("Triveni Ghat"), "Extracted 'Triveni Ghat' from listicle");
assert.equal(
  rishikeshAttractionNames.filter(n => n.toLowerCase().includes("laxman")).length,
  1,
  "Laxman Jhula must not be duplicated across multiple articles"
);
// Since 2 unique attractions are distributed across Day 1 and Day 2, Day 3 must be labeled 'Flexible Exploration Day'
assert.ok(rishikeshData.days[0].area.includes("Laxman Jhula"));
assert.ok(rishikeshData.days[1].area.includes("Triveni Ghat"));
assert.ok(
  rishikeshData.days[2].area.includes("Flexible Exploration Day"),
  "Days without additional distinct verified attractions must be labeled 'Flexible Exploration Day'"
);
console.log('✅ Check 1: "Plan a 3-day trip to Rishikesh for two people" verified (no pagoda imagery, no District 1/2/3, deduplicated attractions & URLs)');

// 2. Regression Check #2: "I need a trip plan for Jaipur under $200" (and typo "strip plan for the Jaipur under $200")
const jaipurBudgetPrompt = "I need a trip plan for Jaipur under $200";
const parsedJaipur = parseTripPrompt(jaipurBudgetPrompt);
assert.equal(parsedJaipur.originalPrompt, jaipurBudgetPrompt);
assert.equal(parsedJaipur.destination, "Jaipur");
assert.equal(parsedJaipur.budgetTarget, 200);
assert.equal(parsedJaipur.budgetCurrency, "USD");

const parsedJaipurTypo = parseTripPrompt("I need a strip plan for the Jaipur under $200");
assert.equal(parsedJaipurTypo.destination, "Jaipur");
assert.equal(parsedJaipurTypo.budgetTarget, 200);

const jaipurData = buildActiveTripData({
  tripBrief: parsedJaipur,
  liveResearchResult: {
    status: "completed",
    destination: "Jaipur",
    duration_days: 5,
    attractions: [
      {
        id: "att-j1",
        name: "Amber Fort & Palace",
        description: "Historic hilltop fort in Amer overlooking Maota Lake in Jaipur.",
        source_url: "https://tourism.rajasthan.gov.in/amber-palace",
        source_title: "Rajasthan Tourism - Amber Palace",
        is_live_result: true
      },
      {
        id: "att-j2",
        name: "Hawa Mahal",
        description: "Iconic red and pink sandstone Palace of Winds in central Jaipur.",
        source_url: "https://tourism.rajasthan.gov.in/hawa-mahal",
        source_title: "Rajasthan Tourism - Hawa Mahal",
        is_live_result: true
      }
    ],
    sources: [
      {
        id: "src-j1",
        title: "Rajasthan Tourism - Amber Palace",
        url: "https://tourism.rajasthan.gov.in/amber-palace",
        domain: "tourism.rajasthan.gov.in",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

const jaipurJson = JSON.stringify(jaipurData);
assert.equal(jaipurData.meta.destination, "Jaipur");
assert.equal(jaipurData.budgetBreakdown.budgetTarget, 200, "Explicit $200 budget target preserved");
assert.equal(jaipurData.budgetBreakdown.budgetCurrency, "USD");
assert.equal(jaipurData.budgetBreakdown.isUnderBudget, true, "Under-budget warning triggered when $200 < benchmark");
assert.ok(jaipurData.budgetBreakdown.budgetWarning.includes("$200 USD"));
assert.ok(jaipurData.budgetBreakdown.exclusionsNote.includes("Excludes"), "Budget must state major cost exclusions");
assert.ok(jaipurData.budgetBreakdown.methodologyNote.includes("Illustrative fixed-percentage"), "Budget must label fixed-percentage model as illustrative");
assert.ok(!jaipurJson.includes("strip plan"), "Raw prompt must never leak into Jaipur title or budget notes");
assert.ok(!jaipurJson.includes("Rishikesh"), "Jaipur data must not contain Rishikesh");
assert.ok(!jaipurJson.includes("Manali"), "Jaipur data must not contain Manali");
assert.ok(!jaipurJson.includes("Kyoto"), "Jaipur data must not contain Kyoto");
assert.ok(
  jaipurData.accommodations.every(a => a.isArchetype === true && a.image === null),
  "Generated stays must be labeled as non-bookable stay archetypes without misleading stock photos"
);
console.log('✅ Check 2: "I need a trip plan for Jaipur under $200" verified (clean destination, honest budget disclosures, under-budget warning, non-bookable stay archetypes)');

// 3. Regression Check #3: "Plan a 4-day trip to Manali for two people"
const manaliPrompt = "Plan a 4-day trip to Manali for two people";
const parsedManali4 = parseTripPrompt(manaliPrompt);
assert.equal(parsedManali4.originalPrompt, manaliPrompt);
assert.equal(parsedManali4.destination, "Manali", "Destination must be 'Manali'");
assert.equal(parsedManali4.durationDays, 4, "Duration must be 4 days");
assert.equal(parsedManali4.groupType, "Romantic Couple", "Group must be 'Romantic Couple'");

// Also verify "5 days exploring of Manali in the Himachal Pradesh"
const parsedManaliState = parseTripPrompt("5 days exploring of Manali in the Himachal Pradesh");
assert.equal(parsedManaliState.destination, "Manali, Himachal Pradesh");
assert.equal(parsedManaliState.durationDays, 5);

const manaliData = buildActiveTripData({
  tripBrief: parsedManali4,
  liveResearchResult: {
    status: "completed",
    destination: "Manali",
    duration_days: 4,
    attractions: [
      {
        id: "att-m1",
        name: "Hadimba Devi Temple",
        description: "16th-century wooden temple surrounded by cedar forests in Manali.",
        source_url: "https://himachaltourism.gov.in/destination/manali/",
        source_title: "Himachal Tourism - Manali",
        is_live_result: true
      },
      {
        id: "att-m2",
        name: "Solang Valley",
        description: "Alpine valley known for panoramic Himalayan views and snow activities.",
        source_url: "https://himachaltourism.gov.in/destination/manali/",
        source_title: "Himachal Tourism - Manali",
        is_live_result: true
      }
    ],
    sources: [
      {
        id: "src-m1",
        title: "Himachal Tourism - Manali",
        url: "https://himachaltourism.gov.in/destination/manali/",
        domain: "himachaltourism.gov.in",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

const manaliJson = JSON.stringify(manaliData);
assert.equal(manaliData.meta.destination, "Manali");
assert.equal(manaliData.days.length, 4);
assert.ok(!manaliJson.includes("Jaipur"), "Manali data must not contain Jaipur");
assert.ok(!manaliJson.includes("Rishikesh"), "Manali data must not contain Rishikesh");
assert.ok(!manaliJson.includes("Kyoto"), "Manali data must not contain Kyoto");
assert.ok(!manaliJson.includes("Shinkansen"), "Manali data must not contain Shinkansen");
assert.ok(!manaliJson.includes("District 1"), "Manali itinerary must not contain District 1/2/3");
assert.ok(
  manaliData.meta.transportPreference.includes("Pending Verification"),
  "Transit strategy must be destination-aware and labeled as pending verification"
);
assert.ok(
  manaliData.attractions.every(a => Boolean(a.source_url) && a.is_live_result === true),
  "Every live attraction must retain its supporting source_url and is_live_result=true"
);
console.log('✅ Check 3: "Plan a 4-day trip to Manali for two people" verified (4 days, destination-aware transit, traceable sources, zero cross-city contamination)');

// 4. Live vs Demo Fallback Distinction Check
const demoFallbackData = buildActiveTripData({
  tripBrief: {
    destination: "Kyoto, Japan",
    durationDays: 5
  },
  liveResearchResult: null,
  useDemoFallback: true,
  selectedCity: "Kyoto, Japan"
});
assert.equal(demoFallbackData.isLiveResearch, false, "Demo fallback must set isLiveResearch=false");
assert.equal(demoFallbackData.meta.isDemoContent, true, "Demo fallback must set meta.isDemoContent=true");
console.log('✅ Check 4: Live vs Demo fallback distinction verified');

// 5. Empty Upstream Results Must NEVER Be Mislabeled as Live Research or Substitute Preset Sights
const emptyLiveResponse = {
  status: "empty",
  destination: "Kyoto, Japan",
  duration_days: 5,
  attractions: [],
  sources: [],
  error_message: "TinyFish Search returned 0 verifiable attractions or citations."
};
const emptyResultData = buildActiveTripData({
  tripBrief: {
    destination: "Kyoto, Japan",
    durationDays: 5
  },
  liveResearchResult: emptyLiveResponse,
  useDemoFallback: false,
  selectedCity: "Kyoto, Japan"
});
assert.equal(emptyResultData.isLiveResearch, false, "Empty upstream result must NOT be marked isLiveResearch=true");
assert.equal(emptyResultData.attractions.length, 0, "Empty upstream result without demo fallback must NOT substitute preset Kyoto attractions");
assert.equal(emptyResultData.sourcesBibliography.length, 0, "Empty upstream result without demo fallback must NOT substitute preset Kyoto sources");
console.log('✅ Check 5: Empty upstream results are never mislabeled as live research or silently filled with mock attractions');

// 6. Multi-Currency Budget Parsing, Group vs Per-Person Totals & Consecutive Search Isolation
const inrPrompt = "Plan a 4-day trip to Manali for two people under ₹18,000";
const parsedInr = parseTripPrompt(inrPrompt);
assert.equal(parsedInr.destination, "Manali");
assert.equal(parsedInr.durationDays, 4);
assert.equal(parsedInr.budgetTarget, 18000);
assert.equal(parsedInr.budgetCurrency, "INR");

assert.equal(
  jaipurData.budgetBreakdown.perPersonUsd,
  Math.round(jaipurData.budgetBreakdown.totalUsd / 2),
  "Per-person total must equal half of the 2-traveler group benchmark"
);

// Simulate consecutive state transitions: Jaipur -> reset -> Manali -> reset -> Rishikesh
let simulatedLiveState = jaipurData;
assert.equal(simulatedLiveState.meta.destination, "Jaipur");
// Clear prior results before Manali search
simulatedLiveState = null;
simulatedLiveState = manaliData;
assert.equal(simulatedLiveState.meta.destination, "Manali");
assert.ok(!JSON.stringify(simulatedLiveState).includes("Jaipur"));
// Clear prior results before Rishikesh search
simulatedLiveState = null;
simulatedLiveState = rishikeshData;
assert.equal(simulatedLiveState.meta.destination, "Rishikesh");
assert.ok(!JSON.stringify(simulatedLiveState).includes("Manali"));
assert.ok(!JSON.stringify(simulatedLiveState).includes("Jaipur"));
console.log('✅ Check 6: Multi-currency budget parsing, group/per-person math, and consecutive search isolation verified');

// 7. Geographic Relevance Classification & Excursion Handling (Rishikesh + Regional Sights)
const geoTripData = buildActiveTripData({
  tripBrief: parsedRishikesh,
  liveResearchResult: {
    status: "completed",
    destination: "Rishikesh",
    duration_days: 3,
    attractions: [
      {
        id: "geo-1",
        name: "Mindrolling Monastery",
        description: "Famous Tibetan Buddhist monastery often visited on a regional trip from Rishikesh in Dehradun.",
        source_url: "https://tripadvisor.in/rishikesh-excursions",
        source_title: "Tripadvisor Rishikesh Guide",
        is_live_result: true
      },
      {
        id: "geo-2",
        name: "Secret Waterfall",
        description: "Mentioned in a general travel blog without municipal location details.",
        source_url: "https://travelblog.example.com/uttarakhand-notes",
        source_title: "Travel Blog Notes",
        is_live_result: true
      },
      {
        id: "geo-3",
        name: "Laxman Jhula",
        description: "Historic suspension bridge across the Ganges in Rishikesh.",
        source_url: "https://uttarakhandtourism.gov.in/rishikesh",
        source_title: "Uttarakhand Tourism",
        is_live_result: true
      }
    ],
    sources: [
      {
        id: "src-geo-1",
        title: "Uttarakhand Tourism",
        url: "https://uttarakhandtourism.gov.in/rishikesh",
        category: "attractions"
      }
    ]
  },
  useDemoFallback: false,
  selectedCity: "Kyoto, Japan"
});

// Verify sorting: in_destination comes first, then nearby_excursion, then unverified_location
assert.equal(geoTripData.attractions.length, 3);
const [inDestSight, excursionSight, unverifiedSight] = geoTripData.attractions;

assert.equal(inDestSight.name, "Laxman Jhula");
assert.equal(inDestSight.geographic_status, "in_destination");
assert.equal(inDestSight.source_url, "https://uttarakhandtourism.gov.in/rishikesh");

assert.equal(excursionSight.name, "Mindrolling Monastery");
assert.equal(excursionSight.geographic_status, "nearby_excursion");
assert.ok(excursionSight.geographic_label.includes("Nearby Excursion"), "Excursion sight must carry Nearby Excursion badge label");
assert.ok(excursionSight.location_note.includes("check the linked source") || excursionSight.location_note.includes("Verify"), "Excursion sight must advise checking distance/travel time without inventing coordinates");
assert.equal(excursionSight.source_url, "https://tripadvisor.in/rishikesh-excursions");

assert.equal(unverifiedSight.name, "Secret Waterfall");
assert.equal(unverifiedSight.geographic_status, "unverified_location");
assert.ok(unverifiedSight.geographic_label.includes("Location Unverified"), "Unverified sight must carry Location Unverified badge label");
assert.equal(unverifiedSight.source_url, "https://travelblog.example.com/uttarakhand-notes");

// Verify Day 2 (which receives the excursion sight) does NOT silently present Mindrolling Monastery as a central Rishikesh attraction
const day1 = geoTripData.days[0];
const day2 = geoTripData.days[1];
const day3 = geoTripData.days[2];
assert.ok(day1.title.includes("Laxman Jhula"), "Day 1 should feature central Rishikesh sight");
assert.ok(!day1.title.includes("Nearby Excursion"), "Central sight day should not be labeled as an excursion");

assert.ok(day2.title.includes("Nearby Excursion"), "Day 2 featuring Mindrolling Monastery must be explicitly titled as a Nearby Excursion");
assert.ok(day2.area.includes("Excursion from Rishikesh"), "Day 2 area must explicitly note Excursion from Rishikesh");
assert.ok(day2.theme.includes("Verify Distance"), "Day 2 theme must warn user to verify distance and travel time");

assert.ok(!day3.title.includes("Secret Waterfall"), "Day 3 must never schedule unverified sight 'Secret Waterfall' as a confirmed stop");
assert.ok(day3.title.includes("Flexible Exploration Day") || day3.theme.includes("Flexible Exploration Day"), "Day 3 without confirmed verified stop must remain an honest Flexible Exploration Day");
console.log('✅ Check 7: Conservative geographic classification (in_destination, nearby_excursion, unverified_location) & excursion itinerary labeling verified');

// 8. Quality Pass: Destination Display Capitalization, Social/Listicle Rejection & Stay Disclaimer
// 8a. Destination Display Capitalization
assert.equal(parseTripPrompt("plan a 3-day trip to rishikesh for two").destination, "Rishikesh");
assert.equal(parseTripPrompt("5 days exploring of manali in the himachal pradesh").destination, "Manali, Himachal Pradesh");
assert.equal(normalizeDestination("the jaipur"), "Jaipur");
assert.equal(formatDestinationTitle("amalfi coast, italy"), "Amalfi Coast, Italy");

// 8b. Prevent listicle headings, social media captions, and generic articles from becoming attractions
const rawDirtyAttractions = [
  {
    name: "15 Best Things to Do in Rishikesh (2026 Travel Guide)",
    description: "A general guide article without sub-landmarks in snippet.",
    source_url: "https://example.com/guide",
    is_live_result: true
  },
  {
    name: "Watch on Instagram #reels #travel",
    description: "5,420 likes, 120 comments. Follow us on Instagram.",
    source_url: "https://instagram.com/p/123",
    is_live_result: true
  },
  {
    name: "1. Laxman Jhula - Historic Suspension Bridge",
    description: "Famous bridge in Rishikesh.",
    source_url: "https://uttarakhandtourism.gov.in/laxman-jhula",
    is_live_result: true
  }
];
const cleanedAttractions = deduplicateAndCleanAttractions(rawDirtyAttractions, "Rishikesh");
// The listicle guide and the Instagram promo must be rejected; only Laxman Jhula is preserved
assert.equal(cleanedAttractions.length, 1);
assert.equal(cleanedAttractions[0].name, "Laxman Jhula");
assert.ok(!cleanedAttractions.some(a => a.name.includes("Cultural & Scenic Highlights")), "Must NOT fabricate fallback highlights");

// 8c. Dedicated Excursion Day Slot Separation (Never mix distant regional excursions into central sight days)
assert.equal(day1.slots.morning.title, "Laxman Jhula");
assert.ok(!day1.slots.afternoon.title.includes("Mindrolling"), "Day 1 must not contain distant Mindrolling excursion in afternoon");
assert.equal(day2.slots.morning.title, "Mindrolling Monastery");
assert.equal(day2.slots.afternoon.category, "Regional Excursion Window");

// 8d. Stay Archetype Layout Integrity & Explicit Disclaimers
assert.ok(geoTripData.accommodations.length > 0);
for (const acc of geoTripData.accommodations) {
  assert.ok(acc.isArchetype === true || acc.type.includes("Archetype"), "Stays must be explicitly identified as illustrative archetypes");
  assert.ok(!acc.name.includes("Marriott") && !acc.name.includes("Hilton"), "Must never invent real hotel brand names");
  assert.ok(acc.type.includes("Not a Bookable Property") || acc.type.includes("Archetype"), "Must preserve non-bookable disclaimer");
}
console.log('✅ Check 8: Destination capitalization, listicle/social heading rejection, excursion day slot isolation & stay archetype disclaimers verified');

// 9. Regression Check #9: Shimla Destination Parsing & Prompt Variations
const shimlaPrompt1 = "Create Shimla Trip under $250 for the 4 days trip";
const parsedShimla1 = parseTripPrompt(shimlaPrompt1);
assert.equal(parsedShimla1.destination, "Shimla", "Destination must be 'Shimla', not 'Shimla Trip For'");
assert.equal(parsedShimla1.durationDays, 4, "Duration must be 4 days");
assert.equal(parsedShimla1.budgetTarget, 250, "Budget target must be 250");
assert.equal(parsedShimla1.budgetCurrency, "USD", "Budget currency must be USD");
assert.equal(parsedShimla1.needsClarification, false);

const shimlaPrompt2 = "plan a 3-day trip to Shimla";
const parsedShimla2 = parseTripPrompt(shimlaPrompt2);
assert.equal(parsedShimla2.destination, "Shimla", "Destination must be 'Shimla'");
assert.equal(parsedShimla2.durationDays, 3, "Duration must be 3 days");

const shimlaPrompt3 = "Create Shimla Trip for 4 days";
const parsedShimla3 = parseTripPrompt(shimlaPrompt3);
assert.equal(parsedShimla3.destination, "Shimla", "Destination must be 'Shimla'");
assert.equal(parsedShimla3.durationDays, 4, "Duration must be 4 days");

const shimlaPrompt4 = "Shimla Trip under $250 for the 4 days trip";
const parsedShimla4 = parseTripPrompt(shimlaPrompt4);
assert.equal(parsedShimla4.destination, "Shimla", "Destination must be 'Shimla'");
assert.equal(parsedShimla4.durationDays, 4, "Duration must be 4 days");
assert.equal(parsedShimla4.budgetTarget, 250, "Budget target must be 250");
console.log('✅ Check 9: Shimla destination parsing & variations verified ("Create Shimla Trip under $250 for the 4 days trip" -> Shimla, 4 days, $250 USD)');

// 10. Regression Check #10: Strict Non-Negative Stay Benchmark Prices & Category Allocations
const testBudgetTiers = ['Backpacker', 'Balanced Explorer', 'Luxury Comfort', 'Bespoke Haute-Luxe'];
for (const tier of testBudgetTiers) {
  const trip = buildActiveTripData({
    tripBrief: {
      destination: "Shimla",
      durationDays: 4,
      budgetTarget: 250,
      budgetCurrency: "USD",
      travelStyle: tier,
      groupType: "Romantic Couple"
    },
    useDemoFallback: false
  });

  // Verify all accommodation benchmark prices are strictly positive and contain no minus signs
  assert.equal(trip.accommodations.length, 3, "Must have 3 stay archetypes");
  for (const acc of trip.accommodations) {
    assert.ok(typeof acc.pricePerNightUsd === 'number', "pricePerNightUsd must be a number");
    assert.ok(acc.pricePerNightUsd > 0, `pricePerNightUsd (${acc.pricePerNightUsd}) must be strictly positive for ${tier}`);
    assert.ok(!acc.pricePerNightDemo.includes('-'), `pricePerNightDemo (${acc.pricePerNightDemo}) must never include a minus sign`);
    assert.ok(!acc.pricePerNightDemo.includes('~-'), "pricePerNightDemo must not contain negative tilde");
    assert.ok(acc.pricePerNightDemo.startsWith('$'), `pricePerNightDemo (${acc.pricePerNightDemo}) must start with currency symbol`);
  }

  // Verify all budget breakdown categories are strictly positive
  assert.ok(trip.budgetBreakdown.totalUsd > 0, "totalUsd must be positive");
  assert.ok(trip.budgetBreakdown.perPersonUsd > 0, "perPersonUsd must be positive");
  for (const cat of trip.budgetBreakdown.categories) {
    assert.ok(cat.amount > 0, `Category ${cat.name} amount (${cat.amount}) must be strictly positive`);
  }
}
console.log('✅ Check 10: Strict non-negative stay prices & category allocations verified across all travel tiers (0 negative values)');

// 11. Regression Check #11: Shimla Landmark Extraction, Tour Rejection, and Foreign Landmark Isolation
const rawShimlaAttractions = [
  {
    id: "att-sh1",
    name: "The BEST Shimla Tours and Excursion... - Tripadvisor",
    description: "Browse top-rated tours and outdoor activities in Shimla.",
    source_url: "https://tripadvisor.com/shimla-tours",
    source_title: "Tripadvisor Shimla Tours",
    is_live_result: true
  },
  {
    id: "att-sh2",
    name: "Hadimba Devi Temple",
    description: "Ancient wooden temple dedicated to Hadimba in the dense cedar forests of Manali.",
    source_url: "https://himachaltourism.gov.in/hadimba",
    source_title: "Himachal Tourism - Hadimba",
    is_live_result: true
  },
  {
    id: "att-sh3",
    name: "The Ridge, Shimla",
    description: "Open cultural hub along Mall Road offering panoramic Himalayan mountain vistas in central Shimla.",
    source_url: "https://himachaltourism.gov.in/shimla-ridge",
    source_title: "Himachal Tourism - Ridge",
    is_live_result: true
  },
  {
    id: "att-sh4",
    name: "Jakhoo Temple",
    description: "Historic temple dedicated to Lord Hanuman atop Jakhoo Hill in Shimla.",
    source_url: "https://himachaltourism.gov.in/jakhoo",
    source_title: "Himachal Tourism - Jakhoo",
    is_live_result: true
  },
  {
    id: "att-sh5",
    name: "Kufri Nature Park",
    description: "High-altitude Himalayan nature park located 16 km outside Shimla.",
    source_url: "https://himachaltourism.gov.in/kufri",
    source_title: "Himachal Tourism - Kufri",
    is_live_result: true
  }
];

const cleanedShimlaAttractions = deduplicateAndCleanAttractions(rawShimlaAttractions, "Shimla");
const cleanedShimlaNames = cleanedShimlaAttractions.map(a => a.name);

// 1. Tour guide / listicle title rejected
assert.ok(!cleanedShimlaNames.some(n => n.includes("The BEST Shimla Tours")), "Tour guide title must be rejected");
assert.ok(!cleanedShimlaNames.some(n => n.includes("Tours and Excursion")), "Tour/excursion phrase must be rejected");

// 2. Foreign landmark belonging to Manali rejected
assert.ok(!cleanedShimlaNames.some(n => n.includes("Hadimba")), "Hadimba Temple in Manali must NOT be included in Shimla sights");

// 3. Genuine Shimla landmarks preserved
assert.ok(cleanedShimlaNames.includes("The Ridge"), "The Ridge must be preserved");
assert.ok(cleanedShimlaNames.includes("Jakhoo Temple"), "Jakhoo Temple must be preserved");
assert.ok(cleanedShimlaNames.includes("Kufri Nature Park"), "Kufri Nature Park must be preserved");

// 4. Geographic classification
const ridgeAtt = cleanedShimlaAttractions.find(a => a.name === "The Ridge");
assert.equal(ridgeAtt.geographic_status, "in_destination");

const kufriAtt = cleanedShimlaAttractions.find(a => a.name === "Kufri Nature Park");
assert.equal(kufriAtt.geographic_status, "nearby_excursion");

// 5. Itinerary Synthesis with insufficient sights for 4 days
const shimlaTripData = buildActiveTripData({
  tripBrief: parsedShimla1,
  liveResearchResult: {
    status: "completed",
    destination: "Shimla",
    duration_days: 4,
    attractions: cleanedShimlaAttractions,
    sources: [
      {
        id: "src-sh1",
        title: "Himachal Tourism - Shimla",
        url: "https://himachaltourism.gov.in/destination/shimla",
        domain: "himachaltourism.gov.in",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

assert.equal(shimlaTripData.days.length, 4, "Must have 4 days");
assert.ok(shimlaTripData.days[0].area.includes("The Ridge"), "Day 1 must feature The Ridge");
assert.ok(shimlaTripData.days[1].area.includes("Jakhoo Temple"), "Day 2 must feature Jakhoo Temple");
assert.ok(shimlaTripData.days[2].area.includes("Kufri Nature Park"), "Day 3 must feature Kufri Nature Park");
assert.ok(
  shimlaTripData.days[3].area.includes("Flexible Exploration Day"),
  "Day 4 without additional verified sights must be an honest Flexible Exploration Day"
);
console.log('✅ Check 11: Shimla landmark extraction, tour title rejection, cross-city foreign landmark isolation & honest flexible day synthesis verified');

// 12. Regression Check #12: Bug 2 Fix — Sights & Attractions Populated with >= 4 Live Findings (Never 0 findings)
const liveShimlaResearch = {
  status: "completed",
  destination: "Shimla",
  duration_days: 4,
  attractions: [
    {
      id: "att-live-1",
      name: "The Ridge",
      category: "Attractions",
      description: "Wide open cultural promenade in central Shimla.",
      source_url: "https://www.tripadvisor.com/The_Ridge.html",
      source_title: "Top Shimla Attractions - Tripadvisor",
      is_live_result: true,
      geographic_status: "in_destination",
      geographic_label: "In Shimla",
      location_note: "Central municipal landmark inside Shimla."
    },
    {
      id: "att-live-2",
      name: "Mall Road",
      category: "Attractions",
      description: "Main shopping and pedestrian street in central Shimla.",
      source_url: "https://www.holidify.com/shimla.html",
      source_title: "Places to Visit in Shimla - Holidify",
      is_live_result: true,
      geographic_status: "in_destination",
      geographic_label: "In Shimla",
      location_note: "Central municipal landmark inside Shimla."
    },
    {
      id: "att-live-3",
      name: "Jakhoo Temple",
      category: "Attractions",
      description: "Historic temple dedicated to Lord Hanuman atop Jakhoo Hill.",
      source_url: "https://www.holidify.com/shimla.html",
      source_title: "Places to Visit in Shimla - Holidify",
      is_live_result: true,
      geographic_status: "in_destination",
      geographic_label: "In Shimla",
      location_note: "Central municipal landmark inside Shimla."
    },
    {
      id: "att-live-4",
      name: "Viceregal Lodge",
      category: "Attractions",
      description: "British-era heritage estate in Shimla.",
      source_url: "https://www.tripadvisor.com/Viceregal.html",
      source_title: "Top Shimla Attractions - Tripadvisor",
      is_live_result: true,
      geographic_status: "in_destination",
      geographic_label: "In Shimla",
      location_note: "Central municipal landmark inside Shimla."
    }
  ],
  sources: [
    {
      id: "src-live-1",
      url: "https://www.holidify.com/shimla.html",
      title: "Places to Visit in Shimla - Holidify",
      domain: "holidify.com",
      is_live_result: true
    },
    {
      id: "src-live-2",
      url: "https://www.tripadvisor.com/The_Ridge.html",
      title: "Top Shimla Attractions - Tripadvisor",
      domain: "tripadvisor.com",
      is_live_result: true
    }
  ]
};

const fullShimlaTripData = buildActiveTripData({
  tripBrief: {
    originalPrompt: "Create Shimla Trip under $250 for the 4 days trip",
    destination: "Shimla",
    durationDays: 4,
    budgetTarget: 250,
    budgetCurrency: "USD",
    travelStyle: "Balanced Explorer",
    groupType: "Romantic Couple"
  },
  liveResearchResult: liveShimlaResearch,
  useDemoFallback: false
});

assert.ok(fullShimlaTripData.attractions.length >= 4, `Expected >= 4 attractions, got ${fullShimlaTripData.attractions.length}`);
assert.equal(fullShimlaTripData.isLiveResearch, true, "isLiveResearch must be true");
assert.equal(fullShimlaTripData.meta.destination, "Shimla");
assert.equal(fullShimlaTripData.meta.budgetTarget, 250);
assert.equal(fullShimlaTripData.accommodations.length, 3, "Must have 3 stay archetypes");
for (const stay of fullShimlaTripData.accommodations) {
  assert.ok(stay.pricePerNightUsd > 0, "Nightly stay price must be positive");
}
// Verify Sights & Attractions names
const fullNames = fullShimlaTripData.attractions.map(a => a.name);
assert.ok(fullNames.includes("The Ridge"));
assert.ok(fullNames.includes("Mall Road"));
assert.ok(fullNames.includes("Jakhoo Temple"));
assert.ok(fullNames.includes("Viceregal Lodge"));
console.log('✅ Check 12: Bug 2 fix verified — Sights & Attractions reliably populated with 4 live findings (never 0 findings or empty message)');

// 13. Regression Check #13: Prompt parsing for "Create a 5 day trip to the Delhi for under $450"
const delhiPrompt = "Create a 5 day trip to the Delhi for under $450";
const parsedDelhi = parseTripPrompt(delhiPrompt);
assert.equal(parsedDelhi.originalPrompt, delhiPrompt, "originalPrompt must match user input exactly");
assert.equal(parsedDelhi.destination, "Delhi", "destination must be clean 'Delhi' (no 'to the')");
assert.equal(parsedDelhi.durationDays, 5, "durationDays must be 5");
assert.equal(parsedDelhi.budgetTarget, 450, "budgetTarget must be 450");
assert.equal(parsedDelhi.budgetCurrency, "USD", "budgetCurrency must be 'USD'");
assert.equal(parsedDelhi.travelStyle, "Balanced Explorer");
assert.equal(parsedDelhi.needsClarification, false);
console.log('✅ Check 13: Delhi prompt parsing verified ("Create a 5 day trip to the Delhi for under $450" -> Delhi, 5 days, $450 USD)');

// 14. Regression Check #14: Rejection of editorial phrases ("The Game Plans") and foreign landmark isolation in Delhi
const rawDelhiAttractions = [
  {
    id: "att-d1",
    name: "The Game Plans",
    description: "Overview of strategy for navigating Delhi metro and markets.",
    source_url: "https://www.delhitourism.gov.in/delhi-guide",
    source_title: "Delhi 5-Day Itinerary Guide",
    is_live_result: true
  },
  {
    id: "att-d2",
    name: "Red Fort",
    description: "Mughal red sandstone fortress situated in the heart of Old Delhi.",
    source_url: "https://www.delhitourism.gov.in/red-fort",
    source_title: "Delhi Tourism - Red Fort",
    is_live_result: true
  },
  {
    id: "att-d3",
    name: "Jama Masjid",
    description: "Grand historic 17th-century congregational mosque opposite Chandni Chowk in Delhi.",
    source_url: "https://www.delhitourism.gov.in/jama-masjid",
    source_title: "Delhi Tourism - Jama Masjid",
    is_live_result: true
  },
  {
    id: "att-d4",
    name: "Hadimba Temple",
    description: "Pagoda-style temple located in Manali cedar forests.",
    source_url: "https://himachaltourism.gov.in/hadimba",
    source_title: "Himachal Tourism",
    is_live_result: true
  },
  {
    id: "att-d5",
    name: "Amber Fort",
    description: "Royal hill palace in Amer near Jaipur.",
    source_url: "https://tourism.rajasthan.gov.in/amber",
    source_title: "Rajasthan Tourism",
    is_live_result: true
  },
  {
    id: "att-d6",
    name: "Taj Mahal",
    description: "White marble mausoleum situated in Agra, an excursion outside Delhi.",
    source_url: "https://delhitravel.org/taj-mahal",
    source_title: "Excursions from Delhi",
    is_live_result: true
  },
  {
    id: "att-d7",
    name: "Secret Viewpoint",
    description: "Hidden viewpoint overlooking Delhi with unknown coordinates.",
    source_url: "https://delhitravel.org/secret",
    source_title: "Secret Delhi",
    is_live_result: true
  }
];

const cleanedDelhiAttractions = deduplicateAndCleanAttractions(rawDelhiAttractions, "Delhi");
const cleanedDelhiNames = cleanedDelhiAttractions.map(a => a.name);

// 1. Reject editorial phrase
assert.ok(!cleanedDelhiNames.some(n => n.includes("Game Plan")), "'The Game Plans' must be rejected");

// 2. Reject foreign landmarks from other destinations
assert.ok(!cleanedDelhiNames.some(n => n.includes("Hadimba")), "Hadimba from Manali must NOT leak into Delhi");
assert.ok(!cleanedDelhiNames.some(n => n.includes("Amber")), "Amber Fort from Jaipur must NOT leak into Delhi");

// 3. Preserve legitimate Delhi sights
assert.ok(cleanedDelhiNames.includes("Red Fort"), "Red Fort must be preserved");
assert.ok(cleanedDelhiNames.includes("Jama Masjid"), "Jama Masjid must be preserved");
assert.ok(cleanedDelhiNames.includes("Taj Mahal"), "Taj Mahal must be preserved");

// 4. Verify geographic classification
const redFortAtt = cleanedDelhiAttractions.find(a => a.name === "Red Fort");
assert.equal(redFortAtt.geographic_status, "in_destination", "Red Fort must be verified as in_destination");
assert.equal(redFortAtt.geographic_label, "In Delhi");

const tajAtt = cleanedDelhiAttractions.find(a => a.name === "Taj Mahal");
assert.equal(tajAtt.geographic_status, "nearby_excursion", "Taj Mahal must be nearby_excursion");
assert.ok(tajAtt.geographic_label.includes("Nearby Excursion"));

const secretAtt = cleanedDelhiAttractions.find(a => a.name === "Secret Viewpoint");
if (secretAtt) {
  assert.equal(secretAtt.geographic_status, "unverified_location", "Secret Viewpoint must be unverified_location");
}
console.log('✅ Check 14: Rejection of editorial phrases, foreign landmark isolation & Delhi landmark verification verified');

// 15. Regression Check #15: Itinerary Integrity — NEVER schedule unverified attractions as confirmed stops
const unverifiedOnlyAttractions = [
  {
    id: "att-unv-1",
    name: "Secret Viewpoint",
    description: "Vague viewpoint without verified placement.",
    source_url: "https://example.com/unverified",
    source_title: "Blog Post",
    is_live_result: true,
    geographic_status: "unverified_location",
    geographic_label: "Location Unverified • Check Source",
    location_note: "Exact municipal placement not confirmed."
  }
];

const tripWithUnverified = buildActiveTripData({
  tripBrief: parsedDelhi,
  liveResearchResult: {
    status: "completed",
    destination: "Delhi",
    duration_days: 5,
    attractions: unverifiedOnlyAttractions,
    sources: [
      {
        id: "src-1",
        url: "https://example.com/source",
        title: "Example Travel Blog",
        domain: "example.com",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

assert.equal(tripWithUnverified.days.length, 5, "Trip must have 5 days");
for (const day of tripWithUnverified.days) {
  // Confirm that unverified sight was NEVER assigned to any day as a confirmed stop!
  assert.ok(
    !day.title.includes("Secret Viewpoint"),
    `Day ${day.day} must not schedule unverified sight 'Secret Viewpoint' as a confirmed stop`
  );
  assert.ok(
    day.theme.includes("Flexible Exploration Day") || day.title.includes("Flexible Exploration"),
    `Day ${day.day} must remain a Flexible Exploration Day`
  );
}
console.log('✅ Check 15: Itinerary integrity verified — Unverified attractions are NEVER scheduled as confirmed stops');

// 16. Regression Check #16: Multi-day Itinerary with verified in-destination + excursions + flexible days
const tripWithMixedDelhi = buildActiveTripData({
  tripBrief: parsedDelhi,
  liveResearchResult: {
    status: "completed",
    destination: "Delhi",
    duration_days: 5,
    attractions: cleanedDelhiAttractions,
    sources: [
      {
        id: "src-d1",
        url: "https://www.delhitourism.gov.in/delhi-guide",
        title: "Delhi Tourism",
        domain: "delhitourism.gov.in",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

assert.equal(tripWithMixedDelhi.days.length, 5, "Must have 5 days");
// Days 1 & 2 feature verified in-destination sights (Red Fort, Jama Masjid)
assert.ok(tripWithMixedDelhi.days[0].area.includes("Red Fort"), "Day 1 must feature Red Fort");
assert.ok(tripWithMixedDelhi.days[1].area.includes("Jama Masjid"), "Day 2 must feature Jama Masjid");
// Excursion day features Taj Mahal with excursion labeling
assert.ok(tripWithMixedDelhi.days[2].area.includes("Taj Mahal") || tripWithMixedDelhi.days[2].title.includes("Taj Mahal"), "Day 3 must feature Taj Mahal excursion");
assert.ok(tripWithMixedDelhi.days[2].theme.includes("Regional Excursion"), "Day 3 theme must indicate Regional Excursion");
// Days 4 & 5 must remain honest Flexible Exploration Days
assert.ok(tripWithMixedDelhi.days[3].theme.includes("Flexible Exploration Day"), "Day 4 must be Flexible Exploration Day");
assert.ok(tripWithMixedDelhi.days[4].theme.includes("Flexible Exploration Day"), "Day 5 must be Flexible Exploration Day");
console.log('✅ Check 16: Mixed destination itinerary synthesis verified (confirmed stops, excursion day, flexible days)');

// 17. Regression Check #17: Separation of live-source status from geographic-verification status
assert.equal(redFortAtt.is_live_result, true, "is_live_result indicates live upstream research");
assert.equal(redFortAtt.geographic_status, "in_destination", "geographic_status independently indicates municipality placement");
assert.equal(tajAtt.is_live_result, true);
assert.equal(tajAtt.geographic_status, "nearby_excursion");
assert.ok(
  tripWithMixedDelhi.meta.confidenceScore.includes("Live Web Grounded"),
  `confidenceScore must reflect grounded sights: ${tripWithMixedDelhi.meta.confidenceScore}`
);
console.log('✅ Check 17: Accurate separation of live-source status from geographic-verification status verified');

// 18. Regression Check #18: Empty or weak live search results produce honest fallback without crashing
// 18a. Weak live crawl (citations found, but 0 attractions verified)
const weakDelhiTrip = buildActiveTripData({
  tripBrief: parsedDelhi,
  liveResearchResult: {
    status: "completed",
    destination: "Delhi",
    duration_days: 5,
    attractions: [],
    sources: [
      {
        id: "src-weak-1",
        title: "Delhi Overview",
        url: "https://delhitravel.org/overview",
        domain: "delhitravel.org",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

assert.equal(weakDelhiTrip.days.length, 5);
assert.equal(weakDelhiTrip.attractions.length, 0);
assert.equal(weakDelhiTrip.sourcesBibliography.length, 1);
assert.equal(weakDelhiTrip.isLiveResearch, true);
assert.equal(weakDelhiTrip.meta.confidenceScore, "Live Research Empty • 0 Verified Sights");
for (const day of weakDelhiTrip.days) {
  assert.ok(day.theme.includes("Flexible Exploration Day"));
}
assert.equal(weakDelhiTrip.accommodations.length, 3);
for (const stay of weakDelhiTrip.accommodations) {
  assert.ok(stay.pricePerNightUsd > 0);
}

// 18b. Completely empty upstream crawl (0 citations, 0 attractions)
const emptyDelhiTrip = buildActiveTripData({
  tripBrief: parsedDelhi,
  liveResearchResult: {
    status: "empty",
    destination: "Delhi",
    duration_days: 5,
    attractions: [],
    sources: []
  },
  useDemoFallback: false
});

assert.equal(emptyDelhiTrip.days.length, 5);
assert.equal(emptyDelhiTrip.attractions.length, 0);
assert.equal(emptyDelhiTrip.sourcesBibliography.length, 0);
assert.equal(emptyDelhiTrip.isLiveResearch, false);
assert.equal(emptyDelhiTrip.meta.confidenceScore, "Calculated Outline");
for (const day of emptyDelhiTrip.days) {
  assert.ok(day.theme.includes("Flexible Exploration Day"));
}
console.log('✅ Check 18: Empty and weak live search results produce honest fallback without breaking UI');

// 19. Regression Check #19: "Ladakh By Road" Destination Normalization & Transport Preference
const ladakhByRoadPrompt = "Ladakh By Road";
const parsedLadakhByRoad = parseTripPrompt(ladakhByRoadPrompt);
assert.equal(parsedLadakhByRoad.originalPrompt, ladakhByRoadPrompt);
assert.equal(parsedLadakhByRoad.destination, "Ladakh", "Destination for 'Ladakh By Road' must be normalized to 'Ladakh'");
assert.ok(
  parsedLadakhByRoad.transportPreference && parsedLadakhByRoad.transportPreference.includes("Road Trip"),
  "Transport preference should capture Road Trip when 'by road' is specified"
);
assert.equal(normalizeDestination("Ladakh By Road"), "Ladakh", "normalizeDestination('Ladakh By Road') must return 'Ladakh'");
assert.equal(normalizeDestination("Plan a road trip to Ladakh"), "Ladakh");

const ladakh6DayPrompt = "Plan a 6-day road trip to Ladakh for two people";
const parsedLadakh6Day = parseTripPrompt(ladakh6DayPrompt);
assert.equal(parsedLadakh6Day.destination, "Ladakh");
assert.equal(parsedLadakh6Day.durationDays, 6);
assert.equal(parsedLadakh6Day.groupType, "Romantic Couple");

const ladakhBudgetPrompt = "Create Ladakh Trip by road under $350 for the 5 days trip";
const parsedLadakhBudget = parseTripPrompt(ladakhBudgetPrompt);
assert.equal(parsedLadakhBudget.destination, "Ladakh");
assert.equal(parsedLadakhBudget.durationDays, 5);
assert.equal(parsedLadakhBudget.budgetTarget, 350);
assert.equal(parsedLadakhBudget.budgetCurrency, "USD");
console.log('✅ Check 19: Ladakh By Road destination parsing & variations verified ("Ladakh By Road" -> Ladakh, Road Trip transport preference)');

// 20. Regression Check #20: Category Heading Rejection, Himalayan Landmark Grounding & Itinerary Integrity
// 20a. Verify category headings are strictly rejected by isPlausibleNamedPlace
const categoryHeadings = [
  "Sacred & Religious Sites",
  "Historic Sites",
  "Monuments & Statues",
  "Architectural & Historic Buildings",
  "Nature & Wildlife Areas",
  "Sights & Landmarks",
  "Outdoor Activities",
  "Spas & Wellness"
];
for (const heading of categoryHeadings) {
  assert.equal(
    isPlausibleNamedPlace(heading, "Ladakh"),
    false,
    `Generic category heading '${heading}' must NEVER be treated as a plausible named place`
  );
}

// 20b. Verify real Himalayan landmarks are accepted
const realHimalayanLandmarks = [
  "Thiksey Monastery",
  "Pangong Tso",
  "Khardung La Pass",
  "Diskit Gompa",
  "Shanti Stupa"
];
for (const landmark of realHimalayanLandmarks) {
  assert.equal(
    isPlausibleNamedPlace(landmark, "Ladakh"),
    true,
    `Real Himalayan landmark '${landmark}' must be recognized as a plausible named place`
  );
}

// 20c. Raw crawl with category headings, scraped metadata, and real landmarks
const rawLadakhAttractions = [
  {
    id: "att-cat-1",
    name: "Sacred & Religious Sites",
    description: "4.5 (1,234 reviews) • #1 of 42 things to do in Leh • Filter by: 1. Thiksey Monastery 2. Diskit Gompa",
    source_url: "https://www.tripadvisor.com/Attractions-g297625-Activities-c47-Ladakh.html",
    source_title: "Top Sacred & Religious Sites in Ladakh",
    is_live_result: true
  },
  {
    id: "att-cat-2",
    name: "Historic Sites",
    description: "Ancient historical fortifications and heritage sites across Ladakh. Open today 9am-5pm.",
    source_url: "https://www.tripadvisor.com/Attractions-g297625-Activities-c47-t17-Ladakh.html",
    source_title: "Historic Sites in Ladakh",
    is_live_result: true
  },
  {
    id: "att-cat-3",
    name: "Monuments & Statues",
    description: "Ranked #3 in sightseeing. Book tickets online for Ladakh monuments.",
    source_url: "https://www.tripadvisor.com/Attractions-g297625-Activities-c47-t26-Ladakh.html",
    source_title: "Monuments & Statues in Ladakh",
    is_live_result: true
  },
  {
    id: "att-real-1",
    name: "Thiksey Monastery",
    description: "Thiksey Monastery is a twelve-storey Tibetan Buddhist monastery located on top of a hill in Thiksey, Ladakh.",
    source_url: "https://www.ladakhtourism.gov.in/attractions/thiksey-monastery",
    source_title: "Ladakh Tourism - Thiksey Monastery",
    is_live_result: true
  },
  {
    id: "att-real-2",
    name: "Pangong Tso",
    description: "Pangong Tso is a high-altitude endorheic lake situated in the Himalayas in Ladakh extending into Tibet.",
    source_url: "https://www.ladakhtourism.gov.in/attractions/pangong-lake",
    source_title: "Ladakh Tourism - Pangong Tso Lake",
    is_live_result: true
  }
];

const cleanedLadakhAttractions = deduplicateAndCleanAttractions(rawLadakhAttractions, "Ladakh");
const cleanedNames = cleanedLadakhAttractions.map(a => a.name);

// Verify category headings were rejected
for (const heading of categoryHeadings) {
  assert.ok(!cleanedNames.includes(heading), `Cleaned attractions must NOT include category heading '${heading}'`);
}
// Verify real landmarks were kept
assert.ok(cleanedNames.includes("Thiksey Monastery"));
assert.ok(cleanedNames.includes("Pangong Tso"));
assert.equal(cleanedLadakhAttractions.length, 2);

// Verify geographic classification
for (const att of cleanedLadakhAttractions) {
  assert.equal(att.geographic_status, "in_destination");
  assert.ok(att.geographic_label.includes("Ladakh"));
}

// 20d. Verify 5-day Ladakh trip synthesis
const ladakhTripData = buildActiveTripData({
  tripBrief: parsedLadakhBudget,
  liveResearchResult: {
    status: "completed",
    destination: "Ladakh",
    duration_days: 5,
    attractions: cleanedLadakhAttractions,
    sources: [
      {
        id: "src-1",
        title: "Ladakh Tourism Guide",
        url: "https://www.ladakhtourism.gov.in/guide",
        domain: "ladakhtourism.gov.in",
        is_live_result: true
      }
    ]
  },
  useDemoFallback: false
});

assert.equal(ladakhTripData.meta.destination, "Ladakh");
assert.equal(ladakhTripData.days.length, 5);
// Day 1 has Thiksey Monastery, Day 2 has Pangong Tso
assert.ok(ladakhTripData.days[0].title.includes("Thiksey Monastery"));
assert.ok(ladakhTripData.days[1].title.includes("Pangong Tso"));
// Days 3, 4, 5 are Flexible Exploration Days
for (let d = 2; d < 5; d++) {
  assert.ok(
    ladakhTripData.days[d].theme.includes("Flexible Exploration Day"),
    `Day ${d + 1} must be an honest Flexible Exploration Day`
  );
}
// Stays must have positive rates
for (const stay of ladakhTripData.accommodations) {
  assert.ok(stay.pricePerNightUsd > 0);
}
console.log('✅ Check 20: Category heading rejection, Himalayan landmark grounding & itinerary integrity verified');

console.log('\n🎉 ALL FRONTEND DESTINATION FIDELITY & RESULTS QUALITY VERIFICATIONS PASSED!');



