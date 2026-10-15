import { SAMPLE_TRIPS } from '../data/mockTrips.js';
import { normalizeDestination, parseTripPrompt } from './promptParser.js';

/**
 * TripPilot AI — Destination-Aware Trip Data Synthesizer
 * Merges live TinyFish research results with structured itinerary components.
 * Guarantees:
 * - Zero leakage of raw natural-language prompts or unrelated demo cities/Japanese imagery
 * - No templated "District 1 / 2 / 3" or fabricated transit times / opening hours
 * - Canonical URL deduplication for citations and name deduplication for attractions
 * - Honest labeling of illustrative stay archetypes and fixed-percentage budget estimates
 */

const BUDGET_MULTIPLIERS = {
  'Backpacker': 85,
  'Balanced Explorer': 210,
  'Luxury Comfort': 520,
  'Bespoke Haute-Luxe': 1150
};

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source'
]);

const LISTICLE_REGEX = /(?:\b(?:\d+|the|a|an)?\s*(?:best|top|unmissable|must[-\s]?see|must[-\s]?visit|essential|things|places|sights|attractions|activities|spots|experiences|coolest|awesome|greatest|cheap|free|popular|famous)\b|\b(?:things\s+to\s+do|places\s+to\s+visit|places\s+to\s+see|what\s+to\s+do|what\s+to\s+see|where\s+to\s+go|where\s+to\s+stay|where\s+to\s+eat|how\s+to\s+reach|how\s+to\s+get|best\s+places|top\s+attractions|top\s+sights|tourist\s+places|travel\s+guide|complete\s+guide|sights\s+guide|attractions\s+guide|city\s+guide|visitor\s+guide|pocket\s+guide|trip\s+planner|trip\s+guide|itinerary\s+guide|itinerary|must[-\s]?do|experiences\s+in|top\s+things|travel\s+tips|travel\s+blog|vacation\s+guide|holiday\s+guide|overview\s+of|introduction\s+to|everything\s+you\s+need\s+to\s+know|visiting\s+[a-z]+|exploring\s+[a-z]+|ultimate\s+guide|book\s+now|book\s+tickets|tour\s+package|day\s+tours?|guided\s+tours?|tours?\s+(?:and|&)\s+excursions?|excursions?\s+(?:and|&)\s+tours?|outdoor\s+activities|cultural\s+&\s+scenic\s+highlights|scenic\s+highlights|travel\s+highlights|destination\s+highlights)\b|\b(?:instagram|tiktok|facebook|pinterest|youtube|twitter|reels|shorts|vlog|photo\s+by|photos?\s+and\s+videos?|watch\s+on|pinned\s+by|likes?,\s*\d+\s*comments?)\b)/i;

const GENERIC_EDITORIAL_REGEX = /\b(?:the\s+game\s+plans?|game\s+plans?|day\s+plans?|action\s+plans?|travel\s+plans?|trip\s+plans?|sample\s+plans?|daily\s+breakdown|step[-\s]by[-\s]step|what\s+to\s+expect|what\s+to\s+pack|pro\s+tips?|quick\s+tips?|travel\s+tips?|practical\s+tips?|honest\s+review|when\s+to\s+go|how\s+to\s+get\s+there|getting\s+there|getting\s+around|where\s+to\s+stay|where\s+to\s+eat|final\s+thoughts|final\s+words|bottom\s+line|key\s+takeaways?|read\s+next|leave\s+a\s+reply|table\s+of\s+contents|faq|faqs|frequently\s+asked|the\s+basics|essential\s+info|good\s+to\s+know|our\s+recommendations?|top\s+recommendations?|morning\s+routine|evening\s+plans?|afternoon\s+plans?|day\s+\d+|stop\s+\d+|step\s+\d+)\b/i;

