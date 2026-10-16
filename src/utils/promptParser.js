/**
 * TripPilot AI — Intelligent Natural Language Trip Prompt Parser
 * Extracts structured, normalized trip fields from free-form user prompts while
 * preserving the exact original prompt separately for display/context.
 *
 * Returned structured fields:
 * - originalPrompt: exact user input text
 * - destination: clean normalized place name (e.g. "Jaipur", "Manali, Himachal Pradesh", "Rishikesh")
 * - durationDays: numeric duration in days
 * - budgetTarget: explicit numeric budget cap if specified in the prompt (e.g. 200 from "under $200"), else null
 * - budgetCurrency: currency code ("USD", "INR", "EUR", "GBP"), defaults to "USD"
 * - travelStyle / budgetTier: structured style tier ("Backpacker", "Balanced Explorer", "Luxury Comfort", "Bespoke Haute-Luxe")
 * - groupType / groupSize: structured traveler group ("Solo Explorer", "Romantic Couple", "Family with Kids", "Friends Squad")
 * - needsClarification: true when a destination cannot be reliably inferred
 */

const WORD_NUMBERS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fourteen: 14,
};

export function parseTripPrompt(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    return {
      originalPrompt: '',
      destination: '',
      durationDays: 5,
      hasExplicitDuration: false,
      budgetTarget: null,
      budgetCurrency: 'USD',
      travelStyle: 'Balanced Explorer',
      budgetTier: 'Balanced Explorer',
      groupType: 'Romantic Couple',
      groupSize: 'Romantic Couple',
      needsClarification: true,
    };
  }

  const originalPrompt = promptText.trim();
  if (originalPrompt.length === 0) {
    return {
      originalPrompt: '',
      destination: '',
      durationDays: 5,
      hasExplicitDuration: false,
      budgetTarget: null,
      budgetCurrency: 'USD',
      travelStyle: 'Balanced Explorer',
      budgetTier: 'Balanced Explorer',
      groupType: 'Romantic Couple',
      groupSize: 'Romantic Couple',
      needsClarification: true,
    };
  }

  // 1. Duration extraction (supports "5 days", "3-day", "three days", "a week", "weekend")
  let durationDays = 5;
  let hasExplicitDuration = false;
  const numericDayMatch = originalPrompt.match(/\b(\d{1,2})[-\s]*(?:days?|nights?|d\b)/i);
  const wordDayMatch = originalPrompt.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen)[-\s]+(?:days?|nights?)\b/i);

  if (numericDayMatch) {
    const d = parseInt(numericDayMatch[1], 10);
    if (d >= 1 && d <= 30) {
      durationDays = d;
      hasExplicitDuration = true;
    }
  } else if (wordDayMatch) {
    const d = WORD_NUMBERS[wordDayMatch[1].toLowerCase()];
    if (d) {
      durationDays = d;
      hasExplicitDuration = true;
    }
  } else if (/\ba\s+week\b|\bone\s+week\b|\b1\s+week\b|\b(?:next|this|upcoming|coming)\s+week\b/i.test(originalPrompt)) {
    durationDays = 7;
    hasExplicitDuration = true;
  } else if (/\btwo\s+weeks?\b|\b2\s+weeks?\b/i.test(originalPrompt)) {
    durationDays = 14;
    hasExplicitDuration = true;
  } else if (/\b(?:next|this|upcoming|coming)?\s*weekend\b/i.test(originalPrompt)) {
    durationDays = 3;
    hasExplicitDuration = true;
  }

  // 2. Explicit Budget Target & Currency extraction (e.g. "under $200", "within ₹15,000", "budget of 500 USD")
  let budgetTarget = null;
  let budgetCurrency = 'USD';

  const currencyPatterns = [
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about|for)?\s*(?:\$|usd\s*)(\d[\d,]*)/i,
      curr: 'USD',
    },
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about)?\s*(\d[\d,]*)\s*(?:usd|dollars?|\$)/i,
      curr: 'USD',
    },
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about|for)?\s*(?:₹|rs\.?\s*|inr\s*)(\d[\d,]*)/i,
      curr: 'INR',
    },
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about)?\s*(\d[\d,]*)\s*(?:inr|rupees?)/i,
      curr: 'INR',
    },
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about|for)?\s*(?:€|eur\s*)(\d[\d,]*)/i,
      curr: 'EUR',
    },
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about)?\s*(\d[\d,]*)\s*(?:eur|euros?)/i,
      curr: 'EUR',
    },
    {
      re: /(?:under|below|within|max|maximum|up\s+to|budget(?:\s+of)?|around|about|for)?\s*(?:£|gbp\s*)(\d[\d,]*)/i,
      curr: 'GBP',
    },
    {
      re: /\b(?:under|below|within|budget\s+of)\s+(\d[\d,]*)\b/i,
      curr: 'USD',
    },
  ];

  for (const pat of currencyPatterns) {
    const m = originalPrompt.match(pat.re);
    if (m && m[1]) {
      const val = parseInt(m[1].replace(/,/g, ''), 10);
      if (!Number.isNaN(val) && val > 0) {
        budgetTarget = val;
        budgetCurrency = pat.curr;
        break;
      }
    }
  }

  // 3. Travel Style / Budget Tier extraction
  let travelStyle = 'Balanced Explorer';
  if (/bespoke|haute|ultra[-\s]?luxury|michelin/i.test(originalPrompt)) {
    travelStyle = 'Bespoke Haute-Luxe';
  } else if (/luxury|5-star|five\s+star|splurge|high-end/i.test(originalPrompt)) {
    travelStyle = 'Luxury Comfort';
  } else if (/backpacker|hostel|cheap|shoestring|tight\s+budget|low\s+budget/i.test(originalPrompt)) {
    travelStyle = 'Backpacker';
  } else if (/\bbudget\b/i.test(originalPrompt) && !/balanced\s+budget/i.test(originalPrompt)) {
    travelStyle = 'Backpacker';
  }

  // 4. Group Type extraction
  let groupType = 'Romantic Couple';
  if (/\b(?:solo|alone|1\s+person|one\s+person|for\s+me|myself|single\s+traveler)\b/i.test(originalPrompt)) {
    groupType = 'Solo Explorer';
  } else if (/\b(?:family|kids|children|parents|with\s+kids)\b/i.test(originalPrompt)) {
    groupType = 'Family with Kids';
  } else if (/\b(?:friends|squad|group\s+of\s+[3-9]|[3-9]\s+people|[3-9]\s+adults|boys\s+trip|girls\s+trip)\b/i.test(originalPrompt)) {
    groupType = 'Friends Squad';
  } else if (/\b(?:two\s+people|2\s+people|two\s+adults|2\s+adults|for\s+two|for\s+2|couple|couples|honeymoon|romantic)\b/i.test(originalPrompt)) {
    groupType = 'Romantic Couple';
  }

  // 4b. Transport preference extraction (e.g. "by road", "road trip", "by train", "self drive")
  let transportPreference = null;
  if (/\b(?:by\s+(?:road|car|automobile)|road\s*trip|self[-\s]?drive)\b/i.test(originalPrompt)) {
    transportPreference = 'Road Trip / Private Vehicle & Regional Transit';
  } else if (/\b(?:by\s+(?:bike|motorcycle|motorbike)|motorcycle\s*trip|bike\s*trip)\b/i.test(originalPrompt)) {
    transportPreference = 'Motorcycle / Scenic Highway Riding';
  } else if (/\b(?:by\s+(?:train|rail)|rail\s*trip)\b/i.test(originalPrompt)) {
    transportPreference = 'Scenic Rail & Regional Transit';
  } else if (/\b(?:by\s+(?:flight|air)|fly)\b/i.test(originalPrompt)) {
    transportPreference = 'Air & Regional Airport Transfers';
  }

  // 5. Destination extraction (strictly isolated from prompt boilerplate, budget, group, and duration)
  let s = originalPrompt;

  // 5a. Strip explicit budget phrases so "under $200" never leaks into destination
  s = s.replace(
    /(?:\b(?:under|below|within|up\s+to|on|with|for|at|around|about)\s+)?(?:a\s+)?(?:tight\s+|balanced\s+|luxury\s+|low\s+|max\s+|maximum\s+)?(?:budget(?:\s+of)?\s*)?(?:\$|₹|€|£|usd|inr|eur|gbp|rs\.?)\s*\d[\d,]*(?:\s*(?:usd|dollars?|inr|rupees?|eur|euros?|gbp|per\s+person|total))?/gi,
    ' '
  );
  s = s.replace(
    /\b(?:under|below|within|up\s+to|budget(?:\s+of)?)\s+(?:\$|₹|€|£)?\s*\d[\d,]*(?:\s*(?:usd|dollars?|inr|rupees?|eur|euros?|gbp))?\b/gi,
    ' '
  );
  s = s.replace(
    /\bon\s+a\s+(?:balanced|luxury|tight|low|shoestring|student|backpacker)?\s*budget\b/gi,
    ' '
  );

  // 5b. Strip group phrases ("for two people", "for 2 adults", "for a couple", "for family", "for two")
  s = s.replace(
    /\bfor\s+(?:two|three|four|five|six|one|\d+)\s+(?:people|persons?|adults?|travelers?|guests?|friends?|couples?)\b/gi,
    ' '
  );
  s = s.replace(
    /\bfor\s+(?:two|2)\b(?!\s*[-\s]*(?:days?|nights?|weeks?|months?))/gi,
    ' '
  );
  s = s.replace(
    /\bfor\s+(?:a\s+)?(?:romantic\s+couple|couple|solo\s+traveler|solo\s+explorer|family(?:\s+with\s+kids)?|friends(?:\s+squad)?)\b/gi,
    ' '
  );

  // 5c. Strip duration phrases ("for 5 days in", "3-day trip to", "next 5 days trip to", "a weekend in", "next weekend in")
  s = s.replace(
    /\b(?:for\s+)?(?:the\s+|a\s+|an\s+)?(?:next|this|upcoming|coming|following)?\s*(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen)[-\s]*(?:days?|nights?)\s*(?:s?trip\s+plan|travel\s+plan|itinerary|s?trip|vacation|holiday|tour|guide|getaway|plan)?\s*(?:exploring(?:\s+of)?|visiting|of|in|to|for|around|across|along)?\b/gi,
    ' '
  );
  s = s.replace(
    /\b(?:for\s+)?(?:the\s+|a\s+|an\s+)?(?:next|this|upcoming|coming|following)?\s*(?:a\s+weekend|weekend|a\s+week|one\s+week|two\s+weeks|week)\s*(?:s?trip\s+plan|itinerary|s?trip|vacation|holiday|getaway|tour)?\s*(?:exploring(?:\s+of)?|in|of|to|for|around|along)?\b/gi,
    ' '
  );

  // 5c2. Strip transport and travel-mode phrases ("by road", "road trip", "by train", "by air", "self drive")
  s = s.replace(
    /\b(?:by\s+(?:road|car|bike|motorcycle|bus|train|rail|flight|air|boat|ferry)|road\s*trip|bike\s*trip|self[-\s]?drive|on\s+foot|by\s+foot)\b/gi,
    ' '
  );

  // 5d. Iteratively strip leading conversational and intent phrases (including typos like "strip plan")
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.trim();
    s = s.replace(/^(?:hi|hello|hey)\s*[,.!]?\s*/i, '');
    s = s.replace(
      /^(?:i\s+(?:need|want|would\s+like|am\s+looking\s+for|am\s+planning|'m\s+planning|'d\s+like)|we\s+(?:need|want|would\s+like|are\s+planning|are\s+looking\s+for)|help\s+me\s+(?:plan|make|create|find|build)|can\s+you\s+(?:please\s+)?(?:make|plan|create|give(?:\s+me)?|generate|build|suggest|show(?:\s+me)?|design)|could\s+you\s+(?:please\s+)?(?:make|plan|create|give(?:\s+me)?|generate|build|suggest)|please\s+(?:make|plan|create|give(?:\s+me)?|generate|build|suggest|design)|(?:make|plan|create|give(?:\s+me)?|generate|build|suggest|show(?:\s+me)?|design))\b\s*/i,
      ''
    );
    s = s.replace(
      /^(?:an?|the|my|our)?\s*(?:best|good|great|complete|detailed|perfect|quick|custom|personalised|personalized|ideal|budget|luxury|next|upcoming|coming|this)?\s*(?:s?trip\s+plan|travel\s+plan|itinerary|s?trip|vacation|holiday|guide|tour|plan|route|getaway)\b\s*/i,
      ''
    );
    s = s.replace(
      /^(?:exploring(?:\s+of)?|deep-diving\s+(?:into)?|visiting|explore|discovering|discover|travell?ing\s+to|going\s+to|headed\s+to|journey\s+to|tour\s+of|along)\b\s*/i,
      ''
    );
    s = s.replace(/^(?:next|this|upcoming|coming)\b\s*/i, '');
    s = s.replace(/^(?:my|our)\b\s*/i, '');
    s = s.replace(/^(?:for|to|in|of|around|across|through|at)\b\s*/i, '');
    s = s.replace(/^(?:the|a|an)\b\s*/i, '');
  }

  // 5e. Split before trailing activity/interest qualifiers
  const parts = s.split(
    /\s+(?:exploring|discovering|visiting|focusing(?:\s+on)?|with\s+(?:focus|photography|lemon|a|my|our|artisanal|beaches|temples|scenic|quiet|local)|featuring\s+|including\s+|and\s+ryokan|tailored\s+for|with)\b/i
  );
  let main = (parts[0] || '').trim();

  // Handle possessives like "Kyoto's quiet Zen temples..." -> "Kyoto"
  if (/['’]s\b/i.test(main)) {
    main = main.split(/['’]s\b/)[0].trim();
  }

  // Handle "City in the Region/State" -> "City, Region/State"
  // e.g. "Manali in the Himachal Pradesh" -> "Manali, Himachal Pradesh"
  main = main.replace(/\s+in\s+the\s+([a-zA-Z\s]+)$/i, (m, p1) => ', ' + p1.trim());
  main = main.replace(/\s+in\s+([a-zA-Z\s]+)$/i, (m, p1) => ', ' + p1.trim());

  // Iteratively strip trailing/leading trip nouns, prepositions, articles, verbs, transport modes, and temporal modifiers
  let prevMain = '';
  while (main !== prevMain) {
    prevMain = main;
    main = main.trim();
    // Strip trailing descriptive landscape additions (e.g. "Mumbai and the hills there" -> "Mumbai", "Mumbai and surrounding hills")
    main = main.replace(/\s+\b(?:and\s+(?:the\s+)?|with\s+(?:the\s+)?)(?:surrounding\s+)?(?:hills?|mountains?|beaches?|coast|valleys?|countryside|surroundings?|surrounds?|nearby(?:\s+areas?)?)(?:\s+(?:there|around|nearby))?$/i, '').trim();
    // Strip trailing trip intent nouns (e.g. "Shimla Trip" -> "Shimla")
    main = main.replace(/\s+\b(?:s?trips?|tours?|vacations?|holidays?|travels?|getaways?|itineraries|itinerary|plans?|visits?)\b$/i, '').trim();
    // Strip trailing transport mode qualifiers
    main = main.replace(/\s+\b(?:by\s+(?:road|car|bike|motorcycle|bus|train|rail|flight|air|boat|ferry)|road\s*trip|bike\s*trip|self[-\s]?drive)\b$/i, '').trim();
    // Strip trailing temporal qualifiers (e.g. "Maldives next weekend" -> "Maldives")
    main = main.replace(/\s+\b(?:next|this|upcoming|coming)\s+(?:weekend|week|month|year|days?|nights?)\b$/i, '').trim();
    main = main.replace(/\s+\b(?:next|this|upcoming|coming)\b$/i, '').trim();
    // Strip trailing prepositions & articles
    main = main.replace(/\s+\b(?:under|below|within|for|in|to|of|the|a|an|on|with|around|across|along|at|by)$/i, '').trim();
    // Strip leading transport mode qualifiers
    main = main.replace(/^(?:by\s+(?:road|car|bike|motorcycle|bus|train|rail|flight|air|boat|ferry)|road\s*trip|bike\s*trip|self[-\s]?drive)\s+/i, '').trim();
    // Strip leading temporal qualifiers (e.g. "Next Maldives" -> "Maldives")
    main = main.replace(/^(?:next|this|upcoming|coming)\s+/i, '').trim();
    main = main.replace(/^(?:my|our)\s+/i, '').trim();
    // Strip leading prepositions & articles
    main = main.replace(/^(?:the|a|an|in|to|for|of|at|by)\s+/i, '').trim();
    // Strip leading action/intent verbs (e.g. "Create Shimla" -> "Shimla")
    main = main.replace(/^(?:create|make|plan|build|generate|find)\s+/i, '').trim();
  }

  // Collapse multiple spaces and clean trailing punctuation
  main = main.replace(/\s{2,}/g, ' ').replace(/[,;.-]+$/, '').trim();

  const formattedDestination = formatDestinationTitle(main);
  const destination = formattedDestination;

  // 6. Validation: Check for generic non-location phrases
  const genericTerms = [
    'trip', 'strip', 'plan', 'trip plan', 'strip plan', 'itinerary',
    'vacation', 'holiday', 'travel', 'somewhere', 'anywhere', 'place', 'places',
    'days', 'day', 'exploring', 'destination', 'somewhere warm', 'somewhere sunny'
  ];

  const containsVagueWords = /\b(?:somewhere|anywhere|nowhere|warm\s+place|sunny\s+place)\b/i.test(destination);

  const isInvalid =
    !destination ||
    destination.length < 2 ||
    containsVagueWords ||
    genericTerms.includes(destination.toLowerCase());

  return {
    originalPrompt,
    destination: isInvalid ? '' : destination,
    durationDays,
    hasExplicitDuration,
    budgetTarget,
    budgetCurrency,
    travelStyle,
    budgetTier: travelStyle,
    groupType,
    groupSize: groupType,
    transportPreference,
    needsClarification: isInvalid,
  };
}

/**
 * Normalizes destination display capitalization, e.g. "rishikesh" -> "Rishikesh",
 * "manali, himachal pradesh" -> "Manali, Himachal Pradesh", preserving abbreviations.
 */
export function formatDestinationTitle(dest = '') {
  if (!dest || typeof dest !== 'string') return '';
  return dest
    .split(',')
    .map(segment => {
      const words = segment.trim().split(/\s+/);
      return words
        .map((w, idx) => {
          if (!w) return '';
          const lw = w.toLowerCase();
          if (idx > 0 && ['in', 'the', 'of', 'and', '&', 'de', 'la', 'du'].includes(lw)) {
            return lw;
          }
          if (w.length <= 3 && w === w.toUpperCase() && !/^[aeiou]+$/i.test(w)) {
            return w;
          }
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Ensures any destination string is a clean, title-cased place name and never a raw natural-language prompt.
 */
export function normalizeDestination(rawDestination, fallback = 'Kyoto, Japan') {
  if (!rawDestination || typeof rawDestination !== 'string') {
    return fallback;
  }
  const trimmed = rawDestination.trim();
  if (!trimmed) return fallback;

  // If it looks like a clean short place name without prompt verbs or price tags, keep it
  const looksLikePrompt =
    /\b(?:i\s+need|i\s+want|make\s+|plan\s+|s?trip\s+plan|itinerary|under\s*\$|below\s*\$|\$\d+|\d+\s*days?\b|exploring\b|for\s+two\s+people|by\s+(?:road|car|bike|bus|train|flight)|road\s*trip|(?:next|upcoming|this|coming)\s+(?:weekend|week|\d+\s*days?))/i.test(
      trimmed
    );

  if (!looksLikePrompt) {
    let cleaned = trimmed.replace(/^(?:the|a|an)\s+/i, '').trim();
    cleaned = cleaned.replace(/\s+\b(?:by\s+(?:road|car|bike|motorcycle|bus|train|rail|flight|air|boat|ferry)|road\s*trip|bike\s*trip|self[-\s]?drive)\b$/i, '').trim();
    cleaned = cleaned.replace(/^(?:by\s+(?:road|car|bike|motorcycle|bus|train|rail|flight|air|boat|ferry)|road\s*trip|bike\s*trip)\s+/i, '').trim();
    cleaned = cleaned.replace(/^(?:next|this|upcoming|coming)\s+/i, '').trim();
    cleaned = cleaned.replace(/\s+\b(?:next|this|upcoming|coming)\s+(?:weekend|week|month|year|days?|nights?)\b$/i, '').trim();
    cleaned = cleaned.replace(/\s+\b(?:next|this|upcoming|coming)\b$/i, '').trim();
    return formatDestinationTitle(cleaned) || fallback;
  }

  const parsed = parseTripPrompt(trimmed);
  return formatDestinationTitle(parsed.destination) || fallback;
}

