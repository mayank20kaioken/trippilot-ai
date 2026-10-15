import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from backend.main import app
from backend.schemas import TripBrief, ResearchRequest
from backend.services.research_agent import (
    canonicalize_url,
    classify_attraction_geography,
    normalize_attraction_display_name,
    _extract_candidate_attractions_from_text,
)


@pytest.mark.asyncio
async def test_manali_trip_scope_preview_zero_external_calls():
    """
    Verifies that 'Manali, Himachal Pradesh' with 5 days reaches preview correctly
    and generates Manali-specific query plans with zero external API calls.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "trip_brief": {
                "destination": "Manali, Himachal Pradesh",
                "duration_days": 5,
                "budget_tier": "Balanced Explorer",
                "group_size": "Couple",
                "transport_preference": "Regional Transit (Estimate • Pending Verification)",
                "selected_interests": ["Alpine Nature", "Local Food"],
                "prompt": "5 days exploring of Manali in the Himachal Pradesh",
                "mode": "quick"
            },
            "selected_categories": ["attractions", "stays", "food"]
        }
        res = await ac.post("/api/trips/preview", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["status"] == "preview_ready"
        assert data["destination"] == "Manali, Himachal Pradesh"
        assert data["requires_confirmation"] is True
        assert data["total_categories"] == 3
        assert data["estimated_total_queries"] > 0

        # Verify that queries target Manali, Himachal Pradesh specifically
        attraction_plan = next(p for p in data["category_plans"] if p["category_id"] == "attractions")
        assert any("Manali, Himachal Pradesh" in q for q in attraction_plan["planned_queries"])
        assert not any("Kyoto" in q for q in attraction_plan["planned_queries"])


@pytest.mark.asyncio
async def test_manali_research_execution_grounded_mocked():
    """
    Verifies that research execution for Manali invokes the research pipeline,
    requires confirmation, and returns structured Manali attractions and sources.
    Uses mocked TinyFish calls so no external quota is consumed.
    """
    mock_search_results = [
        {
            "title": "Hadimba Temple - Ancient Cedar Forest Shrine",
            "url": "https://himachaltourism.gov.in/attractions/hadimba-temple",
            "snippet": "Historic 16th century wooden temple dedicated to Hadimba Devi in Manali cedar woods."
        },
        {
            "title": "Solang Valley Adventure & Alpine Vistas",
            "url": "https://manalitravel.org/solang-valley",
            "snippet": "High-altitude valley near Manali known for paragliding, skiing and scenic Himalayan panoramas."
        }
    ]

    mock_fetch_results = [
        {
            "url": "https://himachaltourism.gov.in/attractions/hadimba-temple",
            "text": "Hadimba Temple is surrounded by dense deodar cedar forests in Dhungri Park, Manali. Built in 1553."
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Manali, Himachal Pradesh",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "transport_preference": "Regional Transit (Estimate • Pending Verification)",
                    "selected_interests": ["Alpine Nature"],
                    "prompt": "5 days exploring of Manali in the Himachal Pradesh",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "completed"
            assert data["destination"] == "Manali, Himachal Pradesh"
            assert data["duration_days"] == 5
            assert len(data["attractions"]) == 2
            assert "Hadimba" in data["attractions"][0]["name"]
            assert len(data["sources"]) == 2
            assert data["sources"][0]["url"] == "https://himachaltourism.gov.in/attractions/hadimba-temple"
            assert "Hadimba" in data["sources"][0]["extracted_text_sample"]


@pytest.mark.asyncio
async def test_jaipur_research_execution_isolation():
    """
    Verifies that research execution for Jaipur returns Jaipur content
    and does not leak Manali, Kyoto or Shinkansen references.
    """
    mock_search_results = [
        {
            "title": "Amber Fort & Palace Jaipur",
            "url": "https://tourism.rajasthan.gov.in/amber-palace",
            "snippet": "Iconic royal palace and hill fort overlooking Maota Lake in Jaipur, Rajasthan."
        }
    ]
    mock_fetch_results = [
        {
            "url": "https://tourism.rajasthan.gov.in/amber-palace",
            "text": "Amber Palace is situated in Amer, 11 km from Jaipur, Rajasthan. High on a hill."
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Jaipur",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "transport_preference": "Regional Transit (Estimate • Pending Verification)",
                    "selected_interests": ["Historic Architecture"],
                    "prompt": "make the best trip plan for 5 days in Jaipur",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["destination"] == "Jaipur"
            assert "Amber" in data["attractions"][0]["name"]
            # Assert no Manali or Kyoto in results
            data_str = str(data)
            assert "Manali" not in data_str
            assert "Kyoto" not in data_str
            assert "Shinkansen" not in data_str


@pytest.mark.asyncio
async def test_rishikesh_deduplication_and_listicle_extraction():
    """
    Verifies:
    1. Canonical URL normalization deduplicates citations with tracking params/trailing slashes.
    2. Listicle titles ('15 Best Places to Visit in Rishikesh') are distinguished from individual
       extracted attractions ('Laxman Jhula', 'Triveni Ghat').
    3. Duplicate mentions of 'Laxman Jhula' across multiple articles are deduplicated.
    4. Every live attraction retains its supporting source_url.
    """
    assert canonicalize_url("https://www.example.com/rishikesh/?utm_source=google#top") == "https://example.com/rishikesh"

    mock_search_results = [
        {
            "title": "15 Best Places to Visit in Rishikesh (2026 Travel Guide)",
            "url": "https://uttarakhandtourism.gov.in/rishikesh?utm_source=search#section1",
            "snippet": "Top sights include Laxman Jhula and Triveni Ghat on the banks of the Ganges."
        },
        {
            "title": "15 Best Places to Visit in Rishikesh - Duplicate URL Variant",
            "url": "https://www.uttarakhandtourism.gov.in/rishikesh/",
            "snippet": "Duplicate canonical URL that should be filtered out."
        },
        {
            "title": "Laxman Jhula - Iconic Suspension Bridge",
            "url": "https://rishikeshtourism.in/laxman-jhula",
            "snippet": "Laxman Jhula is a famous hanging bridge across the Ganga in Rishikesh."
        }
    ]
    mock_fetch_results = [
        {
            "url": "https://uttarakhandtourism.gov.in/rishikesh?utm_source=search#section1",
            "text": "## Must-do experiences in Rishikesh\n8-Hour Mindrolling Monastery Tour\n### 1. Laxman Jhula\nIconic suspension bridge.\n### 2. Triveni Ghat\nSacred riverfront ghat famous for evening Ganga Aarti."
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Rishikesh",
                    "duration_days": 3,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Plan a 3-day trip to Rishikesh for two people",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            # 2 unique sources (the duplicate canonical URL was removed)
            assert len(data["sources"]) == 2
            # Individual attractions extracted, generic 'Must-do experiences' rejected, and 'Laxman Jhula' not duplicated
            names = [a["name"] for a in data["attractions"]]
            assert "Laxman Jhula" in names
            assert "Triveni Ghat" in names
            assert not any("Must-do" in n for n in names)
            assert not any("Hour " in n for n in names)
            assert sum(1 for n in names if "laxman" in n.lower()) == 1
            assert all(a["source_url"] and a["is_live_result"] is True for a in data["attractions"])


@pytest.mark.asyncio
async def test_empty_search_results_not_mislabeled_as_completed():
    """
    Confirms that when TinyFish Search returns 0 results, POST /api/trips/research
    returns status='empty' with an explicit error_message and empty lists,
    never mislabeling empty results as status='completed' or fabricating findings.
    """
    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = []

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Rishikesh",
                    "duration_days": 3,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Plan a 3-day trip to Rishikesh for two people",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "empty"
            assert data["attractions"] == []
            assert data["sources"] == []
            assert data["error_message"] is not None
            assert "0 verifiable" in data["error_message"]


@pytest.mark.asyncio
async def test_geographic_relevance_classification_and_excursion_handling():
    """
    Verifies conservative geographic classification:
    1. In-destination attractions ('Laxman Jhula' in Rishikesh) -> 'in_destination'
    2. Nearby excursions ('Mindrolling Monastery' in Dehradun / day trip) -> 'nearby_excursion'
    3. Unverified locations ('Secret Waterfall' without municipal anchor) -> 'unverified_location'
    4. Results are sorted with in_destination first, preserving source URLs and never inventing coordinates/distances.
    """
    in_dest_status, in_dest_label, in_dest_note = classify_attraction_geography(
        "Laxman Jhula",
        "Iconic suspension bridge across the Ganges in Rishikesh.",
        "Laxman Jhula in Rishikesh",
        "Rishikesh"
    )
    assert in_dest_status == "in_destination"

    exc_status, exc_label, exc_note = classify_attraction_geography(
        "Mindrolling Monastery",
        "Large Buddhist temple complex in Dehradun often visited from Rishikesh.",
        "Day trip to Mindrolling Monastery in Dehradun",
        "Rishikesh"
    )
    assert exc_status == "nearby_excursion"
    assert "Nearby Excursion" in exc_label
    assert "check the linked source" in exc_note.lower() or "verify" in exc_note.lower()

    unv_status, unv_label, unv_note = classify_attraction_geography(
        "Secret Waterfall",
        "A scenic spot mentioned by travelers.",
        "Secret Waterfall",
        "Rishikesh"
    )
    assert unv_status == "unverified_location"
    assert "Location Unverified" in unv_label

    mock_search_results = [
        {
            "title": "Rishikesh & Uttarakhand Sights Guide",
            "url": "https://uttarakhandtourism.gov.in/rishikesh-guide",
            "snippet": "Explore Rishikesh and surrounding regional highlights."
        }
    ]
    mock_fetch_results = [
        {
            "url": "https://uttarakhandtourism.gov.in/rishikesh-guide",
            "text": (
                "### 1. Mindrolling Monastery\n"
                "Famous Buddhist monastery located in Dehradun, a popular excursion from Rishikesh.\n"
                "### 2. Secret Waterfall\n"
                "Mentioned in traveler notes without exact municipal coordinates.\n"
                "### 3. Laxman Jhula\n"
                "Historic suspension bridge in the heart of Rishikesh.\n"
            )
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Rishikesh",
                    "duration_days": 3,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Plan a 3-day trip to Rishikesh for two people",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            attractions = data["attractions"]
            assert len(attractions) == 3
            # Sorted: in_destination first, nearby_excursion second, unverified_location third
            assert attractions[0]["name"] == "Laxman Jhula"
            assert attractions[0]["geographic_status"] == "in_destination"
            assert attractions[1]["name"] == "Mindrolling Monastery"
            assert attractions[1]["geographic_status"] == "nearby_excursion"
            assert attractions[2]["name"] == "Secret Waterfall"
            assert attractions[2]["geographic_status"] == "unverified_location"
            assert all(a["source_url"] == "https://uttarakhandtourism.gov.in/rishikesh-guide" for a in attractions)


@pytest.mark.asyncio
async def test_social_media_confidence_and_display_name_normalization():
    """
    Verifies:
    1. Social media sources (e.g. instagram.com) are labeled as lower confidence:
       'Social Media Citation (Lower Confidence • Verify Independently)'.
    2. Social media titles and listicle headings are not used as attraction names.
    3. No fabricated fallback 'Cultural & Scenic Highlights' is generated when candidates are empty.
    4. normalize_attraction_display_name cleans numbered bullets and title-cases.
    """
    # 1. Normalization helper check
    assert normalize_attraction_display_name("1. laxman jhula - tripadvisor") == "Laxman Jhula"
    assert normalize_attraction_display_name("amber fort | rajasthan tourism") == "Amber Fort"

    # 2. Candidate extraction with a social media post with no concrete landmarks -> empty
    social_empty_candidates = _extract_candidate_attractions_from_text(
        title="Watch on Instagram: 10 places you cannot miss #reels",
        snippet="5,420 likes, 120 comments. Follow us on Instagram for daily travel guides.",
        fetched_text="",
        dest="Rishikesh",
        is_social_source=True,
    )
    assert len(social_empty_candidates) == 0

    # 3. Candidate extraction with a listicle guide with no concrete sub-landmarks -> empty (no fake fallback)
    listicle_empty_candidates = _extract_candidate_attractions_from_text(
        title="15 Best Things to Do in Rishikesh (Complete Travel Guide)",
        snippet="General travel guide about visiting Uttarakhand without landmark names.",
        fetched_text="",
        dest="Rishikesh",
        is_social_source=False,
    )
    assert len(listicle_empty_candidates) == 0

    # 4. End-to-end pipeline with Instagram source containing a real landmark in text
    mock_search_results = [
        {
            "title": "Photo by Explorer on Instagram: Rishikesh Vibes",
            "url": "https://www.instagram.com/p/DF123XYZ/",
            "snippet": "Visiting Laxman Jhula across the Ganges in Rishikesh. #travel #reels #ganga"
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = []

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Rishikesh",
                    "duration_days": 3,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Plan a 3-day trip to Rishikesh for two people",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            # Verify source is marked as Social Media Citation
            assert len(data["sources"]) == 1
            src = data["sources"][0]
            assert "Social Media Citation" in src["confidence"]
            assert "Lower Confidence" in src["confidence"]

            # Verify attraction was extracted from text, not the Instagram title
            assert len(data["attractions"]) == 1
            att = data["attractions"][0]
            assert att["name"] == "Laxman Jhula"
            assert not any("Instagram" in att["name"] for _ in [1])
            assert "social media" in att["location_note"].lower()


@pytest.mark.asyncio
async def test_shimla_research_isolation_and_foreign_landmark_rejection():
    """
    Verifies that:
    1. Tour/excursion titles like 'The BEST Shimla Tours and Excursion...' are rejected as attraction names.
    2. Landmarks from other destinations (e.g. 'Hadimba Devi Temple' in Manali) are rejected for Shimla.
    3. Legitimate Shimla landmarks (e.g. 'The Ridge', 'Jakhoo Temple') are accepted as in_destination.
    4. Regional excursions like 'Kufri' are classified as nearby_excursion.
    """
    # Unit checks on geography classification
    ridge_status, _, _ = classify_attraction_geography("The Ridge", "Open space in central Shimla", "", "Shimla")
    assert ridge_status == "in_destination"

    kufri_status, _, _ = classify_attraction_geography("Kufri Nature Park", "Scenic hill station near Shimla", "", "Shimla")
    assert kufri_status == "nearby_excursion"

    mock_search_results = [
        {
            "title": "The BEST Shimla Tours and Excursion... - Tripadvisor",
            "url": "https://www.tripadvisor.com/Attractions-g304552-Activities-c42-Shimla_Shimla_District_Himachal_Pradesh.html",
            "snippet": "Find the best tours and outdoor excursions in Shimla for 2026."
        },
        {
            "title": "Top Places in Himachal: Hadimba Devi Temple",
            "url": "https://example.com/himachal-guide",
            "snippet": "Hadimba Devi Temple is an ancient temple surrounded by cedar forest in Manali."
        },
        {
            "title": "The Ridge & Jakhoo Temple - Shimla Heritage Guide",
            "url": "https://himachaltourism.gov.in/destination/shimla",
            "snippet": "The Ridge is the wide open cultural promenade in the heart of Shimla. Jakhoo Temple sits atop the highest peak."
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = []

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Shimla",
                    "duration_days": 4,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Create Shimla Trip under $250 for the 4 days trip",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            attraction_names = [a["name"] for a in data["attractions"]]

            # 1. Reject tour/excursion listicle title
            assert not any("The BEST Shimla Tours" in name for name in attraction_names)
            assert not any("Tours and Excursion" in name for name in attraction_names)

            # 2. Reject foreign landmark from Manali
            assert not any("Hadimba" in name for name in attraction_names)

            # 3. Accept legitimate Shimla landmarks
            assert any("Ridge" in name for name in attraction_names)
            assert any("Jakhoo" in name for name in attraction_names)


@pytest.mark.asyncio
async def test_shimla_multi_source_listicle_and_link_landmark_extraction():
    """
    Regression Test for Bug 2: Sights & Attractions always shows zero findings.
    Verifies that when live research produces listicle-heavy sources and markdown-link pages
    for Shimla, the research agent extracts multiple verified in-destination attractions
    (The Ridge, Mall Road, Jakhoo Temple, Christ Church, Viceregal Lodge)
    instead of 0 findings.
    """
    mock_search_results = [
        {
            "title": "15 Best Places to Visit in Shimla (2026 Tourist Guide) - Holidify",
            "url": "https://www.holidify.com/places/shimla/sightseeing-and-things-to-do.html",
            "snippet": "Top places to visit in Shimla include The Ridge, Mall Road, Jakhoo Temple, Christ Church, and Kufri Nature Park."
        },
        {
            "title": "THE 10 BEST Things to Do in Shimla - Tripadvisor",
            "url": "https://www.tripadvisor.com/Attractions-g304552-Activities-Shimla.html",
            "snippet": "Find top attractions, historic sights, and cultural landmarks across Shimla."
        }
    ]

    mock_fetch_results = [
        {
            "url": "https://www.tripadvisor.com/Attractions-g304552-Activities-Shimla.html",
            "text": """# Top Shimla Attractions

