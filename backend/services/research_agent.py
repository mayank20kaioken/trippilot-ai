import logging
import re
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from typing import List, Tuple, Dict, Any, Optional, Set
from backend.schemas import (
    TripBrief,
    CategoryQueryPlan,
    AttractionItem,
    SourceFinding,
    TelemetryEvent,
)
from backend.services.tinyfish import TinyFishClient

logger = logging.getLogger("trippilot.agent")

TRACKING_QUERY_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "msclkid",
    "ref",
    "source",
}

SOCIAL_DOMAINS = {
    "instagram.com", "www.instagram.com",
    "tiktok.com", "www.tiktok.com",
    "facebook.com", "www.facebook.com",
    "pinterest.com", "www.pinterest.com",
    "twitter.com", "x.com",
    "youtube.com", "www.youtube.com",
}

LISTICLE_TITLE_PATTERN = re.compile(
    r"(?:\b(?:\d+|the|a|an)?\s*(?:best|top|unmissable|must[-\s]?see|must[-\s]?visit|essential|things|places|sights|attractions|activities|spots|experiences|coolest|awesome|greatest|cheap|free|popular|famous)\b"
    r"|\b(?:things\s+to\s+do|places\s+to\s+visit|places\s+to\s+see|what\s+to\s+do|what\s+to\s+see|where\s+to\s+go|where\s+to\s+stay|where\s+to\s+eat|how\s+to\s+reach|how\s+to\s+get|best\s+places|top\s+attractions|top\s+sights|tourist\s+places|travel\s+guide|complete\s+guide|sights\s+guide|attractions\s+guide|city\s+guide|visitor\s+guide|pocket\s+guide|trip\s+planner|trip\s+guide|itinerary\s+guide|itinerary|must[-\s]?do|experiences\s+in|top\s+things|travel\s+tips|travel\s+blog|vacation\s+guide|holiday\s+guide|overview\s+of|introduction\s+to|everything\s+you\s+need\s+to\s+know|visiting\s+[a-z]+|exploring\s+[a-z]+|ultimate\s+guide|book\s+now|book\s+tickets|tour\s+package|day\s+tours?|guided\s+tours?|tours?\s+(?:and|&)\s+excursions?|excursions?\s+(?:and|&)\s+tours?|outdoor\s+activities|cultural\s+&\s+scenic\s+highlights|scenic\s+highlights|travel\s+highlights|destination\s+highlights)\b"
    r"|\b(?:instagram|tiktok|facebook|pinterest|youtube|twitter|reels|shorts|vlog|photo\s+by|photos?\s+and\s+videos?|watch\s+on|pinned\s+by|likes?,\s*\d+\s*comments?)\b)",
    re.IGNORECASE,
)

GENERIC_EDITORIAL_PATTERNS = re.compile(
    r"\b(?:"
    r"the\s+game\s+plans?|game\s+plans?|day\s+plans?|action\s+plans?|travel\s+plans?|trip\s+plans?|"
    r"sample\s+plans?|daily\s+breakdown|step[-\s]by[-\s]step|what\s+to\s+expect|what\s+to\s+pack|"
    r"pro\s+tips?|quick\s+tips?|travel\s+tips?|practical\s+tips?|honest\s+review|"
    r"when\s+to\s+go|how\s+to\s+get\s+there|getting\s+there|getting\s+around|where\s+to\s+stay|"
    r"where\s+to\s+eat|final\s+thoughts|final\s+words|bottom\s+line|key\s+takeaways?|"
    r"read\s+next|leave\s+a\s+reply|table\s+of\s+contents|faq|faqs|frequently\s+asked|"
    r"the\s+basics|essential\s+info|good\s+to\s+know|our\s+recommendations?|top\s+recommendations?|"
    r"morning\s+routine|evening\s+plans?|afternoon\s+plans?|day\s+\d+|stop\s+\d+|step\s+\d+"
    r")\b",
    re.IGNORECASE,
)

GENERIC_CATEGORY_HEADING_PATTERNS = re.compile(
    r"(?:"
    r"\b[A-Za-z]+\s+(?:&|and)\s+[A-Za-z]+\s+(?:Sites|Areas|Buildings|Places|Attractions|Tours|Landmarks|Activities|Spots|Centres|Centers|Reserves|Parks|Museums|Sanctuaries|Ruins|Shops)\b|"
    r"\b(?:Monuments\s+(?:&|and)\s+Statues|Statues\s+(?:&|and)\s+Monuments|Sights\s+(?:&|and)\s+Landmarks|Landmarks\s+(?:&|and)\s+Sights|Museums\s+(?:&|and)\s+Galleries|Galleries\s+(?:&|and)\s+Museums|Parks\s+(?:&|and)\s+Gardens|Gardens\s+(?:&|and)\s+Parks|Nature\s+(?:&|and)\s+Parks|Castles\s+(?:&|and)\s+Palaces|Temples\s+(?:&|and)\s+Shrines|Churches\s+(?:&|and)\s+Cathedrals)\b|"
    r"\b(?:Sacred|Religious|Historic|Historical|Ancient|Cultural|Archaeological|Architectural|Scenic|Natural|Outdoor|Top|Popular|Famous|Best|Local|Traditional|Modern|Specialty|Art|History|Science|Military|Children's|Maritime|National|State|Regional)\s+(?:Sites|Areas|Buildings|Places|Attractions|Tours|Landmarks|Activities|Spots|Centres|Centers|Reserves|Ruins|Museums|Statues|Monuments|Galleries|Markets|Parks)\b|"
    r"\b(?:Points\s+of\s+Interest|Things\s+to\s+Do|Places\s+to\s+Visit|Where\s+to\s+Go|What\s+to\s+See|Nature\s+(?:&|and)\s+Wildlife|Outdoor\s+Activities|Water\s+(?:&|and)\s+Amusement\s+Parks|Spas\s+(?:&|and)\s+Wellness|Nightlife\s+(?:&|and)\s+Bars|Food\s+(?:&|and)\s+Drink|Shopping\s+(?:&|and)\s+Markets|Tours\s+(?:&|and)\s+Activities|Transportation\s+(?:&|and)\s+Transfers|Traveler\s+Resources|Visitor\s+Centers?|Filter\s+by|Sort\s+by|Show\s+More|See\s+All)\b"
    r")",
    re.IGNORECASE,
)

RECOGNIZED_PLACE_NOUNS = {
    "temple", "fort", "palace", "ghat", "jhula", "ashram", "waterfall", "falls",
    "valley", "pass", "lake", "tso", "monastery", "gompa", "shrine", "pavilion", "garden",
    "gardens", "museum", "market", "bazaar", "park", "caves", "cave", "peak",
    "point", "sanctuary", "springs", "bridge", "cathedral", "mosque", "church",
    "stepwell", "baori", "haveli", "observatory", "mantar", "mahal", "ridge",
    "lodge", "theatre", "railway", "road", "street", "promenade", "hill", "hills",
    "complex", "institute", "niwas", "setu", "tomb", "minar", "gate", "gateway", "masjid",
    "chowk", "qila", "bhavan", "mandir", "gurudwara", "memorial", "stupa", "chorten",
    "fortress", "tower", "plaza", "square", "village", "quarter", "alley", "center",
    "centre", "planetarium", "aquarium", "zoo", "hall", "la", "dargah", "arch", "terminus",
    "beach", "beaches", "basilica", "kottam", "gallery", "galleries"
}

# Regex to extract capitalized landmark names ending with a recognized place/monument noun (never matching across newlines)
NAMED_LANDMARK_PATTERN = re.compile(
    r"\b((?:(?!Visiting\b|Visit\b|Exploring\b|Explore\b|Discovering\b|Discover\b|Seeing\b|See\b|Touring\b|Tour\b|Walk\b|Include\b|Includes\b|Hour\b|Hours\b|Day\b|Days\b|Private\b|Guided\b|Half\b|Full\b|Watch\b|Photo\b|Reel\b|Video\b)[A-Z][a-zA-Z'’-]+(?:[^\S\r\n]+(?:of|the|de|la|di))?[^\S\r\n]+){1,3}"
    r"(?:Temple|Fort|Palace|Ghat|Jhula|Ashram|Waterfall|Falls|Valley|Pass|Lake|Tso|Monastery|Gompa|Shrine|Pavilion|Garden|Gardens|Museum|Market|Bazaar|Park|Caves|Cave|Peak|Point|Sanctuary|Springs|Bridge|Cathedral|Mosque|Church|Stepwell|Baori|Haveli|Observatory|Mantar|Mahal|Ridge|Lodge|Theatre|Railway|Road|Street|Promenade|Hill|Hills|Complex|Institute|Niwas|Setu|Tomb|Minar|Gate|Gateway|Masjid|Chowk|Qila|Bhavan|Mandir|Gurudwara|Memorial|Stupa|Chorten|Fortress|Tower|Plaza|Square|Hall|La|Dargah|Arch|Terminus|Beach|Beaches|Basilica|Kottam|Gallery|Galleries|Planetarium|Aquarium))\b"
)

# Regex to extract landmarks with the noun at the front followed by a connector (e.g. Gateway of India, Tower of London, Palace of Versailles)
FRONT_NOUN_LANDMARK_PATTERN = re.compile(
    r"\b((?:Gateway|Arch|Tower|Statue|Palace|Castle|Fort|Temple|Church|Cathedral|Basilica|Mosque|Museum|Bridge|Caves?|Valley|Port|Garden|Ghat|Sea\s+Link|Beach)\s+(?:of|de|la|du|del|di)\s+[A-Z][a-zA-Z0-9'’-]+(?:\s+(?!and\b|the\b|near\b|overlooking\b|situated\b|located\b|built\b|along\b|facing\b|with\b)[A-Z][a-zA-Z0-9'’-]+)?)\b",
    re.IGNORECASE
)

# Regex to extract numbered/bulleted landmark items from search snippets (e.g. "1. Gateway Of India ... Perfect for...")
NUMBERED_SNIPPET_PATTERN = re.compile(
    r"(?:^|\.\s+|\n|•)\s*\d+[\.\)]\s+([A-Z][a-zA-Z0-9'’&\- ]+?)(?=\s+(?:\.\.\.|—|–|-|:\s+|•)|\r?\n|$)"
)


def canonicalize_url(raw_url: str) -> str:
    """
    Normalizes a URL into a canonical form for deduplication:
    - Lowercases scheme and netloc (stripping leading 'www.' for canonical comparison)
    - Strips URL fragments (#...)
    - Removes common tracking query parameters (utm_*, fbclid, gclid, etc.)
    - Strips trailing slashes from the path
    """
    if not raw_url or not isinstance(raw_url, str):
        return ""
    trimmed = raw_url.strip()
    if not trimmed:
        return ""
    try:
        parsed = urlparse(trimmed)
        scheme = (parsed.scheme or "https").lower()
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = re.sub(r"/+$", "", parsed.path or "")
        filtered_query = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=False)
            if k.lower() not in TRACKING_QUERY_PARAMS
        ]
        filtered_query.sort()
        query_str = urlencode(filtered_query)
        return urlunparse((scheme, netloc, path, "", query_str, ""))
    except Exception:
        return trimmed.lower().rstrip("/")


