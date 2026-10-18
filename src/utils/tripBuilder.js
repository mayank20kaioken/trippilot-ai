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
  'Backpacker': 75,
  'Balanced Explorer': 210,
  'Luxury Comfort': 520,
  'Bespoke Haute-Luxe': 1150
};

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source'
]);

const RECOGNIZED_PLACE_NOUNS = new Set([
  'temple', 'fort', 'palace', 'ghat', 'jhula', 'ashram', 'waterfall', 'falls',
  'valley', 'pass', 'lake', 'tso', 'monastery', 'gompa', 'shrine', 'pavilion', 'garden',
  'gardens', 'museum', 'market', 'bazaar', 'park', 'caves', 'cave', 'peak',
  'point', 'sanctuary', 'springs', 'bridge', 'cathedral', 'mosque', 'church',
  'stepwell', 'baori', 'haveli', 'observatory', 'mantar', 'mahal', 'ridge',
  'lodge', 'theatre', 'railway', 'road', 'street', 'promenade', 'hill', 'hills',
  'complex', 'institute', 'niwas', 'setu', 'tomb', 'minar', 'gate', 'gateway', 'masjid',
  'chowk', 'qila', 'bhavan', 'mandir', 'gurudwara', 'memorial', 'stupa', 'chorten',
  'fortress', 'tower', 'plaza', 'square', 'village', 'quarter', 'alley', 'center',
  'centre', 'planetarium', 'aquarium', 'zoo', 'hall', 'la', 'dargah', 'arch', 'terminus',
  'beach', 'beaches', 'basilica', 'kottam', 'gallery', 'galleries'
]);

const LISTICLE_REGEX = /(?:\b(?:\d+|the|a|an)?\s*(?:best|top|unmissable|must[-\s]?see|must[-\s]?visit|essential|things|places|sights|attractions|activities|spots|experiences|coolest|awesome|greatest|cheap|free|popular|famous)\b|\b(?:things\s+to\s+do|places\s+to\s+visit|places\s+to\s+see|what\s+to\s+do|what\s+to\s+see|where\s+to\s+go|where\s+to\s+stay|where\s+to\s+eat|how\s+to\s+reach|how\s+to\s+get|best\s+places|top\s+attractions|top\s+sights|tourist\s+places|travel\s+guide|complete\s+guide|sights\s+guide|attractions\s+guide|city\s+guide|visitor\s+guide|pocket\s+guide|trip\s+planner|trip\s+guide|itinerary\s+guide|itinerary|must[-\s]?do|experiences\s+in|top\s+things|travel\s+tips|travel\s+blog|vacation\s+guide|holiday\s+guide|overview\s+of|introduction\s+to|everything\s+you\s+need\s+to\s+know|visiting\s+[a-z]+|exploring\s+[a-z]+|ultimate\s+guide|book\s+now|book\s+tickets|tour\s+package|day\s+tours?|guided\s+tours?|tours?\s+(?:and|&)\s+excursions?|excursions?\s+(?:and|&)\s+tours?|outdoor\s+activities|cultural\s+&\s+scenic\s+highlights|scenic\s+highlights|travel\s+highlights|destination\s+highlights)\b|\b(?:instagram|tiktok|facebook|pinterest|youtube|twitter|reels|shorts|vlog|photo\s+by|photos?\s+and\s+videos?|watch\s+on|pinned\s+by|likes?,\s*\d+\s*comments?)\b)/i;

const GENERIC_EDITORIAL_REGEX = /\b(?:the\s+game\s+plans?|game\s+plans?|day\s+plans?|action\s+plans?|travel\s+plans?|trip\s+plans?|sample\s+plans?|daily\s+breakdown|step[-\s]by[-\s]step|what\s+to\s+expect|what\s+to\s+pack|pro\s+tips?|quick\s+tips?|travel\s+tips?|practical\s+tips?|honest\s+review|when\s+to\s+go|how\s+to\s+get\s+there|getting\s+there|getting\s+around|where\s+to\s+stay|where\s+to\s+eat|final\s+thoughts|final\s+words|bottom\s+line|key\s+takeaways?|read\s+next|leave\s+a\s+reply|table\s+of\s+contents|faq|faqs|frequently\s+asked|the\s+basics|essential\s+info|good\s+to\s+know|our\s+recommendations?|top\s+recommendations?|morning\s+routine|evening\s+plans?|afternoon\s+plans?|day\s+\d+|stop\s+\d+|step\s+\d+)\b/i;

