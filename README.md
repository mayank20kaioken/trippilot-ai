# TripPilot AI — Frontend Prototype (AZINHACK '26)

> **"Your next great trip, already figured out."**  
> An AI-powered travel research agent prototype featuring editorial typography, interactive 3D agency aesthetics, and source-backed itinerary synthesis.

---

## 🧭 Product Overview

**TripPilot AI** is an autonomous travel research agent. A traveler describes their ideal trip in natural language or configures personal parameters via a guided questionnaire. They preview and customize the research scope across 5 travel categories (stays, transport, attractions, food, and photo spots), confirm authorization, and observe the agent synthesis pipeline in real time. The resulting dashboard delivers a day-by-day schedule, accommodation comparison matrix, attraction cards with crowd avoidance hints, a budget breakdown, and transparent source citations.

---

## 🎨 Design Direction & 3D Agency Aesthetic

Inspired by modern 3D agency experiences (such as geometric tactile studio compositions):
- **Editorial Typography**: Ultra-bold condensed headings (`Syne`) paired with modern geometric UI sans (`Outfit`) and monospace telemetry (`JetBrains Mono`).
- **Signature Color Palette**: Vibrant electric/ocean blue (`#1940E6` / `#091547`), stark contrast white, and warm canary yellow CTAs (`#FFE600`).
- **Interactive 3D Tactile Sculpture**: Built with Three.js featuring an architectural podium, terracotta archway, studio stairs, geometric torus, cone, and floating spheres with real-time mouse parallax and soft shadows.
- **Visual Toggle**: One-click toggle between the 3D Agency Visual and high-resolution destination photography showcase.
- **Glassmorphism & Guide Lines**: Subtle editorial vertical grid lines and frosted acrylic panels (`backdrop-blur-xl`).
- **Accessibility**: High-contrast ratios and full `prefers-reduced-motion` compliance.

---

## ⚡ Tech Stack

- **React 19** — Component architecture & state management
- **Vite 8** — Ultra-fast build & development environment
- **GSAP 3** — Restrained editorial text reveal & layout animations
- **Three.js** — Interactive 3D WebGL agency sculpture
- **Tailwind CSS v4** — Responsive layout, spacing, and styling engine
- **Lucide Icons** — Consistent, modern iconography
- **Canvas-Confetti** — Celebration feedback on research completion

---

## 📦 Required Pages & States Implemented

| State / Feature | Description | Status |
| :--- | :--- | :--- |
| **1. Landing & Hero** | Headline *"Your next great trip, already figured out."*, prompt studio, mode toggles, 3D agency sculpture canvas. | **Fully Functional** |
| **2. Natural-Language Prompt** | Natural language textarea with quick start chips, surprise preset randomizer, and direct scope launch. | **Fully Functional** |
| **3. Quick & Personalised Modes** | Toggle between instant heuristic plan and multi-step questionnaire. | **Fully Functional** |
| **4. Personalised Questionnaire** | 4-step modal covering destination, duration, budget tier, group size, transport preference, and interests. | **Fully Functional** |
| **5. Research Scope Preview** | Selectable category cards (Stays, Transport, Attractions, Food, Photo Spots) with estimated agent query counters. | **Fully Functional** |
| **6. Mandatory Confirmation** | Modal requiring explicit user confirmation of parameters and scope before agent execution. | **Fully Functional** |
| **7. Research Dashboard** | Live progress bars per category, simulated agent telemetry log stream, fast-forward and error test controls. | **Fully Functional** |
| **8. Results Dashboard** | Comprehensive day-by-day itinerary (morning/afternoon/evening), accommodation comparison matrix, attraction cards with tips, interactive budget summary, and source bibliography. | **Fully Functional** |
| **9. Empty State** | Standby screen with inspiration starter presets and return CTA. | **Fully Functional** |
| **10. Error & Retry State** | Pipeline timeout exception with an interactive "Retry Research Pipeline" recovery action. | **Fully Functional** |
| **11. Loading Skeleton State** | Shimmering layout placeholders for previewing asynchronous data fetch. | **Fully Functional** |
| **12. Demo Inspector Dock** | Floating dock (bottom-right) allowing judges to jump directly into any required state with one click. | **Fully Functional** |

---

## 🛡️ Hackathon Integrity & Separation of Concerns

- **Realistic Demo Content**: All sample data is isolated in `src/data/mockTrips.js`, `src/data/scopeCategories.js`, and `src/data/promptSuggestions.js`.
- **Zero Fabricated Verification**: Prototype disclaimers are visibly surfaced on all stays, prices, and source links.
- **Backend-Ready Architecture**: The visual presentation layers consume clean JSON interfaces, ready for future Python/FastAPI integration without refactoring UI components.
- **No Secret Leaks**: Zero hardcoded API keys or external confidential tokens exist in frontend code.

---

## 🚀 Installation & Run Commands

### 1. Prerequisites
- Node.js (v18+ or v24+)
- npm (v9+)

### 2. Navigate to project directory
```bash
cd C:\Users\mayan\.gemini\antigravity\scratch\trippilot-ai
```

### 3. Install dependencies
```bash
npm install
```

### 4. Start local development server
```bash
npm run dev
```
The application will launch at:  
👉 **http://127.0.0.1:5173/**

### 5. Build for production
```bash
npm run build
```

### 6. Preview production build
```bash
npm run preview
```

---

## 🧪 Testing Required States for Hackathon Judges

To facilitate review during AZINHACK '26:
1. Open the app in your browser at `http://127.0.0.1:5173/`.
2. Look at the bottom-right corner for the **`DEMO INSPECTOR • HACKATHON`** dock.
3. Click to expand and instantly test:
   - **1. Landing / Hero**: View editorial layout and interactive 3D sculpture.
   - **2. Scope Preview**: Toggle research categories and view query recalculations.
   - **3. Research Progress**: Watch live agent telemetry stream or click "Fast-Forward".
   - **4. Results Dashboard**: Inspect day-by-day itinerary, stay comparisons, and budget breakdown.
   - **5. Empty State**: Test blank prompt experience.
   - **6. Error & Retry**: Test agent timeout and click "Retry Research Pipeline".
   - **7. Loading Skeleton**: Test shimmering skeleton state.
   - **Reduced Motion Toggle**: Verify accessible animation suppression.
   - **Dataset Switcher**: Switch between **Kyoto, Japan** and **Amalfi Coast, Italy** sample itineraries.