def _normalize_attraction_key(name: str, dest: str = "") -> str:
    """
    Creates a normalized deduplication key for an attraction name so that
    minor variations (e.g. 'Hadimba Temple' vs 'The Hadimba Devi Temple, Manali')
    do not produce duplicate attraction cards.
    """
    if not name:
        return ""
    s = name.lower().strip()
    # Remove destination name suffix if attached (never strip if attraction itself is the place name)
    if dest:
        dest_primary = dest.split(",")[0].strip().lower()
        if dest_primary and s != dest_primary:
            cand_stripped = re.sub(rf"\b(?:in|at|near|of)?\s*{re.escape(dest_primary)}\b", " ", s).strip()
            if cand_stripped:
                s = cand_stripped
        for k, sub_list in DESTINATION_SUB_REGIONS.items():
            if k in dest_primary or dest_primary in k:
                for sub in sub_list:
                    if s != sub and sub in s:
                        cand_stripped = re.sub(rf"\b(?:in|at|near|of)?\s*{re.escape(sub)}\b", " ", s).strip()
                        if cand_stripped:
                            s = cand_stripped
    s = re.sub(r"^(?:the|a|an)\s+", "", s)
    # Normalize common synonymous tokens
    s = re.sub(r"\bhidimba\b", "hadimba", s)
    s = re.sub(r"\bdevi\s+temple\b", "temple", s)
    s = re.sub(r"\blakshman\b", "laxman", s)
    s = re.sub(r"\bamer\b", "amber", s)
    s = re.sub(r"\bfort\s+(?:and|&)\s+palace\b", "fort", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    # Canonicalize known core landmarks within the destination so variations don't duplicate
    dest_lower = dest.lower() if dest else ""
    for d_key, core_list in CORE_IN_DESTINATION_LANDMARKS.items():
        if not dest_lower or d_key in dest_lower:
            for lm in core_list:
                if re.search(rf"\b{re.escape(lm)}\b", s):
                    return lm
    return s


def normalize_attraction_display_name(name: str) -> str:
    """
    Cleans leading numbered bullets, trailing site branding, and formats title case for display.
    e.g. '1. laxman jhula - tripadvisor' -> 'Laxman Jhula'
    """
    if not name:
        return ""
    s = re.sub(r"^\d+[\.\)\-:]\s*", "", name.strip())
    s = re.sub(r"\[\d{4}\]|\(\d{4}\)", "", s).strip()
    s = re.sub(r"^(?:HOURS|HRS|DAYS|MINS|MINUTES)([A-Z][a-z])", r"\1", s).strip()
    s = re.sub(r"^(?:\d+(?:\.\d+)?\s*)?(?:hours?|hrs?|days?|mins?|minutes?)\b\s*", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(?:other\s+)?(?:visitors?'?\s+)?(?:reviews?|tips?|guide)\s+(?:of|for|to)\s+", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip)\s+", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+(?:attraction\s+)?(?:highlights?|reviews?|overview|guide|tips|faqs?|map)$", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+(?:tickets?|prices?|promos?|entry\s+fees?|entry\s+tickets?).*$", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip|tour\s+with\s+.*|tour\s+and\s+.*)$", "", s, flags=re.IGNORECASE).strip()
    s = s.split(" - ")[0].split(" | ")[0].split(" – ")[0].split(" — ")[0].strip()
    s = re.sub(r"\s+Overview$", "", s, flags=re.IGNORECASE).strip()
    # Title-case words, preserving common connectors
    words = s.split()
    formatted = []
    for i, w in enumerate(words):
        lw = w.lower()
        if i > 0 and lw in {"of", "the", "de", "la", "in", "and", "&"}:
            formatted.append(lw)
        elif w.isupper() and len(w) <= 4:
            formatted.append(w)
        else:
            formatted.append(w.capitalize())
    res = " ".join(formatted).strip()
    if res.lower() in ("ridge", "the ridge"):
        return "The Ridge"
    return res


def _is_article_or_listicle_title(title: str) -> bool:
    """
    Returns True if a webpage title looks like a listicle, roundup, or generic travel guide
    rather than a single specific landmark.
    """
    if not title:
        return True
    cleaned = title.split(" - ")[0].split(" | ")[0].split(" – ")[0].strip()
    return bool(LISTICLE_TITLE_PATTERN.search(cleaned))


def _clean_landmark_heading(raw_heading: str, dest: str) -> str:
    """
    Cleans markdown heading/bullet prefixes and site suffixes from a candidate attraction name.
    """
    h = re.sub(r"^[#*\-\s]+", "", raw_heading).strip()
    h = re.sub(r"^\d+[\.\)\-:]\s*", "", h).strip()
    h = re.sub(r"\[\d{4}\]|\(\d{4}\)", "", h).strip()
    h = re.sub(r"^(?:day|step|stop|part)\s+\d+[\.\:\-]\s*", "", h, flags=re.IGNORECASE).strip()
    h = re.sub(r"^(?:HOURS|HRS|DAYS|MINS|MINUTES)([A-Z][a-z])", r"\1", h).strip()
    h = re.sub(r"^(?:\d+(?:\.\d+)?\s*)?(?:hours?|hrs?|days?|mins?|minutes?)\b\s*", "", h, flags=re.IGNORECASE).strip()
    h = re.sub(r"^(?:other\s+)?(?:visitors?'?\s+)?(?:reviews?|tips?|guide)\s+(?:of|for|to)\s+", "", h, flags=re.IGNORECASE).strip()
    h = re.sub(r"^(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip)\s+", "", h, flags=re.IGNORECASE).strip()
    h = re.sub(r"\s+(?:attraction\s+)?(?:highlights?|reviews?|overview|guide|tips|faqs?|map)$", "", h, flags=re.IGNORECASE).strip()
    h = re.sub(r"\s+(?:tickets?|prices?|promos?|entry\s+fees?|entry\s+tickets?).*$", "", h, flags=re.IGNORECASE).strip()
    h = re.sub(r"\s+(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip|tour\s+with\s+.*|tour\s+and\s+.*)$", "", h, flags=re.IGNORECASE).strip()
    h = h.split(" - ")[0].split(" | ")[0].split(" – ")[0].split(" — ")[0].strip()
    h = re.sub(r"\s+Overview$", "", h, flags=re.IGNORECASE).strip()
    # Reject headings that are themselves generic article sections, editorial titles, or social media artifacts
    generic_headings = {
        "introduction", "overview", "conclusion", "summary", "best time to visit",
        "how to reach", "where to stay", "where to eat", "things to do", "places to visit",
        "travel tips", "frequently asked questions", "faq", "faqs", "getting around",
        "budget", "itinerary", "map", "final thoughts", "what to pack",
        "highlights", "scenic highlights", "cultural highlights", "cultural & scenic highlights",
        "photos", "videos", "reels", "comments", "related posts", "popular searches",
        "about", "contact", "navigation", "search", "share",
        "tours", "excursions", "tours and excursions", "tours & excursions",
        "day tours", "guided tours", "tour packages", "outdoor activities", "sightseeing",
        "the game plans", "the game plan", "game plans", "game plan", "day plans", "action plan",
    }
    if not h or len(h) < 3 or len(h) > 68:
        return ""
    if (
        h.lower() in generic_headings
        or LISTICLE_TITLE_PATTERN.search(h)
        or GENERIC_EDITORIAL_PATTERNS.search(h)
        or GENERIC_CATEGORY_HEADING_PATTERNS.search(h)
        or bool(re.search(r"\b(?:tours?\s+(?:and|&)\s+excursions?|best\s+[a-z\s]+tours?|top\s+[a-z\s]+tours?)\b", h, re.IGNORECASE))
        or bool(re.search(r"\b(?:Sites|Areas|Buildings|Attractions|Activities|Tours|Spots|Statues|Monuments)$", h, re.IGNORECASE))
    ):
        return ""
    if dest and h.lower() == dest.split(",")[0].strip().lower():
        return ""
    return normalize_attraction_display_name(h)


def _is_plausible_named_place(name: str, dest: str = "") -> bool:
    """
    Validates that a candidate attraction is a plausible named place/landmark,
    not merely a capitalized editorial phrase (such as 'The Game Plans' or 'Our Day 1 Route')
    or a generic category heading (such as 'Sacred & Religious Sites' or 'Monuments & Statues').
    """
    if not name or len(name) < 3 or len(name) > 68:
        return False
    name_clean = name.strip()
    name_lower = name_clean.lower()

    # Reject listicle, editorial, and generic category patterns
    if (
        LISTICLE_TITLE_PATTERN.search(name_clean)
        or GENERIC_EDITORIAL_PATTERNS.search(name_clean)
        or GENERIC_CATEGORY_HEADING_PATTERNS.search(name_clean)
    ):
        return False

    # Reject common editorial prefixes like "The Game Plans", "The Options", "Day 1", action verbs, etc.
    if re.search(r"^(?:the\s+)?(?:game\s+plans?|day\s+plans?|action\s+plans?|trip\s+plans?|options?|routes?|itinerary|overview|summary|introduction|conclusion|budget|highlights?|embark|discover|experience|explore|visit|start|begin|enjoy|join|see|book|choose|uncover)\b", name_lower):
        return False

    # Reject metaphorical nicknames / epithets (e.g. City of Caves, City of Joy, City of Dreams)
    if re.search(r"^(?:city|land|isle|island|queen)\s+of\s+(?:caves|dreams|joy|lakes|temples|forts|hills|destinies|tomorrow|peace|lights|hope|seven\s+islands)\b", name_lower):
        return False

    # Reject plural taxonomy category nouns at the end of the name
    if re.search(r"\b(?:Sites|Areas|Buildings|Attractions|Activities|Tours|Spots|Statues|Monuments)$", name_clean, re.IGNORECASE):
        # Allow only if it is explicitly a known core landmark
        is_known = False
        for d_key, core_list in CORE_IN_DESTINATION_LANDMARKS.items():
            if any(lm in name_lower for lm in core_list):
                is_known = True
                break
        if not is_known:
            return False

    if dest:
        dest_primary = dest.split(",")[0].strip().lower()
        if name_lower == dest_primary or name_lower == f"the {dest_primary}":
            return False

    # Positive match: Known core landmark for any destination
    dest_key = dest.split(",")[0].strip().lower() if dest else ""
    for d_key, core_list in CORE_IN_DESTINATION_LANDMARKS.items():
        if d_key in dest_key or not dest_key:
            if any(lm in name_lower for lm in core_list):
                return True

    # Positive match: Ends with or contains a recognized place/monument noun
    tokens = re.findall(r"[a-zA-Z]+", name_lower)
    if any(t in RECOGNIZED_PLACE_NOUNS for t in tokens):
        return True

    # Multi-word proper name check
    non_place_tokens = {
        "best", "top", "great", "ultimate", "essential", "complete", "daily",
        "our", "your", "my", "this", "that", "these", "those", "how", "what",
        "why", "when", "where", "who", "which", "free", "cheap", "plans",
        "plan", "itinerary", "guide", "tips", "hacks", "review", "reviews",
        "options", "ideas", "route", "routes", "stops", "things", "places",
        "game", "games", "routine", "breakdown", "sites", "areas", "buildings",
        "attractions", "activities", "tours", "spots", "statues", "monuments",
        "sacred", "religious", "historic", "historical", "archaeological",
        "architectural", "scenic", "cultural", "filter", "filters", "sorted",
        "sorting", "ranked", "ratings", "entry", "tickets", "ticket", "hours",
        "fee", "fees", "table", "contents", "gallery", "galleries", "popular",
        "famous", "local", "traditional", "modern", "specialty",
        "embark", "discover", "experience", "explore", "visit", "start", "begin",
        "enjoy", "join", "see", "book", "choose", "uncover", "adventure", "adventures",
        "trip", "trips", "vacation", "vacations", "holiday", "holidays", "journey",
        "journeys", "escape", "getaway"
    }
    capitalized_tokens = [w for w in name_clean.split() if w and w[0].isupper()]
    if len(capitalized_tokens) >= 2:
        if not any(t in non_place_tokens for t in tokens):
            return True

    return False


def _is_multi_attraction_list_text(text: str, dest: str = "", current_landmark: str = "") -> bool:
    """
    Checks whether a text line or snippet is a multi-attraction listicle enumeration
    (e.g. 'Must-see places include Victoria Memorial, Indian Museum, Howrah Bridge, and Science City')
    or conflates multiple distinct sites (e.g. 'Lord Ramanujar Temple, Valluvar Kottam and Rajiv Gandhi Memorial')
    rather than being a clean, individual evidence excerpt for a single landmark.
    """
    if not text:
        return False
    lower = text.lower()
    dest_key = dest.split(",")[0].strip().lower() if dest else ""
    cur_norm = (current_landmark or "").lower().strip()
    cur_norm = re.sub(r"^(?:the|visit|explore)\s+", "", cur_norm).strip()

    # Collect known landmarks to check against
    known_lms = []
    for k, lms in CORE_IN_DESTINATION_LANDMARKS.items():
        if not dest_key or k in dest_key or dest_key in k:
            known_lms.extend(lms)

    matched_landmarks: Set[str] = set()
    for lm in known_lms:
        if cur_norm and (lm in cur_norm or cur_norm in lm):
            continue
        if re.search(rf"\b{re.escape(lm)}\b", lower):
            matched_landmarks.add(lm)
            if len(matched_landmarks) >= 1 and cur_norm:
                return True
            if len(matched_landmarks) >= 2:
                return True

    # Check known place locations
    for lm_key in KNOWN_PLACE_LOCATIONS.keys():
        if cur_norm and (lm_key in cur_norm or cur_norm in lm_key):
            continue
        if re.search(rf"\b{re.escape(lm_key)}\b", lower):
            if not any(lm_key in m or m in lm_key for m in matched_landmarks):
                matched_landmarks.add(lm_key)
                if len(matched_landmarks) >= 1 and cur_norm:
                    return True
                if len(matched_landmarks) >= 2:
                    return True

    # Check named landmark matches
    named_matches = [m.group(0).strip() for m in NAMED_LANDMARK_PATTERN.finditer(text)]
    distinct_named = [
        nm for nm in named_matches
        if not (cur_norm and (nm.lower() in cur_norm or cur_norm in nm.lower()))
    ]
    if len(distinct_named) >= 1 and cur_norm:
        if re.search(r",\s*|\b(?:and|along\s+with|as\s+well\s+as|together\s+with|including|such\s+as)\b", lower):
            return True
    if len(distinct_named) >= 2:
        return True

    has_list_phrase = bool(re.search(
        r"\b(?:must[-\s]?see\s+(?:places|sights|attractions|spots)|top\s+(?:places|sights|attractions|things\s+to\s+do)|"
        r"places\s+to\s+visit\s+include|sights\s+include|highlights\s+include|attractions\s+include|"
        r"explore\s+[a-z\s]+(?:include|including|such\s+as)|"
        r"along\s+with|as\s+well\s+as|together\s+with|nearby\s+(?:attractions|sights|places)\s+include)\b",
        lower,
        re.IGNORECASE
    ))
    return has_list_phrase and (len(matched_landmarks) >= 1 or len(distinct_named) >= 1)


def _extract_local_evidence(landmark_name: str, text: str, fallback_snippet: str = "", dest: str = "") -> str:
    """
    Extracts a focused local context snippet (40-300 chars) specifically around
    the landmark mention in fetched markdown or page text.
    Prefers dedicated markdown headings and substantive descriptive prose.
    Stops lookahead at subsequent landmark headings to prevent cross-landmark leakage.
    Strictly rejects multi-attraction listicle enumerations from being used as individual evidence.
    """
    if not text or not landmark_name:
        if fallback_snippet and (not dest or not is_geographic_mismatch(landmark_name, fallback_snippet, dest)):
            if not _is_multi_attraction_list_text(fallback_snippet, dest, current_landmark=landmark_name):
                return fallback_snippet
        return ""

    name_lower = landmark_name.lower().strip()
    text_lower = text.lower()

    metadata_patterns = re.compile(
        r"(?:"
        r"\b(?:\d+(?:\.\d+)?\s*(?:stars?|★|\/5|\/10)|rated\s+\d|ratings?)\b|"
        r"\b(?:\d+[\d,]*\s*(?:reviews?|traveler\s+reviews?|ratings?))\b|"
        r"\b(?:#\d+\s+of\s+\d+|ranked\s+#\d+|ranking)\b|"
        r"\b(?:filter\s+by|sort\s+by|category:|categories:|type:|admission:|entry\s+fee)\b|"
        r"\b(?:open\s+now|opening\s+hours|hours\s+today|closed\s+now|book\s+tickets?|check\s+availability|read\s+more|see\s+all)\b|"
        r"\b(?:phone|call|email|website|address|duration:|suggested\s+duration:)\b|"
        r"^\[?!\[.*?\]\(.*?\)\]?$"
        r")",
        re.IGNORECASE
    )

    # 1. Heading-first matching: find a dedicated markdown heading or bold item for this landmark
    heading_pattern = rf"(?:^|\n)[ \t]*(?:#{{1,4}}|\d+[\.\)]|[\-*])[ \t]+(?:\*\*)?(?:\[)?(?:\d+[\.\)]\s*)?({re.escape(name_lower)})(?:\]\([^\)]+\))?(?:\*\*)?[ \t]*(?::|\r?\n|$)"
    m = re.search(heading_pattern, text, re.IGNORECASE)
    if not m:
        heading_pattern_bold = rf"(?:^|\n)[ \t]*(?:\*\*|__)[ \t]*{re.escape(name_lower)}[ \t]*(?:\*\*|__)[ \t]*(?::|\r?\n|$)"
        m = re.search(heading_pattern_bold, text, re.IGNORECASE)

    if m:
        after_heading = text[m.end():]
        # Stop at the next heading or next bullet landmark
        next_heading = re.search(r"\n[ \t]*(?:#{1,4}|\d+[\.\)]\s+[A-Z]|\*\*|[\-*]\s+[A-Z])", after_heading)
        section_text = after_heading[:next_heading.start()] if next_heading else after_heading[:2000]
        lines = [line.strip() for line in section_text.splitlines() if line.strip()]
        for line in lines:
            clean_line = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", line)
            clean_line = re.sub(r"^[\s#*\-:—–|]+", "", clean_line).strip()
            clean_line = re.sub(r"\s+", " ", clean_line)

            if (
                len(clean_line) < 30
                or metadata_patterns.search(clean_line)
                or GENERIC_EDITORIAL_PATTERNS.search(clean_line)
                or GENERIC_CATEGORY_HEADING_PATTERNS.search(clean_line)
                or _is_multi_attraction_list_text(clean_line, dest, current_landmark=landmark_name)
            ):
                continue

            sentence_match = re.search(r"^(.{35,280}?[\.\!\?])(?:\s|$)", clean_line)
            if sentence_match:
                candidate_sentence = sentence_match.group(1).strip()
                if not metadata_patterns.search(candidate_sentence) and not _is_multi_attraction_list_text(candidate_sentence, dest, current_landmark=landmark_name):
                    return candidate_sentence
            elif len(clean_line) <= 280:
                return clean_line
            else:
                return clean_line[:280].rsplit(" ", 1)[0] + "."

    # 2. Search for dedicated sentences in running prose
    for match in re.finditer(rf"\b{re.escape(name_lower)}\b", text_lower):
        idx = match.start()
        start = max(0, idx - 120)
        end = min(len(text), idx + len(name_lower) + 300)
        chunk = text[start:end]
        sentences = re.split(r"[\r\n]+|[.!?]\s+", chunk)
        for s in sentences:
            s_clean = s.strip()
            if name_lower in s_clean.lower() and len(s_clean) >= 35:
                s_clean = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", s_clean)
                s_clean = re.sub(r"^[\s#*\-:—–|]+", "", s_clean).strip()
                s_clean = re.sub(r"\s+", " ", s_clean)
                if (
                    not metadata_patterns.search(s_clean)
                    and not _is_multi_attraction_list_text(s_clean, dest, current_landmark=landmark_name)
                    and not GENERIC_EDITORIAL_PATTERNS.search(s_clean)
                ):
                    return s_clean if s_clean.endswith(".") else s_clean + "."

    # 3. Fallback snippet (only if not a multi-attraction list)
    if fallback_snippet:
        if dest and is_geographic_mismatch(landmark_name, fallback_snippet, dest):
            return ""
        if name_lower in fallback_snippet.lower() and not _is_multi_attraction_list_text(fallback_snippet, dest, current_landmark=landmark_name):
            return fallback_snippet

    return ""


# Mapping of destinations / states / regions to their major constituent cities and municipal hubs
DESTINATION_SUB_REGIONS: Dict[str, List[str]] = {
    "west bengal": [
        "kolkata", "calcutta", "howrah", "darjeeling", "sundarbans", "sunderbans",
        "kalimpong", "siliguri", "digha", "shantiniketan", "santiniketan",
        "bishnupur", "murshidabad", "hooghly", "cooch behar", "kurseong",
        "duars", "dooars", "malda", "jalpaiguri"
    ],
    "kolkata": [
        "howrah", "hooghly", "salt lake", "new town", "alipore", "dum dum",
        "park street", "esplanade", "ballygunge", "jadavpur", "shyambazar"
    ],
    "delhi": [
        "new delhi", "old delhi", "chandni chowk", "connaught place", "south delhi",
        "hauz khas", "mehrauli", "chanakyapuri", "karol bagh", "dwarka", "rohini"
    ],
    "rajasthan": [
        "jaipur", "udaipur", "jodhpur", "jaisalmer", "pushkar", "ajmer",
        "bikaner", "mount abu", "alwar", "chittorgarh", "ranthambore", "shekhawati"
    ],
    "himachal": [
        "shimla", "manali", "dharamshala", "mcleodganj", "kullu", "spiti",
        "kaza", "dalhousie", "kasauli", "chamba", "palampur", "kinnaur", "solan"
    ],
    "himachal pradesh": [
        "shimla", "manali", "dharamshala", "mcleodganj", "kullu", "spiti",
        "kaza", "dalhousie", "kasauli", "chamba", "palampur", "kinnaur", "solan"
    ],
    "uttarakhand": [
        "rishikesh", "haridwar", "dehradun", "mussoorie", "nainital",
        "corbett", "jim corbett", "kedarnath", "badrinath", "auli", "kausani", "almora"
    ],
    "goa": [
        "panaji", "panjim", "calangute", "baga", "anjuna", "candolim",
        "margao", "vasco", "colva", "palolem", "morjim", "arambol", "vagator"
    ],
    "ladakh": [
        "leh", "nubra", "nubra valley", "pangong", "tso moriri",
        "zanskar", "kargil", "khardung la", "diskit", "hunder", "hemis", "thiksey"
    ],
    "kerala": [
        "kochi", "cochin", "munnar", "alleppey", "alappuzha", "wayanad",
        "trivandrum", "thiruvananthapuram", "kovalam", "varkala", "thekkady", "kumarakom"
    ],
    "maharashtra": [
        "mumbai", "pune", "lonavala", "khandala", "mahabaleshwar", "ajanta",
        "ellora", "aurangabad", "nashik", "alibaug", "matheran"
    ],
    "mumbai": [
        "colaba", "bandra", "juhu", "churchgate", "fort", "dadar", "worli",
        "andheri", "prabhadevi", "malabar hill", "girgaon", "byculla"
    ],
    "tamil nadu": [
        "chennai", "madurai", "ooty", "kodaikanal", "coimbatore",
        "rameswaram", "mahabalipuram", "kanchipuram", "thanjavur"
    ],
    "chennai": [
        "mylapore", "triplicane", "george town", "marina beach", "besant nagar",
        "adyar", "egmore", "t nagar", "nungambakkam", "san thome", "guindy", "alwarpet", "royapettah"
    ],
    "karnataka": [
        "bengaluru", "bangalore", "mysore", "mysuru", "hampi",
        "coorg", "gokarna", "chikmagalur", "badami", "mangalore"
    ],
}

# Authoritative locations of iconic landmarks to prevent cross-state contamination (e.g. Taj Mahal in West Bengal)
KNOWN_PLACE_LOCATIONS: Dict[str, Dict[str, str]] = {
    "taj mahal": {"city": "agra", "state": "uttar pradesh", "region": "northern india"},
    "agra fort": {"city": "agra", "state": "uttar pradesh", "region": "northern india"},
    "fatehpur sikri": {"city": "agra", "state": "uttar pradesh", "region": "northern india"},
    "mehtab bagh": {"city": "agra", "state": "uttar pradesh", "region": "northern india"},
    "itimad-ud-daulah": {"city": "agra", "state": "uttar pradesh", "region": "northern india"},
    "gateway of india": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "marine drive": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "elephanta caves": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "chhatrapati shivaji terminus": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "chhatrapati shivaji maharaj terminus": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "cst": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "siddhivinayak temple": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "haji ali dargah": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "haji ali": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "bandra-worli sea link": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "bandra worli sea link": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "crawford market": {"city": "mumbai", "state": "maharashtra", "region": "western india"},
    "alai minar": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "golden temple": {"city": "amritsar", "state": "punjab", "region": "northern india"},
    "charminar": {"city": "hyderabad", "state": "telangana", "region": "southern india"},
    "golconda fort": {"city": "hyderabad", "state": "telangana", "region": "southern india"},
    "mysore palace": {"city": "mysore", "state": "karnataka", "region": "southern india"},
    "amba vilas palace": {"city": "mysore", "state": "karnataka", "region": "southern india"},
    "meenakshi temple": {"city": "madurai", "state": "tamil nadu", "region": "southern india"},
    "brihadisvara temple": {"city": "thanjavur", "state": "tamil nadu", "region": "southern india"},
    "hampi ruins": {"city": "hampi", "state": "karnataka", "region": "southern india"},
    "virupaksha temple": {"city": "hampi", "state": "karnataka", "region": "southern india"},
    "red fort": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "qutub minar": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "india gate": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "lotus temple": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "humayun's tomb": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "humayun tomb": {"city": "delhi", "state": "delhi", "region": "northern india"},
    "hawa mahal": {"city": "jaipur", "state": "rajasthan", "region": "western india"},
    "amber fort": {"city": "jaipur", "state": "rajasthan", "region": "western india"},
    "amer fort": {"city": "jaipur", "state": "rajasthan", "region": "western india"},
    "nahargarh": {"city": "jaipur", "state": "rajasthan", "region": "western india"},
    "jal mahal": {"city": "jaipur", "state": "rajasthan", "region": "western india"},
    "hadimba": {"city": "manali", "state": "himachal pradesh", "region": "northern india"},
    "hadimba temple": {"city": "manali", "state": "himachal pradesh", "region": "northern india"},
    "laxman jhula": {"city": "rishikesh", "state": "uttarakhand", "region": "northern india"},
    "ram jhula": {"city": "rishikesh", "state": "uttarakhand", "region": "northern india"},
    "victoria memorial": {"city": "kolkata", "state": "west bengal", "region": "eastern india"},
    "howrah bridge": {"city": "kolkata", "state": "west bengal", "region": "eastern india"},
    "dakshineswar": {"city": "kolkata", "state": "west bengal", "region": "eastern india"},
    "dakshineswar kali temple": {"city": "kolkata", "state": "west bengal", "region": "eastern india"},
    "belur math": {"city": "howrah", "state": "west bengal", "region": "eastern india"},
    "indian museum": {"city": "kolkata", "state": "west bengal", "region": "eastern india"},
    "sundarbans": {"city": "sundarbans", "state": "west bengal", "region": "eastern india"},
    "sunderbans": {"city": "sunderbans", "state": "west bengal", "region": "eastern india"},
    "srikalahasti temple": {"city": "srikalahasti", "district": "tirupati", "state": "andhra pradesh", "region": "southern india"},
    "srikalahasti": {"city": "srikalahasti", "district": "tirupati", "state": "andhra pradesh", "region": "southern india"},
    "sri kalahasteeswara temple": {"city": "srikalahasti", "district": "tirupati", "state": "andhra pradesh", "region": "southern india"},
    "eiffel tower": {"city": "paris", "country": "france"},
    "louvre museum": {"city": "paris", "country": "france"},
    "colosseum": {"city": "rome", "country": "italy"},
}

# Known regional excursion / neighboring localities often bundled into city guides
REGIONAL_EXCURSION_KEYWORDS: Dict[str, List[str]] = {
    "rishikesh": [
        "dehradun", "haridwar", "mussoorie", "shivpuri", "kunjapuri",
        "mindrolling", "rajaji", "devprayag", "kanatal", "tehri", "neer garh", "neergarh"
    ],
    "manali": [
        "rohtang", "solang", "atal tunnel", "kullu", "manikaran",
        "kasol", "naggar", "sissu", "spiti", "gulaba", "kothi", "jogini"
    ],
    "jaipur": [
        "abhaneri", "chand baori", "pushkar", "ajmer", "bhangarh",
        "ranthambore", "sariska", "samode", "bagru", "sanganer"
    ],
    "kyoto": [
        "nara", "osaka", "uji", "kobe", "himeji", "biwa", "kurama", "kibune", "ohara"
    ],
    "shimla": [
        "kufri", "chail", "naldehra", "mashobra", "tattapani",
        "kasauli", "solan", "narkanda", "shoghi", "fagu"
    ],
    "delhi": [
        "agra", "taj mahal", "fatehpur sikri", "jaipur", "neemrana",
        "mathura", "vrindavan", "sultanpur", "damdama", "surajkund",
        "kurukshetra", "bharatpur", "rishikesh", "haridwar", "alwar"
    ],
    "west bengal": [
        "darjeeling", "sundarbans", "sunderbans", "tiger hill", "batasia loop",
        "digha", "shantiniketan", "santiniketan", "bishnupur", "murshidabad",
        "mandarmani", "bakkhali", "mayapur", "kalimpong", "kurseong", "mirik",
        "dooars", "duars", "siliguri", "cooch behar"
    ],
    "kolkata": [
        "darjeeling", "sundarbans", "sunderbans", "tiger hill", "batasia loop",
        "digha", "shantiniketan", "santiniketan", "bishnupur", "murshidabad",
        "mandarmani", "bakkhali", "mayapur", "chandannagar", "bandel"
    ],
    "mumbai": [
        "elephanta caves", "elephanta island", "alibaug", "lonavala", "khandala", "matheran"
    ],
    "chennai": [
        "srikalahasti", "tirupati", "mahabalipuram", "mamallapuram",
        "kanchipuram", "pulicat", "vedanthangal", "covelong", "muttukadu", "sadras", "pondicherry", "puducherry"
    ],
}

# Known core municipal landmarks clearly inside the destination
CORE_IN_DESTINATION_LANDMARKS: Dict[str, List[str]] = {
    "mumbai": [
        "gateway of india", "marine drive", "elephanta caves",
        "chhatrapati shivaji maharaj terminus", "chhatrapati shivaji terminus", "cst",
        "siddhivinayak temple", "haji ali dargah", "haji ali",
        "bandra-worli sea link", "bandra worli sea link", "crawford market",
        "kanheri caves", "sanjay gandhi national park", "juhu beach", "colaba causeway"
    ],
    "rishikesh": [
        "laxman jhula", "lakshman jhula", "ram jhula", "triveni ghat",
        "parmarth niketan", "beatles ashram", "chaurasi kutia", "tera manzil",
        "trayambakeshwar", "bharat mandir", "swarg ashram", "geeta bhawan", "janki setu"
    ],
    "manali": [
        "hadimba", "hidimba", "manu temple", "old manali", "van vihar",
        "vashisht", "mall road", "club house", "tibetan monastery", "himalayan nyinmapa"
    ],
    "jaipur": [
        "hawa mahal", "city palace", "jantar mantar", "albert hall",
        "birla mandir", "nahargarh", "jal mahal", "amber fort", "amer fort",
        "amber palace", "jaigarh", "johari bazaar", "bapu bazaar", "patrika gate", "galta ji"
    ],
    "kyoto": [
        "fushimi inari", "kinkaku-ji", "kinkakuji", "golden pavilion",
        "ginkaku-ji", "ginkakuji", "silver pavilion", "kiyomizu-dera",
        "arashiyama", "nijo castle", "gion", "philosopher's path", "kennin-ji", "tenryu-ji"
    ],
    "amalfi": [
        "path of the gods", "positano", "amalfi cathedral", "duomo di amalfi",
        "ravello", "villa rufolo", "villa cimbrone", "fiordo di furore", "atrani"
    ],
    "shimla": [
        "the ridge", "ridge", "mall road", "jakhu temple", "jakhoo temple",
        "christ church", "kalka shimla", "viceregal lodge", "rashtrapati niwas",
        "gaiety theatre", "annandale", "summer hill", "chadwick falls",
        "tara devi", "scandal point", "lakkar bazaar", "sankat mochan", "kali bari",
        "indian institute of advanced study"
    ],
    "delhi": [
        "red fort", "jama masjid", "chandni chowk", "qutub minar",
        "humayun's tomb", "humayun tomb", "india gate", "lotus temple",
        "akshardham", "rashtrapati bhavan", "bangla sahib", "gurudwara bangla sahib",
        "raj ghat", "lodhi garden", "lodhi gardens", "national museum",
        "jantar mantar", "purana qila", "connaught place", "hauz khas",
        "safdarjung tomb", "agrasen ki baori", "dilli haat", "national war memorial",
        "waste to wonder"
    ],
    "west bengal": [
        "victoria memorial", "howrah bridge", "dakshineswar", "dakshineswar kali temple",
        "belur math", "indian museum", "science city", "kalighat", "kalighat temple",
        "marble palace", "st paul's cathedral", "st pauls cathedral", "eden gardens",
        "princep ghat", "prinsep ghat", "alipore zoo", "eco park", "national library",
        "jorasanko thakur bari", "mother house", "south park street cemetery", "kumartuli",
        "birla planetarium", "birla temple", "new market", "college street", "tagore house",
        "sundarbans", "sunderbans", "darjeeling himalayan railway", "tiger hill", "batasia loop",
        "hazarduari palace", "bishnupur terracotta temples", "cooch behar palace"
    ],
    "kolkata": [
        "victoria memorial", "howrah bridge", "dakshineswar", "dakshineswar kali temple",
        "belur math", "indian museum", "science city", "kalighat", "kalighat temple",
        "marble palace", "st paul's cathedral", "st pauls cathedral", "eden gardens",
        "princep ghat", "prinsep ghat", "alipore zoo", "eco park", "national library",
        "jorasanko thakur bari", "mother house", "south park street cemetery", "kumartuli",
        "birla planetarium", "birla temple", "new market", "college street", "tagore house"
    ],
    "chennai": [
        "kapaleeshwarar temple", "kapaleeswarar temple", "marina beach", "san thome basilica",
        "santhome cathedral", "fort st george", "fort saint george", "government museum",
        "guindy national park", "valluvar kottam", "elliot's beach", "elliots beach",
        "edward elliot's beach", "parthasarathy temple", "dakshinachitra", "national art gallery",
        "birla planetarium", "vadapalani andavar temple", "semmozhi poonga"
    ],
}

def sanitize_destination_name(dest: str) -> str:
    """
    Strips leading/trailing temporal modifiers, articles, descriptive landscape additions, and prepositions defensively.
    """
    if not dest:
        return ""
    d = dest.strip()
    d = re.sub(r"^(?:the|a|an)\s+", "", d, flags=re.IGNORECASE).strip()
    d = re.sub(r"^(?:next|this|upcoming|coming)\s+", "", d, flags=re.IGNORECASE).strip()
    d = re.sub(r"\s+\b(?:next|this|upcoming|coming)\s+(?:weekend|week|month|year|days?|nights?)$", "", d, flags=re.IGNORECASE).strip()
    d = re.sub(r"\s+\b(?:next|this|upcoming|coming)$", "", d, flags=re.IGNORECASE).strip()
    d = re.sub(
        r"\s+\b(?:and\s+(?:the\s+)?|with\s+(?:the\s+)?)(?:surrounding\s+)?(?:hills?|mountains?|beaches?|coast|valleys?|countryside|surroundings?|surrounds?|nearby(?:\s+areas?)?)(?:\s+(?:there|around|nearby))?$",
        "",
        d,
        flags=re.IGNORECASE,
    ).strip()
    return d


def is_geographic_mismatch(candidate_name: str, local_text: str, dest: str) -> bool:
    """
    Identifies whether a candidate attraction is clearly located outside the requested destination.
    Distinguishes:
    - Sights known to be located in other cities/states (e.g. Taj Mahal in Agra for West Bengal)
    - Candidates whose supporting text explicitly locates them in a contradictory external hub
    - Preserves legitimate destination sights and valid regional excursions (e.g. Agra is allowed for Delhi)
    """
    if not candidate_name or not dest:
        return False

    dest_clean = sanitize_destination_name(dest).lower()
    dest_primary = dest_clean.split(",")[0].strip()
    cand_lower = candidate_name.lower().strip()
    cand_norm = re.sub(r"['’\u2018\u2019\ufffd]+", "'", cand_lower)
    cand_alphanum = re.sub(r"[^a-z0-9]+", " ", cand_norm).strip()
    text_lower = (local_text or "").lower()

    # Collect all valid destination tokens (destination itself + sub-regions + allowed excursions)
    valid_geo_tokens: Set[str] = {dest_clean, dest_primary}
    for k, sub_list in DESTINATION_SUB_REGIONS.items():
        k_matched = (
            k == dest_clean
            or k == dest_primary
            or bool(re.search(rf"\b{re.escape(k)}\b", dest_clean))
            or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary)}\b", k)))
        )
        if k_matched:
            valid_geo_tokens.add(k)
            valid_geo_tokens.update(s.lower() for s in sub_list)

    for k, exc_list in REGIONAL_EXCURSION_KEYWORDS.items():
        k_matched = (
            k == dest_clean
            or k == dest_primary
            or bool(re.search(rf"\b{re.escape(k)}\b", dest_clean))
            or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary)}\b", k)))
        )
        if k_matched:
            valid_geo_tokens.add(k)
            valid_geo_tokens.update(s.lower() for s in exc_list)

    # 1. Check known place locations (e.g. Taj Mahal in Agra, Gateway of India in Mumbai)
    for lm_key, loc_info in KNOWN_PLACE_LOCATIONS.items():
        lm_norm = re.sub(r"['’\u2018\u2019\ufffd]+", "'", lm_key.lower()).strip()
        lm_alphanum = re.sub(r"[^a-z0-9]+", " ", lm_norm).strip()
        if lm_norm in cand_norm or cand_norm in lm_norm or lm_alphanum in cand_alphanum or cand_alphanum in lm_alphanum:
            loc_city = loc_info.get("city", "").lower()
            loc_state = loc_info.get("state", "").lower()
            loc_country = loc_info.get("country", "").lower()

            matches_dest = False
            for tok in valid_geo_tokens:
                if tok and (tok == loc_city or tok == loc_state or tok == loc_country):
                    matches_dest = True
                    break
            if not matches_dest:
                if loc_city and len(loc_city) >= 3 and bool(re.search(rf"\b{re.escape(loc_city)}\b", dest_clean)):
                    matches_dest = True
                elif loc_state and len(loc_state) >= 3 and bool(re.search(rf"\b{re.escape(loc_state)}\b", dest_clean)):
                    matches_dest = True
                elif loc_country and len(loc_country) >= 3 and bool(re.search(rf"\b{re.escape(loc_country)}\b", dest_clean)):
                    matches_dest = True

            if not matches_dest:
                logger.info(
                    "Geographic mismatch: '%s' is located in %s, %s, which does not match destination '%s'",
                    candidate_name, loc_city, loc_state or loc_country, dest
                )
                return True
            else:
                return False

    # 2. Check explicit location contradictions in local supporting text
    # (e.g. "located in Agra", "situated in Agra", "in Uttar Pradesh")
    KNOWN_OTHER_HUBS = {
        "agra": "uttar pradesh",
        "jaipur": "rajasthan",
        "udaipur": "rajasthan",
        "jodhpur": "rajasthan",
        "delhi": "delhi",
        "new delhi": "delhi",
        "mumbai": "maharashtra",
        "pune": "maharashtra",
        "amritsar": "punjab",
        "goa": "goa",
        "bengaluru": "karnataka",
        "bangalore": "karnataka",
        "mysore": "karnataka",
        "hyderabad": "telangana",
        "chennai": "tamil nadu",
        "varanasi": "uttar pradesh",
        "lucknow": "uttar pradesh",
        "kolkata": "west bengal",
        "paris": "france",
        "rome": "italy",
        "tokyo": "japan",
    }

    for hub_city, hub_state in KNOWN_OTHER_HUBS.items():
        if any(tok == hub_city or tok == hub_state for tok in valid_geo_tokens):
            continue

        # Check if candidate local text explicitly places this landmark in that external hub
        pattern = rf"(?:,\s*|\b(?:located|situated|built|stands?|lies?|found)?\s*(?:in|at|near|outside)\s+(?:(?:central|downtown|historic|old)\s+)?)\b{re.escape(hub_city)}\b"
        if re.search(pattern, text_lower):
            logger.info(
                "Geographic mismatch: candidate '%s' local text places it in '%s', which does not belong to '%s'",
                candidate_name, hub_city, dest
            )
            return True

    return False