## [1. The Ridge](https://www.tripadvisor.com/Attraction_Review-The_Ridge.html)
The Ridge is the wide open cultural promenade in the heart of Shimla.

## [2. Viceregal Lodge](https://www.tripadvisor.com/Attraction_Review-Viceregal.html)
Magnificent British colonial estate that served as the summer capital of British India.

## [3. Gaiety Theatre](https://www.tripadvisor.com/Attraction_Review-Gaiety.html)
Historic Victorian-era cultural complex on Mall Road.
"""
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Shimla",
                    "duration_days": 4,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Create Shimla Trip under $250 for the 4 days trip",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "completed"
            assert data["destination"] == "Shimla"

            # Must NOT be 0 findings!
            assert len(data["attractions"]) >= 3, f"Expected >= 3 attractions, got {len(data['attractions'])}"

            names = [a["name"] for a in data["attractions"]]
            assert "The Ridge" in names, f"Expected 'The Ridge' in {names}"
            assert any(n in names for n in ["Mall Road", "Jakhoo Temple", "Christ Church", "Viceregal Lodge"])

            # Verify all extracted attractions are correctly grounded to their source URLs
            for att in data["attractions"]:
                assert att["source_url"] != "", "Each attraction must have a grounded source URL"
                assert att["is_live_result"] is True
                assert att["geographic_status"] in ("in_destination", "nearby_excursion")


@pytest.mark.asyncio
async def test_delhi_landmark_extraction_grounding_and_editorial_rejection():
    """
    Regression Test for Delhi research grounding & integrity:
    1. Core Delhi landmarks (Red Fort, Jama Masjid, Chandni Chowk) with direct evidence
       are verified as 'in_destination' (not 'unverified_location').
    2. Regional excursions mentioned in Delhi articles (e.g. Taj Mahal, Agra)
       are marked as 'nearby_excursion', not falsely claimed as in-destination.
    3. Editorial phrases such as 'The Game Plans' are rejected.
    4. Foreign landmarks from other cities (e.g. Hadimba, Amber Fort) are rejected.
    5. Local evidence extracted directly describes each landmark rather than generic page snippet.
    """
    mock_search_results = [
        {
            "title": "Delhi 5-Day Itinerary Guide: The Game Plans & Top Sights",
            "url": "https://www.delhitourism.gov.in/delhi-guide",
            "snippet": "Complete Delhi travel itinerary covering historic Old Delhi, Mughal monuments, and regional day trips."
        },
        {
            "title": "Day Trips and Excursions from Delhi",
            "url": "https://delhitravel.org/day-trips",
            "snippet": "Popular excursions from Delhi include the Taj Mahal in Agra, located 200 km away."
        }
    ]

    mock_fetch_results = [
        {
            "url": "https://www.delhitourism.gov.in/delhi-guide",
            "text": """# Complete Guide to Delhi

