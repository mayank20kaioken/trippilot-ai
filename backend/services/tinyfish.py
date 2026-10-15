import logging
from typing import List, Dict, Any, Optional
import httpx
from backend import config

logger = logging.getLogger("trippilot.tinyfish")


class TinyFishError(Exception):
    """Base exception for TinyFish API interactions."""
    pass


class TinyFishMissingKeyError(TinyFishError):
    """Raised when TINYFISH_API_KEY is not set."""
    pass


class TinyFishAuthError(TinyFishError):
    """Raised on 401 or 403 authorization failures."""
    pass


class TinyFishRateLimitError(TinyFishError):
    """Raised on 429 rate limit exceeded."""
    pass


class TinyFishTimeoutError(TinyFishError):
    """Raised when requests exceed configured timeout."""
    pass


class TinyFishUpstreamError(TinyFishError):
    """Raised when upstream TinyFish service returns 5xx or unparseable output."""
    pass


class TinyFishClient:
    """
    Client for TinyFish Search API and Fetch API.
    Uses official endpoints:
      - Search: GET https://api.search.tinyfish.ai?query=...
      - Fetch: POST https://api.fetch.tinyfish.ai with {"urls": [...], "format": "markdown"}
    Authentication: X-API-Key header.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        search_url: str = config.TINYFISH_SEARCH_URL,
        fetch_url: str = config.TINYFISH_FETCH_URL,
        timeout: float = config.REQUEST_TIMEOUT_SECONDS,
    ):
        self.api_key = api_key if api_key is not None else config.TINYFISH_API_KEY
        self.search_url = search_url.rstrip("/")
        self.fetch_url = fetch_url.rstrip("/")
        self.timeout = timeout

    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise TinyFishMissingKeyError(
                "TINYFISH_API_KEY is not configured. "
                "Set TINYFISH_API_KEY in backend/.env or as an environment variable."
            )
        return {
            "X-API-Key": self.api_key,
            "Accept": "application/json",
            "User-Agent": "TripPilotAI-Agent/0.2.0 (AZINHACK26)"
        }

    async def search(
        self,
        query: str,
        location: str = "US",
        language: str = "en",
        purpose: Optional[str] = "travel itinerary research",
    ) -> List[Dict[str, Any]]:
        """
        Executes web search via TinyFish Search API.
        GET https://api.search.tinyfish.ai
        Query params: query, location, language, purpose
        """
        headers = self._get_headers()
        params = {
            "query": query.strip(),
            "location": location,
            "language": language,
        }
        if purpose:
            params["purpose"] = purpose

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.search_url,
                    params=params,
                    headers=headers,
                )

            if response.status_code in (401, 403):
                raise TinyFishAuthError(
                    f"TinyFish authentication failed (HTTP {response.status_code}). Verify your TINYFISH_API_KEY."
                )
            elif response.status_code == 429:
                raise TinyFishRateLimitError("TinyFish rate limit exceeded. Please retry shortly.")
            elif response.status_code >= 500:
                raise TinyFishUpstreamError(
                    f"TinyFish Search API upstream error (HTTP {response.status_code}): {response.text[:200]}"
                )
            elif response.status_code != 200:
                raise TinyFishUpstreamError(
                    f"TinyFish Search API unexpected error (HTTP {response.status_code}): {response.text[:200]}"
                )

            data = response.json()
            # Handle results array from official response format
            results = data.get("results", [])
            if not isinstance(results, list):
                logger.warning("TinyFish search returned non-list 'results': %s", data)
                return []
            return results

        except httpx.TimeoutException as exc:
            raise TinyFishTimeoutError(f"TinyFish Search timed out after {self.timeout}s: {exc}") from exc
        except httpx.RequestError as exc:
            raise TinyFishUpstreamError(f"Network error communicating with TinyFish Search: {exc}") from exc

    async def fetch(
        self,
        urls: List[str],
        format_type: str = "markdown",
        purpose: Optional[str] = "extract travel facts, opening hours, crowd tips",
    ) -> List[Dict[str, Any]]:
        """
        Fetches web page content via TinyFish Fetch API.
        POST https://api.fetch.tinyfish.ai
        Payload: {"urls": [...], "format": "markdown", "purpose": ...}
        """
        if not urls:
            return []

        # Bound batch size to max 10 as per API specifications
        bounded_urls = [u.strip() for u in urls if u and u.startswith("http")][:10]
        if not bounded_urls:
            return []

        headers = self._get_headers()
        headers["Content-Type"] = "application/json"

        payload: Dict[str, Any] = {
            "urls": bounded_urls,
            "format": format_type,
        }
        if purpose:
            payload["purpose"] = purpose

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.fetch_url,
                    json=payload,
                    headers=headers,
                )

            if response.status_code in (401, 403):
                raise TinyFishAuthError(
                    f"TinyFish authentication failed (HTTP {response.status_code}). Verify your TINYFISH_API_KEY."
                )
            elif response.status_code == 429:
                raise TinyFishRateLimitError("TinyFish rate limit exceeded. Please retry shortly.")
            elif response.status_code >= 500:
                raise TinyFishUpstreamError(
                    f"TinyFish Fetch API upstream error (HTTP {response.status_code}): {response.text[:200]}"
                )
            elif response.status_code != 200:
                raise TinyFishUpstreamError(
                    f"TinyFish Fetch API unexpected error (HTTP {response.status_code}): {response.text[:200]}"
                )

            data = response.json()
            results = data.get("results", [])
            if not isinstance(results, list):
                logger.warning("TinyFish fetch returned non-list 'results': %s", data)
                return []
            return results

        except httpx.TimeoutException as exc:
            raise TinyFishTimeoutError(f"TinyFish Fetch timed out after {self.timeout}s: {exc}") from exc
        except httpx.RequestError as exc:
            raise TinyFishUpstreamError(f"Network error communicating with TinyFish Fetch: {exc}") from exc