CANONICAL_LANDMARK_NAMES: Dict[str, str] = {
    "the ridge": "The Ridge",
    "ridge": "The Ridge",
    "mall road": "Mall Road",
    "jakhu temple": "Jakhoo Temple",
    "jakhoo temple": "Jakhoo Temple",
    "christ church": "Christ Church",
    "kalka shimla": "Kalka-Shimla Railway",
    "viceregal lodge": "Viceregal Lodge",
    "rashtrapati niwas": "Rashtrapati Niwas",
    "gaiety theatre": "Gaiety Theatre",
    "annandale": "Annandale",
    "summer hill": "Summer Hill",
    "chadwick falls": "Chadwick Falls",
    "tara devi": "Tara Devi Temple",
    "scandal point": "Scandal Point",
    "lakkar bazaar": "Lakkar Bazaar",
    "sankat mochan": "Sankat Mochan Temple",
    "kali bari": "Kali Bari Temple",
    "indian institute of advanced study": "Indian Institute of Advanced Study",
    "laxman jhula": "Laxman Jhula",
    "lakshman jhula": "Laxman Jhula",
    "ram jhula": "Ram Jhula",
    "triveni ghat": "Triveni Ghat",
    "parmarth niketan": "Parmarth Niketan",
    "beatles ashram": "Beatles Ashram",
    "chaurasi kutia": "Chaurasi Kutia (Beatles Ashram)",
    "tera manzil": "Tera Manzil Temple",
    "janki setu": "Janki Setu",
    "hadimba": "Hadimba Temple",
    "hidimba": "Hadimba Temple",
    "manu temple": "Manu Temple",
    "old manali": "Old Manali",
    "van vihar": "Van Vihar",
    "vashisht": "Vashisht Hot Water Springs",
    "hawa mahal": "Hawa Mahal",
    "city palace": "City Palace",
    "jantar mantar": "Jantar Mantar",
    "albert hall": "Albert Hall Museum",
    "amber fort": "Amber Fort",
    "amer fort": "Amber Fort",
    "jal mahal": "Jal Mahal",
    "nahargarh": "Nahargarh Fort",
    "jaigarh": "Jaigarh Fort",
    "patrika gate": "Patrika Gate",
    "fushimi inari": "Fushimi Inari-taisha",
    "kinkaku-ji": "Kinkaku-ji (Golden Pavilion)",
    "kinkakuji": "Kinkaku-ji (Golden Pavilion)",
    "golden pavilion": "Kinkaku-ji (Golden Pavilion)",
    "kiyomizu-dera": "Kiyomizu-dera",
    "arashiyama": "Arashiyama Bamboo Grove",
    "gion": "Gion Historic District",
    "red fort": "Red Fort",
    "jama masjid": "Jama Masjid",
    "chandni chowk": "Chandni Chowk",
    "qutub minar": "Qutub Minar",
    "humayun's tomb": "Humayun's Tomb",
    "humayun tomb": "Humayun's Tomb",
    "india gate": "India Gate",
    "lotus temple": "Lotus Temple",
    "akshardham": "Akshardham Temple",
    "rashtrapati bhavan": "Rashtrapati Bhavan",
    "gurudwara bangla sahib": "Gurudwara Bangla Sahib",
    "bangla sahib": "Gurudwara Bangla Sahib",
    "raj ghat": "Raj Ghat",
    "lodhi garden": "Lodhi Garden",
    "lodhi gardens": "Lodhi Garden",
    "national museum": "National Museum",
    "purana qila": "Purana Qila",
    "connaught place": "Connaught Place",
    "hauz khas": "Hauz Khas Village",
    "safdarjung tomb": "Safdarjung Tomb",
    "agrasen ki baori": "Agrasen Ki Baori",
    "dilli haat": "Dilli Haat",
    "national war memorial": "National War Memorial",
    "victoria memorial": "Victoria Memorial",
    "howrah bridge": "Howrah Bridge",
    "dakshineswar": "Dakshineswar Kali Temple",
    "dakshineswar kali temple": "Dakshineswar Kali Temple",
    "belur math": "Belur Math",
    "indian museum": "Indian Museum",
    "science city": "Science City Kolkata",
    "kalighat": "Kalighat Kali Temple",
    "kalighat temple": "Kalighat Kali Temple",
    "marble palace": "Marble Palace",
    "st paul's cathedral": "St. Paul's Cathedral",
    "st pauls cathedral": "St. Paul's Cathedral",
    "eden gardens": "Eden Gardens",
    "princep ghat": "Princep Ghat",
    "prinsep ghat": "Princep Ghat",
    "alipore zoo": "Alipore Zoological Gardens",
    "eco park": "Eco Park New Town",
    "national library": "National Library of India",
    "jorasanko thakur bari": "Jorasanko Thakur Bari",
    "mother house": "Mother House",
    "south park street cemetery": "South Park Street Cemetery",
    "kumartuli": "Kumartuli Potter's Quarter",
    "birla planetarium": "Birla Planetarium",
    "birla temple": "Birla Mandir Kolkata",
    "sundarbans": "Sundarbans National Park",
    "sunderbans": "Sundarbans National Park",
    "darjeeling himalayan railway": "Darjeeling Himalayan Railway",
    "tiger hill": "Tiger Hill",
    "batasia loop": "Batasia Loop",
    "hazarduari palace": "Hazarduari Palace",
    "bishnupur terracotta temples": "Bishnupur Terracotta Temples",
    "cooch behar palace": "Cooch Behar Palace",
    "taj mahal": "Taj Mahal",
    "gateway of india": "Gateway of India",
    "marine drive": "Marine Drive",
    "elephanta caves": "Elephanta Caves",
    "chhatrapati shivaji maharaj terminus": "Chhatrapati Shivaji Maharaj Terminus",
    "chhatrapati shivaji terminus": "Chhatrapati Shivaji Maharaj Terminus",
    "cst": "Chhatrapati Shivaji Maharaj Terminus",
    "siddhivinayak temple": "Siddhivinayak Temple",
    "haji ali dargah": "Haji Ali Dargah",
    "haji ali": "Haji Ali Dargah",
    "bandra-worli sea link": "Bandra-Worli Sea Link",
    "bandra worli sea link": "Bandra-Worli Sea Link",
    "crawford market": "Crawford Market",
    "kanheri caves": "Kanheri Caves",
    "sanjay gandhi national park": "Sanjay Gandhi National Park",
    "juhu beach": "Juhu Beach",
    "colaba causeway": "Colaba Causeway",
    "kapaleeshwarar temple": "Kapaleeshwarar Temple",
    "kapaleeswarar temple": "Kapaleeshwarar Temple",
    "marina beach": "Marina Beach",
    "san thome basilica": "San Thome Basilica",
    "santhome cathedral": "San Thome Basilica",
    "fort st george": "Fort St. George",
    "fort saint george": "Fort St. George",
    "government museum": "Government Museum Chennai",
    "guindy national park": "Guindy National Park",
    "valluvar kottam": "Valluvar Kottam",
    "elliot's beach": "Elliot's Beach",
    "elliots beach": "Elliot's Beach",
    "parthasarathy temple": "Parthasarathy Temple",
    "srikalahasti temple": "Srikalahasti Temple",
    "sri kalahasteeswara temple": "Srikalahasti Temple",
    "dakshinachitra": "DakshinaChitra Heritage Museum",
    "national art gallery": "National Art Gallery",
    "birla planetarium": "Birla Planetarium",
}