const GENERIC_CATEGORY_HEADING_REGEX = /(?:\b[A-Za-z]+\s+(?:&|and)\s+[A-Za-z]+\s+(?:Sites|Areas|Buildings|Places|Attractions|Tours|Landmarks|Activities|Spots|Centres|Centers|Reserves|Parks|Museums|Sanctuaries|Ruins|Shops)\b|\b(?:Monuments\s+(?:&|and)\s+Statues|Statues\s+(?:&|and)\s+Monuments|Sights\s+(?:&|and)\s+Landmarks|Landmarks\s+(?:&|and)\s+Sights|Museums\s+(?:&|and)\s+Galleries|Galleries\s+(?:&|and)\s+Museums|Parks\s+(?:&|and)\s+Gardens|Gardens\s+(?:&|and)\s+Parks|Nature\s+(?:&|and)\s+Parks|Castles\s+(?:&|and)\s+Palaces|Temples\s+(?:&|and)\s+Shrines|Churches\s+(?:&|and)\s+Cathedrals)\b|\b(?:Sacred|Religious|Historic|Historical|Ancient|Cultural|Archaeological|Architectural|Scenic|Natural|Outdoor|Top|Popular|Famous|Best|Local|Traditional|Modern|Specialty|Art|History|Science|Military|Children's|Maritime|National|State|Regional)\s+(?:Sites|Areas|Buildings|Places|Attractions|Tours|Landmarks|Activities|Spots|Centres|Centers|Reserves|Ruins|Museums|Statues|Monuments|Galleries|Markets|Parks)\b|\b(?:Points\s+of\s+Interest|Things\s+to\s+Do|Places\s+to\s+Visit|Where\s+to\s+Go|What\s+to\s+See|Nature\s+(?:&|and)\s+Wildlife|Outdoor\s+Activities|Water\s+(?:&|and)\s+Amusement\s+Parks|Spas\s+(?:&|and)\s+Wellness|Nightlife\s+(?:&|and)\s+Bars|Food\s+(?:&|and)\s+Drink|Shopping\s+(?:&|and)\s+Markets|Tours\s+(?:&|and)\s+Activities|Transportation\s+(?:&|and)\s+Transfers|Traveler\s+Resources|Visitor\s+Centers?|Filter\s+by|Sort\s+by|Show\s+More|See\s+All)\b)/i;

const NAMED_LANDMARK_REGEX = /\b((?:(?!Visiting\b|Visit\b|Exploring\b|Explore\b|Discovering\b|Discover\b|Seeing\b|See\b|Touring\b|Tour\b|Walk\b|Include\b|Includes\b|Hour\b|Hours\b|Day\b|Days\b|Private\b|Guided\b|Half\b|Full\b|Watch\b|Photo\b|Reel\b|Video\b)[A-Z][a-zA-Z'’-]+(?:\s+(?:of|the|de|la|di))?\s+){1,3}(?:Temple|Fort|Palace|Ghat|Jhula|Ashram|Waterfall|Falls|Valley|Pass|Lake|Tso|Monastery|Gompa|Shrine|Pavilion|Garden|Gardens|Museum|Market|Bazaar|Park|Caves|Cave|Peak|Point|Sanctuary|Springs|Bridge|Cathedral|Mosque|Church|Stepwell|Baori|Haveli|Observatory|Mantar|Mahal|Ridge|Lodge|Theatre|Railway|Road|Street|Promenade|Hill|Hills|Complex|Institute|Niwas|Setu|Tomb|Minar|Gate|Masjid|Chowk|Qila|Bhavan|Mandir|Gurudwara|Memorial|Stupa|Chorten|Fortress|Tower|Plaza|Square|Hall|La))\b/g;

/**
 * Normalizes a URL for deduplication (strips fragment, tracking params, www, trailing slash).
 */
export function canonicalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const protocol = (parsed.protocol || 'https:').toLowerCase();
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = (parsed.pathname || '').replace(/\/+$/, '');
    const keptParams = [];
    for (const [k, v] of parsed.searchParams.entries()) {
      if (!TRACKING_PARAMS.has(k.toLowerCase())) {
        keptParams.push([k, v]);
      }
    }
    keptParams.sort((a, b) => a[0].localeCompare(b[0]));
    const search = keptParams.length > 0
      ? '?' + new URLSearchParams(keptParams).toString()
      : '';
    return `${protocol}//${host}${pathname}${search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Normalizes an attraction name to prevent duplicate attraction cards across sources.
 */
export function normalizeAttractionKey(name, destination = '') {
  if (!name || typeof name !== 'string') return '';
  let s = name.toLowerCase().trim();
  if (destination) {
    const primaryDest = destination.split(',')[0].trim().toLowerCase();
    if (primaryDest) {
      s = s.replace(new RegExp(`\\b(?:in|at|near|of)?\\s*${primaryDest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
    }
  }
  s = s.replace(/^(?:the|a|an)\s+/i, '');
  s = s.replace(/\bhidimba\b/g, 'hadimba');
  s = s.replace(/\bdevi\s+temple\b/g, 'temple');
  s = s.replace(/\blakshman\b/g, 'laxman');
  s = s.replace(/\bamer\b/g, 'amber');
  s = s.replace(/\bfort\s+(?:and|&)\s+palace\b/g, 'fort');
  s = s.replace(/\bpalace\s+(?:and|&)\s+fort\b/g, 'fort');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  return s;
}

/**
 * Deduplicates citations by canonical URL.
 */
export function deduplicateSources(sources = []) {
  const seen = new Set();
  const result = [];
  for (const src of sources) {
    if (!src) continue;
    const canon = canonicalizeUrl(src.url || '');
    const key = canon || (src.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...src,
      canonical_url: canon || src.url || ''
    });
  }
  return result;
}

const REGIONAL_EXCURSION_KEYWORDS = {
  rishikesh: [
    'dehradun', 'haridwar', 'mussoorie', 'shivpuri', 'kunjapuri',
    'mindrolling', 'rajaji', 'devprayag', 'kanatal', 'tehri', 'neer garh', 'neergarh'
  ],
  manali: [
    'rohtang', 'solang', 'atal tunnel', 'kullu', 'manikaran',
    'kasol', 'naggar', 'sissu', 'spiti', 'gulaba', 'kothi', 'jogini'
  ],
  jaipur: [
    'abhaneri', 'chand baori', 'pushkar', 'ajmer', 'bhangarh',
    'ranthambore', 'sariska', 'samode', 'bagru', 'sanganer'
  ],
  kyoto: [
    'nara', 'osaka', 'uji', 'kobe', 'himeji', 'biwa', 'kurama', 'kibune', 'ohara'
  ],
  shimla: [
    'kufri', 'chail', 'naldehra', 'mashobra', 'tattapani',
    'kasauli', 'solan', 'narkanda', 'shoghi', 'fagu'
  ],
  delhi: [
    'agra', 'taj mahal', 'fatehpur sikri', 'jaipur', 'neemrana',
    'mathura', 'vrindavan', 'sultanpur', 'damdama', 'surajkund',
    'kurukshetra', 'bharatpur', 'rishikesh', 'haridwar', 'alwar'
  ]
};

const CORE_IN_DESTINATION_LANDMARKS = {
  rishikesh: [
    'laxman jhula', 'lakshman jhula', 'ram jhula', 'triveni ghat',
    'parmarth niketan', 'beatles ashram', 'chaurasi kutia', 'tera manzil',
    'trayambakeshwar', 'bharat mandir', 'swarg ashram', 'geeta bhawan', 'janki setu'
  ],
  manali: [
    'hadimba', 'hidimba', 'manu temple', 'old manali', 'van vihar',
    'vashisht', 'mall road', 'club house', 'tibetan monastery', 'himalayan nyinmapa'
  ],
  jaipur: [
    'hawa mahal', 'city palace', 'jantar mantar', 'albert hall',
    'birla mandir', 'nahargarh', 'jal mahal', 'amber fort', 'amer fort',
    'amber palace', 'jaigarh', 'johari bazaar', 'bapu bazaar', 'patrika gate', 'galta ji'
  ],
  kyoto: [
    'fushimi inari', 'kinkaku-ji', 'kinkakuji', 'golden pavilion',
    'ginkaku-ji', 'ginkakuji', 'silver pavilion', 'kiyomizu-dera',
    'arashiyama', 'nijo castle', 'gion', "philosopher's path", 'kennin-ji', 'tenryu-ji'
  ],
  amalfi: [
    'path of the gods', 'positano', 'amalfi cathedral', 'duomo di amalfi',
    'ravello', 'villa rufolo', 'villa cimbrone', 'fiordo di furore', 'atrani'
  ],
  shimla: [
    'the ridge', 'ridge', 'mall road', 'jakhu temple', 'jakhoo temple',
    'christ church', 'kalka shimla', 'viceregal lodge', 'rashtrapati niwas',
    'gaiety theatre', 'annandale', 'summer hill', 'chadwick falls',
    'tara devi', 'scandal point', 'lakkar bazaar', 'sankat mochan', 'kali bari',
    'indian institute of advanced study'
  ],
  delhi: [
    'red fort', 'jama masjid', 'chandni chowk', 'qutub minar',
    'humayun\'s tomb', 'humayun tomb', 'india gate', 'lotus temple',
    'akshardham', 'rashtrapati bhavan', 'bangla sahib', 'gurudwara bangla sahib',
    'raj ghat', 'lodhi garden', 'lodhi gardens', 'national museum',
    'jantar mantar', 'purana qila', 'connaught place', 'hauz khas',
    'safdarjung tomb', 'agrasen ki baori', 'dilli haat', 'national war memorial',
    'waste to wonder'
  ]
};

const EXCURSION_CONTEXT_REGEX = /\b(?:day\s+trip|excursion|detour|outskirts|outside\s+of|\d+\s*(?:km|kilometers?|miles?|hr|hrs|hours?)\s+(?:from|away|drive|north|south|east|west)|drive\s+from|full[-\s]?day\s+tour|situated\s+in\s+[A-Z][a-z]+,\s*\d+\s*km)\b/i;

const VAGUE_UNVERIFIED_NAME_REGEX = /^(?:secret|hidden|mystery|unknown|local|private|scenic|top|best)\s+(?:waterfall|falls|beach|viewpoint|spot|trail|cave|temple|place)s?$/i;

/**
 * Conservative destination-relevance check that distinguishes:
 * - 'in_destination': Attractions clearly inside the requested destination
 * - 'nearby_excursion': Nearby excursions requiring an explicit distance or travel-time check
 * - 'unverified_location': Attractions that cannot be geographically verified
 */
export function classifyAttractionGeography(att = {}, destination = '') {
  if (
    att.geographic_status &&
    ['in_destination', 'nearby_excursion', 'unverified_location'].includes(att.geographic_status) &&
    att.geographic_label &&
    att.location_note
  ) {
    return {
      geographic_status: att.geographic_status,
      geographic_label: att.geographic_label,
      location_note: att.location_note
    };
  }

  const primaryDest = (destination.split(',')[0] || 'Destination').trim();
  const destKey = primaryDest.toLowerCase();
  const nameLower = (att.name || '').toLowerCase().trim();
  const descLower = (att.description || '').toLowerCase().trim();
  const combined = `${nameLower} ${descLower}`;

  if (VAGUE_UNVERIFIED_NAME_REGEX.test(nameLower)) {
    return {
      geographic_status: 'unverified_location',
      geographic_label: 'Location Unverified • Check Source',
      location_note: `Mentioned in a ${primaryDest} source without a specific municipal address or landmark name. Exact geographic location cannot be verified from retrieved text — consult the linked source.`
    };
  }

  const matchedKey = Object.keys(REGIONAL_EXCURSION_KEYWORDS).find(k => destKey.includes(k));
  const excursionList = matchedKey ? REGIONAL_EXCURSION_KEYWORDS[matchedKey] : [];
  const coreKey = Object.keys(CORE_IN_DESTINATION_LANDMARKS).find(k => destKey.includes(k));
  const coreList = coreKey ? CORE_IN_DESTINATION_LANDMARKS[coreKey] : [];
  const isCoreName = coreList.some(c => nameLower.includes(c));

  for (const kw of excursionList) {
    if (nameLower.includes(kw) || (!isCoreName && combined.includes(kw))) {
      return {
        geographic_status: 'nearby_excursion',
        geographic_label: `Nearby Excursion • Verify Distance from ${primaryDest}`,
        location_note: `Referenced as a regional excursion or outside central ${primaryDest}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling.`
      };
    }
  }

  if (EXCURSION_CONTEXT_REGEX.test(combined)) {
    return {
      geographic_status: 'nearby_excursion',
      geographic_label: `Nearby Excursion • Verify Distance from ${primaryDest}`,
      location_note: `Source text indicates this sight requires travel from central ${primaryDest}. Verify exact distance, transit route, and travel time via the linked source.`
    };
  }

  if (isCoreName) {
    return {
      geographic_status: 'in_destination',
      geographic_label: `In ${primaryDest}`,
      location_note: `Verified landmark within ${primaryDest}. Exact coordinates and opening hours are not independently verified — check source link.`
    };
  }

  const escapedDest = destKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const explicitInDest = new RegExp(
    `\\b(?:in|across|at|within|central|northern|southern|eastern|western|old|downtown|heart\\s+of|located\\s+in|situated\\s+in|monastery\\s+in|temple\\s+in|fort\\s+in|palace\\s+in|lake\\s+in|pass\\s+in|attraction\\s+in|sights?\\s+in|visit\\s+in|guide\\s+to)\\s+(?:[a-z]+\\s+){0,3}${escapedDest}\\b|${escapedDest}\\s+(?:region|district|valley|state|territory)\\b|,\\s*${escapedDest}\\b`,
    'i'
  );
  if (explicitInDest.test(combined) || combined.includes(destKey)) {
    return {
      geographic_status: 'in_destination',
      geographic_label: `In ${primaryDest}`,
      location_note: `Referenced within ${primaryDest} by the retrieved source. Verify exact venue address and hours via the linked source.`
    };
  }

  return {
    geographic_status: 'unverified_location',
    geographic_label: 'Location Unverified • Check Source',
    location_note: `Extracted from a ${primaryDest} travel source, but exact placement within municipal ${primaryDest} could not be confirmed from the retrieved snippet. Verify location via the source link.`
  };
}

/**
 * Validates that candidate is a plausible named place, rejecting editorial titles.
 */
export function isPlausibleNamedPlace(name, destination = '') {
  if (!name || typeof name !== 'string' || name.length < 3 || name.length > 68) return false;
  const clean = name.trim();
  const lower = clean.toLowerCase();

  if (
    LISTICLE_REGEX.test(clean) ||
    GENERIC_EDITORIAL_REGEX.test(clean) ||
    GENERIC_CATEGORY_HEADING_REGEX.test(clean)
  ) {
    return false;
  }

  // Reject common editorial prefixes
  if (/^(?:the\s+)?(?:game\s+plans?|day\s+plans?|action\s+plans?|trip\s+plans?|options?|routes?|itinerary|overview|summary|introduction|conclusion|budget|highlights?)\b/i.test(lower)) {
    return false;
  }

  // Reject plural taxonomy category nouns at the end of the candidate name
  if (/\b(?:Sites|Areas|Buildings|Attractions|Activities|Tours|Spots|Statues|Monuments)$/i.test(clean)) {
    let isKnown = false;
    for (const coreList of Object.values(CORE_IN_DESTINATION_LANDMARKS)) {
      if (coreList.some(lm => lower.includes(lm))) {
        isKnown = true;
        break;
      }
    }
    if (!isKnown) return false;
  }

  const primaryDest = destination.split(',')[0].trim().toLowerCase();
  if (primaryDest && (lower === primaryDest || lower === `the ${primaryDest}`)) return false;

  // Known core landmark
  const destKey = primaryDest;
  for (const [dKey, coreList] of Object.entries(CORE_IN_DESTINATION_LANDMARKS)) {
    if (!destKey || destKey.includes(dKey)) {
      if (coreList.some(lm => lower.includes(lm))) return true;
    }
  }

  // Contains recognized place noun
  const placeNouns = [
    'temple', 'fort', 'palace', 'ghat', 'jhula', 'ashram', 'waterfall', 'falls',
    'valley', 'pass', 'lake', 'tso', 'monastery', 'gompa', 'shrine', 'pavilion', 'garden',
    'gardens', 'museum', 'market', 'bazaar', 'park', 'caves', 'cave', 'peak',
    'point', 'sanctuary', 'springs', 'bridge', 'cathedral', 'mosque', 'church',
    'stepwell', 'baori', 'haveli', 'observatory', 'mantar', 'mahal', 'ridge',
    'lodge', 'theatre', 'railway', 'road', 'street', 'promenade', 'hill', 'hills',
    'complex', 'institute', 'niwas', 'setu', 'tomb', 'minar', 'gate', 'masjid',
    'chowk', 'qila', 'bhavan', 'mandir', 'gurudwara', 'memorial', 'stupa', 'chorten',
    'fortress', 'tower', 'plaza', 'square', 'village', 'quarter', 'alley', 'center',
    'centre', 'planetarium', 'aquarium', 'zoo', 'hall', 'la'
  ];
  const words = lower.match(/[a-z]+/g) || [];
  if (words.some(w => placeNouns.includes(w))) return true;

  // Capitalized multi-word check
  const nonPlaceWords = new Set([
    'best', 'top', 'great', 'ultimate', 'essential', 'complete', 'daily',
    'our', 'your', 'my', 'this', 'that', 'these', 'those', 'how', 'what',
    'why', 'when', 'where', 'who', 'which', 'free', 'cheap', 'plans',
    'plan', 'itinerary', 'guide', 'tips', 'hacks', 'review', 'reviews',
    'options', 'ideas', 'route', 'routes', 'stops', 'things', 'places',
    'game', 'games', 'routine', 'breakdown', 'sites', 'areas', 'buildings',
    'attractions', 'activities', 'tours', 'spots', 'statues', 'monuments',
    'sacred', 'religious', 'historic', 'historical', 'archaeological',
    'architectural', 'scenic', 'cultural', 'filter', 'filters', 'sorted',
    'sorting', 'ranked', 'ratings', 'entry', 'tickets', 'ticket', 'hours',
    'fee', 'fees', 'table', 'contents', 'gallery', 'galleries', 'popular',
    'famous', 'local', 'traditional', 'modern', 'specialty'
  ]);
  const capTokens = clean.split(/\s+/).filter(w => w && w[0] === w[0].toUpperCase());
  if (capTokens.length >= 2 && !words.some(w => nonPlaceWords.has(w))) {
    return true;
  }

  return false;
}

/**
 * Distinguishes source articles/listicles from individual attractions, deduplicates attractions,
 * and applies conservative geographic relevance classification.
 * Preserves source_url, source_title, and is_live_result on every live attraction.
 */
export function deduplicateAndCleanAttractions(rawAttractions = [], destination = '') {
  const seenKeys = new Set();
  const cleaned = [];
  const primaryDest = destination.split(',')[0].trim();

  for (const att of rawAttractions) {
    if (!att) continue;
    const rawName = (att.name || '').trim();
    const desc = (att.description || '').trim();
    const isListicle = LISTICLE_REGEX.test(rawName) || GENERIC_EDITORIAL_REGEX.test(rawName);

    let candidateNames = [];
    if (isListicle) {
      // Try extracting concrete named landmarks from the description/snippet first
      const matches = [...desc.matchAll(NAMED_LANDMARK_REGEX)];
      for (const m of matches) {
        let lm = m[1].trim();
        if (lm.toLowerCase() !== 'the ridge' && lm.toLowerCase() !== 'the beatles ashram') {
          lm = lm.replace(/^(?:Visit|Explore|See|Discover|Tour|Walk|At|In|Near|The|Famous|Historic|Ancient|Iconic)\s+/i, '').trim();
        }
        if (lm.toLowerCase() === 'ridge') {
          lm = 'The Ridge';
        }
        if (lm && !LISTICLE_REGEX.test(lm) && !GENERIC_EDITORIAL_REGEX.test(lm)) {
          candidateNames.push(lm);
        }
      }
      // If no sub-landmarks were matched, do not invent a fallback attraction.
    } else if (rawName && !LISTICLE_REGEX.test(rawName) && !GENERIC_EDITORIAL_REGEX.test(rawName)) {
      const cleanedName = rawName
        .split(' - ')[0]
        .split(' | ')[0]
        .split(' – ')[0]
        .replace(/^\d+[\.\)\-:]\s*/, '')
        .replace(/^(?:day|step|stop|part)\s+\d+[\.\:\-]\s*/i, '')
        .trim();
      if (cleanedName && cleanedName.toLowerCase() !== primaryDest.toLowerCase() && !LISTICLE_REGEX.test(cleanedName) && !GENERIC_EDITORIAL_REGEX.test(cleanedName)) {
        candidateNames.push(cleanedName);
      }
    }

    for (const rawCandName of candidateNames) {
      let candName = rawCandName
        .replace(/^\d+[\.\)\-:]\s*/, '')
        .replace(/^(?:day|step|stop|part)\s+\d+[\.\:\-]\s*/i, '')
        .trim();
      if (candName.toLowerCase() === 'ridge') {
        candName = 'The Ridge';
      }
      if (primaryDest) {
        const escapedDest = primaryDest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        candName = candName.replace(new RegExp(`[,\\s]+(?:in|at|near|of)?\\s*${escapedDest}\\b`, 'i'), '').trim();
      }
      if (candName.toLowerCase() === 'ridge') {
        candName = 'The Ridge';
      }
      if (!isPlausibleNamedPlace(candName, destination)) {
        continue;
      }
      const key = normalizeAttractionKey(candName, destination);
      if (!key || seenKeys.has(key)) continue;

      // Reject if name matches tour/excursion phrases, listicles, generic editorial, or category headings
      if (
        LISTICLE_REGEX.test(candName) ||
        GENERIC_EDITORIAL_REGEX.test(candName) ||
        GENERIC_CATEGORY_HEADING_REGEX.test(candName) ||
        /\b(?:tours?\s+(?:and|&)\s+excursions?|best\s+[a-z\s]+tours?|top\s+[a-z\s]+tours?)\b/i.test(candName)
      ) {
        continue;
      }

      // Reject foreign landmarks from other known destinations
      const destKey = primaryDest.toLowerCase();
      let isForeignLandmark = false;
      for (const [otherDest, otherLandmarks] of Object.entries(CORE_IN_DESTINATION_LANDMARKS)) {
        if (!destKey.includes(otherDest) && otherLandmarks.some(lm => candName.toLowerCase().includes(lm))) {
          // Allow shared names like 'mall road' only if destination itself has it in its core landmarks
          const thisDestCore = CORE_IN_DESTINATION_LANDMARKS[destKey] || [];
          if (!thisDestCore.some(lm => candName.toLowerCase().includes(lm))) {
            isForeignLandmark = true;
            break;
          }
        }
      }
      if (isForeignLandmark) {
        continue;
      }

      seenKeys.add(key);

      const candidateObj = {
        ...att,
        name: candName,
        description: desc
      };
      const geo = classifyAttractionGeography(candidateObj, destination);

      cleaned.push({
        ...att,
        id: att.id || `att-${cleaned.length + 1}`,
        name: candName,
        // Never attach misleading generic/pagoda stock imagery to live or unverified attractions
        image: att.isVerifiedImage ? att.image : null,
        source_url: att.source_url || att.sourceUrl || '',
        source_title: att.source_title || att.sourceTitle || '',
        is_live_result: Boolean(att.is_live_result),
        geographic_status: geo.geographic_status,
        geographic_label: geo.geographic_label,
        location_note: geo.location_note
      });
    }
  }

  const priority = { in_destination: 0, nearby_excursion: 1, unverified_location: 2 };
  cleaned.sort((a, b) => (priority[a.geographic_status] ?? 2) - (priority[b.geographic_status] ?? 2));

  return cleaned;
}

