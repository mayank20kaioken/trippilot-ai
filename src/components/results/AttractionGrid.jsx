import React, { useState } from 'react';
import { Compass, Lightbulb, ExternalLink, ShieldCheck, MapPin, Globe, AlertTriangle, HelpCircle } from 'lucide-react';

// Known Kyoto pagoda URL that previously caused Japanese imagery to appear on non-Japan destinations
const KYOTO_PAGODA_URL_FRAGMENT = "1493976040374-85c8e12f0c0e";

function hasRelevantDestinationImage(att, destination = "") {
  if (!att?.image || typeof att.image !== "string") return false;
  const isJapan = /kyoto|tokyo|osaka|japan|nara|hakone/i.test(destination);
  if (!isJapan && att.image.includes(KYOTO_PAGODA_URL_FRAGMENT)) {
    return false;
  }
  return true;
}

function getGeoBadgeConfig(geoStatus, geoLabel, destination) {
  const primaryDest = (destination || "Destination").split(',')[0].trim();
  if (geoStatus === 'nearby_excursion') {
    return {
      label: geoLabel || `Nearby Excursion • Verify Distance from ${primaryDest}`,
      badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      borderClass: 'border-amber-400/40 hover:border-amber-300',
      Icon: AlertTriangle
    };
  }
  if (geoStatus === 'unverified_location') {
    return {
      label: geoLabel || 'Location Unverified • Check Source',
      badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
      borderClass: 'border-blue-400/35 hover:border-blue-300',
      Icon: HelpCircle
    };
  }
  return {
    label: geoLabel || `In ${primaryDest}`,
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
    Icon: MapPin
  };
}

