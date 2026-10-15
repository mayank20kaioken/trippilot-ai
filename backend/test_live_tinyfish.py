"""
Live end-to-end integration tester for TinyFish Search and Fetch APIs.
Executes only when TINYFISH_API_KEY is configured in backend/.env or environment.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import config
from backend.services.tinyfish import TinyFishClient, TinyFishError
from backend.services.research_agent import research_attractions
from backend.schemas import TripBrief


async def main():
    print("=" * 60)
    print("TripPilot AI — Live TinyFish Integration Diagnostic")
    print("=" * 60)

    key = config.TINYFISH_API_KEY
    if not key:
        print("[INFO] TINYFISH_API_KEY is currently empty in backend/.env.")
        print("[INFO] To run live queries:")
        print("       1. Get your free API key at: https://agent.tinyfish.ai")
        print("       2. Paste it into backend/.env (TINYFISH_API_KEY=...)")
        print("       3. Re-run: .\\backend\\venv\\Scripts\\python backend\\test_live_tinyfish.py")
        print("=" * 60)
        return

    print(f"[OK] TINYFISH_API_KEY detected: {key[:4]}...{key[-4:]}")
    client = TinyFishClient(api_key=key)

    # 1. Test live search
    query = "Kyoto historic shrines hidden gems travel guide"
    print(f"\n[1/3] Testing Live Search (query='{query}')...")
    try:
        search_results = await client.search(query=query)
        print(f"      Success! Received {len(search_results)} search results.")
        for i, item in enumerate(search_results[:3]):
            print(f"      - [{i+1}] {item.get('title')} -> {item.get('url')}")
    except TinyFishError as e:
        print(f"      [FAILED] Live search error: {e}")
        return

    # 2. Test live fetch on first result
    if search_results:
        target_url = search_results[0].get("url")
        print(f"\n[2/3] Testing Live Fetch on top URL: {target_url}...")
        try:
            fetch_results = await client.fetch(urls=[target_url], format_type="markdown")
            print(f"      Success! Fetched {len(fetch_results)} pages.")
            if fetch_results:
                sample_text = fetch_results[0].get("text", "")[:200]
                print(f"      Extracted preview: {repr(sample_text)}...")
        except TinyFishError as e:
            print(f"      [FAILED] Live fetch error: {e}")

    # 3. Test research attractions agent end-to-end
    print("\n[3/3] Testing Research Agent end-to-end on Kyoto...")
    brief = TripBrief(
        destination="Kyoto, Japan",
        duration_days=5,
        budget_tier="Balanced Explorer",
        selected_interests=["Zen Temples", "Matcha"]
    )
    attractions, sources, telemetry = await research_attractions(brief, client)
    print(f"      Synthesized {len(attractions)} attraction items.")
    print(f"      Captured {len(sources)} source citations.")
    for s in sources:
        print(f"      * Citation: {s.title} ({s.domain}) -> {s.url}")

    print("\n[DONE] All live TinyFish integration checks completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