## The Game Plans
Here is our general strategy for tackling the bustling streets and metro network of the capital.

## 1. Red Fort
Red Fort is an imposing 17th-century Mughal fortress constructed in red sandstone by Emperor Shah Jahan in the heart of Old Delhi.

## 2. Jama Masjid
Jama Masjid is one of the largest mosques in India, featuring grand marble domes and towering minarets opposite Chandni Chowk.

## 3. Chandni Chowk
Chandni Chowk is a historic bustling market street filled with centuries-old spice bazaars and traditional street food stalls.

## 4. Hadimba Temple
Hadimba Temple is located in the pine forests of Manali.

## 5. Amber Fort
Amber Fort is a hilltop royal palace overlooking Maota Lake in Jaipur.
"""
        },
        {
            "url": "https://delhitravel.org/day-trips",
            "text": """# Excursions from Delhi

## [1. Taj Mahal](https://delhitravel.org/taj-mahal)
Taj Mahal is an ivory-white marble mausoleum situated in Agra, a 3-hour express train excursion from central Delhi.
"""
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Delhi",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Create a 5 day trip to the Delhi for under $450",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "completed"
            assert data["destination"] == "Delhi"

            attractions = data["attractions"]
            names = [a["name"] for a in attractions]

            # 1. Reject 'The Game Plans' and editorial phrases
            assert not any("Game Plan" in n for n in names), f"'The Game Plans' must be rejected: {names}"
            assert not any("The Game" in n for n in names)

            # 2. Reject foreign landmarks (Hadimba from Manali, Amber Fort from Jaipur)
            assert not any("Hadimba" in n for n in names), f"Hadimba must not leak into Delhi: {names}"
            assert not any("Amber" in n for n in names), f"Amber Fort must not leak into Delhi: {names}"

            # 3. Core Delhi landmarks verified as 'in_destination'
            assert "Red Fort" in names, f"Red Fort must be extracted: {names}"
            assert "Jama Masjid" in names, f"Jama Masjid must be extracted: {names}"
            assert "Chandni Chowk" in names, f"Chandni Chowk must be extracted: {names}"

            red_fort = next(a for a in attractions if a["name"] == "Red Fort")
            assert red_fort["geographic_status"] == "in_destination", "Red Fort must be in_destination"
            assert "red sandstone" in red_fort["description"].lower() or "fortress" in red_fort["description"].lower(), \
                "Evidence for Red Fort must describe the fort, not generic itinerary text"

            # 4. Regional excursion (Taj Mahal) classified as 'nearby_excursion'
            taj_mahal = next((a for a in attractions if "Taj Mahal" in a["name"]), None)
            if taj_mahal:
                assert taj_mahal["geographic_status"] == "nearby_excursion", "Taj Mahal must be nearby_excursion"
                assert "excursion" in taj_mahal["geographic_label"].lower() or "nearby" in taj_mahal["geographic_label"].lower()


@pytest.mark.asyncio
async def test_ladakh_by_road_landmark_extraction_and_category_rejection():
    """
    Regression Test for Ladakh By Road Landmark Extraction:
    1. Rejects category headings ('Sacred & Religious Sites', 'Historic Sites', 'Monuments & Statues').
    2. Rejects scraped TripAdvisor metadata (star ratings, review counts, rankings, filter text) in descriptions.
    3. Extracts real Himalayan landmarks ('Thiksey Monastery', 'Pangong Tso', 'Khardung La').
    4. Generalizes geographic verification to 'in_destination' without hardcoding Ladakh.
    5. Preserves grounded source URLs and live result flags.
    """
    mock_search_results = [
        {
            "title": "THE 10 BEST Things to Do in Ladakh - Tripadvisor",
            "url": "https://www.tripadvisor.com/Attractions-g297625-Activities-Ladakh.html",
            "snippet": "Discover top sights, monasteries, mountain passes, and lakes across Ladakh."
        }
    ]

    mock_fetch_results = [
        {
            "url": "https://www.tripadvisor.com/Attractions-g297625-Activities-Ladakh.html",
            "text": """# Top Sights in Ladakh