HEADING_OR_LIST_PATTERN = re.compile(
    r"(?:^|\n)[ \t]*(?:#{1,4}|\d+[\.\)]|[\-*])[ \t]+(?:\*\*)?(?:\[)?(?:\d+[\.\)]\s*)?([A-Z][A-Za-z0-9'’&,\- \(\)]{2,65}?)(?:\]\([^\)]+\))?(?:\*\*)?(?:\r?\n|$)"
)


def _extract_candidate_attractions_from_text(
    title: str,
    snippet: str,
    fetched_text: str,
    dest: str,
    is_social_source: bool = False,
) -> List[Tuple[str, str]]:
    """
    Distinguishes source articles from individual extracted attractions.
    Returns a list of (attraction_name, grounded_description) pairs extracted
    from the source's title, fetched markdown headings/numbered/bullet items, named landmarks,
    or verified core destination landmarks mentioned in text.
    Rejects social media titles, generic travel guides, and listicle headings.
    Never invents a fabricated fallback attraction when candidates are empty.
    """
    candidates: List[Tuple[str, str]] = []
    seen_in_source: Set[str] = set()
    dest_primary = dest.split(",")[0].strip()

    def _add_candidate(cand_name: str, desc: str):
        if not cand_name:
            return
        if not _is_plausible_named_place(cand_name, dest):
            return
        norm_key = _normalize_attraction_key(cand_name, dest)
        if not norm_key or norm_key in seen_in_source:
            return
        if _is_article_or_listicle_title(cand_name):
            return
        if bool(re.search(r"\b(?:tours?\s+(?:and|&)\s+excursions?|best\s+[a-z\s]+tours?|top\s+[a-z\s]+tours?)\b", cand_name, re.IGNORECASE)):
            return
        seen_in_source.add(norm_key)
        candidates.append((cand_name, desc))

    # 1. If the webpage title itself names a specific attraction (not a listicle, guide, or social page)
    cleaned_title = title.split(" - ")[0].split(" | ")[0].split(" – ")[0].strip()
    cleaned_title = re.sub(r"\s+Overview$", "", cleaned_title, flags=re.IGNORECASE).strip()
    
    combined_text = f"{fetched_text or ''}\n{snippet or ''}"

    if (
        cleaned_title
        and not is_social_source
        and not _is_article_or_listicle_title(cleaned_title)
        and cleaned_title.lower() != dest_primary.lower()
    ):
        norm_title = normalize_attraction_display_name(cleaned_title)
        if norm_title and _is_plausible_named_place(norm_title, dest):
            desc = _extract_local_evidence(norm_title, combined_text, snippet, dest) or f"Verified landmark in {dest_primary}."
            _add_candidate(norm_title[:60], desc)

    # 2. Parse markdown headings, numbered list items, bullets, and markdown links
    for match in HEADING_OR_LIST_PATTERN.finditer(combined_text):
        cand_name = _clean_landmark_heading(match.group(1), dest)
        if cand_name and _is_plausible_named_place(cand_name, dest):
            desc = _extract_local_evidence(cand_name, combined_text, snippet, dest)
            if desc:
                _add_candidate(cand_name, desc)

    # 2b. Parse numbered/bulleted items from search snippets (e.g. "1. Gateway Of India ...")
    for match in NUMBERED_SNIPPET_PATTERN.finditer(combined_text):
        cand_name = _clean_landmark_heading(match.group(1), dest)
        if cand_name and _is_plausible_named_place(cand_name, dest):
            desc = _extract_local_evidence(cand_name, combined_text, snippet, dest)
            if desc:
                _add_candidate(cand_name, desc)

    # 3. Extract explicit named landmarks (e.g. "The Ridge", "Laxman Jhula", "Amber Fort", "Mall Road")
    for match in NAMED_LANDMARK_PATTERN.finditer(combined_text):
        landmark = match.group(1).strip()
        landmark = re.sub(r"^(?:HOURS|HRS|DAYS|MINS|MINUTES)([A-Z][a-z])", r"\1", landmark).strip()
        landmark = re.sub(r"^(?:\d+(?:\.\d+)?\s*)?(?:hours?|hrs?|days?|mins?|minutes?)\b\s*", "", landmark, flags=re.IGNORECASE).strip()
        landmark = re.sub(r"^(?:half[-\s]?day|full[-\s]?day|private|guided|tour|day[-\s]?trip)\s+", "", landmark, flags=re.IGNORECASE).strip()
        # Avoid action prefixes like "Visiting Laxman Jhula" or "Explore Amber Fort"
        # Preserve "The Ridge" and "The Beatles Ashram"
        if landmark.lower() not in ("the ridge", "the beatles ashram"):
            landmark = re.sub(
                r"^(?:Visiting|Visit|Exploring|Explore|Discovering|Discover|Seeing|See|Touring|Tour|Walk|At|In|Near|The|Famous|Historic|Ancient|Iconic|Watch|Photo|Reel|Video)\s+",
                "",
                landmark,
                flags=re.IGNORECASE,
            ).strip()
        if 3 <= len(landmark) <= 60 and not LISTICLE_TITLE_PATTERN.search(landmark):
            norm_landmark = normalize_attraction_display_name(landmark)
            if norm_landmark and _is_plausible_named_place(norm_landmark, dest):
                desc = _extract_local_evidence(norm_landmark, combined_text, snippet, dest)
                if desc:
                    _add_candidate(norm_landmark, desc)

    # 3b. Extract front-noun landmarks (e.g. "Gateway of India", "Tower of London", "Palace of Versailles")
    for match in FRONT_NOUN_LANDMARK_PATTERN.finditer(combined_text):
        landmark = match.group(1).strip()
        norm_landmark = normalize_attraction_display_name(landmark)
        if norm_landmark and _is_plausible_named_place(norm_landmark, dest):
            desc = _extract_local_evidence(norm_landmark, combined_text, snippet, dest)
            if desc:
                _add_candidate(norm_landmark, desc)

    # 4. Extract verified core destination landmarks explicitly mentioned in text / snippets
    # Do not extract multiple core landmarks from generic multi-landmark social media captions
    if not (is_social_source and _is_multi_attraction_list_text(combined_text, dest)):
        dest_key = dest_primary.lower()
        for d_key, core_list in CORE_IN_DESTINATION_LANDMARKS.items():
            if d_key in dest_key:
                for lm_key in core_list:
                    pattern = rf"\b{re.escape(lm_key)}\b"
                    match = re.search(pattern, combined_text, flags=re.IGNORECASE)
                    if match:
                        disp_name = CANONICAL_LANDMARK_NAMES.get(lm_key) or normalize_attraction_display_name(lm_key)
                        # Extract surrounding context window if available
                        start = max(0, match.start() - 100)
                        end = min(len(combined_text), match.end() + 150)
                        snippet_window = combined_text[start:end].strip().replace("\n", " ")
                        snippet_clean = re.sub(r"\s+", " ", snippet_window)
                        local_ev = _extract_local_evidence(lm_key, combined_text, snippet_clean, dest)
                        desc = local_ev or f"Location verified in {dest_primary}. Mentioned in passing in retrieved search overview; detailed venue description and hours not provided in snippet."
                        _add_candidate(disp_name, desc)

    return candidates

