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
    "complex", "institute", "niwas", "setu", "tomb", "minar", "gate", "masjid",
    "chowk", "qila", "bhavan", "mandir", "gurudwara", "memorial", "stupa", "chorten",
    "fortress", "tower", "plaza", "square", "village", "quarter", "alley", "center",
    "centre", "planetarium", "aquarium", "zoo", "hall", "la"
}

# Regex to extract capitalized landmark names ending with a recognized place/monument noun
NAMED_LANDMARK_PATTERN = re.compile(
    r"\b((?:(?!Visiting\b|Visit\b|Exploring\b|Explore\b|Discovering\b|Discover\b|Seeing\b|See\b|Touring\b|Tour\b|Walk\b|Include\b|Includes\b|Hour\b|Hours\b|Day\b|Days\b|Private\b|Guided\b|Half\b|Full\b|Watch\b|Photo\b|Reel\b|Video\b)[A-Z][a-zA-Z'’-]+(?:\s+(?:of|the|de|la|di))?\s+){1,3}"
    r"(?:Temple|Fort|Palace|Ghat|Jhula|Ashram|Waterfall|Falls|Valley|Pass|Lake|Tso|Monastery|Gompa|Shrine|Pavilion|Garden|Gardens|Museum|Market|Bazaar|Park|Caves|Cave|Peak|Point|Sanctuary|Springs|Bridge|Cathedral|Mosque|Church|Stepwell|Baori|Haveli|Observatory|Mantar|Mahal|Ridge|Lodge|Theatre|Railway|Road|Street|Promenade|Hill|Hills|Complex|Institute|Niwas|Setu|Tomb|Minar|Gate|Masjid|Chowk|Qila|Bhavan|Mandir|Gurudwara|Memorial|Stupa|Chorten|Fortress|Tower|Plaza|Square|Hall|La))\b"
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
    # Remove destination name suffix if attached
    if dest:
        dest_primary = dest.split(",")[0].strip().lower()
        if dest_primary:
            s = re.sub(rf"\b(?:in|at|near|of)?\s*{re.escape(dest_primary)}\b", " ", s)
    s = re.sub(r"^(?:the|a|an)\s+", "", s)
    # Normalize common synonymous tokens
    s = re.sub(r"\bhidimba\b", "hadimba", s)
    s = re.sub(r"\bdevi\s+temple\b", "temple", s)
    s = re.sub(r"\blakshman\b", "laxman", s)
    s = re.sub(r"\bamer\b", "amber", s)
    s = re.sub(r"\bfort\s+(?:and|&)\s+palace\b", "fort", s)
    s = re.sub(r"\bpalace\s+(?:and|&)\s+fort\b", "fort", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s


def normalize_attraction_display_name(name: str) -> str:
    """
    Cleans leading numbered bullets, trailing site branding, and formats title case for display.
    e.g. '1. laxman jhula - tripadvisor' -> 'Laxman Jhula'
    """
    if not name:
        return ""
    s = re.sub(r"^\d+[\.\)\-:]\s*", "", name.strip())
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
    h = re.sub(r"\*+", "", h).strip()
    h = re.sub(r"^(?:day|step|stop|part)\s+\d+[\.\:\-]\s*", "", h, flags=re.IGNORECASE).strip()
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

    # Reject common editorial prefixes like "The Game Plans", "The Options", "Day 1", etc.
    if re.search(r"^(?:the\s+)?(?:game\s+plans?|day\s+plans?|action\s+plans?|trip\s+plans?|options?|routes?|itinerary|overview|summary|introduction|conclusion|budget|highlights?)\b", name_lower):
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
        "famous", "local", "traditional", "modern", "specialty"
    }
    capitalized_tokens = [w for w in name_clean.split() if w and w[0].isupper()]
    if len(capitalized_tokens) >= 2:
        if not any(t in non_place_tokens for t in tokens):
            return True

    return False


def _extract_local_evidence(landmark_name: str, text: str, fallback_snippet: str = "") -> str:
    """
    Extracts a focused local context snippet (40–300 chars) specifically around
    the landmark mention in fetched markdown or page text.
    Skips TripAdvisor/scraped metadata (star ratings, review counts, rankings,
    category filters, navigation links, and ticketing buttons) before capturing
    the true descriptive sentence.
    """
    if not text or not landmark_name:
        return fallback_snippet or ""

    name_lower = landmark_name.lower().strip()
    text_lower = text.lower()

    idx = text_lower.find(name_lower)
    if idx == -1:
        # Search for key words of landmark name
        significant_words = [w for w in name_lower.split() if w not in {"the", "a", "an", "of", "in", "temple", "fort", "palace", "monastery", "lake"}]
        for word in significant_words:
            if len(word) >= 4:
                idx = text_lower.find(word)
                if idx != -1:
                    break

    if idx == -1:
        return fallback_snippet or ""

    # Look ahead from the mention up to 2500 chars to find substantive descriptive prose
    lookahead = text[idx + len(name_lower):idx + len(name_lower) + 2500]
    lines = [line.strip() for line in lookahead.splitlines() if line.strip()]

    # Scraped metadata rejection regexes
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

    for line in lines:
        clean_line = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", line)
        clean_line = re.sub(r"^[\s#*\-:—–|]+", "", clean_line).strip()
        clean_line = re.sub(r"\s+", " ", clean_line)

        # Skip metadata, listicles, category headings, and editorial lines
        if (
            len(clean_line) < 30
            or metadata_patterns.search(clean_line)
            or LISTICLE_TITLE_PATTERN.search(clean_line)
            or GENERIC_EDITORIAL_PATTERNS.search(clean_line)
            or GENERIC_CATEGORY_HEADING_PATTERNS.search(clean_line)
        ):
            continue

        # Extract first complete or clean sentence
        sentence_match = re.search(r"^(.{35,280}?[\.\!\?])(?:\s|$)", clean_line)
        if sentence_match:
            candidate_sentence = sentence_match.group(1).strip()
            if not metadata_patterns.search(candidate_sentence):
                return candidate_sentence
        elif len(clean_line) <= 280:
            return clean_line
        else:
            return clean_line[:280].rsplit(" ", 1)[0] + "."

    # Fallback to text before mention if lookahead only had metadata
    start = max(0, idx - 100)
    end = min(len(text), idx + len(name_lower) + 150)
    window = text[start:end].replace("\n", " ")
    window = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", window)
    window = re.sub(r"\s+", " ", window).strip()
    if len(window) >= 40 and not metadata_patterns.search(window):
        return window

    return fallback_snippet or ""


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
}

