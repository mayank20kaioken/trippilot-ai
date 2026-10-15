import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from backend import config
from backend.schemas import (
    HealthResponse,
    ScopePreviewRequest,
    ScopePreviewResponse,
    ResearchRequest,
    ResearchResponse,
)
from backend.services.tinyfish import (
    TinyFishClient,
    TinyFishMissingKeyError,
    TinyFishAuthError,
    TinyFishRateLimitError,
    TinyFishTimeoutError,
    TinyFishUpstreamError,
)
from backend.services.research_agent import (
    generate_query_plan,
    research_attractions,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("trippilot.api")

app = FastAPI(
    title="TripPilot AI Research Backend",
    version="0.2.0",
    description="Live AI travel research backend powered by TinyFish Search & Fetch APIs."
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def get_health():
    """Verifies backend availability and TinyFish configuration status."""
    is_configured = bool(config.TINYFISH_API_KEY and len(config.TINYFISH_API_KEY) > 5)
    return HealthResponse(
        status="healthy",
        service="TripPilot AI Backend",
        version="0.2.0",
        tinyfish_configured=is_configured,
        tinyfish_search_endpoint=config.TINYFISH_SEARCH_URL,
        tinyfish_fetch_endpoint=config.TINYFISH_FETCH_URL,
    )


@app.post("/api/trips/preview", response_model=ScopePreviewResponse)
async def preview_trip_scope(request: ScopePreviewRequest):
    """
    Validates trip brief details and returns planned queries per category.
    CRITICAL: Does NOT initiate any external web search or consume API quota.
    """
    query_plans = generate_query_plan(
        trip_brief=request.trip_brief,
        selected_categories=request.selected_categories
    )

    total_queries = sum(len(plan.planned_queries) for plan in query_plans)

    return ScopePreviewResponse(
        status="preview_ready",
        destination=request.trip_brief.destination,
        requires_confirmation=True,
        total_categories=len(query_plans),
        estimated_total_queries=total_queries,
        category_plans=query_plans,
        message=(
            f"Scope preview for {request.trip_brief.destination} prepared. "
            "Zero external API calls made. User confirmation required before launching research."
        )
    )


@app.post("/api/trips/research", response_model=ResearchResponse)
async def execute_trip_research(request: ResearchRequest):
    """
    Executes live web research only after explicit confirmation (confirmed=true).
    Uses TinyFish Search & Fetch APIs to retrieve and verify factual sources.
    Currently initiates the attractions category for the first end-to-end integration.
    """
    if not request.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Research execution requires explicit user authorization (confirmed=true)."
        )

    client = TinyFishClient()

    try:
        # Run end-to-end research on attractions
        attractions, sources, telemetry = await research_attractions(
            trip_brief=request.trip_brief,
            client=client
        )

        is_empty = len(attractions) == 0 and len(sources) == 0

        return ResearchResponse(
            status="empty" if is_empty else "completed",
            is_demo_content=False,
            destination=request.trip_brief.destination,
            duration_days=request.trip_brief.duration_days,
            confirmed=True,
            active_categories=request.selected_categories,
            attractions=attractions,
            sources=sources,
            telemetry_logs=telemetry,
            error_message=(
                f"TinyFish Search returned 0 verifiable attractions or citations for '{request.trip_brief.destination}'."
                if is_empty
                else None
            ),
        )

    except TinyFishMissingKeyError as exc:
        logger.error("Missing TinyFish API key: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "TINYFISH_API_KEY is not configured on the backend server. "
                "Please add TINYFISH_API_KEY to backend/.env and restart the service."
            )
        )
    except TinyFishAuthError as exc:
        logger.error("TinyFish Auth failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc)
        )
    except TinyFishRateLimitError as exc:
        logger.warning("TinyFish Rate limit: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc)
        )
    except TinyFishTimeoutError as exc:
        logger.error("TinyFish timeout: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Research upstream timed out: {exc}"
        )
    except TinyFishUpstreamError as exc:
        logger.error("TinyFish upstream error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream research service error: {exc}"
        )
    except Exception as exc:
        logger.exception("Unexpected error during research: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected research engine exception: {exc}"
        )