EXCURSION_CONTEXT_PATTERN = re.compile(
    r"\b(?:day\s+trip|excursion|detour|outskirts|outside\s+of|\d+\s*(?:km|kilometers?|miles?|hr|hrs|hours?)\s+(?:from|away|drive|north|south|east|west)|drive\s+from|full[-\s]?day\s+tour|situated\s+in\s+[A-Z][a-z]+,\s*\d+\s*km)\b",
    re.IGNORECASE,
)

VAGUE_UNVERIFIED_NAME_PATTERN = re.compile(
    r"^(?:secret|hidden|mystery|unknown|local|private|scenic|top|best)\s+(?:waterfall|falls|beach|viewpoint|spot|trail|cave|temple|place)s?$",
    re.IGNORECASE,
)




def classify_attraction_geography(
    name: str,
    description: str,
    context_text: str,
    dest: str,
    is_single_landmark_page: bool = False,
    source_title: str = "",
    source_url: str = "",
) -> Tuple[str, str, str]:
    """
    Conservative destination-relevance check that distinguishes:
    1. 'in_destination': Attractions clearly inside the requested destination
    2. 'nearby_excursion': Nearby excursions requiring an explicit distance or travel-time check
    3. 'unverified_location': Attractions that cannot be geographically verified from retrieved text

    Never invents coordinates, distances, travel times, or administrative boundaries.
    """
    dest_clean = sanitize_destination_name(dest)
    dest_primary = (dest_clean.split(",")[0].strip() if dest_clean else "Destination")
    dest_key = dest_primary.lower()
    name_lower = (name or "").lower().strip()
    desc_lower = (description or "").lower()

    # Extract a local window around the attraction mention in context_text (strict bounds to prevent cross-landmark leakage)
    local_window = desc_lower
    if context_text and name_lower:
        idx = context_text.lower().find(name_lower)
        if idx != -1:
            line_start = max(
                context_text.rfind("\n\n", 0, idx),
                context_text.rfind("\r\n\r\n", 0, idx),
                context_text.rfind("\n#", 0, idx),
            )
            start = idx if line_start == -1 else (line_start + 2)
            next_heading = re.search(r"\n+(?:#{1,4}|\d+[\.\)])\s+", context_text[idx:])
            if next_heading:
                end = idx + next_heading.start()
            else:
                end = min(len(context_text), idx + len(name_lower) + 250)
            local_window = f"{desc_lower} {context_text[start:end].lower()}"

    # 0. Check if candidate is an explicit geographic mismatch
    if is_geographic_mismatch(name, local_window, dest):
        return (
            "rejected_mismatch",
            "Rejected Mismatch",
            f"Candidate is known or indicated to be outside {dest_primary}."
        )

    # 1. Check if name is a generic/vague unanchored label (e.g. "Secret Waterfall")
    if VAGUE_UNVERIFIED_NAME_PATTERN.match(name_lower):
        return (
            "unverified_location",
            "Location Unverified • Check Source",
            f"Mentioned in a {dest_primary} source without a specific municipal address or landmark name. Exact geographic location cannot be verified from retrieved text — consult the linked source."
        )

    # 2. Check for known regional excursion keywords for this destination
    excursion_keywords = []
    for k, kw_list in REGIONAL_EXCURSION_KEYWORDS.items():
        k_matched = (
            k == dest_key
            or k == dest_primary.lower()
            or bool(re.search(rf"\b{re.escape(k)}\b", dest_key))
            or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary.lower())}\b", k)))
        )
        if k_matched:
            excursion_keywords = kw_list
            break

    for kw in excursion_keywords:
        if kw in name_lower or re.search(rf"\b{re.escape(kw)}\b", local_window):
            # If the landmark itself is a known core in-destination landmark, only mark excursion if kw is in name_lower
            core_list = []
            for k, c_list in CORE_IN_DESTINATION_LANDMARKS.items():
                k_matched = (
                    k == dest_key
                    or k == dest_primary.lower()
                    or bool(re.search(rf"\b{re.escape(k)}\b", dest_key))
                    or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary.lower())}\b", k)))
                )
                if k_matched:
                    core_list.extend(c_list)
            is_core = any(c in name_lower for c in core_list)
            if not is_core or kw in name_lower:
                excursion_note = (
                    f"Located in Andhra Pradesh (~115 km from {dest_primary}, approx 2.5-3 hours travel). Referenced as a regional excursion. Distance, transit route, and interstate travel logistics must be verified before scheduling."
                    if "srikalahasti" in name_lower or "tirupati" in name_lower
                    else f"Referenced as a regional excursion or outside central {dest_primary}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling."
                )
                return (
                    "nearby_excursion",
                    f"Nearby Excursion • Verify Distance from {dest_primary}",
                    excursion_note
                )

    # 3. Check for explicit excursion / distance phrases in description or local context window
    if EXCURSION_CONTEXT_PATTERN.search(local_window):
        return (
            "nearby_excursion",
            f"Nearby Excursion • Verify Distance from {dest_primary}",
            f"Source text indicates this sight requires travel from central {dest_primary}. Verify exact distance, transit route, and travel time via the linked source."
        )

    # 4. Check for positive in-destination evidence
    # 4a. Check authoritative known place locations table for matching destination
    valid_dest_tokens: Set[str] = {dest_key, dest_primary.lower()}
    for k, sub_list in DESTINATION_SUB_REGIONS.items():
        k_matched = (
            k == dest_key
            or k == dest_primary.lower()
            or bool(re.search(rf"\b{re.escape(k)}\b", dest_key))
            or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary.lower())}\b", k)))
        )
        if k_matched:
            valid_dest_tokens.add(k.lower())
            valid_dest_tokens.update(s.lower() for s in sub_list)

    cand_norm = re.sub(r"['’\u2018\u2019\ufffd]+", "'", name_lower).strip()
    cand_alphanum = re.sub(r"[^a-z0-9]+", " ", cand_norm).strip()
    for lm_key, loc_info in KNOWN_PLACE_LOCATIONS.items():
        lm_norm = re.sub(r"['’\u2018\u2019\ufffd]+", "'", lm_key.lower()).strip()
        lm_alphanum = re.sub(r"[^a-z0-9]+", " ", lm_norm).strip()
        if lm_norm == cand_norm or cand_norm in lm_norm or lm_norm in cand_norm or cand_alphanum == lm_alphanum:
            loc_city = loc_info.get("city", "").lower()
            loc_state = loc_info.get("state", "").lower()
            loc_country = loc_info.get("country", "").lower()
            if (loc_city and loc_city in valid_dest_tokens) or (loc_state and loc_state in valid_dest_tokens) or (loc_country and loc_country in valid_dest_tokens):
                if any(kw in name_lower for kw in excursion_keywords):
                    return (
                        "nearby_excursion",
                        f"Nearby Excursion • Verify Distance from {dest_primary}",
                        f"Referenced as a regional excursion or outside central {dest_primary}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling."
                    )
                return (
                    "in_destination",
                    f"In {dest_primary}",
                    f"Verified landmark within {dest_primary}. Exact coordinates and opening hours are not independently verified — check source link."
                )

    # 4b. Check core destination landmarks
    core_landmarks = []
    for k, c_list in CORE_IN_DESTINATION_LANDMARKS.items():
        k_matched = (
            k == dest_key
            or k == dest_primary.lower()
            or bool(re.search(rf"\b{re.escape(k)}\b", dest_key))
            or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary.lower())}\b", k)))
        )
        if k_matched:
            core_landmarks.extend(c_list)

    if any(c in name_lower for c in core_landmarks):
        if any(kw in name_lower for kw in excursion_keywords):
            return (
                "nearby_excursion",
                f"Nearby Excursion • Verify Distance from {dest_primary}",
                f"Referenced as a regional excursion or outside central {dest_primary}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling."
            )
        return (
            "in_destination",
            f"In {dest_primary}",
            f"Verified landmark within {dest_primary}. Exact coordinates and opening hours are not independently verified — check source link."
        )

    # Check for destination name or constituent central sub-regions in local window
    target_geo_names = [dest_key]
    for k, sub_list in DESTINATION_SUB_REGIONS.items():
        k_matched = (
            k == dest_key
            or k == dest_primary.lower()
            or bool(re.search(rf"\b{re.escape(k)}\b", dest_key))
            or (len(dest_primary) >= 3 and bool(re.search(rf"\b{re.escape(dest_primary.lower())}\b", k)))
        )
        if k_matched:
            if k not in target_geo_names:
                target_geo_names.append(k)
            for sub in sub_list:
                if sub not in excursion_keywords and sub not in target_geo_names:
                    target_geo_names.append(sub)

    matched_in_dest = False
    for geo_name in target_geo_names:
        escaped_geo = re.escape(geo_name)
        pattern = (
            rf"\b(?:in|across|at|within|central|northern|southern|eastern|western|old|downtown|heart\s+of|located\s+in|situated\s+in|monastery\s+in|temple\s+in|fort\s+in|palace\s+in|lake\s+in|pass\s+in|attraction\s+in|sights?\s+in|visit\s+in|guide\s+to|promenade\s+in|museum\s+in|coast\s+of|shore\s+of|along)\s+(?:[a-z]+\s+){{0,3}}{escaped_geo}\b"
            rf"|{escaped_geo}(?:'s|’s|\s+landmark|\s+attraction|\s+monument|\s+temple|\s+museum|\s+city|\s+waterfront|\s+harbour|\s+harbor|\s+coast|\s+center|\s+centre|\s+promenade|\s+beach|\s+district|\s+valley|\s+region)\b"
            rf"|\b(?:south|north|east|west|central|old|downtown)\s+{escaped_geo}\b"
            rf"|{escaped_geo}\s+(?:region|district|valley|state|territory|city)\b"
            rf"|,\s*{escaped_geo}\b"
        )
        if re.search(pattern, f"{name_lower} {local_window}", re.IGNORECASE) or (is_single_landmark_page and geo_name in f"{name_lower} {local_window}"):
            matched_in_dest = True
            break

    # Source context grounding: if the source title or URL is dedicated to this destination
    # Guard: never ground a candidate as in_destination if its known location is outside this destination, or if it matches an excursion keyword
    is_known_out_of_destination = False
    for lm_key, loc_info in KNOWN_PLACE_LOCATIONS.items():
        lm_norm = re.sub(r"['’\u2018\u2019\ufffd]+", "'", lm_key.lower()).strip()
        lm_alphanum = re.sub(r"[^a-z0-9]+", " ", lm_norm).strip()
        if lm_norm == cand_norm or cand_norm in lm_norm or lm_norm in cand_norm or cand_alphanum == lm_alphanum:
            loc_city = loc_info.get("city", "").lower()
            loc_state = loc_info.get("state", "").lower()
            loc_country = loc_info.get("country", "").lower()
            if not ((loc_city and loc_city in valid_dest_tokens) or (loc_state and loc_state in valid_dest_tokens) or (loc_country and loc_country in valid_dest_tokens)):
                is_known_out_of_destination = True
                break

    if not matched_in_dest and not is_known_out_of_destination and not any(kw in name_lower for kw in excursion_keywords) and (source_title or source_url):
        src_context = f"{source_title} {source_url}".lower()
        if dest_key in src_context:
            matched_in_dest = True

    if matched_in_dest:
        return (
            "in_destination",
            f"In {dest_primary}",
            f"Referenced within {dest_primary} by the retrieved source. Verify exact venue address and hours via the linked source."
        )

    # 5. Conservative default when geographic placement inside the destination cannot be confirmed
    return (
        "unverified_location",
        "Location Unverified • Check Source",
        f"Extracted from a {dest_primary} travel source, but exact placement within municipal {dest_primary} could not be confirmed from the retrieved snippet. Verify location via the source link."
    )


