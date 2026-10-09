// Realistic sample research results for TripPilot AI prototype
// Note: As per project requirements, all data below is clearly labeled as DEMO CONTENT.
// No live search or fabricated verified credentials are claimed.

export const SAMPLE_TRIPS = {
  "Kyoto, Japan": {
    meta: {
      isDemoContent: true,
      demoLabel: "Demo Prototype Research Result",
      destination: "Kyoto, Japan",
      durationDays: 5,
      season: "Autumn / October",
      groupSize: "Couple / 2 Adults",
      travelStyle: "Balanced Explorer",
      transportPreference: "Scenic Rail & High-Speed Shinkansen",
      totalEstimatedBudgetUsd: 2840,
      currency: "USD",
      confidenceScore: "94% Match",
      synthesisDate: "2026-10-10",
      generatedPrompt: "5 days exploring Kyoto's quiet Zen temples, morning bamboo trails, hidden matcha spots, and ryokan stays on a balanced budget."
    },
    days: [
      {
        day: 1,
        title: "Arrival, Historic Machiya Alleys & Lantern Glow",
        area: "Higashiyama & Gion",
        theme: "Heritage Atmosphere",
        transitTip: "Use ICOCA IC Card for subway; take Tozai line to Sanjo Keihan.",
        walkingPace: "Approx. 9,400 steps • Moderate grade",
        slots: {
          morning: {
            time: "09:30 - 12:00",
            title: "Check-in & Sanjo Coffee at Weekenders",
            description: "Drop luggage at the boutique stay, grab pour-over single-origin roast tucked behind a quiet parking alley in central Kyoto.",
            location: "Tomikoji-dori, Nakagyo Ward",
            category: "Food & Coffee",
            duration: "1.5 hours",
            costNote: "$6 / person (Demo estimate)",
            tag: "Hidden Neighborhood Gem",
            agentTip: "Arrive right at opening to sit in the tranquil courtyard bench before locals queue."
          },
          afternoon: {
            time: "13:30 - 16:30",
            title: "Kennin-ji Zen Garden & Twin Dragons Ceiling",
            description: "Kyoto's oldest Zen monastery. Contemplate the dry-gravel courtyard and gaze up at the monumental ceiling painting of Twin Dragons without the crushing crowds of Kiyomizu-dera.",
            location: "Gion District",
            category: "Attractions",
            duration: "2.5 hours",
            costNote: "$7 entry (Demo estimate)",
            tag: "UNESCO Culture",
            agentTip: "Remove shoes at the entrance and sit on the tatami veranda for unhurried garden meditation."
          },
          evening: {
            time: "18:00 - 21:00",
            title: "Lantern-lit Pontocho & Kamo River Casual Kaiseki",
            description: "Stroll along the narrow cobbled Pontocho alley as traditional paper lanterns flicker on. Settle into a riverside seasonal kaiseki dinner with grilled sweetfish.",
            location: "Pontocho Alley",
            category: "Food & Dining",
            duration: "2.5 hours",
            costNote: "$55 / person (Demo estimate)",
            tag: "Evening Ambiance",
            agentTip: "Reservation recommended 3 weeks ahead for direct river-view seating (Kamo River veranda)."
          }
        }
      },
      {
        day: 2,
        title: "Early Mist in Arashiyama & Private Bamboo Pathways",
        area: "Western Kyoto / Sagano",
        theme: "Bamboo Groves & Imperial Gardens",
        transitTip: "Randen tram from Shijo-Omiya gives scenic old-school streetcar views.",
        walkingPace: "Approx. 13,000 steps • Flat riverbanks",
        slots: {
          morning: {
            time: "07:00 - 09:30",
            title: "Dawn Bamboo Path & Okochi Sanso Villa",
            description: "Beat tour buses by arriving at the bamboo forest at 7:15 AM. Continue directly into Okochi Sanso Villa gardens for panoramic vistas over the Hozu River and complimentary matcha.",
            location: "Arashiyama",
            category: "Photo Spots",
            duration: "2.5 hours",
            costNote: "$8 villa entry + tea (Demo)",
            tag: "Golden Hour Photo",
            agentTip: "Soft morning light through the towering bamboo stems creates ethereal volumetric rays between 07:30 and 08:15 AM."
          },
          afternoon: {
            time: "11:30 - 15:00",
            title: "Tenryu-ji Sogenchi Garden & Sagano Cycling",
            description: "Marvel at the 14th-century pond reflecting Mount Arashiyama. Rent e-bikes outside the station to ride 15 minutes north to Giou-ji, a moss-draped secluded sanctuary.",
            location: "Sagano North",
            category: "Attractions",
            duration: "3.5 hours",
            costNote: "$12 e-bike + entry (Demo)",
            tag: "Nature & Zen",
            agentTip: "Giou-ji's moss garden has over 40 moss varieties and is 90% quieter than main temple circuits."
          },
          evening: {
            time: "17:30 - 20:30",
            title: "Soba Noodles & Japanese Craft Beer Tasting",
            description: "Head back toward Karasuma for cold hand-rolled buckwheat soba served with seasonal duck broth, followed by local microbrews at Before9 craft taproom.",
            location: "Karasuma Oike",
            category: "Food & Dining",
            duration: "2 hours",
            costNote: "$28 / person (Demo estimate)",
            tag: "Culinary",
            agentTip: "Try the Sansho pepper pale ale brewed with local botanical herbs."
          }
        }
      },
      {
        day: 3,
        title: "Northern Sanctuaries & The Philosopher's Meander",
        area: "Sakyo Ward / Higashiyama North",
        theme: "Philosophy & Stoneware Artisans",
        transitTip: "Kyoto City Bus #203 or pleasant bicycle route along the canal.",
        walkingPace: "Approx. 11,200 steps • Gentle incline",
        slots: {
          morning: {
            time: "08:30 - 11:30",
            title: "Ginkaku-ji (Silver Pavilion) & Dry Sand Sea",
            description: "Walk the immaculate white sand cone (Kogetsudai) and hike the winding hill path behind the pavilion for a view across the city.",
            location: "Sakyo Ward",
            category: "Attractions",
            duration: "2.5 hours",
            costNote: "$5 entry (Demo estimate)",
            tag: "UNESCO Site",
            agentTip: "The elevated hill trail has the best framing with the wooden pavilion nestled among pine trees."
          },
          afternoon: {
            time: "12:00 - 15:30",
            title: "Philosopher's Path Canal Walk & Honen-in Seclusion",
            description: "Follow the stone path beside the gentle cherry canal to Honen-in, entered through a thatched gate framed by raked sand mounds that change patterns daily.",
            location: "Philosopher's Path",
            category: "Photo Spots",
            duration: "3 hours",
            costNote: "Free admission (Demo)",
            tag: "Hidden Sanctuary",
            agentTip: "Stop by Monk's Coffee midway for a quiet break overlooking the water."
          },
          evening: {
            time: "18:00 - 21:00",
            title: "Charcoal Yakitori Bar & Gion Evening Lanterns",
            description: "Small 10-seat counter serving heirloom Jidori chicken grilled over white binchotan charcoal. Finish with a walk through the quiet cobblestone preservation alleys of Shirakawa.",
            location: "Gion Shirakawa",
            category: "Food & Dining",
            duration: "2.5 hours",
            costNote: "$42 / person (Demo estimate)",
            tag: "Gastronomy",
            agentTip: "Ask for the chef's 'Omakase 7 Skewers' for the most balanced seasonal selection."
          }
        }
      },
      {
        day: 4,
        title: "Vermilion Torii Torrents & Green Tea Cultivation in Uji",
        area: "Southern Kyoto & Uji",
        theme: "Spiritual Gateways & Matcha Heritage",
        transitTip: "JR Nara Line from Kyoto Station to Inari (5 min), then onwards to Uji (20 min).",
        walkingPace: "Approx. 14,500 steps • Hill climb on mountain trails",
        slots: {
          morning: {
            time: "06:30 - 09:30",
            title: "Fushimi Inari Mountain Summit Trail at Sunrise",
            description: "Hike past the initial crowded gates up to the Yotsutsuji intersection and summit loop as dawn filters through thousands of bright vermilion torii arches.",
            location: "Fushimi Ward",
            category: "Photo Spots",
            duration: "3 hours",
            costNote: "Free admission (Demo)",
            tag: "Golden Hour Icon",
            agentTip: "95% of travelers turn back at the halfway viewpoint. The upper summit loop is peaceful with mossy stone shrines and zero tour groups."
          },
          afternoon: {
            time: "11:00 - 15:30",
            title: "Uji Heritage: Byodoin Phoenix Hall & Ceremonial Matcha Whisking",
            description: "Board the rapid train to Uji, the historic epicenter of Japanese green tea. Admire the floating reflection of Byodoin (featured on the 10-yen coin) and visit a 300-year-old tea merchant.",
            location: "Uji City",
            category: "Attractions",
            duration: "4 hours",
            costNote: "$18 entry + tea tasting (Demo)",
            tag: "Culinary Heritage",
            agentTip: "Sample freshly stone-ground Koicha (thick ceremonial grade matcha) at Tsuen Tea, operating beside the Uji River since 1160 AD."
          },
          evening: {
            time: "18:30 - 21:30",
            title: "Casual Izakaya Gathering near Kyoto Station",
            description: "Celebrate day four with sake flight tastings, Kyoto-style Obanzai small plates, and crispy seasonal vegetable tempura.",
            location: "Shimogyo Ward",
            category: "Food & Dining",
            duration: "2.5 hours",
            costNote: "$38 / person (Demo estimate)",
            tag: "Local Culture",
            agentTip: "Order the seasonal Kamo eggplant glazed with sweet red hatcho miso."
          }
        }
      },
      {
        day: 5,
        title: "Morning Market Crafts, Zen Farewell & Departure",
        area: "Central Kyoto",
        theme: "Artisanal Souvenirs & Mindful Departure",
        transitTip: "Haruka Airport Express direct from Kyoto Station to Kansai International Airport (75 min).",
        walkingPace: "Approx. 6,800 steps • Leisure stroll",
        slots: {
          morning: {
            time: "09:00 - 12:00",
            title: "Nishiki Market Backstreets & Handmade Knife Studio",
            description: "Browse traditional wooden craft studios, handcrafted copper tea canisters at Kaikado, and taste warm dashi rolled omelettes.",
            location: "Nakagyo Ward",
            category: "Attractions",
            duration: "2.5 hours",
            costNote: "$15 tastings (Demo)",
            tag: "Craft & Culinary",
            agentTip: "Kaikado tea canisters are hand-hammered heirloom pieces made to age with a rich brass patina over decades."
          },
          afternoon: {
            time: "13:00 - 15:30",
            title: "Daitoku-ji Hidden Sub-Temples (Zuiho-in)",
            description: "Escape final city noise in the serene rock gardens of Daitoku-ji. The crushed raked stone at Zuiho-in evokes crashing ocean waves designed by legendary landscape architect Mirei Shigemori.",
            location: "Kita Ward",
            category: "Attractions",
            duration: "2 hours",
            costNote: "$5 entry (Demo estimate)",
            tag: "Zen Farewell",
            agentTip: "One of the most contemplative spaces in Japan; sit on the wooden corridor with a light breeze."
          },
          evening: {
            time: "16:30 - 18:00",
            title: "Bento Box Selection & Kansai Express Departure",
            description: "Pick up an artisanal seasonal Ekiben at Kyoto Station Isetan B2 gourmet hall before boarding the Haruka Express.",
            location: "Kyoto Station",
            category: "Transport",
            duration: "1.5 hours",
            costNote: "$24 ticket + bento (Demo)",
            tag: "Transit Exit",
            agentTip: "Reserve seats on the right side of the Haruka Express for sunset views toward Osaka."
          }
        }
      }
    ],
    accommodations: [
      {
        id: "acc-1",
        name: "Sowaka Luxury Machiya Ryokan",
        type: "Boutique Heritage Ryokan",
        neighborhood: "Gion Yasaka",
        vibeScore: 98,
        pricePerNightDemo: "$420",
        priceTier: "Luxury Splurge",
        matchReason: "Restored 100-year-old traditional ryokan blending cedar architecture with whisper-quiet Japanese gardens.",
        pros: ["Walk to Gion in 4 min", "Private in-room cypress bath", "Michelin-curated breakfast"],
        cons: ["Higher price point", "Only 23 bespoke rooms"],
        transitMinutes: "8 min walk to Gion-Shijo Station",
        image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
        sourceBadge: "Curated Boutique Registry [Demo Source]"
      },
      {
        id: "acc-2",
        name: "The Celestine Kyoto Gion",
        type: "Contemporary Design Hotel",
        neighborhood: "Higashiyama",
        vibeScore: 94,
        pricePerNightDemo: "$230",
        priceTier: "Balanced Explorer (Recommended)",
        matchReason: "Optimal sweet spot between authentic Japanese hospitality, modern soundproofing, and central walking radius.",
        pros: ["Large basement public sento bath", "Free evening sake lounge", "Prime walking score 96/100"],
        cons: ["Slightly smaller standard rooms"],
        transitMinutes: "7 min walk to Kiyomizu-Gojo Station",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
        sourceBadge: "Kansai Hospitality Index [Demo Source]"
      },
      {
        id: "acc-3",
        name: "Ace Hotel Kyoto (Kengo Kuma Design)",
        type: "Architectural Lifestyle Hotel",
        neighborhood: "Karasuma Oike",
        vibeScore: 91,
        pricePerNightDemo: "$270",
        priceTier: "Design & Cultural Hub",
        matchReason: "Stunning revitalized red-brick telephone exchange designed by world-renowned architect Kengo Kuma.",
        pros: ["Direct subway station connection", "Vibrant lobby & record players in rooms", "Top-tier specialty coffee on-site"],
        cons: ["Livelier atmosphere, less traditional stillness"],
        transitMinutes: "Direct underground access (0 min)",
        image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80",
        sourceBadge: "Design Hotels International [Demo Source]"
      }
    ],
    attractions: [
      {
        id: "att-1",
        name: "Fushimi Inari-Taisha Upper Peaks",
        category: "Photo Spots",
        dwellTime: "3.5 Hours",
        bestTime: "06:30 - 08:30 AM",
        crowdFactor: "Low before 8am (High after 9am)",
        description: "Thousands of brilliant cinnabar torii winding up holy Mount Inari through whispering cedar groves.",
        tip: "Hike all the way to the Mitsutsuji shrine for misty, deserted paths and wild bamboo groves.",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "att-2",
        name: "Okochi Sanso Garden & Teahouse",
        category: "Attractions",
        dwellTime: "1.5 Hours",
        bestTime: "10:00 AM",
        crowdFactor: "Very Low (Hidden gem)",
        description: "Former estate of silent film star Denjiro Okochi, meticulously crafted over 30 years with seasonal vistas of the gorge.",
        tip: "Ticket includes hot matcha and sweet wagashi served in an open-air pavilion surrounded by maples.",
        image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "att-3",
        name: "Honen-in Thatched Gate & Moss Sanctuary",
        category: "Attractions",
        dwellTime: "1 Hour",
        bestTime: "14:00 PM",
        crowdFactor: "Quiet & Contemplative",
        description: "A moss-carpeted temple tucked away along the Philosopher's Path with raked white sand mounds honoring seasonal motifs.",
        tip: "Step softly across the stone bridge over the koi pond; photography is welcome outside the main hall.",
        image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "att-4",
        name: "Byodoin Phoenix Hall (Uji)",
        category: "UNESCO Heritage",
        dwellTime: "2.5 Hours",
        bestTime: "11:30 AM",
        crowdFactor: "Moderate",
        description: "Pure Land Buddhist architecture mirrored in a tranquil pond, celebrated for its twin bronze phoenix sculptures.",
        tip: "Visit the underground Hoshokan Museum to see the original thousand-year-old Bodhisattvas on floating clouds.",
        image: "https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80"
      }
    ],
    budgetBreakdown: {
      totalUsd: 2840,
      perPersonUsd: 1420,
      currencySymbol: "$",
      categories: [
        { name: "Accommodations (4 Nights)", amount: 1120, percentage: 39, color: "#FFE600" },
        { name: "Dining & Culinary Tastings", amount: 780, percentage: 27, color: "#3B82F6" },
        { name: "Transit, IC Cards & Haruka Express", amount: 260, percentage: 9, color: "#10B981" },
        { name: "Temples, Passes & E-bikes", amount: 340, percentage: 12, color: "#8B5CF6" },
        { name: "Artisanal Souvenirs & Contingency Buffer", amount: 340, percentage: 12, color: "#F97316" }
      ],
      agentNote: "Budget optimized for 'Balanced Explorer'. Staying at The Celestine Kyoto balances boutique charm while leaving generous room for fine seasonal dining and matcha tastings."
    },
    sourcesBibliography: [
      {
        id: "src-1",
        title: "Kyoto City Official Transit Bureau API [Mock Specimen]",
        category: "Transport & Pacing",
        domain: "city.kyoto.lg.jp",
        confidence: "High (Official timetable data)",
        summary: "Cross-referenced bus route saturation and subway transfer timings to prevent rush-hour congestion.",
        isDemoLink: true
      },
      {
        id: "src-2",
        title: "Japan National Tourism Organization (JNTO) Heritage Registry [Demo]",
        category: "Attractions",
        domain: "japan.travel",
        confidence: "Verified Historical (Demo Source)",
        summary: "Validated opening seasons, admission rules, and cultural preservation guidelines for temple gardens.",
        isDemoLink: true
      },
      {
        id: "src-3",
        title: "Kansai Gastronomy & Michelin Guide Bib Gourmand Kyoto 2025 [Demo]",
        category: "Food & Dining",
        domain: "guide.michelin.com",
        confidence: "Curated Culinary (Demo Reference)",
        summary: "Verified seasonal Kaiseki ingredient availability, reservation protocols, and English menu accessibility.",
        isDemoLink: true
      },
      {
        id: "src-4",
        title: "The Photographer's Ephemeris & Astronomical Solar Azimuth [Demo]",
        category: "Photo Spots",
        domain: "photoephemeris.com",
        confidence: "Algorithmic Solar Calculation (Demo Source)",
        summary: "Calculated sun angles and golden-hour intervals for bamboo groves (07:30-08:15) and Fushimi Inari summit.",
        isDemoLink: true
      }
    ]
  },
  "Amalfi Coast, Italy": {
    meta: {
      isDemoContent: true,
      demoLabel: "Demo Prototype Research Result",
      destination: "Amalfi Coast, Italy",
      durationDays: 7,
      season: "Late Spring / May",
      groupSize: "Couple / 2 Adults",
      travelStyle: "Luxury Comfort",
      transportPreference: "Private Water Taxis & Clifftop Ferries",
      totalEstimatedBudgetUsd: 4650,
      currency: "USD",
      confidenceScore: "92% Match",
      synthesisDate: "2026-10-10",
      generatedPrompt: "7 days along the Amalfi Coast and Capri with lemon grove walks, clifftop aperitivos, and scenic ferry transfers for two."
    },
    days: [
      {
        day: 1,
        title: "Arrival in Positano & Sunset Spritz Over the Cliffs",
        area: "Positano",
        theme: "Vertical Village Magic",
        transitTip: "Hydrofoil ferry from Salerno or Naples avoids the hairpin coastal road traffic.",
        walkingPace: "Approx. 7,200 steps • Steep stone stairs",
        slots: {
          morning: {
            time: "10:30 - 13:00",
            title: "Check-in at Clifftop Villa & Lemon Sorbet Welcome",
            description: "Settle into your balcony overlooking the pastel cascades of Positano. Savor a chilled Amalfi lemon sorbet served inside a fresh frozen lemon peel.",
            location: "Via Cristoforo Colombo",
            category: "Food & Dining",
            duration: "2 hours",
            costNote: "$14 / person (Demo estimate)",
            tag: "Coastal Welcome",
            agentTip: "Request luggage porter service from the pier to spare yourself carrying bags up 300 vertical stone steps."
          },
          afternoon: {
            time: "14:30 - 17:30",
            title: "Fornillo Beach Hidden Pathway & Linen Boutiques",
            description: "Follow the romantic cliffside walkway away from the bustling main marina toward the quieter, pebble-strewn Fornillo beach.",
            location: "Fornillo Cove",
            category: "Attractions",
            duration: "3 hours",
            costNote: "Free access (Demo)",
            tag: "Hidden Cove",
            agentTip: "Rent wooden sun loungers at the far end of the cove for crystal-clear emerald water swimming."
          },
          evening: {
            time: "19:00 - 22:00",
            title: "Franco's Bar Sunset Aperitivo & Candlelit Trattoria",
            description: "Toast with an Aperol Spritz as the village lights illuminate the vertical cliffs, followed by fresh lobster linguine at Chez Black.",
            location: "Positano Clifftop",
            category: "Food & Dining",
            duration: "3 hours",
            costNote: "$85 / person (Demo estimate)",
            tag: "Iconic Sunset",
            agentTip: "Arrive at Franco's Bar at 18:30 PM sharp; they operate on first-come seating with no advance reservations."
          }
        }
      },
      {
        day: 2,
        title: "Hiking the Path of the Gods (Sentiero degli Dei)",
        area: "Bomerano to Nocelle",
        theme: "Panoramic Clifftops",
        transitTip: "Early bus to Bomerano starts the trail heading downhill toward Positano.",
        walkingPace: "Approx. 15,000 steps • Rugged mountain footpath",
        slots: {
          morning: {
            time: "08:00 - 12:30",
            title: "Sentiero degli Dei Ridge Hike",
            description: "Walk between sky and sea 600 meters above the Mediterranean with sweeping views of the entire Sorrentine Peninsula and Capri in the distance.",
            location: "Path of the Gods Ridge",
            category: "Photo Spots",
            duration: "4.5 hours",
            costNote: "Free trail (Demo)",
            tag: "Epic Trek",
            agentTip: "Wear proper grip hiking shoes; carry at least 1.5L water per person as there are no refills until Nocelle."
          },
          afternoon: {
            time: "13:00 - 15:30",
            title: "Rustic Farm Lunch at Il Chiosco del Sentiero",
            description: "Rest your legs in Nocelle with fresh buffalo mozzarella, heirloom tomatoes, and cold sparkling lemon granita.",
            location: "Nocelle Village",
            category: "Food & Dining",
            duration: "2 hours",
            costNote: "$30 / person (Demo estimate)",
            tag: "Farm to Table",
            agentTip: "Take the local minibus down to Positano instead of walking the 1,700 vertical stairs down to Arienzo."
          },
          evening: {
            time: "18:00 - 21:00",
            title: "Balcony Relaxation & Wood-fired Pizza under Citrus Trellises",
            description: "Unwind on your private terrace before enjoying thin-crust Neapolitan pizza scented by surrounding lemon blossoms.",
            location: "Positano",
            category: "Food & Dining",
            duration: "2.5 hours",
            costNote: "$35 / person (Demo estimate)",
            tag: "Comfort Dining",
            agentTip: "Ask for house Limoncello made from sfusato amalfitano lemons."
          }
        }
      }
    ],
    accommodations: [
      {
        id: "acc-amalfi-1",
        name: "Hotel Villa Franca Positano",
        type: "Boutique Clifftop Hideaway",
        neighborhood: "Upper Positano Cliffs",
        vibeScore: 97,
        pricePerNightDemo: "$680",
        priceTier: "Haute Luxe",
        matchReason: "Rooftop infinity pool with 360-degree views of the sea and romantic village cascades.",
        pros: ["Unmatched panoramic views", "Complimentary shuttle to marina", "Rooftop cocktail deck"],
        cons: ["Steep pricing in high season"],
        transitMinutes: "5 min shuttle to beach pier",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
        sourceBadge: "Amalfi Coast Hoteliers Guild [Demo Source]"
      },
      {
        id: "acc-amalfi-2",
        name: "Palazzo Murat Historic Heritage Villa",
        type: "18th-Century Noble Palazzo",
        neighborhood: "Central Positano",
        vibeScore: 93,
        pricePerNightDemo: "$490",
        priceTier: "Luxury Comfort (Recommended)",
        matchReason: "Secluded botanical courtyard filled with antique citrus trees in the pedestrian heart of the village.",
        pros: ["Zero stairs to village center", "Historic royal heritage", "Serene courtyard pool"],
        cons: ["Sea views from upper floors only"],
        transitMinutes: "3 min flat walk to beach",
        image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
        sourceBadge: "Historic Palazzi of Campania [Demo Source]"
      }
    ],
    attractions: [
      {
        id: "att-amalfi-1",
        name: "Villa Cimbrone Infinity Terrace (Ravello)",
        category: "Photo Spots",
        dwellTime: "2.5 Hours",
        bestTime: "16:00 PM (Golden Hour)",
        crowdFactor: "Low in late afternoon",
        description: "Marble busts overlooking the endless cobalt Mediterranean from an 11th-century cliffside garden.",
        tip: "Take the morning bus to Amalfi, then the open-top coach up to Ravello for easy panoramic transit.",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "att-amalfi-2",
        name: "Emerald Grotto (Grotta dello Smeraldo)",
        category: "Attractions",
        dwellTime: "1 Hour",
        bestTime: "11:00 AM - 13:00 PM",
        crowdFactor: "Moderate",
        description: "Natural marine cave illuminated by subterranean sunlight filtering through the deep sea floor.",
        tip: "Small rowboats take you inside; visit mid-day when the sun is directly overhead for vivid turquoise colors.",
        image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80"
      }
    ],
    budgetBreakdown: {
      totalUsd: 4650,
      perPersonUsd: 2325,
      currencySymbol: "$",
      categories: [
        { name: "Luxury Clifftop Stays (6 Nights)", amount: 2450, percentage: 53, color: "#FFE600" },
        { name: "Gastronomic Dining & Clifftop Bars", amount: 1100, percentage: 24, color: "#3B82F6" },
        { name: "Private Ferries & Capri Hydrofoils", amount: 480, percentage: 10, color: "#10B981" },
        { name: "Villa Gardens & Beach Clubs", amount: 320, percentage: 7, color: "#8B5CF6" },
        { name: "Luggage Porters & Contingency", amount: 300, percentage: 6, color: "#F97316" }
      ],
      agentNote: "Budget tailored for 'Luxury Comfort'. Stays and private ferries represent the primary investment."
    },
    sourcesBibliography: [
      {
        id: "src-amalfi-1",
        title: "Capri & Amalfi Maritime Ferry Schedules [Mock Data]",
        category: "Transport",
        domain: "capritourism.com",
        confidence: "Seasonal Timetable (Demo Link)",
        summary: "Validated fast hydrofoil connections between Positano, Capri Marina Grande, and Amalfi port.",
        isDemoLink: true
      },
      {
        id: "src-amalfi-2",
        title: "Campania Regional Heritage Authority [Demo]",
        category: "Attractions",
        domain: "regione.campania.it",
        confidence: "Verified Historical Registry (Demo)",
        summary: "Checked opening hours and conservation rules for Ravello villas and nature trails.",
        isDemoLink: true
      }
    ]
  }
};