## Sacred & Religious Sites
4.8 (3,420 reviews) • #1 of 50 in Leh Ladakh
Category: Sacred & Religious Sites • Filter by: Monasteries
Open now: 6:00 AM - 6:00 PM • Book tickets online

### 1. Thiksey Monastery
4.9 stars • 4,120 traveler reviews • Ranked #1 of 25 monasteries
Filter by: Gelug Sect • Suggested duration: 2-3 hours
Thiksey Monastery is a twelve-storey Tibetan Buddhist monastery complex of the Gelug sect located on top of a hill in Thiksey, Ladakh.

## Historic Sites
4.5 (1,150 reviews) • Open daily
Ancient heritage structures and historical fortifications across Ladakh.

### 2. Pangong Tso
5.0 stars • 8,900 reviews • #1 Lake in Ladakh
Admission: Free • Best time: Morning
Pangong Tso is a high-altitude endorheic lake situated in the Himalayas in Ladakh extending into Tibet.

## Monuments & Statues
3.9 (820 reviews) • View map
Statues and war memorials in Jammu & Kashmir and Ladakh.

### 3. Khardung La
4.7 stars • 5,400 reviews
Khardung La is a high mountain pass in the Ladakh region of India serving as the gateway to Shyok and Nubra valleys.
"""
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key-for-test"):

        mock_search.return_value = mock_search_results
        mock_fetch.return_value = mock_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Ladakh",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Ladakh By Road",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "completed"
            assert data["destination"] == "Ladakh"

            attractions = data["attractions"]
            names = [a["name"] for a in attractions]

            # 1. Strictly reject TripAdvisor category headings
            category_headings = [
                "Sacred & Religious Sites",
                "Historic Sites",
                "Monuments & Statues",
                "Things to Do"
            ]
            for cat in category_headings:
                assert cat not in names, f"Category heading '{cat}' must NEVER appear as an attraction: {names}"

            # 2. Extract genuine named landmarks
            assert any("Thiksey" in n for n in names), f"Thiksey Monastery must be extracted: {names}"
            assert any("Pangong" in n for n in names), f"Pangong Tso must be extracted: {names}"
            assert any("Khardung" in n for n in names), f"Khardung La must be extracted: {names}"

            # 3. Clean descriptions: NO star ratings, review counts, or filter text
            for att in attractions:
                desc = att["description"]
                assert "stars" not in desc.lower(), f"Description must not leak star ratings: {desc}"
                assert "reviews" not in desc.lower(), f"Description must not leak review counts: {desc}"
                assert "filter by" not in desc.lower(), f"Description must not leak filter text: {desc}"
                assert "open now" not in desc.lower(), f"Description must not leak opening hours button: {desc}"
                assert att["geographic_status"] == "in_destination", f"Landmark {att['name']} should be in_destination"
                assert "ladakh" in att["geographic_label"].lower()
                assert att["source_url"] != ""
                assert att["is_live_result"] is True