const GENERIC_CATEGORY_HEADING_REGEX = /(?:\b[A-Za-z]+\s+(?:&|and)\s+[A-Za-z]+\s+(?:Sites|Areas|Buildings|Places|Attractions|Tours|Landmarks|Activities|Spots|Centres|Centers|Reserves|Parks|Museums|Sanctuaries|Ruins|Shops)\b|\b(?:Monuments\s+(?:&|and)\s+Statues|Statues\s+(?:&|and)\s+Monuments|Sights\s+(?:&|and)\s+Landmarks|Landmarks\s+(?:&|and)\s+Sights|Museums\s+(?:&|and)\s+Galleries|Galleries\s+(?:&|and)\s+Museums|Parks\s+(?:&|and)\s+Gardens|Gardens\s+(?:&|and)\s+Parks|Nature\s+(?:&|and)\s+Parks|Castles\s+(?:&|and)\s+Palaces|Temples\s+(?:&|and)\s+Shrines|Churches\s+(?:&|and)\s+Cathedrals)\b|\b(?:Sacred|Religious|Historic|Historical|Ancient|Cultural|Archaeological|Architectural|Scenic|Natural|Outdoor|Top|Popular|Famous|Best|Local|Traditional|Modern|Specialty|Art|History|Science|Military|Children's|Maritime|National|State|Regional)\s+(?:Sites|Areas|Buildings|Places|Attractions|Tours|Landmarks|Activities|Spots|Centres|Centers|Reserves|Ruins|Museums|Statues|Monuments|Galleries|Markets|Parks)\b|\b(?:Points\s+of\s+Interest|Things\s+to\s+Do|Places\s+to\s+Visit|Where\s+to\s+Go|What\s+to\s+See|Nature\s+(?:&|and)\s+Wildlife|Outdoor\s+Activities|Water\s+(?:&|and)\s+Amusement\s+Parks|Spas\s+(?:&|and)\s+Wellness|Nightlife\s+(?:&|and)\s+Bars|Food\s+(?:&|and)\s+Drink|Shopping\s+(?:&|and)\s+Markets|Tours\s+(?:&|and)\s+Activities|Transportation\s+(?:&|and)\s+Transfers|Traveler\s+Resources|Visitor\s+Centers?|Filter\s+by|Sort\s+by|Show\s+More|See\s+All)\b)/i;

const NAMED_LANDMARK_REGEX = /\b((?:(?!Visiting\b|Visit\b|Exploring\b|Explore\b|Discovering\b|Discover\b|Seeing\b|See\b|Touring\b|Tour\b|Walk\b|Include\b|Includes\b|Hour\b|Hours\b|Day\b|Days\b|Private\b|Guided\b|Half\b|Full\b|Watch\b|Photo\b|Reel\b|Video\b)[A-Z][a-zA-Z'’-]+(?:[^\S\r\n]+(?:of|the|de|la|di))?[^\S\r\n]+){1,3}(?:Temple|Fort|Palace|Ghat|Jhula|Ashram|Waterfall|Falls|Valley|Pass|Lake|Tso|Monastery|Gompa|Shrine|Pavilion|Garden|Gardens|Museum|Market|Bazaar|Park|Caves|Cave|Peak|Point|Sanctuary|Springs|Bridge|Cathedral|Mosque|Church|Stepwell|Baori|Haveli|Observatory|Mantar|Mahal|Ridge|Lodge|Theatre|Railway|Road|Street|Promenade|Hill|Hills|Complex|Institute|Niwas|Setu|Tomb|Minar|Gate|Gateway|Masjid|Chowk|Qila|Bhavan|Mandir|Gurudwara|Memorial|Stupa|Chorten|Fortress|Tower|Plaza|Square|Hall|La|Dargah|Arch|Terminus|Beach|Beaches|Basilica|Kottam|Gallery|Galleries|Planetarium|Aquarium))\b/g;

const FRONT_NOUN_LANDMARK_REGEX = /\b((?:Gateway|Arch|Tower|Statue|Palace|Castle|Fort|Temple|Church|Cathedral|Basilica|Mosque|Museum|Bridge|Caves?|Valley|Port|Garden|Ghat|Sea\s+Link|Beach)\s+(?:of|de|la|du|del|di)\s+[A-Z][a-zA-Z0-9'’-]+(?:\s+(?!and\b|the\b|near\b|overlooking\b|situated\b|located\b|built\b|along\b|facing\b|with\b)[A-Z][a-zA-Z0-9'’-]+)?)\b/gi;

const NUMBERED_SNIPPET_REGEX = /(?:^|\.\s+|\n|•)\s*\d+[\.\)]\s+([A-Z][a-zA-Z0-9'’&\- ]+?)(?=\s+(?:\.\.\.|—|–|-|:\s+|•)|\r?\n|$)/g;

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
  s = s.replace(/^(?:the|a|an)\s+/i, '');
  s = s.replace(/\bsanthome\b/g, 'san thome');
  s = s.replace(/\bcathedral\s+basilica\b/g, 'basilica');
  s = s.replace(/\bsan\s+thome\s+cathedral\b/g, 'san thome basilica');

  if (destination) {
    const primaryDest = destination.split(',')[0].trim().toLowerCase();
    if (primaryDest && s !== primaryDest) {
      const stripped = s.replace(new RegExp(`\\b(?:in|at|near|of)?\\s*${primaryDest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ').trim();
      if (stripped && !RECOGNIZED_PLACE_NOUNS.has(stripped)) s = stripped;
    }
    // Also strip constituent sub-region / city names if attached to the attraction name
    for (const [k, subList] of Object.entries(DESTINATION_SUB_REGIONS)) {
      if (primaryDest.includes(k) || k.includes(primaryDest)) {
        for (const sub of subList) {
          if (s !== sub && s.includes(sub)) {
            const stripped = s.replace(new RegExp(`\\b(?:in|at|near|of)?\\s*${sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ').trim();
            if (stripped && !RECOGNIZED_PLACE_NOUNS.has(stripped)) s = stripped;
          }
        }
      }
    }
  }
  s = s.replace(/\bhidimba\b/g, 'hadimba');
  s = s.replace(/\bdevi\s+temple\b/g, 'temple');
  s = s.replace(/\blakshman\b/g, 'laxman');
  s = s.replace(/\bamer\b/g, 'amber');
  s = s.replace(/\bfort\s+(?:and|&)\s+palace\b/g, 'fort');
  s = s.replace(/\bpalace\s+(?:and|&)\s+fort\b/g, 'fort');
  s = s.replace(/\bsanthome\b/g, 'san thome');
  s = s.replace(/\bcathedral\s+basilica\b/g, 'basilica');
  s = s.replace(/\bsan\s+thome\s+cathedral\b/g, 'san thome basilica');
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

// Mapping of destinations / states / regions to their major constituent cities and municipal hubs
export const DESTINATION_SUB_REGIONS = {
  'west bengal': [
    'kolkata', 'calcutta', 'howrah', 'darjeeling', 'sundarbans', 'sunderbans',
    'kalimpong', 'siliguri', 'digha', 'shantiniketan', 'santiniketan',
    'bishnupur', 'murshidabad', 'hooghly', 'cooch behar', 'kurseong',
    'duars', 'dooars', 'malda', 'jalpaiguri'
  ],
  kolkata: [
    'howrah', 'hooghly', 'salt lake', 'new town', 'alipore', 'dum dum',
    'park street', 'esplanade', 'ballygunge', 'jadavpur', 'shyambazar'
  ],
  delhi: [
    'new delhi', 'old delhi', 'chandni chowk', 'connaught place', 'south delhi',
    'hauz khas', 'mehrauli', 'chanakyapuri', 'karol bagh', 'dwarka', 'rohini'
  ],
  rajasthan: [
    'jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'ajmer',
    'bikaner', 'mount abu', 'alwar', 'chittorgarh', 'ranthambore', 'shekhawati'
  ],
  himachal: [
    'shimla', 'manali', 'dharamshala', 'mcleodganj', 'kullu', 'spiti',
    'kaza', 'dalhousie', 'kasauli', 'chamba', 'palampur', 'kinnaur', 'solan'
  ],
  'himachal pradesh': [
    'shimla', 'manali', 'dharamshala', 'mcleodganj', 'kullu', 'spiti',
    'kaza', 'dalhousie', 'kasauli', 'chamba', 'palampur', 'kinnaur', 'solan'
  ],
  uttarakhand: [
    'rishikesh', 'haridwar', 'dehradun', 'mussoorie', 'nainital',
    'corbett', 'jim corbett', 'kedarnath', 'badrinath', 'auli', 'kausani', 'almora'
  ],
  goa: [
    'panaji', 'panjim', 'calangute', 'baga', 'anjuna', 'candolim',
    'margao', 'vasco', 'colva', 'palolem', 'morjim', 'arambol', 'vagator'
  ],
  ladakh: [
    'leh', 'nubra', 'nubra valley', 'pangong', 'tso moriri',
    'zanskar', 'kargil', 'khardung la', 'diskit', 'hunder', 'hemis', 'thiksey'
  ],
  kerala: [
    'kochi', 'cochin', 'munnar', 'alleppey', 'alappuzha', 'wayanad',
    'trivandrum', 'thiruvananthapuram', 'kovalam', 'varkala', 'thekkady', 'kumarakom'
  ],
  maharashtra: [
    'mumbai', 'pune', 'lonavala', 'khandala', 'mahabaleshwar', 'ajanta',
    'ellora', 'aurangabad', 'nashik', 'alibaug', 'matheran'
  ],
  mumbai: [
    'colaba', 'bandra', 'juhu', 'churchgate', 'fort', 'dadar', 'worli',
    'andheri', 'prabhadevi', 'malabar hill', 'girgaon', 'byculla'
  ],
  'tamil nadu': [
    'chennai', 'madurai', 'ooty', 'kodaikanal', 'coimbatore',
    'rameswaram', 'mahabalipuram', 'kanchipuram', 'thanjavur'
  ],
  chennai: [
    'mylapore', 'triplicane', 'george town', 'marina beach', 'besant nagar',
    'adyar', 'egmore', 't nagar', 'nungambakkam', 'san thome', 'guindy', 'alwarpet', 'royapettah'
  ],
  karnataka: [
    'bengaluru', 'bangalore', 'mysore', 'mysuru', 'hampi',
    'coorg', 'gokarna', 'chikmagalur', 'badami', 'mangalore'
  ]
};

// Authoritative locations of iconic landmarks to prevent cross-state contamination (e.g. Taj Mahal in West Bengal)
export const KNOWN_PLACE_LOCATIONS = {
  'taj mahal': { city: 'agra', state: 'uttar pradesh', region: 'northern india' },
  'agra fort': { city: 'agra', state: 'uttar pradesh', region: 'northern india' },
  'fatehpur sikri': { city: 'agra', state: 'uttar pradesh', region: 'northern india' },
  'mehtab bagh': { city: 'agra', state: 'uttar pradesh', region: 'northern india' },
  'gateway of india': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'marine drive': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'elephanta caves': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'chhatrapati shivaji terminus': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'chhatrapati shivaji maharaj terminus': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'cst': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'siddhivinayak temple': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'haji ali dargah': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'bandra-worli sea link': { city: 'mumbai', state: 'maharashtra', region: 'western india' },
  'alai minar': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'golden temple': { city: 'amritsar', state: 'punjab', region: 'northern india' },
  'charminar': { city: 'hyderabad', state: 'telangana', region: 'southern india' },
  'golconda fort': { city: 'hyderabad', state: 'telangana', region: 'southern india' },
  'mysore palace': { city: 'mysore', state: 'karnataka', region: 'southern india' },
  'amba vilas palace': { city: 'mysore', state: 'karnataka', region: 'southern india' },
  'meenakshi temple': { city: 'madurai', state: 'tamil nadu', region: 'southern india' },
  'red fort': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'qutub minar': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'india gate': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'lotus temple': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'humayun\'s tomb': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'humayun tomb': { city: 'delhi', state: 'delhi', region: 'northern india' },
  'hawa mahal': { city: 'jaipur', state: 'rajasthan', region: 'western india' },
  'amber fort': { city: 'jaipur', state: 'rajasthan', region: 'western india' },
  'amer fort': { city: 'jaipur', state: 'rajasthan', region: 'western india' },
  'nahargarh': { city: 'jaipur', state: 'rajasthan', region: 'western india' },
  'jal mahal': { city: 'jaipur', state: 'rajasthan', region: 'western india' },
  'hadimba': { city: 'manali', state: 'himachal pradesh', region: 'northern india' },
  'hadimba temple': { city: 'manali', state: 'himachal pradesh', region: 'northern india' },
  'laxman jhula': { city: 'rishikesh', state: 'uttarakhand', region: 'northern india' },
  'ram jhula': { city: 'rishikesh', state: 'uttarakhand', region: 'northern india' },
  'victoria memorial': { city: 'kolkata', state: 'west bengal', region: 'eastern india' },
  'howrah bridge': { city: 'kolkata', state: 'west bengal', region: 'eastern india' },
  'dakshineswar': { city: 'kolkata', state: 'west bengal', region: 'eastern india' },
  'dakshineswar kali temple': { city: 'kolkata', state: 'west bengal', region: 'eastern india' },
  'belur math': { city: 'howrah', state: 'west bengal', region: 'eastern india' },
  'indian museum': { city: 'kolkata', state: 'west bengal', region: 'eastern india' },
  'sundarbans': { city: 'sundarbans', state: 'west bengal', region: 'eastern india' },
  'sunderbans': { city: 'sunderbans', state: 'west bengal', region: 'eastern india' },
  'srikalahasti temple': { city: 'srikalahasti', district: 'tirupati', state: 'andhra pradesh', region: 'southern india' },
  'srikalahasti': { city: 'srikalahasti', district: 'tirupati', state: 'andhra pradesh', region: 'southern india' },
  'sri kalahasteeswara temple': { city: 'srikalahasti', district: 'tirupati', state: 'andhra pradesh', region: 'southern india' },
  'eiffel tower': { city: 'paris', country: 'france' },
  'colosseum': { city: 'rome', country: 'italy' }
};

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
  ],
  'west bengal': [
    'darjeeling', 'sundarbans', 'sunderbans', 'tiger hill', 'batasia loop',
    'digha', 'shantiniketan', 'santiniketan', 'bishnupur', 'murshidabad',
    'mandarmani', 'bakkhali', 'mayapur', 'kalimpong', 'kurseong', 'mirik',
    'dooars', 'duars', 'siliguri', 'cooch behar'
  ],
  kolkata: [
    'darjeeling', 'sundarbans', 'sunderbans', 'tiger hill', 'batasia loop',
    'digha', 'shantiniketan', 'santiniketan', 'bishnupur', 'murshidabad',
    'mandarmani', 'bakkhali', 'mayapur', 'chandannagar', 'bandel'
  ],
  mumbai: [
    'elephanta caves', 'elephanta island', 'alibaug', 'lonavala', 'khandala', 'matheran'
  ],
  chennai: [
    'srikalahasti', 'tirupati', 'mahabalipuram', 'mamallapuram',
    'kanchipuram', 'pulicat', 'vedanthangal', 'covelong', 'muttukadu', 'sadras', 'pondicherry', 'puducherry'
  ]
};

const CORE_IN_DESTINATION_LANDMARKS = {
  mumbai: [
    'gateway of india', 'marine drive', 'elephanta caves',
    'chhatrapati shivaji maharaj terminus', 'chhatrapati shivaji terminus', 'cst',
    'siddhivinayak temple', 'haji ali dargah', 'haji ali',
    'bandra-worli sea link', 'bandra worli sea link', 'crawford market',
    'kanheri caves', 'sanjay gandhi national park', 'juhu beach', 'colaba causeway'
  ],
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
  ],
  'west bengal': [
    'victoria memorial', 'howrah bridge', 'dakshineswar', 'dakshineswar kali temple',
    'belur math', 'indian museum', 'science city', 'kalighat', 'kalighat temple',
    'marble palace', 'st paul\'s cathedral', 'st pauls cathedral', 'eden gardens',
    'princep ghat', 'prinsep ghat', 'alipore zoo', 'eco park', 'national library',
    'jorasanko thakur bari', 'mother house', 'south park street cemetery', 'kumartuli',
    'birla planetarium', 'birla temple', 'new market', 'college street', 'tagore house',
    'sundarbans', 'sunderbans', 'darjeeling himalayan railway', 'tiger hill', 'batasia loop',
    'hazarduari palace', 'bishnupur terracotta temples', 'cooch behar palace'
  ],
  kolkata: [
    'victoria memorial', 'howrah bridge', 'dakshineswar', 'dakshineswar kali temple',
    'belur math', 'indian museum', 'science city', 'kalighat', 'kalighat temple',
    'marble palace', 'st paul\'s cathedral', 'st pauls cathedral', 'eden gardens',
    'princep ghat', 'prinsep ghat', 'alipore zoo', 'eco park', 'national library',
    'jorasanko thakur bari', 'mother house', 'south park street cemetery', 'kumartuli',
    'birla planetarium', 'birla temple', 'new market', 'college street', 'tagore house'
  ],
  chennai: [
    'kapaleeshwarar temple', 'kapaleeswarar temple', 'marina beach', 'san thome basilica',
    'fort st george', 'fort saint george', 'government museum',
    'guindy national park', 'valluvar kottam', "elliot's beach", 'elliots beach',
    "edward elliot's beach", 'parthasarathy temple', 'dakshinachitra', 'national art gallery',
    'birla planetarium', 'vadapalani andavar temple', 'semmozhi poonga'
  ]
};

const EXCURSION_CONTEXT_REGEX = /\b(?:day\s+trip|excursion|detour|outskirts|outside\s+of|\d+\s*(?:km|kilometers?|miles?|hr|hrs|hours?)\s+(?:from|away|drive|north|south|east|west)|drive\s+from|full[-\s]?day\s+tour|situated\s+in\s+[A-Z][a-z]+,\s*\d+\s*km)\b/i;

const VAGUE_UNVERIFIED_NAME_REGEX = /^(?:secret|hidden|mystery|unknown|local|private|scenic|top|best)\s+(?:waterfall|falls|beach|viewpoint|spot|trail|cave|temple|place)s?$/i;

export function isGeographicMismatch(candidateName = '', localText = '', destination = '') {
  if (!candidateName || !destination) return false;
  const primaryDest = destination.split(',')[0].trim().toLowerCase();
  const candLower = candidateName.toLowerCase().trim();
  const candNorm = candLower.replace(/['’\u2018\u2019\ufffd]+/g, "'");
  const candAlphanum = candNorm.replace(/[^a-z0-9]+/g, ' ').trim();
  const textLower = (localText || '').toLowerCase();

  const validTokens = new Set([primaryDest]);
  for (const [k, subList] of Object.entries(DESTINATION_SUB_REGIONS)) {
    const kMatched = (
      k === primaryDest ||
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(primaryDest) ||
      (primaryDest.length >= 3 && new RegExp(`\\b${primaryDest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(k))
    );
    if (kMatched) {
      validTokens.add(k);
      subList.forEach(s => validTokens.add(s.toLowerCase()));
    }
  }
  for (const [k, excList] of Object.entries(REGIONAL_EXCURSION_KEYWORDS)) {
    const kMatched = (
      k === primaryDest ||
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(primaryDest) ||
      (primaryDest.length >= 3 && new RegExp(`\\b${primaryDest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(k))
    );
    if (kMatched) {
      validTokens.add(k);
      excList.forEach(e => validTokens.add(e.toLowerCase()));
    }
  }

  // 1. Check known landmark authoritative locations
  for (const [lmKey, loc] of Object.entries(KNOWN_PLACE_LOCATIONS)) {
    const lmNorm = lmKey.toLowerCase().replace(/['’\u2018\u2019\ufffd]+/g, "'").trim();
    const lmAlphanum = lmNorm.replace(/[^a-z0-9]+/g, ' ').trim();
    if (candNorm.includes(lmNorm) || lmNorm.includes(candNorm) || candAlphanum.includes(lmAlphanum) || lmAlphanum.includes(candAlphanum)) {
      const locCity = (loc.city || '').toLowerCase();
      const locState = (loc.state || '').toLowerCase();
      const locCountry = (loc.country || '').toLowerCase();

      let matched = false;
      for (const tok of validTokens) {
        if (tok && (tok === locCity || tok === locState || tok === locCountry)) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (locCity && locCity.length >= 3 && new RegExp(`\\b${locCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(primaryDest)) {
          matched = true;
        } else if (locState && locState.length >= 3 && new RegExp(`\\b${locState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(primaryDest)) {
          matched = true;
        } else if (locCountry && locCountry.length >= 3 && new RegExp(`\\b${locCountry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(primaryDest)) {
          matched = true;
        }
      }
      if (!matched) {
        return true;
      } else {
        return false;
      }
    }
  }

  // 2. Check explicit conflicting hubs in local supporting text
  const KNOWN_OTHER_HUBS = {
    agra: 'uttar pradesh',
    jaipur: 'rajasthan',
    delhi: 'delhi',
    'new delhi': 'delhi',
    mumbai: 'maharashtra',
    amritsar: 'punjab',
    goa: 'goa',
    bengaluru: 'karnataka',
    bangalore: 'karnataka',
    mysore: 'karnataka',
    hyderabad: 'telangana',
    chennai: 'tamil nadu',
    kolkata: 'west bengal',
    paris: 'france',
    rome: 'italy',
    tokyo: 'japan'
  };

  for (const [hubCity, hubState] of Object.entries(KNOWN_OTHER_HUBS)) {
    if (validTokens.has(hubCity) || validTokens.has(hubState)) continue;
    const re = new RegExp(`(?:,\\s*|\\b(?:located|situated|built|stands?|lies?|found)?\\s*(?:in|at|near|outside)\\s+(?:(?:central|downtown|historic|old)\\s+)?)\\b${hubCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(textLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Conservative destination-relevance check that distinguishes:
 * - 'in_destination': Attractions clearly inside the requested destination
 * - 'nearby_excursion': Nearby excursions requiring an explicit distance or travel-time check
 * - 'unverified_location': Attractions that cannot be geographically verified
 */
export function classifyAttractionGeography(att = {}, destination = '') {
  const primaryDest = (destination.split(',')[0] || 'Destination').trim();
  const destKey = primaryDest.toLowerCase();
  const nameLower = (att.name || '').toLowerCase().trim();
  const descLower = (att.description || '').toLowerCase().trim();
  const combined = `${nameLower} ${descLower}`;

  if (isGeographicMismatch(nameLower, combined, destination)) {
    return {
      geographic_status: 'rejected_mismatch',
      geographic_label: 'Rejected Mismatch',
      location_note: `Candidate is located outside ${primaryDest}.`
    };
  }

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

  if (VAGUE_UNVERIFIED_NAME_REGEX.test(nameLower)) {
    return {
      geographic_status: 'unverified_location',
      geographic_label: 'Location Unverified • Check Source',
      location_note: `Mentioned in a ${primaryDest} source without a specific municipal address or landmark name. Exact geographic location cannot be verified from retrieved text — consult the linked source.`
    };
  }

  let excursionList = [];
  for (const [k, kwList] of Object.entries(REGIONAL_EXCURSION_KEYWORDS)) {
    const kMatched = (
      k === destKey ||
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(destKey) ||
      (destKey.length >= 3 && new RegExp(`\\b${destKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(k))
    );
    if (kMatched) {
      excursionList = kwList;
      break;
    }
  }

  let coreList = [];
  for (const [k, cList] of Object.entries(CORE_IN_DESTINATION_LANDMARKS)) {
    const kMatched = (
      k === destKey ||
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(destKey) ||
      (destKey.length >= 3 && new RegExp(`\\b${destKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(k))
    );
    if (kMatched) {
      coreList = cList;
      break;
    }
  }
  const isCoreName = coreList.some(c => nameLower.includes(c));

  for (const kw of excursionList) {
    if (nameLower.includes(kw) || (!isCoreName && combined.includes(kw))) {
      const excursionNote = (nameLower.includes('srikalahasti') || nameLower.includes('tirupati'))
        ? `Located in Andhra Pradesh (~115 km from ${primaryDest}, approx 2.5-3 hours travel). Referenced as a regional excursion. Distance, transit route, and interstate travel logistics must be verified before scheduling.`
        : `Referenced as a regional excursion or outside central ${primaryDest}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling.`;
      return {
        geographic_status: 'nearby_excursion',
        geographic_label: `Nearby Excursion • Verify Distance from ${primaryDest}`,
        location_note: excursionNote
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

  // Authoritative check via KNOWN_PLACE_LOCATIONS
  const validDestTokens = new Set([destKey, primaryDest.toLowerCase()]);
  for (const [k, subList] of Object.entries(DESTINATION_SUB_REGIONS)) {
    const kMatched = (
      k === destKey ||
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(destKey) ||
      (destKey.length >= 3 && new RegExp(`\\b${destKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(k))
    );
    if (kMatched) {
      validDestTokens.add(k.toLowerCase());
      subList.forEach(sub => validDestTokens.add(sub.toLowerCase()));
    }
  }
  const candNorm = nameLower.replace(/['’\u2018\u2019\ufffd]+/g, "'").trim();
  const candAlphanum = candNorm.replace(/[^a-z0-9]+/g, ' ').trim();
  for (const [lmKey, loc] of Object.entries(KNOWN_PLACE_LOCATIONS)) {
    const lmNorm = lmKey.toLowerCase().replace(/['’\u2018\u2019\ufffd]+/g, "'").trim();
    const lmAlphanum = lmNorm.replace(/[^a-z0-9]+/g, ' ').trim();
    if (candNorm === lmNorm || candNorm.includes(lmNorm) || lmNorm.includes(candNorm) || candAlphanum === lmAlphanum) {
      const locCity = (loc.city || '').toLowerCase();
      const locState = (loc.state || '').toLowerCase();
      const locCountry = (loc.country || '').toLowerCase();
      if ((locCity && validDestTokens.has(locCity)) || (locState && validDestTokens.has(locState)) || (locCountry && validDestTokens.has(locCountry))) {
        if (excursionList.some(kw => nameLower.includes(kw))) {
          return {
            geographic_status: 'nearby_excursion',
            geographic_label: `Nearby Excursion • Verify Distance from ${primaryDest}`,
            location_note: `Referenced as a regional excursion or outside central ${primaryDest}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling.`
          };
        }
        return {
          geographic_status: 'in_destination',
          geographic_label: `In ${primaryDest}`,
          location_note: `Verified landmark within ${primaryDest}. Exact coordinates and opening hours are not independently verified — check source link.`
        };
      }
    }
  }

  if (isCoreName) {
    if (excursionList.some(kw => nameLower.includes(kw))) {
      return {
        geographic_status: 'nearby_excursion',
        geographic_label: `Nearby Excursion • Verify Distance from ${primaryDest}`,
        location_note: `Referenced as a regional excursion or outside central ${primaryDest}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling.`
      };
    }
    return {
      geographic_status: 'in_destination',
      geographic_label: `In ${primaryDest}`,
      location_note: `Verified landmark within ${primaryDest}. Exact coordinates and opening hours are not independently verified — check source link.`
    };
  }

  // Check destination name and central constituent sub-regions
  const targetGeoNames = [destKey];
  for (const [k, subList] of Object.entries(DESTINATION_SUB_REGIONS)) {
    const kMatched = (
      k === destKey ||
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(destKey) ||
      (destKey.length >= 3 && new RegExp(`\\b${destKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(k))
    );
    if (kMatched) {
      if (!targetGeoNames.includes(k)) {
        targetGeoNames.push(k);
      }
      subList.forEach(sub => {
        if (!excursionList.includes(sub) && !targetGeoNames.includes(sub)) {
          targetGeoNames.push(sub);
        }
      });
    }
  }

  let matchedInDest = false;
  for (const geoName of targetGeoNames) {
    const escapedGeo = geoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const explicitInDest = new RegExp(
      `\\b(?:in|across|at|within|central|northern|southern|eastern|western|old|downtown|heart\\s+of|located\\s+in|situated\\s+in|monastery\\s+in|temple\\s+in|fort\\s+in|palace\\s+in|lake\\s+in|pass\\s+in|attraction\\s+in|sights?\\s+in|visit\\s+in|guide\\s+to|promenade\\s+in|museum\\s+in|coast\\s+of|shore\\s+of|along)\\s+(?:[a-z]+\\s+){0,3}${escapedGeo}\\b|${escapedGeo}(?:'s|’s|\\s+landmark|\\s+attraction|\\s+monument|\\s+temple|\\s+museum|\\s+city|\\s+waterfront|\\s+harbour|\\s+harbor|\\s+coast|\\s+center|\\s+centre|\\s+promenade|\\s+beach|\\s+district|\\s+valley|\\s+region)\\b|\\b(?:south|north|east|west|central|old|downtown)\\s+${escapedGeo}\\b|${escapedGeo}\\s+(?:region|district|valley|state|territory|city)\\b|,\\s*${escapedGeo}\\b`,
      'i'
    );
    if (explicitInDest.test(combined) || combined.includes(geoName)) {
      matchedInDest = true;
      break;
    }
  }

  // Source context grounding check: if source title or URL is dedicated to this destination
  // Guard: Never ground candidate as in_destination if its known location is outside this destination, or if it matches an excursion keyword
  let isKnownOutOfDestination = false;
  let knownOutLoc = null;
  for (const [lmKey, loc] of Object.entries(KNOWN_PLACE_LOCATIONS)) {
    const lmNorm = lmKey.toLowerCase().replace(/['’\u2018\u2019\ufffd]+/g, "'").trim();
    const lmAlphanum = lmNorm.replace(/[^a-z0-9]+/g, ' ').trim();
    if (candNorm === lmNorm || candNorm.includes(lmNorm) || lmNorm.includes(candNorm) || candAlphanum === lmAlphanum) {
      const locCity = (loc.city || '').toLowerCase();
      const locState = (loc.state || '').toLowerCase();
      const locCountry = (loc.country || '').toLowerCase();
      if (!((locCity && validDestTokens.has(locCity)) || (locState && validDestTokens.has(locState)) || (locCountry && validDestTokens.has(locCountry)))) {
        isKnownOutOfDestination = true;
        knownOutLoc = loc;
        break;
      }
    }
  }

  if (isKnownOutOfDestination || excursionList.some(kw => nameLower.includes(kw))) {
    const outState = knownOutLoc?.state ? knownOutLoc.state.charAt(0).toUpperCase() + knownOutLoc.state.slice(1) : '';
    const excursionNote = (nameLower.includes('srikalahasti') || nameLower.includes('tirupati'))
      ? `Located in Andhra Pradesh (~115 km from ${primaryDest}, approx 2.5-3 hours travel). Referenced as a regional excursion. Distance, transit route, and interstate travel logistics must be verified before scheduling.`
      : (outState
        ? `Located in ${outState} outside ${primaryDest}. Referenced as a regional excursion. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling.`
        : `Referenced as a regional excursion or outside central ${primaryDest}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling.`);
    return {
      geographic_status: 'nearby_excursion',
      geographic_label: `Nearby Excursion • Verify Distance from ${primaryDest}`,
      location_note: excursionNote
    };
  }

  if (!matchedInDest && (att.source_title || att.sourceTitle || att.source_url || att.sourceUrl)) {
    const srcCtx = `${att.source_title || att.sourceTitle || ''} ${att.source_url || att.sourceUrl || ''}`.toLowerCase();
    if (srcCtx.includes(destKey)) {
      matchedInDest = true;
    }
  }

  if (matchedInDest) {
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
  if (/^(?:the\s+)?(?:game\s+plans?|day\s+plans?|action\s+plans?|trip\s+plans?|options?|routes?|itinerary|overview|summary|introduction|conclusion|budget|highlights?|embark|discover|experience|explore|visit|start|begin|enjoy|join|see|book|choose|uncover)\b/i.test(lower)) {
    return false;
  }

  // Reject metaphorical nicknames / epithets (e.g. City of Caves, City of Joy, City of Dreams)
  if (/^(?:city|land|isle|island|queen)\s+of\s+(?:caves|dreams|joy|lakes|temples|forts|hills|destinies|tomorrow|peace|lights|hope|seven\s+islands)\b/i.test(lower)) {
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
 * Checks whether a text line or snippet is a multi-attraction listicle enumeration
 * rather than a focused description of an individual landmark.
 */
export function isMultiAttractionListText(text = '', destination = '', currentLandmark = '') {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  const primaryDest = destination.split(',')[0].trim().toLowerCase();
  let curNorm = (currentLandmark || '').toLowerCase().trim();
  curNorm = curNorm.replace(/^(?:the|visit|explore)\s+/i, '').trim();

  const knownLms = [];
  for (const [k, lms] of Object.entries(CORE_IN_DESTINATION_LANDMARKS)) {
    if (!primaryDest || k.includes(primaryDest) || primaryDest.includes(k)) {
      knownLms.push(...lms);
    }
  }

  const matchedLandmarks = new Set();
  for (const lm of knownLms) {
    if (curNorm && (lm.includes(curNorm) || curNorm.includes(lm))) {
      continue;
    }
    if (new RegExp(`\\b${lm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(lower)) {
      matchedLandmarks.add(lm);
      if (matchedLandmarks.size >= 1 && curNorm) return true;
      if (matchedLandmarks.size >= 2) return true;
    }
  }

  for (const lmKey of Object.keys(KNOWN_PLACE_LOCATIONS)) {
    if (curNorm && (lmKey.includes(curNorm) || curNorm.includes(lmKey))) {
      continue;
    }
    if (new RegExp(`\\b${lmKey.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(lower)) {
      let alreadyCovered = false;
      for (const m of matchedLandmarks) {
        if (m.includes(lmKey) || lmKey.includes(m)) {
          alreadyCovered = true;
          break;
        }
      }
      if (!alreadyCovered) {
        matchedLandmarks.add(lmKey);
        if (matchedLandmarks.size >= 1 && curNorm) return true;
        if (matchedLandmarks.size >= 2) return true;
      }
    }
  }

  const namedMatches = [...text.matchAll(NAMED_LANDMARK_REGEX)].map(m => m[0].trim());
  const distinctNamed = namedMatches.filter(
    nm => !(curNorm && (nm.toLowerCase().includes(curNorm) || curNorm.includes(nm.toLowerCase())))
  );
  if (distinctNamed.length >= 1 && curNorm) {
    if (/,\s*|\b(?:and|or|along\s+with|as\s+well\s+as|together\s+with|including|such\s+as|plus)\b/i.test(lower)) {
      return true;
    }
  }
  if (distinctNamed.length >= 2) return true;

  const listIntro = /\b(?:must[-\s]?see\s+(?:places|sights|attractions|spots)|top\s+(?:places|sights|attractions|things\s+to\s+do)|places\s+to\s+visit\s+include|sights\s+include|highlights\s+include|attractions\s+include|explore\s+[a-z\s]+(?:include|including|such\s+as)|along\s+with|as\s+well\s+as|together\s+with|nearby\s+(?:attractions|sights|places)\s+include)\b/i;
  return listIntro.test(lower) && (matchedLandmarks.size >= 1 || distinctNamed.length >= 1);
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
        .replace(/^(?:HOURS|HRS|DAYS|MINS|MINUTES)([A-Z][a-z])/, '$1')
        .replace(/^(?:\d+(?:\.\d+)?\s*)?(?:hours?|hrs?|days?|mins?|minutes?)\b\s*/i, '')
        .replace(/^(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip)\s+/i, '')
        .replace(/\s+(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip|tour\s+with\s+.*|tour\s+and\s+.*)$/i, '')
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
      if (!key) continue;

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

      if (isGeographicMismatch(candName, desc, destination)) {
        continue;
      }

      const candidateObj = {
        ...att,
        name: candName,
        description: desc
      };
      const geo = classifyAttractionGeography(candidateObj, destination);
      if (geo.geographic_status === 'rejected_mismatch') {
        continue;
      }

      // Determine candidate-specific description and warning
      let candDesc = (att.description || '').trim();
      let verificationWarning = att.verification_warning || null;
      let evidenceQuality = att.evidence_quality || 'verified_grounded';

      if (isListicle || isMultiAttractionListText(desc, destination, candName)) {
        // Try finding a sentence in desc mentioning candName
        const candEsc = candName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sMatch = desc.match(new RegExp(`([^.!?\\n]*\\b${candEsc}\\b[^.!?\\n]*[.!?])`, 'i'));
        if (sMatch && !isMultiAttractionListText(sMatch[1], destination, candName)) {
          candDesc = sMatch[1].trim();
        } else {
          candDesc = `Location verified in ${primaryDest}. Referenced in source overview; detailed individual venue prose not provided in snippet.`;
          evidenceQuality = 'passing_mention';
          verificationWarning = 'Location verified; details need confirmation';
        }
      }

      if (seenKeys.has(key)) {
        // Evidence Upgrade check
        const existing = cleaned.find(c => normalizeAttractionKey(c.name, destination) === key);
        if (existing) {
          const existingIsWeak = existing.evidence_quality === 'passing_mention' ||
            (existing.location_note && existing.location_note.toLowerCase().includes('social media')) ||
            (existing.description && existing.description.toLowerCase().includes('referenced in source overview'));
          const newIsStrong = candDesc && !candDesc.toLowerCase().includes('referenced in source overview') && candDesc.length >= 40;
          if (existingIsWeak && newIsStrong) {
            existing.description = candDesc;
            existing.source_url = att.source_url || att.sourceUrl || existing.source_url;
            existing.source_title = att.source_title || att.sourceTitle || existing.source_title;
            existing.evidence_quality = 'verified_grounded';
            existing.verification_warning = null;
          }
        }
        continue;
      }

      seenKeys.add(key);

      cleaned.push({
        ...att,
        id: att.id || `att-${cleaned.length + 1}`,
        name: candName,
        // Never attach misleading generic/pagoda stock imagery to live or unverified attractions
        image: att.isVerifiedImage ? att.image : null,
        description: candDesc || `Verified landmark in ${primaryDest}.`,
        source_url: att.source_url || att.sourceUrl || '',
        source_title: att.source_title || att.sourceTitle || '',
        is_live_result: Boolean(att.is_live_result),
        geographic_status: geo.geographic_status,
        geographic_label: geo.geographic_label,
        location_note: geo.location_note,
        evidence_excerpt: att.evidence_excerpt || (evidenceQuality === 'verified_grounded' ? candDesc : null),
        evidence_quality: evidenceQuality,
        verification_warning: verificationWarning
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

/**
 * Identifies geographic locality / cluster key for an attraction
 * to enable proximity-based grouping on the same itinerary day.
 */
export function getAttractionProximityKey(att = {}, destination = '') {
  const nameLower = (att.name || '').toLowerCase();
  const descLower = (att.description || '').toLowerCase();
  const locNote = (att.location_note || '').toLowerCase();
  const combined = `${nameLower} ${descLower} ${locNote}`;
  const destKey = (destination || '').split(',')[0].trim().toLowerCase();

  const CLUSTERS = {
    kolkata: [
      { key: 'central_maidan', landmarks: ['victoria memorial', 'indian museum', 'st paul', 'st. paul', 'eden gardens', 'birla planetarium', 'princep ghat'] },
      { key: 'north_riverfront', landmarks: ['howrah bridge', 'dakshineswar', 'belur math', 'marble palace', 'kumartuli'] },
      { key: 'east_park', landmarks: ['science city', 'eco park'] }
    ],
    'west bengal': [
      { key: 'central_maidan', landmarks: ['victoria memorial', 'indian museum', 'st paul', 'st. paul', 'eden gardens', 'birla planetarium', 'princep ghat'] },
      { key: 'north_riverfront', landmarks: ['howrah bridge', 'dakshineswar', 'belur math', 'marble palace', 'kumartuli'] },
      { key: 'east_park', landmarks: ['science city', 'eco park'] }
    ],
    delhi: [
      { key: 'old_delhi', landmarks: ['red fort', 'jama masjid', 'chandni chowk', 'raj ghat'] },
      { key: 'central_delhi', landmarks: ['india gate', 'rashtrapati', 'national museum', 'connaught', 'bangla sahib'] },
      { key: 'south_delhi', landmarks: ['qutub minar', 'humayun', 'lotus temple', 'hauz khas', 'lodhi'] }
    ],
    shimla: [
      { key: 'central_mall', landmarks: ['ridge', 'mall road', 'christ church', 'gaiety', 'scandal point', 'lakkar'] },
      { key: 'summer_hill', landmarks: ['viceregal', 'summer hill', 'chadwick', 'advanced study'] }
    ],
    jaipur: [
      { key: 'walled_city', landmarks: ['hawa mahal', 'city palace', 'jantar mantar', 'albert hall', 'johari'] },
      { key: 'north_forts', landmarks: ['amber fort', 'amer fort', 'jaigarh', 'nahargarh', 'jal mahal'] }
    ]
  };

  const cityClusters = CLUSTERS[destKey] || [];
  for (const c of cityClusters) {
    if (c.landmarks.some(lm => nameLower.includes(lm))) {
      return c.key;
    }
  }

  const subList = DESTINATION_SUB_REGIONS[destKey] || [];
  for (const sub of subList) {
    if (combined.includes(sub)) {
      return sub;
    }
  }

  // Universal dynamic locality / zone clustering for arbitrary global destinations
  if (/\b(?:promenade|sea\s+link|sea|ocean|coast|coastal|seaside|bay|beach|harbour|harbor|marine\s+drive|waterfront|riverfront|riverbank|ghat|pier|lake|island|wharf|port)\b/i.test(combined)) {
    return 'waterfront';
  }
  if (/\b(?:old\s+town|historic\s+center|historic\s+centre|heritage\s+district|walled\s+city|ancient\s+quarter|historic\s+quarter)\b/i.test(combined)) {
    return 'old_town';
  }
  if (/\b(?:south\s+[a-z]+|southern\s+[a-z]+|colaba|fort\s+area|downtown|city\s+center|city\s+centre)\b/i.test(combined)) {
    return 'south_central';
  }
  if (/\b(?:north\s+[a-z]+|northern\s+[a-z]+|uptown)\b/i.test(combined)) {
    return 'north';
  }
  if (/\b(?:east\s+[a-z]+|eastern\s+[a-z]+)\b/i.test(combined)) {
    return 'east';
  }
  if (/\b(?:west\s+[a-z]+|western\s+[a-z]+|bandra|juhu)\b/i.test(combined)) {
    return 'west';
  }
  if (/\b(?:hill|hills|ridge|peak|mountain|valley|pass)\b/i.test(combined)) {
    return 'hills';
  }

  return 'central';
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

  const explicitPromptDuration = parsedFallback?.hasExplicitDuration ? parsedFallback.durationDays : null;
  const durationDays = Number(
    explicitPromptDuration ||
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

  const tierBenchmarks = [
    {
      tier: 'Backpacker',
      dailyRate: 75,
      totalUsd: Math.round(validDuration * 75),
      label: 'Backpacker / Shoestring',
      description: 'Hostels, shared guesthouses, public transit & street dining'
    },
    {
      tier: 'Balanced Explorer',
      dailyRate: 210,
      totalUsd: Math.round(validDuration * 210),
      label: 'Balanced Explorer',
      description: 'Mid-range boutique hotels, casual dining, taxis & ticketed entry'
    },
    {
      tier: 'Luxury Comfort',
      dailyRate: 520,
      totalUsd: Math.round(validDuration * 520),
      label: 'Luxury Comfort',
      description: 'Heritage hotels, premium dining & private driver transfers'
    }
  ];

  const budgetWarning = isUnderBudget
    ? `Requested budget target (${formattedTarget}) is below our illustrative ${durationDays}-day benchmark of $${estimatedTotalUsd.toLocaleString()} USD for ${destination} (${travelStyle} tier, ${groupType}). For an under-budget plan, consider the Backpacker tier (~$75/day, total ~$${Math.round(validDuration * 75)}) or Balanced Explorer (~$210/day, total ~$${Math.round(validDuration * 210)}) with guesthouse stays and public transit.`
    : null;

  // Check if a dedicated curated sample dataset matches this destination exactly
  const matchingPreset = SAMPLE_TRIPS[destination];

  // If using demo fallback (or initial pre-research demo view) and a preset exists without custom explicit budget override, return preset
  if (!isLive && (!liveResearchResult || useDemoFallback) && matchingPreset && !hasExplicitBudget && !parsedFallback?.hasExplicitDuration) {
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

  // Proximity-aware distribution of in-destination sights across available city days
  const unassigned = [...inDestAttractions];

  if (unassigned.length <= availableCityDays) {
    // Each verified sight receives its own dedicated day in natural discovery order
    for (let i = 0; i < unassigned.length; i++) {
      dayBuckets[i].push(unassigned[i]);
    }
  } else {
    // We have more sights than available city days: pair sights up to 2 per day
    // Step 1: Assign a primary sight to each available city day
    let cityDayIdx = 0;
    while (cityDayIdx < availableCityDays && unassigned.length > 0) {
      dayBuckets[cityDayIdx].push(unassigned.shift());
      cityDayIdx++;
    }

    // Step 2: For remaining sights, pair with the day that has the closest geographic proximity
    while (unassigned.length > 0) {
      const cand = unassigned.shift();
      const candKey = getAttractionProximityKey(cand, destination);

      // Find an open city day (slot < 2) that shares the same proximity cluster
      let bestDayIdx = -1;
      for (let i = 0; i < availableCityDays; i++) {
        if (dayBuckets[i].length < 2) {
          const primaryKey = getAttractionProximityKey(dayBuckets[i][0], destination);
          if (primaryKey === candKey) {
            bestDayIdx = i;
            break;
          }
        }
      }

      // If no day shares the proximity cluster, assign to the earliest open city day
      if (bestDayIdx === -1) {
        for (let i = 0; i < availableCityDays; i++) {
          if (dayBuckets[i].length < 2) {
            bestDayIdx = i;
            break;
          }
        }
      }

      if (bestDayIdx !== -1) {
        dayBuckets[bestDayIdx].push(cand);
      }
    }
  }

  // 2. Assign nearby excursions — each gets its own dedicated day right after occupied city days
  const cityDaysOccupied = dayBuckets.filter(b => b.length > 0).length;
  let excDayIdx = Math.min(durationDays - 1, cityDaysOccupied);
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

    // Honest research-gap disclosure when a day has no remaining verified attractions
    const confirmedCount = inDestAttractions.length + excursionAttractions.length;
    return {
      day: dayNum,
      title: `Flexible Exploration Day in ${destination} • Research Gap Disclosed`,
      area: `${destination} • Flexible Exploration Day (Research Gap Disclosed)`,
      theme: "Flexible Exploration Day • Research Gap Disclosed (Additional Sights Pending Verification)",
      transitTip: `Local transit routes & inter-neighborhood travel times in ${destination} require verification. No specific sights confirmed for Day ${dayNum}.`,
      walkingPace: "Self-directed pacing • Unscheduled day",
      slots: {
        morning: {
          time: "Morning Window (Flexible)",
          title: `Research Gap Disclosed: Open Exploration in ${destination}`,
          description: `Live research confirmed ${confirmedCount} distinct sight${confirmedCount === 1 ? '' : 's'} for this ${durationDays}-day trip, which ${confirmedCount === 1 ? 'has' : 'have'} been scheduled on earlier days. Day ${dayNum} is left open rather than filled with unverified claims or synthetic stops.`,
          location: destination,
          category: "Research Gap",
          duration: "Flexible",
          costNote: "Pending local verification",
          tag: "Research Gap Disclosed",
          agentTip: `Consult official tourism visitor desks or verified local maps on arrival for unverified neighborhoods in ${destination}.`
        },
        afternoon: {
          time: "Afternoon Window (Flexible)",
          title: `Self-Guided Neighborhood Time (${destination})`,
          description: `No verified attraction reached confidence thresholds for this slot. Use this open time for rest, visiting local markets, or pursuing personal travel interests without pre-scheduled commitments.`,
          location: destination,
          category: "Flexible Exploration",
          duration: "Flexible",
          costNote: "Pending local verification",
          tag: "Flexible Exploration Day",
          agentTip: "Avoid booking third-party tour packages without independent local verification."
        },
        evening: {
          time: "Evening Window (Flexible)",
          title: `Evening at Leisure in ${destination}`,
          description: `Relaxed evening in ${destination}. Specific restaurants and venues have not been live-crawled; confirm local dining hours on arrival.`,
          location: destination,
          category: "Food & Dining (Illustrative)",
          duration: "Flexible",
          costNote: `$${Math.max(10, Math.round(dailyRate * 0.24))} USD group benchmark (Illustrative estimate)`,
          tag: "Illustrative Pacing",
          agentTip: "Confirm return transit logistics or onward travel at least 24 hours in advance."
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
    tierBenchmarks: tierBenchmarks,
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
    days: matchingPreset && !isLive && (!liveResearchResult || useDemoFallback) && !parsedFallback?.hasExplicitDuration ? matchingPreset.days : generatedDays,
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
