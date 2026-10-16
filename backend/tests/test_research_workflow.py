import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.services.tinyfish import TinyFishClient
from backend.services.research_agent import research_attractions
from backend.schemas import TripBrief


@pytest.mark.asyncio
async def test_research_attractions_workflow_mocked(monkeypatch):
    """
    Verifies the end-to-end Search-to-Fetch attractions research workflow:
    1. Search called -> returns top web pages
    2. Fetch called on top URLs -> extracts markdown
    3. Structured AttractionItem and SourceFinding models produced
    4. Telemetry events logged
    """
    trip_brief = TripBrief(
        destination="Kyoto, Japan",
        duration_days=5,
        budget_tier="Balanced Explorer",
        group_size="Couple",
        selected_interests=["Zen Temples", "Matcha"]
    )

    client = TinyFishClient(api_key="mock_test_key")

    # Mock search
    async def mock_search(query, location="US", language="en", purpose=None):
        return [
            {
                "title": "Fushimi Inari Shrine & Mountain Path - Kyoto Guide",
                "url": "https://www.japan-guide.com/e/e3915.html",
                "snippet": "Famous for its thousands of vermilion torii gates straddling Mount Inari."
            },
            {
                "title": "Kinkaku-ji (Golden Pavilion) Overview",
                "url": "https://www.japan-guide.com/e/e3908.html",
                "snippet": "Zen temple in northern Kyoto whose top two floors are completely covered in gold leaf."
            }
        ]

    # Mock fetch
    async def mock_fetch(urls, format_type="markdown", purpose=None):
        return [
            {
                "url": "https://www.japan-guide.com/e/e3915.html",
                "text": "# Fushimi Inari Shrine\n\nWalk the mountain path early in the morning before crowds arrive."
            }
        ]

    monkeypatch.setattr(client, "search", mock_search)
    monkeypatch.setattr(client, "fetch", mock_fetch)

    attractions, sources, telemetry = await research_attractions(trip_brief, client)

    # Assertions
    assert len(attractions) == 2
    assert attractions[0].name.startswith("Fushimi Inari Shrine")
    assert attractions[0].source_url == "https://www.japan-guide.com/e/e3915.html"
    assert attractions[0].is_live_result is True

    assert len(sources) == 2
    assert sources[0].domain == "www.japan-guide.com"
    assert sources[0].confidence == "Live Web Citation"

    # Assert telemetry log stages
    stages = [t.stage for t in telemetry]
    assert "query_generation" in stages
    assert "web_search" in stages
    assert "page_fetch" in stages
    assert "synthesis" in stages
    assert "completed" in stages


@pytest.mark.asyncio
async def test_research_endpoint_full_pipeline_mocked(monkeypatch):
    """
    Tests POST /api/trips/research through FastAPI HTTP layer with mocked TinyFish.
    """
    from backend.services.research_agent import research_attractions as real_research

    # Mock client methods inside main
    async def mock_search(self, query, location="US", language="en", purpose=None):
        return [
            {
                "title": "Amalfi Coast Scenic Path Guide",
                "url": "https://example.com/amalfi",
                "snippet": "Hike the Path of the Gods for views across Positano."
            }
        ]

    async def mock_fetch(self, urls, format_type="markdown", purpose=None):
        return [
            {
                "url": "https://example.com/amalfi",
                "text": "Detailed cliff trail notes and morning hiking hours."
            }
        ]

    monkeypatch.setattr(TinyFishClient, "search", mock_search)
    monkeypatch.setattr(TinyFishClient, "fetch", mock_fetch)

    payload = {
        "trip_brief": {
            "destination": "Amalfi Coast, Italy",
            "duration_days": 7,
            "budget_tier": "Luxury Comfort",
            "group_size": "Couple",
            "selected_interests": ["Coastal Trails", "Aperitivos"]
        },
        "selected_categories": ["attractions"],
        "confirmed": True
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/trips/research", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["destination"] == "Amalfi Coast, Italy"
    assert len(data["attractions"]) >= 1
    assert data["attractions"][0]["source_url"] == "https://example.com/amalfi"
    assert len(data["sources"]) == 1
    assert data["sources"][0]["domain"] == "example.com"
    assert len(data["telemetry_logs"]) > 0
