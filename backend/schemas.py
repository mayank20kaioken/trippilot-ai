import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "twelve": 12, "fourteen": 14
}


class TripBrief(BaseModel):
    destination: str = Field(..., min_length=1, max_length=120, description="Target travel destination")
    duration_days: int = Field(default=5, ge=1, le=30, description="Trip duration in days")
    budget_tier: str = Field(default="Balanced Explorer", description="Budget tier preference")
    group_size: str = Field(default="Romantic Couple", description="Group composition")
    transport_preference: str = Field(default="Regional Transit (Estimate • Pending Verification)", description="Preferred transit mode")
    selected_interests: List[str] = Field(default_factory=list, description="Travel passions and focus areas")
    prompt: Optional[str] = Field(default=None, description="Original natural-language user prompt")
    mode: str = Field(default="quick", description="Planning mode: 'quick' or 'personalised'")

    @field_validator("destination")
    @classmethod
    def clean_destination(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Destination must not be empty.")
        cleaned = re.sub(r"^(?:the|a|an)\s+", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"^(?:next|this|upcoming|coming)\s+", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"\s+\b(?:next|this|upcoming|coming)\s+(?:weekend|week|month|year|days?|nights?)$", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"\s+\b(?:next|this|upcoming|coming)$", "", cleaned, flags=re.IGNORECASE).strip()
        if not cleaned:
            raise ValueError("Destination must not be empty.")
        return cleaned

    @model_validator(mode="after")
    def sync_duration_from_prompt(self):
        if self.prompt:
            p = self.prompt.strip()
            num_m = re.search(r"\b(\d{1,2})[-\s]*(?:days?|nights?|d\b)", p, re.IGNORECASE)
            word_m = re.search(r"\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen)[-\s]+(?:days?|nights?)\b", p, re.IGNORECASE)
            if num_m:
                d = int(num_m.group(1))
                if 1 <= d <= 30:
                    self.duration_days = d
            elif word_m:
                d = WORD_NUMBERS.get(word_m.group(1).lower())
                if d and 1 <= d <= 30:
                    self.duration_days = d
            elif re.search(r"\ba\s+week\b|\bone\s+week\b|\b1\s+week\b|\b(?:next|this|upcoming|coming)\s+week\b", p, re.IGNORECASE):
                self.duration_days = 7
            elif re.search(r"\btwo\s+weeks?\b|\b2\s+weeks?\b", p, re.IGNORECASE):
                self.duration_days = 14
            elif re.search(r"\b(?:next|this|upcoming|coming)?\s*weekend\b", p, re.IGNORECASE):
                self.duration_days = 3
        return self


class CategoryQueryPlan(BaseModel):
    category_id: str
    category_name: str
    planned_queries: List[str]
    estimated_sources: int
    description: str


class ScopePreviewRequest(BaseModel):
    trip_brief: TripBrief
    selected_categories: List[str] = Field(
        default_factory=lambda: ["attractions"],
        description="Categories chosen for research"
    )

    @field_validator("selected_categories")
    @classmethod
    def validate_categories(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one research category must be selected.")
        return v


class ScopePreviewResponse(BaseModel):
    status: str = "preview_ready"
    destination: str
    requires_confirmation: bool = True
    total_categories: int
    estimated_total_queries: int
    category_plans: List[CategoryQueryPlan]
    message: str = (
        "Research preview generated successfully. "
        "No external research calls were made. Explicit user confirmation is required before research execution."
    )


class ResearchRequest(BaseModel):
    trip_brief: TripBrief
    selected_categories: List[str] = Field(
        default_factory=lambda: ["attractions"],
        description="Categories to research"
    )
    confirmed: bool = Field(
        ...,
        description="Explicit user confirmation to initiate live web research"
    )

    @field_validator("confirmed")
    @classmethod
    def must_be_confirmed(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Research execution requires explicit user confirmation (confirmed=true).")
        return v


class SourceFinding(BaseModel):
    id: str
    url: str
    title: str
    snippet: str
    extracted_text_sample: Optional[str] = None
    category: str
    domain: str
    confidence: str = "Live Web Citation"
    is_live_result: bool = True


class AttractionItem(BaseModel):
    id: str
    name: str
    category: str = "Attractions"
    dwell_time: str = "Unknown"
    best_time: str = "Morning / Check site"
    crowd_factor: str = "Unknown (Check live advisories)"
    description: str
    insider_tip: str
    source_url: str
    source_title: str
    is_live_result: bool = True
    geographic_status: str = Field(
        default="in_destination",
        description="Conservative geographic classification: 'in_destination', 'nearby_excursion', or 'unverified_location'"
    )
    geographic_label: str = Field(
        default="In Destination",
        description="Human-readable badge label for geographic relevance"
    )
    location_note: str = Field(
        default="Verified within destination search scope.",
        description="Explanation of geographic relevance or required distance/travel-time check"
    )
    evidence_excerpt: Optional[str] = Field(
        default=None,
        description="Focused attraction-specific evidence snippet extracted from the source"
    )
    evidence_quality: str = Field(
        default="verified_grounded",
        description="Evidence confidence: 'verified_grounded', 'passing_mention', or 'insufficient_detail'"
    )
    verification_warning: Optional[str] = Field(
        default=None,
        description="Clear advisory warning when evidence is weak or details need confirmation"
    )


class TelemetryEvent(BaseModel):
    timestamp_offset: str
    stage: str
    message: str


class ResearchResponse(BaseModel):
    status: str = "completed"
    is_demo_content: bool = False
    destination: str
    duration_days: int
    confirmed: bool = True
    active_categories: List[str]
    attractions: List[AttractionItem] = Field(default_factory=list)
    sources: List[SourceFinding] = Field(default_factory=list)
    telemetry_logs: List[TelemetryEvent] = Field(default_factory=list)
    error_message: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "TripPilot AI Backend"
    version: str = "0.2.0"
    tinyfish_configured: bool
    tinyfish_search_endpoint: str
    tinyfish_fetch_endpoint: str