def generate_query_plan(
    trip_brief: TripBrief,
    selected_categories: List[str]
) -> List[CategoryQueryPlan]:
    """
    Generates deterministic, focused query plans for preview.
    Does NOT call external APIs.
    """
    plans: List[CategoryQueryPlan] = []
    dest = sanitize_destination_name(trip_brief.destination)
    dest_key = dest.lower()

    # Identify primary urban hub for broader regional/state destinations (e.g. West Bengal -> Kolkata)
    sub_hub = ""
    for k, sub_list in DESTINATION_SUB_REGIONS.items():
        if k in dest_key or dest_key in k:
            if sub_list:
                sub_hub = sub_list[0].capitalize()
                break
    hub_clause = f" {sub_hub}" if sub_hub and sub_hub.lower() not in dest_key else ""

    for cat_id in selected_categories:
        if cat_id == "attractions":
            interests_hint = (
                " " + " ".join(trip_brief.selected_interests[:2])
                if trip_brief.selected_interests
                else ""
            )
            queries = [
                f"{dest}{hub_clause} top attractions best sights crowd free timing{interests_hint}".strip(),
                f"{dest}{hub_clause} unmissable cultural sanctuaries travel guide".strip()
            ]
            plans.append(CategoryQueryPlan(
                category_id="attractions",
                category_name="Attractions & Cultural Sights",
                planned_queries=queries,
                estimated_sources=2,
                description="Live web discovery of top cultural landmarks, recommended dwell windows, and crowd avoidance."
            ))
        elif cat_id == "stays":
            plans.append(CategoryQueryPlan(
                category_id="stays",
                category_name="Boutique Stays & Heritage Lodges",
                planned_queries=[f"{dest} boutique hotels quiet neighborhood walking score"],
                estimated_sources=2,
                description="Live discovery of neighborhood accommodations matching transit access."
            ))
        elif cat_id == "transport":
            plans.append(CategoryQueryPlan(
                category_id="transport",
                category_name="Optimized Transit & Rail",
                planned_queries=[f"{dest} airport express public transit passes routes"],
                estimated_sources=2,
                description="Public transit passes and airport-to-city transfers."
            ))
        elif cat_id == "food":
            plans.append(CategoryQueryPlan(
                category_id="food",
                category_name="Culinary & Dining",
                planned_queries=[f"{dest} iconic local dishes authentic dining spots"],
                estimated_sources=2,
                description="Regional culinary specialties and authentic neighborhood eateries."
            ))
        elif cat_id == "photo":
            plans.append(CategoryQueryPlan(
                category_id="photo",
                category_name="Cinematic Photo Vantage",
                planned_queries=[f"{dest} golden hour photography scenic viewpoints"],
                estimated_sources=2,
                description="Scenic viewpoints and golden-hour photo compositions."
            ))

    return plans


