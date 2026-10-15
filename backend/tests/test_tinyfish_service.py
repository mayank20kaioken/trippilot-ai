import pytest
import httpx
from backend.services.tinyfish import (
    TinyFishClient,
    TinyFishMissingKeyError,
    TinyFishAuthError,
    TinyFishRateLimitError,
    TinyFishTimeoutError,
    TinyFishUpstreamError,
)


@pytest.mark.asyncio
async def test_missing_api_key_raises_error():
    """Verify TinyFishClient raises TinyFishMissingKeyError when api_key is empty."""
    client = TinyFishClient(api_key="")
    with pytest.raises(TinyFishMissingKeyError):
        await client.search(query="Kyoto sights")


@pytest.mark.asyncio
async def test_successful_search_mock(monkeypatch):
    """Verify search parses results list properly."""
    client = TinyFishClient(api_key="test_key")

    mock_response = httpx.Response(
        status_code=200,
        json={
            "results": [
                {
                    "title": "Kyoto Travel Guide: 10 Sights",
                    "url": "https://example.com/kyoto",
                    "snippet": "Explore Kinkaku-ji and Fushimi Inari with peaceful morning strolls."
                }
            ]
        },
        request=httpx.Request("GET", "https://api.search.tinyfish.ai")
    )

    async def mock_get(*args, **kwargs):
        return mock_response

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    results = await client.search(query="Kyoto sights")
    assert len(results) == 1
    assert results[0]["title"] == "Kyoto Travel Guide: 10 Sights"
    assert results[0]["url"] == "https://example.com/kyoto"


@pytest.mark.asyncio
async def test_successful_fetch_mock(monkeypatch):
    """Verify fetch parses markdown content properly."""
    client = TinyFishClient(api_key="test_key")

    mock_response = httpx.Response(
        status_code=200,
        json={
            "results": [
                {
                    "url": "https://example.com/kyoto",
                    "text": "# Kyoto Highlights\n\nVisit Ginkaku-ji for dry sand zen gardens."
                }
            ]
        },
        request=httpx.Request("POST", "https://api.fetch.tinyfish.ai")
    )

    async def mock_post(*args, **kwargs):
        return mock_response

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    results = await client.fetch(urls=["https://example.com/kyoto"])
    assert len(results) == 1
    assert "Kyoto Highlights" in results[0]["text"]


@pytest.mark.asyncio
async def test_search_401_auth_error(monkeypatch):
    """Verify 401 translates to TinyFishAuthError."""
    client = TinyFishClient(api_key="invalid_key")

    mock_response = httpx.Response(
        status_code=401,
        text="Unauthorized",
        request=httpx.Request("GET", "https://api.search.tinyfish.ai")
    )

    async def mock_get(*args, **kwargs):
        return mock_response

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(TinyFishAuthError):
        await client.search(query="Kyoto")


@pytest.mark.asyncio
async def test_search_429_rate_limit(monkeypatch):
    """Verify 429 translates to TinyFishRateLimitError."""
    client = TinyFishClient(api_key="valid_key")

    mock_response = httpx.Response(
        status_code=429,
        text="Rate limit exceeded",
        request=httpx.Request("GET", "https://api.search.tinyfish.ai")
    )

    async def mock_get(*args, **kwargs):
        return mock_response

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(TinyFishRateLimitError):
        await client.search(query="Kyoto")


@pytest.mark.asyncio
async def test_search_timeout_error(monkeypatch):
    """Verify timeout translates to TinyFishTimeoutError."""
    client = TinyFishClient(api_key="valid_key")

    async def mock_get(*args, **kwargs):
        raise httpx.TimeoutException("Connection timed out")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(TinyFishTimeoutError):
        await client.search(query="Kyoto")


@pytest.mark.asyncio
async def test_fetch_empty_urls_returns_empty():
    """Verify empty URLs list short-circuits without error."""
    client = TinyFishClient(api_key="valid_key")
    res = await client.fetch(urls=[])
    assert res == []