# Known core municipal landmarks clearly inside the destination
CORE_IN_DESTINATION_LANDMARKS: Dict[str, List[str]] = {
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
}

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
            desc = _extract_local_evidence(norm_title, combined_text, snippet) or f"Verified landmark in {dest}."
            _add_candidate(norm_title[:60], desc)

    # 2. Parse markdown headings, numbered list items, bullets, and markdown links
    for match in HEADING_OR_LIST_PATTERN.finditer(combined_text):
        cand_name = _clean_landmark_heading(match.group(1), dest)
        if cand_name and _is_plausible_named_place(cand_name, dest):
            desc = _extract_local_evidence(cand_name, combined_text, snippet)
            _add_candidate(cand_name, desc)

    # 3. Extract explicit named landmarks (e.g. "The Ridge", "Laxman Jhula", "Amber Fort", "Mall Road")
    for match in NAMED_LANDMARK_PATTERN.finditer(combined_text):
        landmark = match.group(1).strip()
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
                desc = _extract_local_evidence(norm_landmark, combined_text, snippet)
                _add_candidate(norm_landmark, desc)

    # 4. Extract verified core destination landmarks explicitly mentioned in text / snippets
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
                    local_ev = _extract_local_evidence(lm_key, combined_text, snippet_clean)
                    desc = local_ev or snippet or f"Verified landmark in {dest}."
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
) -> Tuple[str, str, str]:
    """
    Conservative destination-relevance check that distinguishes:
    1. 'in_destination': Attractions clearly inside the requested destination
    2. 'nearby_excursion': Nearby excursions requiring an explicit distance or travel-time check
    3. 'unverified_location': Attractions that cannot be geographically verified from retrieved text

    Never invents coordinates, distances, travel times, or administrative boundaries.
    """
    dest_primary = (dest.split(",")[0].strip() if dest else "Destination")
    dest_key = dest_primary.lower()
    name_lower = (name or "").lower().strip()
    desc_lower = (description or "").lower()

    # Extract a local window around the attraction mention in context_text
    local_window = desc_lower
    if context_text and name_lower:
        idx = context_text.lower().find(name_lower)
        if idx != -1:
            start = max(0, idx - 120)
            end = min(len(context_text), idx + len(name_lower) + 180)
            local_window = f"{desc_lower} {context_text[start:end].lower()}"

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
        if k in dest_key:
            excursion_keywords = kw_list
            break

    for kw in excursion_keywords:
        if kw in name_lower or re.search(rf"\b{re.escape(kw)}\b", local_window):
            # If the landmark itself is a known core in-destination landmark, only mark excursion if kw is in name_lower
            core_list = next((v for k, v in CORE_IN_DESTINATION_LANDMARKS.items() if k in dest_key), [])
            is_core = any(c in name_lower for c in core_list)
            if not is_core or kw in name_lower:
                return (
                    "nearby_excursion",
                    f"Nearby Excursion • Verify Distance from {dest_primary}",
                    f"Referenced as a regional excursion or outside central {dest_primary}. Exact road distance and travel time are not verified in this crawl — check the linked source before scheduling."
                )

    # 3. Check for explicit excursion / distance phrases in description or local context window
    if EXCURSION_CONTEXT_PATTERN.search(local_window):
        return (
            "nearby_excursion",
            f"Nearby Excursion • Verify Distance from {dest_primary}",
            f"Source text indicates this sight requires travel from central {dest_primary}. Verify exact distance, transit route, and travel time via the linked source."
        )

    # 4. Check for positive in-destination evidence
    core_landmarks = next((v for k, v in CORE_IN_DESTINATION_LANDMARKS.items() if k in dest_key), [])
    if any(c in name_lower for c in core_landmarks):
        return (
            "in_destination",
            f"In {dest_primary}",
            f"Verified landmark within {dest_primary}. Exact coordinates and opening hours are not independently verified — check source link."
        )

    explicit_in_dest = re.search(
        rf"\b(?:in|across|at|within|central|northern|southern|eastern|western|old|downtown|heart\s+of|located\s+in|situated\s+in|monastery\s+in|temple\s+in|fort\s+in|palace\s+in|lake\s+in|pass\s+in|attraction\s+in|sights?\s+in|visit\s+in|guide\s+to)\s+(?:[a-z]+\s+){{0,3}}{re.escape(dest_key)}\b"
        rf"|{re.escape(dest_key)}\s+(?:region|district|valley|state|territory)\b"
        rf"|,\s*{re.escape(dest_key)}\b",
        f"{name_lower} {local_window}",
        re.IGNORECASE,
    )
    if explicit_in_dest or (is_single_landmark_page and dest_key in f"{name_lower} {local_window}"):
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
    dest = trip_brief.destination

    for cat_id in selected_categories:
        if cat_id == "attractions":
            interests_hint = (
                " " + " ".join(trip_brief.selected_interests[:2])
                if trip_brief.selected_interests
                else ""
            )
            queries = [
                f"{dest} top attractions best sights crowd free timing{interests_hint}",
                f"{dest} unmissable cultural sanctuaries travel guide"
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

    dest = trip_brief.destination
    interests_clause = ""
    if trip_brief.selected_interests:
        interests_clause = " " + " ".join(trip_brief.selected_interests[:2])

    query = f"{dest} top attractions landmarks monuments heritage sights{interests_clause}".strip()

    telemetry.append(TelemetryEvent(
        timestamp_offset="+0.2s",
        stage="query_generation",
        message=f"Formulated search query for {dest}: '{query}'"
    ))

    # Step 1: Live Web Search via TinyFish
    telemetry.append(TelemetryEvent(
        timestamp_offset="+0.6s",
        stage="web_search",
        message="Querying TinyFish Search API for ranked web sources..."
    ))

    raw_search_results = await client.search(
        query=query,
        location="US",
        language="en",
        purpose=f"find verified travel sights in {dest}"
    )

    if not raw_search_results:
        telemetry.append(TelemetryEvent(
            timestamp_offset="+1.2s",
            stage="search_complete",
            message=f"No search results returned for '{query}'. Research yielded 0 items."
        ))
        return attractions, sources, telemetry

    # Deduplicate search results by canonical URL
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
        max_per_source = 3 if is_listicle else 1

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
            dest_key = dest.split(",")[0].strip().lower()
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

            norm_key = _normalize_attraction_key(cand_name, dest)
            if not norm_key or norm_key in seen_attraction_keys:
                continue
            seen_attraction_keys.add(norm_key)

            geo_status, geo_label, loc_note = classify_attraction_geography(
                name=cand_name,
                description=cand_desc,
                context_text=raw_fetched_text,
                dest=dest,
                is_single_landmark_page=(not is_listicle),
            )

            if is_social:
                loc_note = f"{loc_note} (Note: Sourced from social media [{domain}] — lower confidence citation; independently verify opening hours and access.)"

            attractions.append(AttractionItem(
                id=f"att-live-{len(attractions)+1}",
                name=cand_name,
                category="Attractions",
                dwell_time="Verify on arrival",
                best_time="Check venue hours",
                crowd_factor="Varies by season (verify locally)",
                description=cand_desc or f"Verified sight in {dest} referenced by {domain}.",
                insider_tip=f"Extracted from {domain} ({title}). {loc_note}",
                source_url=url,
                source_title=title,
                is_live_result=True,
                geographic_status=geo_status,
                geographic_label=geo_label,
                location_note=loc_note,
            ))
            added_from_this_source += 1
            if added_from_this_source >= max_per_source or len(attractions) >= 6:
                break

    # Step 4: Bounded follow-up query if initial pass yields few verified landmarks (0 in-destination verified landmarks)
    verified_in_dest = [a for a in attractions if a.geographic_status == "in_destination"]
    if len(verified_in_dest) == 0:
        followup_query = f"{dest} top individual landmarks monuments places to visit"
        telemetry.append(TelemetryEvent(
            timestamp_offset="+3.4s",
            stage="followup_search",
            message=f"Initial research yielded {len(attractions)} landmarks. Executing bounded follow-up query: '{followup_query}'..."
        ))
        try:
            followup_search_results = await client.search(
                query=followup_query,
                location="US",
                language="en",
                purpose=f"find individual specific landmarks in {dest}"
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
                    dest_key = dest.split(",")[0].strip().lower()
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
                    norm_key = _normalize_attraction_key(cand_name, dest)
                    if not norm_key or norm_key in seen_attraction_keys:
                        continue
                    seen_attraction_keys.add(norm_key)

                    geo_status, geo_label, loc_note = classify_attraction_geography(
                        name=cand_name,
                        description=cand_desc,
                        context_text=raw_text,
                        dest=dest,
                        is_single_landmark_page=True,
                    )
                    attractions.append(AttractionItem(
                        id=f"att-live-{len(attractions)+1}",
                        name=cand_name,
                        category="Attractions",
                        dwell_time="Verify on arrival",
                        best_time="Check venue hours",
                        crowd_factor="Varies by season (verify locally)",
                        description=cand_desc or f"Verified sight in {dest}.",
                        insider_tip=f"Extracted from {urlparse(url).netloc}. {loc_note}",
                        source_url=url,
                        source_title=title,
                        is_live_result=True,
                        geographic_status=geo_status,
                        geographic_label=geo_label,
                        location_note=loc_note,
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