/**
 * Generates a destination-aware transit strategy label.
 * Clearly marks transit as an estimate / pending verification when not live-researched.
 */
export function resolveDestinationTransitStrategy(destination = '', rawPreference = '') {
  const d = destination.toLowerCase();
  const pref = (rawPreference || '').trim();

  // Strip any stale Japan-specific Shinkansen default on non-Japan destinations
  const isJapan = /kyoto|tokyo|osaka|japan|hakone|hiroshima|nara/i.test(d);
  const hasGenericDefault =
    !pref ||
    /shinkansen/i.test(pref) ||
    pref === 'Scenic Rail & Regional Transit' ||
    pref === 'Scenic Rail & Local Transit' ||
    pref.includes('Pending Verification');

  if (!hasGenericDefault && (isJapan || !/shinkansen/i.test(pref))) {
    return pref.includes('Estimate') || pref.includes('Verification')
      ? pref
      : `${pref} (User Preference • Routes Pending Verification)`;
  }

  if (/rishikesh|manali|himachal|ladakh|leh|shimla|dharamshala|mussoorie|kasol|nainital|gangtok|darjeeling/i.test(d)) {
    return 'Regional Road, Local Taxis & Walkable Zones (Estimate • Pending Verification)';
  }
  if (/jaipur|udaipur|jodhpur|rajasthan|agra|delhi|varanasi|mumbai|bengaluru|kolkata|chennai|hyderabad/i.test(d)) {
    return 'Local Cabs, Auto-Rickshaws & Regional Rail (Estimate • Pending Verification)';
  }
  if (isJapan) {
    return 'Regional Rail & Local Transit (Estimate • Pending Verification)';
  }
  return `Local & Regional Transit in ${destination.split(',')[0]} (Estimate • Pending Verification)`;
}