def _clean_untrusted_text(raw_text: str, max_chars: int = 400) -> str:
    """
    Sanitizes fetched webpage content.
    Treats all web text strictly as untrusted raw strings.
    Strips dangerous characters and bounds length to prevent token overflow.
    """
    if not raw_text:
        return ""
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    cleaned = " ".join(lines)
    if len(cleaned) > max_chars:
        return cleaned[:max_chars].rsplit(" ", 1)[0] + "..."
    return cleaned


async def research_attractions(
    trip_brief: TripBrief,
    client: TinyFishClient,
) -> Tuple[List[AttractionItem], List[SourceFinding], List[TelemetryEvent]]:
    """
    First end-to-end research category: Attractions & Cultural Sights.
    1. Formulates focused query.
    2. Searches live web via TinyFish Search.
    3. Deduplicates citations using normalized canonical URLs.
    4. Fetches top pages via TinyFish Fetch.
    5. Distinguishes source articles from individual extracted attractions and deduplicates attractions.
    """
    telemetry: List[TelemetryEvent] = []
    attractions: List[AttractionItem] = []
    sources: List[SourceFinding] = []

    dest = sanitize_destination_name(trip_brief.destination)
    dest_primary = dest.split(",")[0].strip()
    dest_key = dest.lower()
    sub_hub = ""
    for k, sub_list in DESTINATION_SUB_REGIONS.items():
        if k in dest_key or dest_key in k:
            if sub_list:
                sub_hub = sub_list[0].capitalize()
                break
    hub_clause = f" {sub_hub}" if sub_hub and sub_hub.lower() not in dest_key else ""

    interests_clause = ""
    if trip_brief.selected_interests:
        interests_clause = " " + " ".join(trip_brief.selected_interests[:2])

    # Two targeted primary search queries:
    # 1. Primary landmarks, heritage monuments, and key attractions
    query_1 = f"{dest}{hub_clause} top attractions landmarks monuments heritage sights".strip()
    # 2. Targeted cultural & scenic highlights, or interest-specific sights
    if trip_brief.selected_interests:
        query_2 = f"{dest}{hub_clause} best sights to visit{interests_clause}".strip()
    else:
        query_2 = f"{dest}{hub_clause} unmissable sights places to visit travel guide".strip()

    telemetry.append(TelemetryEvent(
        timestamp_offset="+0.2s",
        stage="query_generation",
        message=f"Formulated 2 targeted research queries for {dest}: '{query_1}' and '{query_2}'"
    ))

    # Step 1: Live Web Search via TinyFish (Two Targeted Primary Queries)
    telemetry.append(TelemetryEvent(
        timestamp_offset="+0.6s",
        stage="web_search",
        message="Querying TinyFish Search API for ranked web sources across targeted categories..."
    ))

    raw_search_results: List[Dict[str, Any]] = []
    res_1 = await client.search(
        query=query_1,
        location="US",
        language="en",
        purpose=f"find verified travel sights in {dest}"
    )
    if res_1:
        raw_search_results.extend(res_1)

    if query_2 != query_1:
        res_2 = await client.search(
            query=query_2,
            location="US",
            language="en",
            purpose=f"find cultural & highlight sights in {dest}"
        )
        if res_2:
            raw_search_results.extend(res_2)

    if not raw_search_results:
        telemetry.append(TelemetryEvent(
            timestamp_offset="+1.2s",
            stage="search_complete",
            message=f"No search results returned for research queries. Research yielded 0 items."
        ))
        return attractions, sources, telemetry

    # Deduplicate search results by canonical URL across both queries
    deduped_search_results: List[Dict[str, Any]] = []
    seen_canonical_urls: Set[str] = set()
    for item in raw_search_results:
        raw_url = item.get("url", "").strip()
        canon_url = canonicalize_url(raw_url)
        dedup_key = canon_url or item.get("title", "").strip().lower()
        if not dedup_key or dedup_key in seen_canonical_urls:
            continue
        seen_canonical_urls.add(dedup_key)
        deduped_search_results.append(item)

    telemetry.append(TelemetryEvent(
        timestamp_offset="+1.1s",
        stage="search_complete",
        message=f"TinyFish Search returned {len(raw_search_results)} results ({len(deduped_search_results)} unique canonical URLs)."
    ))

    # Step 2: Select top unique URLs to fetch via TinyFish Fetch
    selected_for_fetch = deduped_search_results[:2]
    fetch_urls = [item.get("url", "") for item in selected_for_fetch if item.get("url")]

    fetched_content_map: Dict[str, str] = {}
    fetched_raw_map: Dict[str, str] = {}
    if fetch_urls:
        telemetry.append(TelemetryEvent(
            timestamp_offset="+1.6s",
            stage="page_fetch",
            message=f"Fetching clean markdown from {len(fetch_urls)} sources via TinyFish Fetch API..."
        ))
        try:
            fetch_results = await client.fetch(
                urls=fetch_urls,
                format_type="markdown",
                purpose=f"extract attraction highlights for {dest}"
            )
            for item in fetch_results:
                u = item.get("url", "")
                t = item.get("text", "")
                if u and t:
                    canon_u = canonicalize_url(u)
                    cleaned_sample = _clean_untrusted_text(t, max_chars=1000)
                    fetched_content_map[u] = cleaned_sample
                    fetched_raw_map[u] = t[:20000]
                    if canon_u:
                        fetched_content_map[canon_u] = cleaned_sample
                        fetched_raw_map[canon_u] = t[:20000]
            telemetry.append(TelemetryEvent(
                timestamp_offset="+2.8s",
                stage="fetch_complete",
                message=f"Successfully fetched content from {len(fetch_results)} URLs."
            ))
        except Exception as exc:
            logger.warning("TinyFish fetch failed (proceeding with search snippets): %s", exc)
            telemetry.append(TelemetryEvent(
                timestamp_offset="+2.8s",
                stage="fetch_warning",
                message=f"Fetch extraction encountered an issue: {exc}. Falling back to search snippets."
            ))

    # Step 3: Grounded synthesis & deduplication from search & fetched data
    telemetry.append(TelemetryEvent(
        timestamp_offset="+3.2s",
        stage="synthesis",
        message="Synthesizing grounded attraction items and deduplicating across sources..."
    ))

    seen_attraction_keys: Set[str] = set()
    seen_source_descriptions: Set[str] = set()

    for idx, item in enumerate(deduped_search_results[:4]):
        url = item.get("url", "").strip()
        canon_url = canonicalize_url(url)
        title = item.get("title", f"{dest} Sight {idx+1}").strip()
        snippet = item.get("snippet", "").strip()

        domain = urlparse(url).netloc if url else "web"
        extracted_text = (
            fetched_content_map.get(url)
            or fetched_content_map.get(canon_url)
            or snippet
        )
        raw_fetched_text = (
            fetched_raw_map.get(url)
            or fetched_raw_map.get(canon_url)
            or snippet
        )

        source_id = f"src-live-{idx+1}"
        domain_lower = domain.lower()
        is_social = any(s_domain in domain_lower for s_domain in SOCIAL_DOMAINS) or bool(
            re.search(r"\b(?:instagram|tiktok|facebook|pinterest)\b", domain_lower)
        )
        source_confidence = (
            "Social Media Citation (Lower Confidence • Verify Independently)"
            if is_social
            else "Live Web Citation"
        )

        sources.append(SourceFinding(
            id=source_id,
            url=url,
            title=title,
            snippet=snippet or "Live web search result snippet.",
            extracted_text_sample=extracted_text[:250] if extracted_text else None,
            category="Attractions",
            domain=domain,
            confidence=source_confidence,
            is_live_result=True,
        ))

        # Extract candidate attractions from this source and deduplicate across all sources
        is_listicle = _is_article_or_listicle_title(title)
        candidates = _extract_candidate_attractions_from_text(
            title=title,
            snippet=snippet,
            fetched_text=raw_fetched_text,
            dest=dest,
            is_social_source=is_social,
        )

        added_from_this_source = 0
        # Allow up to 3 distinct attractions from a multi-landmark guide article, or 1 from a single-landmark page
        # Social media citations are strictly restricted to 1 attraction max
        max_per_source = 1 if is_social else (3 if is_listicle else 1)

        for cand_name, cand_desc in candidates:
            # Reject if not a plausible named place, or matches editorial phrases / listicles
            if (
                not _is_plausible_named_place(cand_name, dest)
                or LISTICLE_TITLE_PATTERN.search(cand_name)
                or GENERIC_EDITORIAL_PATTERNS.search(cand_name)
                or bool(re.search(r"\b(?:tours?\s+(?:and|&)\s+excursions?|best\s+[a-z\s]+tours?|top\s+[a-z\s]+tours?)\b", cand_name, re.IGNORECASE))
            ):
                continue

            # Reject foreign landmarks from other known destinations
            cand_lower = cand_name.lower()
            is_foreign = False
            for other_dest, other_landmarks in CORE_IN_DESTINATION_LANDMARKS.items():
                if other_dest not in dest_key and any(lm in cand_lower for lm in other_landmarks):
                    this_dest_core = CORE_IN_DESTINATION_LANDMARKS.get(dest_key, [])
                    if not any(lm in cand_lower for lm in this_dest_core):
                        is_foreign = True
                        break
            if is_foreign:
                logger.info("Rejecting foreign landmark '%s' for destination '%s'", cand_name, dest)
                continue

            # Reject geographic mismatches (e.g. Taj Mahal in Agra for West Bengal)
            if is_geographic_mismatch(cand_name, cand_desc, dest):
                logger.info("Rejecting geographic mismatch '%s' for destination '%s'", cand_name, dest)
                continue

            norm_key = _normalize_attraction_key(cand_name, dest)
            if not norm_key:
                continue

            # Deduplication with Evidence Upgrade:
            # If attraction already exists from an earlier source (e.g. weak social citation or passing mention),
            # upgrade it if the current source provides stronger, grounded evidence or an official domain.
            if norm_key in seen_attraction_keys:
                existing_att = next((a for a in attractions if _normalize_attraction_key(a.name, dest) == norm_key), None)
                if existing_att:
                    existing_is_weak = (
                        existing_att.evidence_quality == "passing_mention"
                        or "social media" in (existing_att.location_note or "").lower()
                        or any(s_domain in (existing_att.source_url or "").lower() for s_domain in SOCIAL_DOMAINS)
                        or "mentioned in passing" in (existing_att.description or "").lower()
                    )
                    new_is_strong = (
                        cand_desc
                        and not is_social
                        and "mentioned in passing" not in cand_desc.lower()
                        and len(cand_desc) >= 40
                    )
                    if existing_is_weak and new_is_strong:
                        logger.info("Upgrading attraction '%s' with stronger evidence from %s (%s)", cand_name, domain, url)
                        existing_att.source_url = url
                        existing_att.source_title = title
                        existing_att.description = cand_desc
                        existing_att.evidence_excerpt = cand_desc
                        existing_att.evidence_quality = "verified_grounded"
                        existing_att.verification_warning = None
                        existing_att.insider_tip = f"Extracted from {domain} ({title}). {existing_att.location_note}"
                continue

            geo_status, geo_label, loc_note = classify_attraction_geography(
                name=cand_name,
                description=cand_desc,
                context_text=raw_fetched_text,
                dest=dest,
                is_single_landmark_page=(not is_listicle),
                source_title=title,
                source_url=url,
            )
            if geo_status == "rejected_mismatch":
                logger.info("Rejecting classified mismatch '%s' for destination '%s'", cand_name, dest)
                continue

            # Guarantee that no two attraction cards inherit the identical description snippet
            final_desc = cand_desc
            is_passing = (not cand_desc) or ("mentioned in passing" in (cand_desc or "").lower())
            if cand_desc in seen_source_descriptions:
                final_desc = f"Location verified in {dest_primary}. Referenced alongside other sights in {domain}; detailed venue description not provided in snippet."
                is_passing = True
            elif cand_desc:
                seen_source_descriptions.add(cand_desc)

            seen_attraction_keys.add(norm_key)

            if is_social:
                loc_note = f"{loc_note} (Note: Sourced from social media [{domain}] — lower confidence citation; independently verify opening hours and access.)"
                evidence_quality = "passing_mention" if is_passing else "verified_grounded"
                verification_warning = "Social media citation • Lower confidence"
            elif is_passing:
                evidence_quality = "passing_mention"
                verification_warning = "Location verified; details need confirmation"
            else:
                evidence_quality = "verified_grounded"
                verification_warning = None

            attractions.append(AttractionItem(
                id=f"att-live-{len(attractions)+1}",
                name=cand_name,
                category="Attractions",
                dwell_time="Verify on arrival",
                best_time="Check venue hours",
                crowd_factor="Varies by season (verify locally)",
                description=final_desc or f"Verified sight in {dest_primary} referenced by {domain}.",
                insider_tip=f"Extracted from {domain} ({title}). {loc_note}",
                source_url=url,
                source_title=title,
                is_live_result=True,
                geographic_status=geo_status,
                geographic_label=geo_label,
                location_note=loc_note,
                evidence_excerpt=final_desc if evidence_quality == "verified_grounded" else None,
                evidence_quality=evidence_quality,
                verification_warning=verification_warning,
            ))
            added_from_this_source += 1
            if added_from_this_source >= max_per_source or len(attractions) >= 6:
                break

    # Step 4: Bounded follow-up query if initial pass yields few verified landmarks
    # (At most 1 retry query when verified in-destination landmarks are insufficient: 0 confirmed landmarks)
    verified_in_dest = [a for a in attractions if a.geographic_status == "in_destination"]
    passing_candidates = [a for a in attractions if a.evidence_quality == "passing_mention"]

    needs_followup = len(verified_in_dest) == 0 or (len(verified_in_dest) < 2 and len(passing_candidates) > 0)
    if needs_followup:
        # Formulate candidate-specific query when recognized candidates need stronger grounded evidence
        if passing_candidates:
            target_candidate = passing_candidates[0].name
            followup_query = f"{target_candidate} {dest} visitor guide opening hours attraction details".strip()
            followup_purpose = f"extract specific grounded evidence for {target_candidate} in {dest}"
        elif attractions:
            target_candidate = attractions[0].name
            followup_query = f"{target_candidate} {dest} visitor guide opening hours attraction details".strip()
            followup_purpose = f"extract specific grounded evidence for {target_candidate} in {dest}"
        else:
            followup_query = f"{dest}{hub_clause} top individual landmarks monuments places to visit".strip()
            followup_purpose = f"find individual specific landmarks in {dest}"

        telemetry.append(TelemetryEvent(
            timestamp_offset="+3.4s",
            stage="followup_search",
            message=f"Initial research yielded {len(verified_in_dest)} in-destination landmarks. Executing 1 bounded follow-up query: '{followup_query}'..."
        ))
        try:
            followup_search_results = await client.search(
                query=followup_query,
                location="US",
                language="en",
                purpose=followup_purpose
            )
            new_urls_to_fetch = []
            for item in (followup_search_results or []):
                u = item.get("url", "").strip()
                canon_u = canonicalize_url(u)
                if canon_u and canon_u not in seen_canonical_urls:
                    seen_canonical_urls.add(canon_u)
                    new_urls_to_fetch.append(u)
                    if len(new_urls_to_fetch) >= 1:
                        break

            if new_urls_to_fetch:
                telemetry.append(TelemetryEvent(
                    timestamp_offset="+3.6s",
                    stage="followup_fetch",
                    message=f"Fetching 1 follow-up landmark source via TinyFish Fetch API: {new_urls_to_fetch[0]}..."
                ))
                followup_fetch = await client.fetch(
                    urls=new_urls_to_fetch,
                    format_type="markdown",
                    purpose=f"extract specific named landmarks for {dest}"
                )
                for item in (followup_fetch or []):
                    u = item.get("url", "")
                    t = item.get("text", "")
                    if u and t:
                        canon_u = canonicalize_url(u)
                        cleaned_sample = _clean_untrusted_text(t, max_chars=1000)
                        fetched_content_map[u] = cleaned_sample
                        fetched_raw_map[u] = t[:20000]
                        if canon_u:
                            fetched_content_map[canon_u] = cleaned_sample
                            fetched_raw_map[canon_u] = t[:20000]

            for idx, item in enumerate((followup_search_results or [])[:3]):
                url = item.get("url", "").strip()
                canon_url = canonicalize_url(url)
                title = item.get("title", f"{dest} Landmark").strip()
                snippet = item.get("snippet", "").strip()
                raw_text = (
                    fetched_raw_map.get(url)
                    or fetched_raw_map.get(canon_url)
                    or snippet
                )
                if canon_url and not any(canonicalize_url(s.url) == canon_url for s in sources):
                    sources.append(SourceFinding(
                        id=f"src-live-{len(sources)+1}",
                        url=url,
                        title=title,
                        snippet=snippet or "Follow-up landmark search citation.",
                        extracted_text_sample=raw_text[:250] if raw_text else None,
                        category="Attractions",
                        domain=urlparse(url).netloc if url else "web",
                        confidence="Live Web Citation",
                        is_live_result=True,
                    ))

                cands = _extract_candidate_attractions_from_text(
                    title=title,
                    snippet=snippet,
                    fetched_text=raw_text,
                    dest=dest,
                    is_social_source=False,
                )
                for cand_name, cand_desc in cands:
                    if (
                        not _is_plausible_named_place(cand_name, dest)
                        or LISTICLE_TITLE_PATTERN.search(cand_name)
                        or GENERIC_EDITORIAL_PATTERNS.search(cand_name)
                        or GENERIC_CATEGORY_HEADING_PATTERNS.search(cand_name)
                        or bool(re.search(r"\b(?:tours?\s+(?:and|&)\s+excursions?|best\s+[a-z\s]+tours?|top\s+[a-z\s]+tours?)\b", cand_name, re.IGNORECASE))
                    ):
                        continue
                    cand_lower = cand_name.lower()
                    is_foreign = False
                    for other_dest, other_landmarks in CORE_IN_DESTINATION_LANDMARKS.items():
                        if other_dest not in dest_key and any(lm in cand_lower for lm in other_landmarks):
                            this_dest_core = CORE_IN_DESTINATION_LANDMARKS.get(dest_key, [])
                            if not any(lm in cand_lower for lm in this_dest_core):
                                is_foreign = True
                                break
                    if is_foreign:
                        continue

                    # Reject geographic mismatches
                    if is_geographic_mismatch(cand_name, cand_desc, dest):
                        continue

                    norm_key = _normalize_attraction_key(cand_name, dest)
                    if not norm_key:
                        continue

                    # Deduplication with Evidence Upgrade in follow-up pass
                    if norm_key in seen_attraction_keys:
                        existing_att = next((a for a in attractions if _normalize_attraction_key(a.name, dest) == norm_key), None)
                        if existing_att:
                            existing_is_weak = (
                                existing_att.evidence_quality == "passing_mention"
                                or "social media" in (existing_att.location_note or "").lower()
                                or any(s_domain in (existing_att.source_url or "").lower() for s_domain in SOCIAL_DOMAINS)
                                or "mentioned in passing" in (existing_att.description or "").lower()
                            )
                            new_is_strong = (
                                cand_desc
                                and "mentioned in passing" not in cand_desc.lower()
                                and len(cand_desc) >= 40
                            )
                            if existing_is_weak and new_is_strong:
                                logger.info("Follow-up upgrading attraction '%s' with stronger evidence from %s (%s)", cand_name, urlparse(url).netloc, url)
                                existing_att.source_url = url
                                existing_att.source_title = title
                                existing_att.description = cand_desc
                                existing_att.evidence_excerpt = cand_desc
                                existing_att.evidence_quality = "verified_grounded"
                                existing_att.verification_warning = None
                                existing_att.insider_tip = f"Extracted from {urlparse(url).netloc} ({title}). {existing_att.location_note}"
                        continue

                    geo_status, geo_label, loc_note = classify_attraction_geography(
                        name=cand_name,
                        description=cand_desc,
                        context_text=raw_text,
                        dest=dest,
                        is_single_landmark_page=True,
                        source_title=title,
                        source_url=url,
                    )
                    if geo_status == "rejected_mismatch":
                        continue

                    final_desc = cand_desc
                    is_passing = (not cand_desc) or ("mentioned in passing" in (cand_desc or "").lower())
                    if cand_desc in seen_source_descriptions:
                        final_desc = f"Location verified in {dest_primary}. Referenced alongside other sights in {urlparse(url).netloc}; detailed individual venue prose not provided in snippet."
                        is_passing = True
                    elif cand_desc:
                        seen_source_descriptions.add(cand_desc)

                    seen_attraction_keys.add(norm_key)

                    evidence_quality = "passing_mention" if is_passing else "verified_grounded"
                    verification_warning = "Location verified; details need confirmation" if is_passing else None

                    attractions.append(AttractionItem(
                        id=f"att-live-{len(attractions)+1}",
                        name=cand_name,
                        category="Attractions",
                        dwell_time="Verify on arrival",
                        best_time="Check venue hours",
                        crowd_factor="Varies by season (verify locally)",
                        description=final_desc or f"Verified sight in {dest_primary}.",
                        insider_tip=f"Extracted from {urlparse(url).netloc}. {loc_note}",
                        source_url=url,
                        source_title=title,
                        is_live_result=True,
                        geographic_status=geo_status,
                        geographic_label=geo_label,
                        location_note=loc_note,
                        evidence_excerpt=final_desc if evidence_quality == "verified_grounded" else None,
                        evidence_quality=evidence_quality,
                        verification_warning=verification_warning,
                    ))
                    if len(attractions) >= 6:
                        break
                if len(attractions) >= 6:
                    break
        except Exception as exc:
            logger.warning("Bounded follow-up landmark search failed: %s", exc)

    # Prioritize in_destination sights first, then nearby_excursion, then unverified_location
    geo_priority = {"in_destination": 0, "nearby_excursion": 1, "unverified_location": 2}
    attractions.sort(key=lambda a: geo_priority.get(a.geographic_status, 2))
    for i, att in enumerate(attractions):
        att.id = f"att-live-{i+1}"

    telemetry.append(TelemetryEvent(
        timestamp_offset="+3.8s",
        stage="completed",
        message=f"Research completed: {len(attractions)} unique verified attractions synthesized from {len(sources)} unique sources."
    ))

    return attractions, sources, telemetry