export default function AttractionGrid({ attractions, destination = "" }) {
  const [geoFilter, setGeoFilter] = useState('all');

  if (!attractions || attractions.length === 0) {
    return (
      <div className="rounded-3xl bg-[#091547]/80 border border-white/15 p-8 text-center text-white/75 font-mono text-sm space-y-2">
        <div className="text-[#FFE600] font-bold text-base">Research Found No Verified Sights</div>
        <p className="text-white/60 text-xs max-w-md mx-auto">
          Live research for {destination || "this destination"} completed without identifying confirmed landmarks. The itinerary maintains flexible self-guided exploration windows pending local verification.
        </p>
      </div>
    );
  }

  const inDestCount = attractions.filter(a => (a.geographic_status || 'in_destination') === 'in_destination').length;
  const excursionCount = attractions.filter(a => a.geographic_status === 'nearby_excursion').length;
  const unverifiedCount = attractions.filter(a => a.geographic_status === 'unverified_location').length;

  const filtered = geoFilter === 'all'
    ? attractions
    : attractions.filter(a => (a.geographic_status || 'in_destination') === geoFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600]">
              CURATED SIGHTS & GEOGRAPHIC RELEVANCE AUDIT
            </span>
            {attractions.some(a => a.is_live_result) && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Live Research Grounded
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black text-white font-editorial">
            Sanctuaries, Heritage & Vantage Points
          </h3>
        </div>

        {/* Geographic Relevance Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 text-xs">
          <button
            onClick={() => setGeoFilter('all')}
            className={`px-3 py-1.5 rounded-full transition-all font-mono text-[11px] ${
              geoFilter === 'all'
                ? 'bg-[#FFE600] text-black font-bold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            All ({attractions.length})
          </button>
          <button
            onClick={() => setGeoFilter('in_destination')}
            className={`px-3 py-1.5 rounded-full transition-all font-mono text-[11px] ${
              geoFilter === 'in_destination'
                ? 'bg-emerald-400 text-black font-bold'
                : 'text-emerald-300/80 hover:text-emerald-200'
            }`}
          >
            In Destination ({inDestCount})
          </button>
          {excursionCount > 0 && (
            <button
              onClick={() => setGeoFilter('nearby_excursion')}
              className={`px-3 py-1.5 rounded-full transition-all font-mono text-[11px] ${
                geoFilter === 'nearby_excursion'
                  ? 'bg-amber-400 text-black font-bold'
                  : 'text-amber-300/85 hover:text-amber-200'
              }`}
            >
              Nearby Excursions ({excursionCount})
            </button>
          )}
          {unverifiedCount > 0 && (
            <button
              onClick={() => setGeoFilter('unverified_location')}
              className={`px-3 py-1.5 rounded-full transition-all font-mono text-[11px] ${
                geoFilter === 'unverified_location'
                  ? 'bg-blue-400 text-black font-bold'
                  : 'text-blue-300/85 hover:text-blue-200'
              }`}
            >
              Unverified Location ({unverifiedCount})
            </button>
          )}
        </div>
      </div>

      {/* Prominent notice when 0 attractions are confirmed in-destination */}
      {inDestCount === 0 && excursionCount === 0 && unverifiedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-xs text-amber-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-200 text-sm mb-1 uppercase tracking-wider font-mono">
              Zero Confirmed Sights Inside {destination || "Destination"}
            </div>
            <p className="leading-relaxed text-amber-100/90">
              Live research retrieved web citations, but <strong>did not find enough verified municipal sights</strong> for {destination}. The {unverifiedCount} candidate finding{unverifiedCount > 1 ? 's' : ''} below are marked <strong>Location Unverified</strong> and are not scheduled as confirmed stops in the itinerary timeline.
            </p>
          </div>
        </div>
      )}

      {/* Excursion & Uncertainty Notice when excursions or unverified locations are present */}
      {(excursionCount > 0 || (unverifiedCount > 0 && inDestCount > 0)) && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-100/90 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <span>
            <strong>Geographic Boundary Disclosure:</strong> Web travel guides frequently bundle regional day trips alongside central city sights. Sights requiring an out-of-town transfer are labeled <strong>Nearby Excursion</strong>, and sights without confirmed municipal placement in the retrieved text are labeled <strong>Location Unverified</strong>. No coordinates or travel times are invented.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((att) => {
          const isLive = Boolean(att.is_live_result);
          const geoStatus = att.geographic_status || 'in_destination';
          const geoCfg = getGeoBadgeConfig(geoStatus, att.geographic_label, destination);
          const GeoIcon = geoCfg.Icon;
          const bestTimeVal = att.best_time || att.bestTime || "Check venue hours";
          const dwellVal = att.dwell_time || att.dwellTime || "Verify on arrival";
          const tipVal = att.location_note || att.insider_tip || att.tip || "Verify current opening hours, exact address, and entry rules online.";
          const showImage = hasRelevantDestinationImage(att, destination);

          let sourceDomain = "Verified Source";
          if (att.source_url) {
            try {
              sourceDomain = new URL(att.source_url).hostname.replace(/^www\./, '');
            } catch {
              sourceDomain = att.source_title || "Verified Source";
            }
          }

          return (
            <div
              key={att.id}
              className={`rounded-3xl overflow-hidden bg-black/40 border transition-all flex flex-col sm:flex-row group text-left ${
                isLive ? geoCfg.borderClass : 'border-white/15 hover:border-white/30'
              }`}
            >
              {/* Destination-Relevant Image OR Honest Neutral Destination Placeholder */}
              <div className="relative sm:w-2/5 min-h-[190px] sm:h-auto overflow-hidden shrink-0 bg-gradient-to-br from-[#091547] via-[#0e226b] to-[#050c2a] border-b sm:border-b-0 sm:border-r border-white/10 flex flex-col justify-between p-4">
                {showImage ? (
                  <>
                    <img
                      src={att.image}
                      alt={att.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  </>
                ) : (
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-4 px-2">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFE600]/15 border border-[#FFE600]/30 flex items-center justify-center text-[#FFE600] mb-2.5 shadow-inner">
                      <Compass className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/90 block">
                      {destination || "Destination Landmark"}
                    </span>
                    <span className="text-[10px] font-mono text-white/50 mt-1 block leading-snug">
                      {isLive
                        ? "Verified text extraction • No landmark photo in crawl"
                        : "Neutral destination placeholder"}
                    </span>
                  </div>
                )}

                <div className="relative z-10 flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[#FFE600] text-[10px] font-mono font-bold border border-white/10">
                    {att.category || "Attractions"}
                  </span>
                  {isLive && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold tracking-wide uppercase">
                      Live Finding
                    </span>
                  )}
                </div>

                {att.source_url && (
                  <div className="relative z-10 pt-2">
                    {Boolean((att.source_confidence && att.source_confidence.includes("Social Media")) || /instagram|facebook|tiktok|pinterest/i.test(att.source_url)) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 text-[10px] font-mono border border-amber-400/40 max-w-full truncate" title="Social media citation — lower confidence; independently verify">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{sourceDomain} (Lower Confidence)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white/75 text-[10px] font-mono border border-white/10 max-w-full truncate">
                        <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{sourceDomain}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Geographic Relevance Pill & Verification Warning Pill */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border max-w-full flex-wrap leading-tight break-words ${geoCfg.badgeClass}`}>
                      <GeoIcon className="w-3 h-3 shrink-0" />
                      <span>{geoCfg.label}</span>
                    </span>
                    {(att.verification_warning || att.evidence_quality === 'passing_mention') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border bg-amber-500/20 text-amber-200 border-amber-400/50">
                        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-300" />
                        <span>{att.verification_warning || "Location verified; details need confirmation"}</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-white text-lg mb-2 leading-snug break-words">
                    {att.name}
                  </h4>

                  <p className="text-xs text-white/75 leading-relaxed mb-4 break-words">
                    {att.description}
                  </p>

                  {/* Timing & Verification badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70 mb-4">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 min-w-0">
                      <div className="text-white/40 uppercase text-[9px] mb-0.5">TIMING GUIDANCE</div>
                      <div className="text-[#FFE600] font-bold truncate" title={bestTimeVal}>{bestTimeVal}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 min-w-0">
                      <div className="text-white/40 uppercase text-[9px] mb-0.5">DWELL / TRANSFER</div>
                      <div className="text-white font-bold truncate" title={dwellVal}>
                        {geoStatus === 'nearby_excursion' ? 'Verify travel time' : dwellVal}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geographic / Source Verification Note & Traceable Source Link */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-[#0e1d5a] border border-[#FFE600]/30 text-xs text-white/90">
                    <div className="flex items-center gap-1.5 text-[#FFE600] text-[10px] font-mono font-bold uppercase mb-1">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {att.verification_warning
                          ? "EVIDENCE ADVISORY • VERIFY VENUE DETAILS"
                          : geoStatus === 'nearby_excursion'
                            ? "EXCURSION DISTANCE & TRANSFER CHECK"
                            : geoStatus === 'unverified_location'
                              ? "GEOGRAPHIC VERIFICATION REQUIRED"
                              : isLive
                                ? "VERIFIED SOURCE ADVISORY"
                                : "INSIDER HINT"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/80 break-words">
                      {att.verification_warning
                        ? `${tipVal} Venue opening hours, entry rules, and accessibility must be confirmed via the source.`
                        : tipVal}
                    </p>
                  </div>

                  {att.source_url && (
                    <div className="pt-1 flex items-center justify-between gap-2 text-xs font-mono min-w-0">
                      <span className="text-white/50 truncate min-w-0 flex-1" title={att.source_title || att.source_url}>
                        Source: {att.source_title || sourceDomain}
                      </span>
                      <a
                        href={att.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#FFE600] hover:underline cursor-pointer shrink-0 font-bold"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
