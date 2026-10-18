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


@pytest.mark.asyncio
async def test_maldives_temporal_word_isolation_and_destination_cleaning():
    """
    Regression Test for Maldives & Temporal Word Isolation:
    1. TripBrief cleans temporal prefixes ('Next Maldives' -> 'Maldives', 'Maldives next weekend' -> 'Maldives').
    2. Ordinary destinations with real prefix words ('New York', 'South Korea') are preserved.
    3. Query planning generates queries using 'Maldives', never 'Next Maldives'.
    4. Research execution returns destination 'Maldives' without temporal word corruption.
    """
    from backend.schemas import TripBrief
    from backend.services.research_agent import generate_query_plan

    # 1. Schema-level validation and temporal word stripping
    brief_next = TripBrief(destination="Next Maldives", duration_days=5)
    assert brief_next.destination == "Maldives", f"Expected 'Maldives', got '{brief_next.destination}'"

    brief_weekend = TripBrief(destination="Maldives next weekend", duration_days=3)
    assert brief_weekend.destination == "Maldives", f"Expected 'Maldives', got '{brief_weekend.destination}'"

    brief_upcoming = TripBrief(destination="Upcoming Tokyo", duration_days=4)
    assert brief_upcoming.destination == "Tokyo", f"Expected 'Tokyo', got '{brief_upcoming.destination}'"

    # 2. Ordinary destination names with real geographic words must be preserved
    for ord_dest in ["New York", "New Delhi", "South Korea", "North Goa", "Costa Rica"]:
        b = TripBrief(destination=ord_dest, duration_days=5)
        assert b.destination == ord_dest, f"Ordinary destination '{ord_dest}' must be preserved, got '{b.destination}'"

    # 3. Query planning must never formulate queries targeting 'Next Maldives'
    plans = generate_query_plan(brief_next, selected_categories=["attractions"])
    assert len(plans) > 0
    for plan in plans:
        for q in plan.planned_queries:
            assert not q.startswith("Next Maldives"), f"Query must not start with 'Next Maldives': {q}"
            assert "Maldives" in q

    # 4. End-to-end research execution with Maldives prompt
    mock_search_results = [
        {
            "title": "Top Attractions in Maldives - Male Grand Friday Mosque",
            "url": "https://visitmaldives.com/attractions",
            "snippet": "Explore the historic Grand Friday Mosque and coral atolls across the Maldives."
        }
    ]
    mock_fetch_results = [
        {
            "url": "https://visitmaldives.com/attractions",
            "text": """# Sights in Maldives
### Grand Friday Mosque
Grand Friday Mosque is a magnificent coral-stone Islamic center in Male, Maldives.
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
                    "destination": "Next Maldives",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Plan a next 5 days trip to Maldives under $450",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "completed"
            assert data["destination"] == "Maldives", f"Expected 'Maldives', got '{data['destination']}'"
            assert not any("Next Maldives" in a["name"] for a in data["attractions"])
            for att in data["attractions"]:
                assert "Maldives" in att["geographic_label"]
                assert "Next" not in att["geographic_label"]


@pytest.mark.asyncio
async def test_west_bengal_geographic_relevance_taj_mahal_rejection_and_evidence_quality():
    """
    Verifies:
    1. Query generation for West Bengal incorporates primary constituent urban hub (Kolkata).
    2. Rejects clearly mismatched foreign landmarks (e.g. Taj Mahal in Agra, Amber Fort in Jaipur)
       even when present on mixed-destination travel pages.
    3. Accepts genuine West Bengal attractions (Victoria Memorial, Howrah Bridge) grounded in evidence.
    4. Sights lacking confirmed municipal placement remain 'unverified_location'.
    5. Deduplicates repeated attractions across multiple sources.
    6. Does not invent coordinates or travel times.
    """
    from backend.services.research_agent import is_geographic_mismatch, generate_query_plan

    # 1. Direct unit verification of is_geographic_mismatch
    assert is_geographic_mismatch("Taj Mahal", "Located in Agra, Uttar Pradesh", "West Bengal") is True
    assert is_geographic_mismatch("Amber Fort", "Amer Fort is in Jaipur, Rajasthan", "West Bengal") is True
    assert is_geographic_mismatch("Victoria Memorial", "Located in Kolkata, West Bengal", "West Bengal") is False
    assert is_geographic_mismatch("Howrah Bridge", "Spans the Hooghly in Kolkata/Howrah", "West Bengal") is False
    # Allowed excursion check: Agra IS an allowed excursion for Delhi, but NOT for West Bengal
    assert is_geographic_mismatch("Taj Mahal", "Day trip to Agra from Delhi", "Delhi") is False

    # 2. Query plan verification for West Bengal
    brief = TripBrief(
        destination="West Bengal",
        duration_days=4,
        budget_usd=560,
        traveler_count=2,
        trip_style="Balanced Exploration"
    )
    plans = generate_query_plan(brief, ["attractions"])
    assert len(plans) == 1
    planned_queries = plans[0].planned_queries
    assert any("Kolkata" in q for q in planned_queries), f"Expected Kolkata in planned queries, got: {planned_queries}"
    assert all("West Bengal" in q for q in planned_queries)

    # 3. Full research pipeline with mixed-destination content
    mock_search_results = [
        {
            "title": "Top 10 Monuments in India",
            "url": "https://travelguide.com/india/top-monuments",
            "snippet": "From Taj Mahal in Agra to Victoria Memorial in Kolkata and Amber Fort in Jaipur."
        },
        {
            "title": "Kolkata Sightseeing & Heritage Highlights",
            "url": "https://kolkatatourism.org/highlights",
            "snippet": "Visiting Victoria Memorial and Howrah Bridge in Kolkata, West Bengal."
        }
    ]

    mock_fetch_results = [
        {
            "url": "https://travelguide.com/india/top-monuments",
            "text": """# Top 10 Monuments in India
### Taj Mahal
The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna river in Agra, Uttar Pradesh.

### Victoria Memorial
The Victoria Memorial is a large marble building in Kolkata, West Bengal, dedicated to the memory of Queen Victoria.

### Amber Fort
Amer Fort is a fort located in Amer, Jaipur, Rajasthan, known for its artistic style elements.

### Howrah Bridge
Howrah Bridge spans the Hooghly River linking Kolkata and Howrah in West Bengal.

### Ancient Riverside Pavilion
An unverified scenic riverside spot mentioned in passing without municipal location.
"""
        },
        {
            "url": "https://kolkatatourism.org/highlights",
            "text": """# Kolkata Sightseeing
### Victoria Memorial
Victoria Memorial is a grand landmark in central Kolkata.

### Howrah Bridge
Iconic cantilever bridge connecting Kolkata with Howrah station.
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
                    "destination": "West Bengal",
                    "duration_days": 4,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Romantic Couple",
                    "prompt": "Plan a 4 days trip to the West Bengal under $560",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["status"] == "completed"
            assert data["destination"] == "West Bengal"

            attraction_names = [a["name"] for a in data["attractions"]]

            # Taj Mahal and Amber Fort must be strictly rejected
            assert not any("Taj Mahal" in name for name in attraction_names), f"Taj Mahal must be rejected, found in: {attraction_names}"
            assert not any("Amber Fort" in name for name in attraction_names), f"Amber Fort must be rejected, found in: {attraction_names}"

            # Victoria Memorial must be accepted, deduplicated (only 1 card), and verified in_destination
            vm_items = [a for a in data["attractions"] if "Victoria Memorial" in a["name"]]
            assert len(vm_items) == 1, f"Expected exactly 1 Victoria Memorial card, got {len(vm_items)}"
            assert vm_items[0]["geographic_status"] == "in_destination"
            assert "West Bengal" in vm_items[0]["geographic_label"]

            # Howrah Bridge must be accepted and verified in_destination
            howrah_items = [a for a in data["attractions"] if "Howrah Bridge" in a["name"]]
            assert len(howrah_items) == 1
            assert howrah_items[0]["geographic_status"] == "in_destination"

            # Ancient Riverside Pavilion lacks municipal evidence -> unverified_location
            unverified_items = [a for a in data["attractions"] if "Ancient Riverside Pavilion" in a["name"]]
            if unverified_items:
                assert unverified_items[0]["geographic_status"] == "unverified_location"


@pytest.mark.asyncio
async def test_attraction_evidence_integrity_audit_and_deduplication():
    """
    Evidence Integrity Audit Regression Test:
    1. Two attractions extracted from the same listicle retain distinct, correctly associated evidence.
    2. A generic multi-attraction excerpt is not treated as strong independent evidence for every attraction.
    3. A Facebook result does not receive the same confidence as an official attraction source.
    4. A valid West Bengal landmark remains valid even if its source is weak.
    5. Taj Mahal and Amber Fort remain rejected for a West Bengal itinerary.
    6. Distinct source URLs and excerpts are preserved, and weak evidence is upgraded when strong source is available.
    """
    from backend.services.research_agent import _is_multi_attraction_list_text

    # Unit check: multi-attraction list detection
    assert _is_multi_attraction_list_text("Must-see sights include Victoria Memorial, Indian Museum, and Howrah Bridge.", "West Bengal") is True
    assert _is_multi_attraction_list_text("The Victoria Memorial is a grand marble building in central Kolkata.", "West Bengal") is False

    mock_search_results = [
        {
            "title": "Top Places in Kolkata on Facebook",
            "url": "https://www.facebook.com/kolkatatourism/posts/101202",
            "snippet": "Must-see places include Victoria Memorial, Indian Museum, Howrah Bridge, and Science City. Follow us!"
        },
        {
            "title": "Top Sights & Heritage Guide to Kolkata - West Bengal Tourism",
            "url": "https://kolkatatourism.gov.in/heritage-guide",
            "snippet": "Detailed review of Kolkata's premier historical monuments."
        }
    ]

    mock_fetch_results = [
        {
            "url": "https://kolkatatourism.gov.in/heritage-guide",
            "text": """# Kolkata Heritage Guide
### Highlights
Must-see places include Victoria Memorial, Indian Museum, and Howrah Bridge.

### Victoria Memorial
The Victoria Memorial is a large marble building in central Kolkata, constructed between 1906 and 1921. It is dedicated to the memory of Queen Victoria and features 25 grand historical galleries.

### Indian Museum
Founded in 1814 at the Asiatic Society of Bengal, the Indian Museum in Kolkata is the oldest and largest multipurpose museum in the Asia-Pacific region.

### Taj Mahal in Agra
The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna in Agra.
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
                    "destination": "West Bengal",
                    "duration_days": 4,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "prompt": "Plan a 4-day trip to West Bengal under $560",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            sources = data["sources"]
            attractions = data["attractions"]

            # 1. Source confidence check: Facebook is Lower Confidence, official tourism is Live Web Citation
            fb_sources = [s for s in sources if "facebook.com" in s["url"].lower()]
            assert len(fb_sources) == 1
            assert "Social Media Citation" in fb_sources[0]["confidence"]
            assert "Lower Confidence" in fb_sources[0]["confidence"]

            gov_sources = [s for s in sources if "kolkatatourism.gov.in" in s["url"].lower()]
            assert len(gov_sources) == 1
            assert "Live Web Citation" in gov_sources[0]["confidence"]

            # 2. Rejection of geographic mismatch: Taj Mahal must NOT appear
            att_names = [a["name"] for a in attractions]
            assert not any("Taj Mahal" in n for n in att_names)

            # 3. Two attractions from the same listicle retain distinct, correctly associated evidence
            vm = next((a for a in attractions if "Victoria Memorial" in a["name"]), None)
            im = next((a for a in attractions if "Indian Museum" in a["name"]), None)
            assert vm is not None, f"Expected Victoria Memorial in attractions: {att_names}"
            assert im is not None, f"Expected Indian Museum in attractions: {att_names}"

            assert vm["description"] != im["description"], "Victoria Memorial and Indian Museum must NOT share identical description"
            assert "marble building" in vm["description"].lower()
            assert "oldest and largest" in im["description"].lower()

            # Neither should have inherited the generic multi-attraction intro sentence
            assert not vm["description"].startswith("Must-see places include")
            assert not im["description"].startswith("Must-see places include")

            # 4. Victoria Memorial upgraded to official source URL
            assert "kolkatatourism.gov.in" in vm["source_url"].lower()
            assert vm["evidence_quality"] == "verified_grounded"
            assert vm["verification_warning"] is None

            # 5. Valid landmark with only passing mention remains valid in_destination with honest warning
            hb = next((a for a in attractions if "Howrah Bridge" in a["name"]), None)
            if hb:
                assert hb["geographic_status"] == "in_destination"
                assert hb["evidence_quality"] == "passing_mention"
                assert hb["verification_warning"] == "Location verified; details need confirmation"
                assert hb["description"] != vm["description"]
                assert hb["description"] != im["description"]


@pytest.mark.asyncio
async def test_research_architecture_stabilisation_two_targeted_queries():
    """
    Research Architecture Stabilisation Verification:
    1. Executes 2 targeted primary search queries across different categories/interests.
    2. Deduplicates search results across both queries by canonical URL.
    3. Fetches top 2 unique URLs to strictly control TinyFish consumption.
    4. Triggers at most 1 bounded retry query only when verified in-destination sights are 0.
    """
    executed_queries = []

    async def mock_search_tracker(query, location="US", language="en", purpose=None):
        executed_queries.append(query)
        if "top attractions" in query:
            return [
                {
                    "title": "Victoria Memorial Official Portal",
                    "url": "https://kolkatatourism.gov.in/victoria-memorial",
                    "snippet": "Grand marble monument dedicated to Queen Victoria in central Kolkata."
                }
            ]
        elif "best sights" in query or "unmissable" in query:
            return [
                {
                    "title": "Indian Museum Highlights Guide",
                    "url": "https://kolkatatourism.gov.in/indian-museum",
                    "snippet": "Asia's oldest multipurpose museum founded in 1814 in Kolkata."
                },
                # Duplicate of first query URL to test cross-query canonical deduplication
                {
                    "title": "Victoria Memorial Overview",
                    "url": "https://kolkatatourism.gov.in/victoria-memorial?utm_source=search",
                    "snippet": "Central Kolkata marble landmark."
                }
            ]
        else:
            return []

    async def mock_fetch_tracker(urls, format_type="markdown", purpose=None):
        return [
            {
                "url": u,
                "text": f"Grounded details and verified opening hours for {u}."
            }
            for u in urls
        ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", side_effect=mock_search_tracker), \
         patch("backend.services.tinyfish.TinyFishClient.fetch", side_effect=mock_fetch_tracker), \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key"):

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Kolkata",
                    "duration_days": 4,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "prompt": "Plan a 4-day trip to Kolkata",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            # 1. Exactly 2 targeted primary search queries executed
            assert len(executed_queries) == 2, f"Expected exactly 2 primary search queries, got: {executed_queries}"
            assert any("top attractions" in q for q in executed_queries)
            assert any("best sights" in q or "unmissable" in q for q in executed_queries)

            # 2. Canonical URL deduplication collapsed duplicate Victoria Memorial URL
            urls = [s["url"] for s in data["sources"]]
            assert len(urls) == 2, f"Expected 2 unique sources after deduplication, got: {urls}"

            # 3. Both landmarks synthesized with distinct evidence
            att_names = [a["name"] for a in data["attractions"]]
            assert any("Victoria Memorial" in n for n in att_names)
            assert any("Indian Museum" in n for n in att_names)


@pytest.mark.asyncio
async def test_global_research_engine_matrix_mumbai_and_foreign():
    """
    Verifies that the shared research architecture works reliably across arbitrary destinations:
    1. Indian metro (Mumbai): Gateway of India & Marine Drive in-destination, Elephanta Caves excursion, Taj Mahal rejected.
    2. Foreign destination (Tokyo): Tokyo Skytree & Senso-ji in-destination, Mount Fuji excursion, Colosseum rejected.
    3. Candidate-specific follow-up query formulation when evidence is weak.
    """
    # 1. Mumbai Test
    mumbai_search_results = [
        {
            "title": "Top Places to Visit in Mumbai - Maharashtra Tourism",
            "url": "https://mumbaitourism.gov.in/places",
            "snippet": "Discover top sights in South Mumbai including the Gateway of India and Marine Drive promenade."
        },
        {
            "title": "Gateway of India Overview",
            "url": "https://mumbaitourism.gov.in/gateway",
            "snippet": "20th century arch monument overlooking the Arabian Sea at Apollo Bunder in South Mumbai."
        },
        {
            "title": "Elephanta Caves Day Trip Guide",
            "url": "https://mumbaitourism.gov.in/elephanta",
            "snippet": "Ancient rock-cut temples located on an island 10 km east of Mumbai accessible by ferry."
        },
        {
            "title": "Taj Mahal Monument of Love",
            "url": "https://uptourism.gov.in/taj-mahal",
            "snippet": "Ivory-white marble mausoleum situated in Agra, Uttar Pradesh."
        }
    ]

    mumbai_fetch_results = [
        {
            "url": "https://mumbaitourism.gov.in/places",
            "text": """# Top Places in Mumbai
## Gateway of India
The Gateway of India is an iconic 20th-century arch monument erected to commemorate the landing of King George V at Apollo Bunder in Mumbai.

## Marine Drive
Marine Drive is a 3.6-kilometre-long boulevard along the Arabian Sea coast of South Mumbai.

## Elephanta Caves
A UNESCO World Heritage site situated on Elephanta Island 10 km east of Mumbai.

## Taj Mahal
A world wonder situated in Agra, Uttar Pradesh.
"""
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key"):

        mock_search.return_value = mumbai_search_results
        mock_fetch.return_value = mumbai_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Mumbai, Maharashtra",
                    "duration_days": 4,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "prompt": "Plan a 4-day trip to Mumbai under $500",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            attractions = data["attractions"]
            att_names = [a["name"] for a in attractions]

            # In-destination verification
            gateway = next((a for a in attractions if "Gateway of India" in a["name"]), None)
            assert gateway is not None, f"Expected Gateway of India in attractions: {att_names}"
            assert gateway["geographic_status"] == "in_destination"

            marine_drive = next((a for a in attractions if "Marine Drive" in a["name"]), None)
            assert marine_drive is not None, f"Expected Marine Drive in attractions: {att_names}"
            assert marine_drive["geographic_status"] == "in_destination"

            # Excursion verification
            elephanta = next((a for a in attractions if "Elephanta" in a["name"]), None)
            assert elephanta is not None, f"Expected Elephanta Caves in attractions: {att_names}"
            assert elephanta["geographic_status"] == "nearby_excursion"

            # Geographic mismatch rejection: Taj Mahal in Agra MUST be rejected for Mumbai
            assert not any("Taj Mahal" in n for n in att_names), "Taj Mahal must be rejected for Mumbai"

    # 2. Foreign Destination Test (Tokyo)
    tokyo_search_results = [
        {
            "title": "Tokyo Official Travel Guide - Must-See Sights",
            "url": "https://gotokyo.org/en/guide",
            "snippet": "Explore Tokyo's top cultural sights and modern wonders across Asakusa and Sumida."
        }
    ]

    tokyo_fetch_results = [
        {
            "url": "https://gotokyo.org/en/guide",
            "text": """# Best Attractions in Tokyo
## Senso-ji Temple
Senso-ji is Tokyo's oldest ancient Buddhist temple located in Asakusa.

## Tokyo Skytree
Tokyo Skytree is a broadcasting and observation tower in Sumida, Tokyo.

## Mount Fuji Excursion
Mount Fuji is an iconic active volcano located 100 km southwest of Tokyo, visited as a full-day tour.

## Colosseum
The ancient Roman amphitheatre located in Rome, Italy.
"""
        }
    ]

    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search_tokyo, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch_tokyo, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key"):

        mock_search_tokyo.return_value = tokyo_search_results
        mock_fetch_tokyo.return_value = tokyo_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Tokyo, Japan",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "prompt": "Plan a 5-day trip to Tokyo",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            attractions = data["attractions"]
            att_names = [a["name"] for a in attractions]

            # In-destination verification for foreign destination
            sensoji = next((a for a in attractions if "Senso" in a["name"]), None)
            assert sensoji is not None, f"Expected Senso-ji in Tokyo attractions: {att_names}"
            assert sensoji["geographic_status"] == "in_destination"

            skytree = next((a for a in attractions if "Skytree" in a["name"]), None)
            assert skytree is not None, f"Expected Tokyo Skytree in attractions: {att_names}"
            assert skytree["geographic_status"] == "in_destination"

            # Excursion verification
            fuji = next((a for a in attractions if "Fuji" in a["name"]), None)
            assert fuji is not None, f"Expected Mount Fuji in attractions: {att_names}"
            assert fuji["geographic_status"] == "nearby_excursion"

            # Geographic mismatch rejection: Colosseum in Rome MUST be rejected for Tokyo
            assert not any("Colosseum" in n for n in att_names), "Colosseum must be rejected for Tokyo"


@pytest.mark.asyncio
async def test_mumbai_root_token_and_geographic_verification():
    """
    Regression test verifying:
    1. 'Mumbai' root-token bug fix: 'Mumbai and the hills there' matches the canonical municipality 'Mumbai'.
    2. 'Plan 5 days in Mumbai under $900' handles budget and destination cleanly.
    3. Legitimate Mumbai landmarks (Gateway of India, Elephanta Caves, Chhatrapati Shivaji Maharaj Terminus)
       are verified and NEVER rejected as geographic mismatches.
    4. Out-of-destination landmark (Taj Mahal in Agra) is strictly rejected as a mismatch for Mumbai.
    5. Generic destinations not in predefined tables (e.g. Reykjavik) preserve local landmarks while
       still rejecting known foreign landmarks (e.g. Taj Mahal).
    6. Full research flow with mocked TinyFish retrieves and verifies legitimate Mumbai landmarks.
    """
    from backend.services.research_agent import (
        is_geographic_mismatch,
        classify_attraction_geography,
        sanitize_destination_name,
    )

    # 1. Prompt destination sanitization checks
    assert sanitize_destination_name("Mumbai") == "Mumbai"
    assert sanitize_destination_name("Mumbai and the hills there") == "Mumbai"
    assert sanitize_destination_name("Mumbai and surrounding hills") == "Mumbai"
    assert sanitize_destination_name("Plan 5 days in Mumbai under $900") == "Plan 5 days in Mumbai under $900"

    # 2. Geographic mismatch checks across variations
    for dest in ["Mumbai", "Mumbai and the hills there", "Mumbai and surrounding hills"]:
        # Legitimate landmarks must NOT be rejected
        assert not is_geographic_mismatch("Gateway of India", "Historic arch monument in Colaba, Mumbai.", dest), f"Gateway of India must not be rejected for {dest}"
        assert not is_geographic_mismatch("Elephanta Caves", "Ancient rock-cut temples on Elephanta Island.", dest), f"Elephanta Caves must not be rejected for {dest}"
        assert not is_geographic_mismatch("Chhatrapati Shivaji Maharaj Terminus", "Historic railway terminal in Mumbai.", dest), f"CST must not be rejected for {dest}"
        assert not is_geographic_mismatch("Marine Drive", "Arc road along the coast in Mumbai.", dest), f"Marine Drive must not be rejected for {dest}"

        # Genuinely out-of-destination landmarks MUST be rejected
        assert is_geographic_mismatch("Taj Mahal", "Mausoleum located in Agra, Uttar Pradesh.", dest), f"Taj Mahal must be rejected for {dest}"
        assert is_geographic_mismatch("Colosseum", "Ancient amphitheatre located in Rome, Italy.", dest), f"Colosseum must be rejected for {dest}"

    # 3. Generic destination not in predefined tables (e.g. Reykjavik, Iceland)
    generic_dest = "Reykjavik, Iceland"
    # Local landmark not in known foreign table must NOT be rejected
    assert not is_geographic_mismatch("Hallgrimskirkja", "Iconic Lutheran church in Reykjavik.", generic_dest), "Hallgrimskirkja must not be rejected for Reykjavik"
    # Foreign landmark with known authoritative location MUST be rejected
    assert is_geographic_mismatch("Taj Mahal", "Located in Agra.", generic_dest), "Taj Mahal must be rejected for Reykjavik"
    assert is_geographic_mismatch("Eiffel Tower", "Located in Paris, France.", generic_dest), "Eiffel Tower must be rejected for Reykjavik"

    # 4. Classification statuses for Mumbai
    status, label, _ = classify_attraction_geography("Gateway of India", "Historic waterfront arch in Colaba, Mumbai.", "", "Mumbai and the hills there")
    assert status == "in_destination", f"Gateway of India should be in_destination, got {status}"

    status, label, _ = classify_attraction_geography("Elephanta Caves", "Island cave temples 10 km from Mumbai.", "", "Mumbai and the hills there")
    assert status == "nearby_excursion", f"Elephanta Caves should be nearby_excursion, got {status}"

    # 5. Full research workflow with mocked TinyFish for 'Mumbai and the hills there'
    mumbai_search_results = [
        {
            "title": "Top Attractions in Mumbai - Gateway of India & Marine Drive",
            "url": "https://mumbaitourism.gov.in/highlights",
            "snippet": "Gateway of India and Marine Drive offer classic Arabian Sea views in South Mumbai. Chhatrapati Shivaji Maharaj Terminus is a UNESCO heritage railway terminal."
        },
        {
            "title": "Elephanta Caves Excursion from Mumbai Ferry",
            "url": "https://mumbaitourism.gov.in/elephanta-ferry",
            "snippet": "Elephanta Caves is an island day trip located 10 km east of Mumbai accessible by ferry from Gateway of India."
        },
        {
            "title": "India Golden Triangle Tour with Taj Mahal",
            "url": "https://indiatours.org/golden-triangle",
            "snippet": "Visit the Taj Mahal in Agra, Uttar Pradesh on this north India route."
        }
    ]

    mumbai_fetch_results = [
        {
            "url": "https://mumbaitourism.gov.in/highlights",
            "text": """
# Iconic Mumbai Attractions

## Gateway of India
The Gateway of India is an arch monument erected by the British Raj overlooking Mumbai Harbour in Colaba.

## Chhatrapati Shivaji Maharaj Terminus
Chhatrapati Shivaji Maharaj Terminus is a historic railway station and UNESCO World Heritage Site in Mumbai.

## Marine Drive
A 3.6-kilometre-long boulevard along the coast of South Mumbai.
"""
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key"):

        mock_search.return_value = mumbai_search_results
        mock_fetch.return_value = mumbai_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Mumbai and the hills there",
                    "duration_days": 5,
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "prompt": "Plan 5 days in Mumbai and the hills there under $900",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            attractions = data["attractions"]
            att_names = [a["name"] for a in attractions]

            # Gateway of India must be verified in_destination
            gateway = next((a for a in attractions if "Gateway" in a["name"]), None)
            assert gateway is not None, f"Expected Gateway of India in attractions: {att_names}"
            assert gateway["geographic_status"] == "in_destination"

            # CST must be verified in_destination
            cst = next((a for a in attractions if "Terminus" in a["name"] or "Chhatrapati" in a["name"]), None)
            assert cst is not None, f"Expected Chhatrapati Shivaji Maharaj Terminus in attractions: {att_names}"
            assert cst["geographic_status"] == "in_destination"

            # Elephanta Caves must be retained as nearby excursion
            elephanta = next((a for a in attractions if "Elephanta" in a["name"]), None)
            assert elephanta is not None, f"Expected Elephanta Caves in attractions: {att_names}"
            assert elephanta["geographic_status"] == "nearby_excursion"

            # Out of destination landmark (Taj Mahal) must be rejected
            assert not any("Taj Mahal" in n for n in att_names), "Taj Mahal must be rejected for Mumbai and the hills there"


@pytest.mark.asyncio
async def test_chennai_duration_srikalahasti_and_evidence_integrity():
    """
    Regression Test for Chennai post-fix quality audit:
    1. Duration integrity: 'Plan 5 days in Chennai under $900' produces exactly 5 days.
    2. 'Plan 6 days in Chennai under $900' produces exactly 6 days.
    3. Srikalahasti Temple is classified as 'nearby_excursion', NEVER 'in_destination'.
    4. Srikalahasti location_note contains distance/travel time disclosure (~115 km, 2.5-3 hours).
    5. Mixed listicle sentence mentioning Valluvar Kottam and Rajiv Gandhi Memorial
       is rejected from being bound as single-attraction evidence for Lord Ramanujar Temple.
    6. Chennai landmarks (Marina Beach, Kapaleeshwarar Temple) are classified as in_destination.
    """
    from backend.services.research_agent import classify_attraction_geography, _is_multi_attraction_list_text

    # Check 1 & 2: TripBrief duration synchronization
    brief_5 = TripBrief(
        destination="Chennai",
        duration_days=6,  # Stale duration in state
        prompt="Plan 5 days in Chennai under $900"
    )
    assert brief_5.duration_days == 5, f"Expected duration_days=5, got {brief_5.duration_days}"

    brief_6 = TripBrief(
        destination="Chennai",
        duration_days=5,  # Stale duration in state
        prompt="Plan 6 days in Chennai under $900"
    )
    assert brief_6.duration_days == 6, f"Expected duration_days=6, got {brief_6.duration_days}"

    # Check 3 & 4: Srikalahasti Temple geographic classification
    geo_status, geo_label, geo_note = classify_attraction_geography(
        "Srikalahasti Temple",
        "Ancient Shiva temple known for its Vayu linga located in Srikalahasti.",
        "",
        "Chennai"
    )
    assert geo_status == "nearby_excursion", f"Srikalahasti must be 'nearby_excursion', got {geo_status}"
    assert "115 km" in geo_note, f"Expected distance in location note: {geo_note}"
    assert "Andhra Pradesh" in geo_note, f"Expected state in location note: {geo_note}"

    # Check 5: Multi-attraction list text rejection
    mixed_sentence = "You can visit Lord Ramanujar Temple, Valluvar Kottam and the Great Rajiv Gandhi Memorial on this tour."
    assert _is_multi_attraction_list_text(mixed_sentence, "Chennai", current_landmark="Lord Ramanujar Temple") is True, \
        "Sentence mentioning Valluvar Kottam and Rajiv Gandhi Memorial must be detected as multi-attraction list text"

    # Clean sentence about Lord Ramanujar Temple alone is NOT rejected
    clean_sentence = "Lord Ramanujar Temple is an ancient temple with rich heritage and dedicated shrine."
    assert _is_multi_attraction_list_text(clean_sentence, "Chennai", current_landmark="Lord Ramanujar Temple") is False

    # Check 6: Core Chennai landmark classification
    geo_marina_status, _, _ = classify_attraction_geography(
        "Marina Beach",
        "Natural urban beach along the Bay of Bengal in Chennai.",
        "",
        "Chennai"
    )
    assert geo_marina_status == "in_destination", f"Marina Beach must be 'in_destination', got {geo_marina_status}"

    geo_kapaleeshwarar_status, _, _ = classify_attraction_geography(
        "Kapaleeshwarar Temple",
        "7th-century temple of Shiva located in Mylapore, Chennai.",
        "",
        "Chennai"
    )
    assert geo_kapaleeshwarar_status == "in_destination", f"Kapaleeshwarar Temple must be 'in_destination', got {geo_kapaleeshwarar_status}"

    # End-to-end research flow with mocked search/fetch
    chennai_search_results = [
        {
            "title": "Chennai Tourist Places - Top Sights and Excursions",
            "url": "https://tamilnadutourism.tn.gov.in/chennai",
            "snippet": "Discover Marina Beach, Kapaleeshwarar Temple, and day trips like Srikalahasti Temple from Chennai."
        }
    ]
    chennai_fetch_results = [
        {
            "url": "https://tamilnadutourism.tn.gov.in/chennai",
            "text": """# Chennai Travel Guide

## Marina Beach
Marina Beach is a natural urban beach in Chennai along the Bay of Bengal.

## Kapaleeshwarar Temple
Kapaleeshwarar Temple is a temple of Shiva located in Mylapore, Chennai.

## Srikalahasti Temple
Srikalahasti Temple is a renowned pilgrimage center located in Andhra Pradesh, around 115 km from Chennai.

## Lord Ramanujar Temple
Lord Ramanujar Temple, Valluvar Kottam and the Great Rajiv Gandhi Memorial are popular cultural sites.
"""
        }
    ]

    transport = ASGITransport(app=app)
    with patch("backend.services.tinyfish.TinyFishClient.search", new_callable=AsyncMock) as mock_search, \
         patch("backend.services.tinyfish.TinyFishClient.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("backend.config.TINYFISH_API_KEY", "mock-tinyfish-key"):

        mock_search.return_value = chennai_search_results
        mock_fetch.return_value = chennai_fetch_results

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "trip_brief": {
                    "destination": "Chennai",
                    "duration_days": 6,  # Stale duration in brief; must sync to 5 from prompt
                    "budget_tier": "Balanced Explorer",
                    "group_size": "Couple",
                    "prompt": "Plan 5 days in Chennai under $900",
                    "mode": "quick"
                },
                "selected_categories": ["attractions"],
                "confirmed": True
            }
            res = await ac.post("/api/trips/research", json=payload)
            assert res.status_code == 200
            data = res.json()

            assert data["duration_days"] == 5, f"Expected duration_days=5, got {data['duration_days']}"
            attractions = data["attractions"]
            att_names = [a["name"] for a in attractions]

            # Marina Beach or Kapaleeshwarar verified in_destination
            mb = next((a for a in attractions if "Marina Beach" in a["name"]), None)
            if mb:
                assert mb["geographic_status"] == "in_destination"

            # Srikalahasti Temple must NOT be in_destination
            sk = next((a for a in attractions if "Srikalahasti" in a["name"]), None)
            if sk:
                assert sk["geographic_status"] == "nearby_excursion", f"Srikalahasti must be nearby_excursion, got {sk['geographic_status']}"

            # Lord Ramanujar Temple must NOT inherit mixed excerpt mentioning Valluvar Kottam
            lr = next((a for a in attractions if "Ramanujar" in a["name"]), None)
            if lr:
                desc = lr.get("description", "")
                assert "Valluvar Kottam" not in desc, f"Mixed excerpt must not leak into description: {desc}"


def test_chennai_santhome_deduplication():
    from backend.services.research_agent import _normalize_attraction_key
    from backend.schemas import AttractionItem

    k1 = _normalize_attraction_key("Santhome Cathedral Basilica", "Chennai")
    k2 = _normalize_attraction_key("San Thome Basilica", "Chennai")
    k3 = _normalize_attraction_key("Santhome Cathedral", "Chennai")
    assert k1 == k2 == k3 == "san thome basilica", f"Santhome variations must normalize identically: {k1}, {k2}, {k3}"

    cands = [
        AttractionItem(
            id="att-1",
            name="Santhome Cathedral Basilica",
            description="Referenced in source overview; detailed individual venue prose not provided in snippet.",
            source_url="https://source1.com",
            source_title="Source 1",
            insider_tip="Visit in the morning",
            evidence_quality="passing_mention"
        ),
        AttractionItem(
            id="att-2",
            name="San Thome Basilica",
            description="Historic neo-Gothic Catholic minor basilica built over the tomb of Saint Thomas in Santhome, Chennai.",
            source_url="https://source2.com",
            source_title="Source 2",
            insider_tip="Visit during evening mass",
            evidence_quality="verified_grounded"
        )
    ]
    seen_keys = set()
    cleaned = []
    for cand in cands:
        norm_key = _normalize_attraction_key(cand.name, "Chennai")
        if norm_key in seen_keys:
            existing = next((a for a in cleaned if _normalize_attraction_key(a.name, "Chennai") == norm_key), None)
            if existing and existing.evidence_quality == "passing_mention" and cand.evidence_quality == "verified_grounded":
                existing.description = cand.description
                existing.source_url = cand.source_url
                existing.source_title = cand.source_title
                existing.evidence_quality = "verified_grounded"
            continue
        seen_keys.add(norm_key)
        cleaned.append(cand)

    assert len(cleaned) == 1, f"Expected 1 deduplicated card, got {len(cleaned)}"
    assert "tomb of Saint Thomas" in cleaned[0].description
    assert cleaned[0].evidence_quality == "verified_grounded"











