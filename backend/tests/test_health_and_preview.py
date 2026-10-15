import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify backend health check returns status and config flags."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "tinyfish_configured" in data
    assert "tinyfish_search_endpoint" in data
    assert "tinyfish_fetch_endpoint" in data


@pytest.mark.asyncio
async def test_preview_valid_trip_scope():
    """Verify preview generates category plans without external calls."""
    payload = {
        "trip_brief": {
            "destination": "Kyoto, Japan",
            "duration_days": 5,
            "budget_tier": "Balanced Explorer",
            "group_size": "Romantic Couple",
            "transport_preference": "Scenic Rail & High-Speed Shinkansen",
            "selected_interests": ["Zen Temples", "Matcha Cafes"]
        },
        "selected_categories": ["attractions", "stays"]
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/trips/preview", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "preview_ready"
    assert data["destination"] == "Kyoto, Japan"
    assert data["requires_confirmation"] is True
    assert data["total_categories"] == 2
    assert len(data["category_plans"]) == 2
    assert "Zero external API calls made" in data["message"]


@pytest.mark.asyncio
async def test_preview_invalid_empty_destination():
    """Verify validation fails if destination is empty."""
    payload = {
        "trip_brief": {
            "destination": "   ",
            "duration_days": 5
        },
        "selected_categories": ["attractions"]
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/trips/preview", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_research_requires_explicit_confirmation():
    """Verify research endpoint rejects requests where confirmed=False."""
    payload = {
        "trip_brief": {
            "destination": "Kyoto, Japan",
            "duration_days": 5
        },
        "selected_categories": ["attractions"],
        "confirmed": False
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/trips/research", json=payload)

    # Pydantic validator will reject confirmed=False with 422
    assert response.status_code == 422