export function buildActiveTripData({
  tripBrief = {},
  liveResearchResult = null,
  useDemoFallback = false,
  selectedCity = "Kyoto, Japan"
}) {
  const hasLiveFindings = Boolean(
    liveResearchResult &&
    !useDemoFallback &&
    liveResearchResult.status !== 'empty' &&
    liveResearchResult.status !== 'failed' &&
    ((Array.isArray(liveResearchResult.attractions) && liveResearchResult.attractions.length > 0) ||
      (Array.isArray(liveResearchResult.sources) && liveResearchResult.sources.length > 0))
  );
  const isLive = hasLiveFindings;

  // Parse originalPrompt/prompt as a structured fallback if caller passed raw text
  const rawPromptText = tripBrief.originalPrompt || tripBrief.prompt || '';
  const parsedFallback = rawPromptText ? parseTripPrompt(rawPromptText) : null;

  // Normalized clean destination (never a raw sentence or "under $200")
  const rawCandidateDestination =
    (liveResearchResult?.destination && !useDemoFallback ? liveResearchResult.destination : null) ||
    tripBrief.destination ||
    parsedFallback?.destination ||
    selectedCity ||
    "Kyoto, Japan";

  const destination = normalizeDestination(
    rawCandidateDestination,
    parsedFallback?.destination || "Kyoto, Japan"
  );

  const durationDays = Number(
    (isLive ? liveResearchResult?.duration_days : null) ||
    tripBrief.durationDays ||
    parsedFallback?.durationDays ||
    5
  );

  // Structured travelStyle and groupType (never raw prompt text)
  const travelStyle =
    tripBrief.travelStyle ||
    tripBrief.budgetTier ||
    parsedFallback?.travelStyle ||
    "Balanced Explorer";

  const groupType =
    tripBrief.groupType ||
    tripBrief.groupSize ||
    parsedFallback?.groupType ||
    "Romantic Couple";

  // Explicit user budget target & currency when provided in prompt (e.g. "under $200")
  const explicitBudgetTarget =
    tripBrief.budgetTarget !== undefined && tripBrief.budgetTarget !== null
      ? Number(tripBrief.budgetTarget)
      : (parsedFallback?.budgetTarget ?? null);

  const budgetCurrency =
    tripBrief.budgetCurrency ||
    parsedFallback?.budgetCurrency ||
    "USD";

  const originalPrompt =
    rawPromptText || `Trip to ${destination} for ${durationDays} days`;

  const transportPreference = resolveDestinationTransitStrategy(
    destination,
    tripBrief.transportPreference
  );

  const validDuration = Math.max(1, Math.min(30, Number(durationDays) || 5));
  const baseDailyRate = Number(BUDGET_MULTIPLIERS[travelStyle]) || 210;
  const dailyRate = Math.max(20, baseDailyRate);
  const estimatedTotalUsd = Math.max(dailyRate, Math.round(validDuration * dailyRate));

  const hasExplicitBudget =
    typeof explicitBudgetTarget === 'number' &&
    !Number.isNaN(explicitBudgetTarget) &&
    explicitBudgetTarget > 0;

  const isUnderBudget = hasExplicitBudget && explicitBudgetTarget < estimatedTotalUsd;

  const formattedTarget = hasExplicitBudget
    ? `${budgetCurrency === 'USD' ? '$' : `${budgetCurrency} `}${explicitBudgetTarget.toLocaleString()} ${budgetCurrency}`
    : null;

  const budgetWarning = isUnderBudget
    ? `Requested budget target (${formattedTarget}) is below our illustrative ${durationDays}-day benchmark of $${estimatedTotalUsd.toLocaleString()} USD for ${destination} (${travelStyle} tier, ${groupType}). Consider hostel/guesthouse stays, public buses/shared transit, or a shorter duration to stay within ${formattedTarget}.`
    : null;

  // Check if a dedicated curated sample dataset matches this destination exactly
  const matchingPreset = SAMPLE_TRIPS[destination];

  // If using demo fallback (or initial pre-research demo view) and a preset exists without custom explicit budget override, return preset
  if (!isLive && (!liveResearchResult || useDemoFallback) && matchingPreset && !hasExplicitBudget) {
    return {
      ...matchingPreset,
      isLiveResearch: false,
    };
  }

  // Deduplicate live sources (by canonical URL) and deduplicate/clean live attractions
  const liveSources = deduplicateSources(liveResearchResult?.sources || []);
  const liveAttractions = deduplicateAndCleanAttractions(
    liveResearchResult?.attractions || [],
    destination
  );

  // Partition unique verified attractions across days with geographic awareness:
  // - In-destination sights cluster on central city days (up to 2 per day)
  // - Nearby excursions receive dedicated regional excursion days (never mixed with distant municipal landmarks)
  // - Unverified locations receive explicit verification framing on separate days
  const inDestAttractions = liveAttractions.filter(
    a => (a.geographic_status || 'in_destination') === 'in_destination'
  );
  const excursionAttractions = liveAttractions.filter(
    a => a.geographic_status === 'nearby_excursion'
  );
  const unverifiedAttractions = liveAttractions.filter(
    a => a.geographic_status === 'unverified_location'
  );

  const dayBuckets = Array.from({ length: durationDays }, () => []);

  // Compute available city days (reserving dedicated days for verified excursions)
  const dedicatedExcursionDays = excursionAttractions.length;
  const availableCityDays = Math.max(1, durationDays - dedicatedExcursionDays);

  // If in-destination attractions can each have their own day, distribute 1 per day across city days
  const perCityDayCap = inDestAttractions.length > availableCityDays ? 2 : 1;
  let cityDayIdx = 0;
  for (const att of inDestAttractions) {
    if (cityDayIdx < availableCityDays) {
      dayBuckets[cityDayIdx].push(att);
      if (dayBuckets[cityDayIdx].length >= perCityDayCap) {
        cityDayIdx++;
      }
    } else {
      // If all available city days are filled, fill slots in earlier city days up to 2
      const slotDay = dayBuckets.slice(0, availableCityDays).find(b => b.length < 2);
      if (slotDay) {
        slotDay.push(att);
      }
    }
  }

  // 2. Assign nearby excursions — each gets its own dedicated day
  let excDayIdx = Math.min(
    durationDays - 1,
    Math.max(cityDayIdx, inDestAttractions.length > 0 ? (perCityDayCap === 1 ? inDestAttractions.length : cityDayIdx) : 0)
  );
  for (const exc of excursionAttractions) {
    while (excDayIdx < durationDays && dayBuckets[excDayIdx].length > 0) {
      excDayIdx++;
    }
    if (excDayIdx < durationDays) {
      dayBuckets[excDayIdx].push(exc);
      excDayIdx++;
    }
  }

  // Note: Unverified candidate sights are NEVER scheduled as confirmed stops in the itinerary timeline.
  // Empty days remain honest 'Flexible Exploration Day in <destination> (Pending Landmark Verification)'.

  // Generate day-by-day itinerary without fake "District 1/2/3" labels, fake step counts, or fake hours
  const generatedDays = Array.from({ length: durationDays }, (_, idx) => {
    const dayNum = idx + 1;
    const assignedAttractions = dayBuckets[idx] || [];
    const primaryAttraction = assignedAttractions[0] || null;
    const secondaryAttraction = assignedAttractions[1] || null;

    if (primaryAttraction) {
      const isPrimaryExcursion = primaryAttraction.geographic_status === 'nearby_excursion';

      const dayTitle = secondaryAttraction
        ? `${primaryAttraction.name} & ${secondaryAttraction.name}`
        : isPrimaryExcursion
          ? `${primaryAttraction.name} (Nearby Excursion from ${destination})`
          : `${primaryAttraction.name} & Surrounding Area`;

      const dayArea = isPrimaryExcursion
        ? `Excursion from ${destination} • ${primaryAttraction.name}`
        : `${destination} • ${primaryAttraction.name}`;

      const dayTheme = isPrimaryExcursion
        ? `Regional Excursion Day (Verify Distance & Travel Time from ${destination})`
        : primaryAttraction.is_live_result
          ? `In-Destination Landmark Focus (${assignedAttractions.length} Verified Sight${assignedAttractions.length > 1 ? 's' : ''})`
          : `Destination Focus in ${destination}`;

      return {
        day: dayNum,
        title: dayTitle,
        area: dayArea,
        theme: dayTheme,
        transitTip: isPrimaryExcursion
          ? `Regional excursion outside central ${destination} — road distance & travel time must be verified via source before departure.`
          : `Transit routes & travel times in ${destination} are pending verification — confirm local transport on arrival.`,
        walkingPace: `Pace & walking distances pending local route verification`,
        slots: {
          morning: {
            time: "Morning Window (Verify venue hours)",
            title: primaryAttraction.name,
            description: primaryAttraction.description || `Explore ${primaryAttraction.name}.`,
            location: `${primaryAttraction.geographic_label || destination} (Source: ${primaryAttraction.source_title || 'Verified Web Citation'})`,
            category: primaryAttraction.category || "Attractions",
            duration: isPrimaryExcursion ? "Verify excursion travel time" : "Check venue on arrival",
            costNote: "Entry fee & hours require local verification",
            tag: primaryAttraction.geographic_label || (primaryAttraction.is_live_result ? "Live TinyFish Finding" : "Destination Sight"),
            agentTip: primaryAttraction.location_note || primaryAttraction.insider_tip || `Verify current opening hours and ticketing for ${primaryAttraction.name} before departure.`
          },
          afternoon: secondaryAttraction
            ? {
                time: "Afternoon Window (Verify venue hours)",
                title: secondaryAttraction.name,
                description: secondaryAttraction.description || `Visit ${secondaryAttraction.name}.`,
                location: `${secondaryAttraction.geographic_label || destination} (Source: ${secondaryAttraction.source_title || 'Verified Web Citation'})`,
                category: secondaryAttraction.category || "Attractions",
                duration: secondaryAttraction.geographic_status === 'nearby_excursion' ? "Verify excursion travel time" : "Check venue on arrival",
                costNote: "Entry fee & hours require local verification",
                tag: secondaryAttraction.geographic_label || (secondaryAttraction.is_live_result ? "Live TinyFish Finding" : "Destination Sight"),
                agentTip: secondaryAttraction.location_note || secondaryAttraction.insider_tip || `Confirm travel time between ${primaryAttraction.name} and ${secondaryAttraction.name} locally.`
              }
            : isPrimaryExcursion
              ? {
                  time: "Afternoon Window (Regional Transit & Excursion Return)",
                  title: `${primaryAttraction.name} Grounds & Regional Return`,
                  description: `Continued time at ${primaryAttraction.name} and return transit to central ${destination}. Verify return road transit, bus, or shared taxi timings locally before departure.`,
                  location: `${destination} Region`,
                  category: "Regional Excursion Window",
                  duration: "Verify excursion return travel time",
                  costNote: "Local excursion transit expense (Verify locally)",
                  tag: "Regional Transit Window",
                  agentTip: `Confirm departure transit back to central ${destination} well before sunset.`
                }
              : {
                  time: "Afternoon Window (Flexible)",
                  title: `Flexible Local Exploration (${destination})`,
                  description: `Open exploration window in ${destination}. Exact neighborhood clustering, nearby cafes, and walking routes around ${primaryAttraction.name} have not been live-crawled and should be confirmed locally.`,
                  location: destination,
                  category: "Flexible Exploration",
                  duration: "Flexible",
                  costNote: "Variable local expense (Unverified)",
                  tag: "Pending Local Verification",
                  agentTip: `Ask locally for nearby viewpoints, markets, and afternoon transit connections.`
                },
          evening: {
            time: "Evening Window (Flexible)",
            title: `Regional Dining & Evening Stroll in ${destination}`,
            description: `Unscheduled evening pacing in ${destination}. Specific restaurant operating hours, table reservations, and evening transport schedules still need verification.`,
            location: destination,
            category: "Food & Dining (Illustrative)",
            duration: "Flexible",
            costNote: `$${Math.max(10, Math.round(dailyRate * 0.24))} USD group benchmark (Illustrative estimate)`,
            tag: "Illustrative Pacing",
            agentTip: "Dining venues were not live-crawled in this pass; verify local restaurant hours and hygiene ratings on arrival."
          }
        }
      };
    }

    // Honest fallback when a day has no remaining verified attractions
    return {
      day: dayNum,
      title: `Flexible Exploration Day in ${destination}`,
      area: `${destination} • Flexible Exploration Day`,
      theme: "Flexible Exploration Day (Additional Sights Pending Verification)",
      transitTip: `Local transit routes & inter-neighborhood travel times in ${destination} require verification.`,
      walkingPace: "Flexible pace • Unscheduled day",
      slots: {
        morning: {
          time: "Morning Window (Flexible)",
          title: `Flexible Morning Exploration in ${destination}`,
          description: `No additional distinct live-verified attractions were assigned to Day ${dayNum}. Use this window for self-guided neighborhood walks, rest, or local markets in ${destination}.`,
          location: destination,
          category: "Flexible Exploration",
          duration: "Flexible",
          costNote: "Pending local verification",
          tag: "Flexible Exploration Day",
          agentTip: "What still needs verification: specific landmark opening hours, ticket booking rules, and local transit links for this day."
        },
        afternoon: {
          time: "Afternoon Window (Flexible)",
          title: `Self-Guided Cultural & Market Discovery (${destination})`,
          description: `Open afternoon schedule for ${destination}. Local craft bazaars, regional museums, or scenic trails can be slotted here once verified on arrival.`,
          location: destination,
          category: "Flexible Exploration",
          duration: "Flexible",
          costNote: "Pending local verification",
          tag: "Flexible Exploration Day",
          agentTip: "Check official regional tourism advisories for seasonal weather and afternoon operating hours."
        },
        evening: {
          time: "Evening Window (Flexible)",
          title: `Flexible Evening & Departure Prep in ${destination}`,
          description: `Relaxed evening in ${destination}. Confirm return transfer logistics and dining options locally.`,
          location: destination,
          category: "Food & Dining (Illustrative)",
          duration: "Flexible",
          costNote: `$${Math.max(10, Math.round(dailyRate * 0.24))} USD group benchmark (Illustrative estimate)`,
          tag: "Illustrative Pacing",
          agentTip: "Verify onward transit or departure transfer timing at least 24 hours in advance."
        }
      }
    };
  });

  // Illustrative Stay Archetypes (explicitly labeled as non-bookable benchmarks, no misleading stock photos)
  const rateArchetype1 = Math.max(15, Math.round(dailyRate * 0.52));
  const rateArchetype2 = Math.max(20, Math.round(dailyRate * 0.68));
  const rateArchetype3 = Math.max(10, Math.round(dailyRate * 0.35));

  const accommodations = [
    {
      id: "stay-archetype-1",
      isArchetype: true,
      isVerifiedImage: false,
      image: null,
      name: `Heritage & Boutique Stay Archetype (${destination})`,
      neighborhood: `Central / Cultural Quarter, ${destination}`,
      type: "Illustrative Stay Archetype • Not a Bookable Property",
      pricePerNightUsd: rateArchetype1,
      pricePerNightDemo: `$${rateArchetype1} USD`,
      vibeScore: 92,
      description: `Illustrative mid-to-boutique accommodation profile for ${destination} based on ${travelStyle} tier benchmarks.`,
      matchReason: `Illustrative benchmark for ${groupType} seeking central access in ${destination}. Live hotel inventory and nightly availability are not crawled yet.`,
      pros: [
        `Target budget allocation: $${rateArchetype1}/night for ${groupType}`,
        `Prioritizes walkable access to central ${destination} sights`,
        "Suitable baseline for comparing real boutique guesthouses or heritage stays"
      ],
      cons: [
        "Not a live bookable hotel listing — property names & live rates require verification",
        "Seasonal peak pricing in " + destination + " may vary from this benchmark"
      ],
      transitMinutes: `Transit distance depends on the actual property booked in ${destination}`,
      sourceBadge: "Illustrative Tier Benchmark • Live Stays Crawl Pending",
      agentBadge: "Benchmark Tier Archetype"
    },
    {
      id: "stay-archetype-2",
      isArchetype: true,
      isVerifiedImage: false,
      image: null,
      name: `Scenic Retreat / Nature Lodge Archetype (${destination})`,
      neighborhood: `Scenic Outskirts / Vantage Zone, ${destination}`,
      type: "Illustrative Stay Archetype • Not a Bookable Property",
      pricePerNightUsd: rateArchetype2,
      pricePerNightDemo: `$${rateArchetype2} USD`,
      vibeScore: 89,
      description: `Illustrative higher-comfort scenic stay profile for ${destination}.`,
      matchReason: `Represents quieter perimeter retreats or river/mountain-view lodges around ${destination}. Requires live booking platform verification.`,
      pros: [
        "Quieter setting away from dense transit hubs",
        "Higher amenity & scenic view allocation within benchmark",
        `Tailored to ${travelStyle} comfort expectations`
      ],
      cons: [
        "Not a live bookable property — check real availability before travel",
        "Typically requires local cab/transfer to reach central landmarks"
      ],
      transitMinutes: "Verify local road access and transfer time before booking",
      sourceBadge: "Illustrative Tier Benchmark • Live Stays Crawl Pending",
      agentBadge: "Scenic Comfort Archetype"
    },
    {
      id: "stay-archetype-3",
      isArchetype: true,
      isVerifiedImage: false,
      image: null,
      name: `Value Guesthouse / Transit Hub Archetype (${destination})`,
      neighborhood: `Transit-Accessible Area, ${destination}`,
      type: "Illustrative Stay Archetype • Not a Bookable Property",
      pricePerNightUsd: rateArchetype3,
      pricePerNightDemo: `$${rateArchetype3} USD`,
      vibeScore: 85,
      description: `Illustrative value-focused stay profile for travelers optimizing budget in ${destination}.`,
      matchReason: `Demonstrates how reducing nightly stay spend to $${rateArchetype3}/night lowers overall trip cost in ${destination}.`,
      pros: [
        "Frees up budget for guided activities and regional dining",
        "Practical for short stays and early-morning departures",
        "Helps keep total spend closer to strict budget caps"
      ],
      cons: [
        "Not a real hotel listing — verify guesthouse reviews and safety independently",
        "Fewer on-site leisure amenities"
      ],
      transitMinutes: "Select near verified bus/rail/taxi stands in " + destination,
      sourceBadge: "Illustrative Tier Benchmark • Live Stays Crawl Pending",
      agentBadge: "Budget-Conscious Archetype"
    }
  ];

  // Clean structured category notes (complete, descriptive, never interpolating raw user prompt)
  const accommodationNote = `${durationDays} nights · Illustrative 52% allocation for ${destination} (${travelStyle} tier for ${groupType}; not live hotel pricing)`;
  const diningNote = `${durationDays} days · Illustrative 24% allocation for daily meals & regional cuisine in ${destination} (${groupType})`;
  const sightseeingNote = `${durationDays} days · Illustrative 14% allocation for landmark entry tickets & local guides in ${destination}`;
  const transitNote = `${durationDays} days · Illustrative 10% allocation for local cabs, auto/bus transfers & within-city transit in ${destination}`;

  const budgetExclusions =
    "Excludes international or domestic flights, long-distance intercity rail/bus tickets to reach the destination, visa fees, travel insurance, and peak-holiday surcharges.";
  const budgetMethodology =
    `Illustrative fixed-percentage model (52% stays, 24% dining, 14% sightseeing, 10% local transit) based on ${durationDays} days × $${dailyRate}/day (${travelStyle} benchmark for ${groupType}). Not live-crawled destination pricing.`;

  const budgetBreakdown = {
    totalUsd: Math.max(1, estimatedTotalUsd),
    perPersonUsd: Math.max(1, Math.round(estimatedTotalUsd / 2)),
    totalEstimatedBudgetUsd: Math.max(1, estimatedTotalUsd),
    currency: "USD",
    budgetTarget: hasExplicitBudget ? explicitBudgetTarget : null,
    budgetCurrency: budgetCurrency,
    isUnderBudget: isUnderBudget,
    budgetWarning: budgetWarning,
    travelStyle: travelStyle,
    groupType: groupType,
    appliesToLabel: `Group Total (${groupType})`,
    perPersonLabel: "Per Person (Assuming 2 Travelers)",
    exclusionsNote: budgetExclusions,
    methodologyNote: budgetMethodology,
    categories: [
      {
        name: "Accommodations (Illustrative 52%)",
        amount: Math.max(1, Math.round(estimatedTotalUsd * 0.52)),
        percentage: 52,
        color: "#FFE600",
        notes: accommodationNote
      },
      {
        name: "Dining & Regional Cuisine (Illustrative 24%)",
        amount: Math.max(1, Math.round(estimatedTotalUsd * 0.24)),
        percentage: 24,
        color: "#3B82F6",
        notes: diningNote
      },
      {
        name: "Sightseeing & Activities (Illustrative 14%)",
        amount: Math.max(1, Math.round(estimatedTotalUsd * 0.14)),
        percentage: 14,
        color: "#10B981",
        notes: sightseeingNote
      },
      {
        name: "Local Transit & Transfers (Illustrative 10%)",
        amount: Math.max(1, Math.round(estimatedTotalUsd * 0.10)),
        percentage: 10,
        color: "#8B5CF6",
        notes: transitNote
      }
    ],
    items: [
      {
        category: "Accommodations (Illustrative 52%)",
        amountUsd: Math.max(1, Math.round(estimatedTotalUsd * 0.52)),
        percentage: 52,
        notes: accommodationNote
      },
      {
        category: "Dining & Regional Cuisine (Illustrative 24%)",
        amountUsd: Math.max(1, Math.round(estimatedTotalUsd * 0.24)),
        percentage: 24,
        notes: diningNote
      },
      {
        category: "Sightseeing & Activities (Illustrative 14%)",
        amountUsd: Math.max(1, Math.round(estimatedTotalUsd * 0.14)),
        percentage: 14,
        notes: sightseeingNote
      },
      {
        category: "Local Transit & Transfers (Illustrative 10%)",
        amountUsd: Math.max(1, Math.round(estimatedTotalUsd * 0.10)),
        percentage: 10,
        notes: transitNote
      }
    ],
    agentNote: budgetWarning
      ? `${budgetWarning} ${budgetMethodology} ${budgetExclusions}`
      : `${budgetMethodology} ${budgetExclusions}`
  };

  return {
    meta: {
      isDemoContent: !isLive,
      demoLabel: isLive ? "Live AI Research Results (TinyFish)" : "Demo Prototype Outline",
      originalPrompt: originalPrompt,
      destination: destination,
      durationDays: durationDays,
      season: "Current Season",
      groupType: groupType,
      groupSize: groupType,
      travelStyle: travelStyle,
      transportPreference: transportPreference,
      budgetTarget: hasExplicitBudget ? explicitBudgetTarget : null,
      budgetCurrency: budgetCurrency,
      totalEstimatedBudgetUsd: estimatedTotalUsd,
      currency: "USD",
      isUnderBudget: isUnderBudget,
      budgetWarning: budgetWarning,
      confidenceScore: isLive
        ? ((inDestAttractions.length + excursionAttractions.length) > 0
            ? `Live Web Grounded (${inDestAttractions.length + excursionAttractions.length} Sights Verified)`
            : (liveAttractions.length > 0
                ? "Live Research Partial • Sights Require Local Verification"
                : "Live Research Empty • 0 Verified Sights"))
        : "Calculated Outline",
      synthesisDate: new Date().toISOString().split('T')[0],
      generatedPrompt: originalPrompt
    },
    days: matchingPreset && !isLive && (!liveResearchResult || useDemoFallback) ? matchingPreset.days : generatedDays,
    accommodations: matchingPreset && !isLive && (!liveResearchResult || useDemoFallback) ? matchingPreset.accommodations : accommodations,
    attractions: liveAttractions.length > 0
      ? liveAttractions
      : (matchingPreset && (!liveResearchResult || useDemoFallback) ? matchingPreset.attractions : []),
    budgetBreakdown: matchingPreset && !isLive && !hasExplicitBudget && (!liveResearchResult || useDemoFallback) ? matchingPreset.budgetBreakdown : budgetBreakdown,
    sourcesBibliography: liveSources.length > 0
      ? liveSources
      : (matchingPreset && (!liveResearchResult || useDemoFallback) ? matchingPreset.sourcesBibliography : []),
    isLiveResearch: isLive
  };
}
