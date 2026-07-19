import React, { useState, useEffect, useRef } from "react";
import { Project } from "../types";
import { Search, Compass, ShieldCheck, MapPin, ZoomIn, ZoomOut, AlertTriangle } from "lucide-react";

declare const L: any;

interface ProjectMapProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

// Helper to get fallback coordinates with deterministic jitter based on project ID
const getFallbackCoordinates = (borough: string, projectId: string) => {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map deterministic jitter
  const jitterLat = ((hash & 0xFF) / 255 - 0.5) * 0.035;
  const jitterLng = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.035;

  const b = (borough || "").toLowerCase().trim();
  if (b.includes("manhattan")) {
    return [40.7831 + jitterLat, -73.9712 + jitterLng];
  } else if (b.includes("brooklyn")) {
    return [40.6782 + jitterLat, -73.9442 + jitterLng];
  } else if (b.includes("queens")) {
    return [40.7282 + jitterLat, -73.7949 + jitterLng];
  } else if (b.includes("bronx")) {
    return [40.8448 + jitterLat, -73.8648 + jitterLng];
  } else if (b.includes("staten island") || b.includes("staten")) {
    return [40.5795 + jitterLat, -74.1502 + jitterLng];
  }
  return [40.7128 + jitterLat, -74.0060 + jitterLng]; // NYC default (City Hall)
};

export default function ProjectMap({ projects, onSelectProject }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (typeof L === "undefined") {
      console.warn("Leaflet library is not loaded on the window yet.");
      return;
    }

    if (!mapRef.current && containerRef.current) {
      // Create map
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([40.7128, -73.98], 11);

      // Add elegant grayscale tiles (CartoDB Light)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Add quiet attribution control at bottom right
      L.control.attribution({
        position: "bottomright",
        prefix: false
      }).addAttribution('© OpenMapTiles © OpenStreetMap contributors').addTo(map);

      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers when projects list changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || typeof L === "undefined") return;

    markersLayerRef.current.clearLayers();

    projects.forEach((p) => {
      const lat = p.latitude ? parseFloat(p.latitude) : null;
      const lng = p.longitude ? parseFloat(p.longitude) : null;
      const hasCoords = lat && lng;
      const coords = hasCoords ? [lat, lng] : getFallbackCoordinates(p.borough, p.project_id);

      // Determine marker colors matching public_status
      let color = "#2563eb"; // default In Public Review - Blue
      const status = p.public_status || "Unknown";
      if (status === "Noticed") {
        color = "#eab308"; // Amber
      } else if (status === "Filed") {
        color = "#22c55e"; // Green
      } else if (status === "Completed") {
        color = "#06b6d4"; // Teal
      }

      // Add a circle marker
      const marker = L.circleMarker(coords, {
        radius: hasCoords ? 7 : 5.5,
        fillColor: color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      });

      // Style Popup content
      const popupHtml = `
        <div class="p-1 font-sans text-xs">
          <div class="flex items-center justify-between gap-3 mb-1.5">
            <span class="font-mono text-[9px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-semibold">
              ID: ${p.project_id}
            </span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              status === "Noticed" ? "bg-amber-50 text-amber-700 border border-amber-200" :
              status === "Filed" ? "bg-green-50 text-green-700 border border-green-200" :
              status === "Completed" ? "bg-cyan-50 text-cyan-700 border border-cyan-200" :
              "bg-blue-50 text-blue-700 border border-blue-200"
            }">
              ${status}
            </span>
          </div>
          <h5 class="font-extrabold text-slate-900 text-xs mb-1 line-clamp-2 leading-tight">${p.project_name}</h5>
          <div class="text-[10px] text-slate-500 mb-2 font-medium flex items-center gap-1">
            <span>📍 CD ${p.community_district?.replace(/^[A-Z]/, "") || "N/A"} (${p.borough})</span>
          </div>
          <div class="border-t border-slate-100 pt-2 mt-1.5">
            <button 
              id="map-popup-btn-${p.project_id}" 
              class="w-full text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Go to Project Card
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        minWidth: 190,
        maxWidth: 230,
        className: "custom-leaflet-popup"
      });

      marker.on("popupopen", () => {
        // Add dynamic click handler
        setTimeout(() => {
          const btn = document.getElementById(`map-popup-btn-${p.project_id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              onSelectProject(p);
            };
          }
        }, 50);
      });

      marker.addTo(markersLayerRef.current);
    });

    // Auto-fit bounds if we have projects
    if (projects.length > 0) {
      const validPoints: any[] = [];
      projects.forEach((p) => {
        const lat = p.latitude ? parseFloat(p.latitude) : null;
        const lng = p.longitude ? parseFloat(p.longitude) : null;
        if (lat && lng) validPoints.push([lat, lng]);
      });

      if (validPoints.length > 0 && mapRef.current) {
        mapRef.current.fitBounds(validPoints, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [projects]);

  // Handle Geocoding Address lookup via Nominatim free OSM API
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressQuery.trim() || !mapRef.current) return;

    setIsSearching(true);
    setSearchError("");

    try {
      // Append "New York City" to localize searching results
      const q = `${addressQuery.trim()}, New York City`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      if (!res.ok) throw new Error("Search provider returned error status");
      
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current.flyTo([parseFloat(lat), parseFloat(lon)], 15, {
          duration: 1.5,
        });
      } else {
        setSearchError("No results found for this NYC address.");
      }
    } catch (err) {
      console.error("Address geocoding search failed:", err);
      setSearchError("Failed to search address. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Zoom Helpers
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  // Locate User Helper
  const locateMe = () => {
    if (!mapRef.current) return;
    mapRef.current.locate({ setView: true, maxZoom: 14 });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm flex flex-col relative w-full h-[500px]">
      {/* Search & Address Bar (Top Left Float) */}
      <div className="absolute top-3 left-3 z-[1000] w-full max-w-[280px] sm:max-w-[340px]">
        <form onSubmit={handleAddressSearch} className="flex items-center bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden p-1 gap-1">
          <input
            type="text"
            placeholder="Zoom to Address..."
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="p-1.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
            title="Search Address"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
        {searchError && (
          <div className="mt-1.5 bg-rose-50 border border-rose-200 p-2 rounded-lg text-[10px] text-rose-700 font-bold shadow-md flex items-center gap-1 animate-fade-in">
            <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Floating Controls (Top Right Float) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Custom Zoom Control panel */}
        <div className="flex flex-col bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-slate-50 border-b border-slate-100 text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-slate-50 text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Locate User Compass */}
        <button
          onClick={locateMe}
          className="p-2 bg-white border border-slate-200 shadow-lg rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
          title="Zoom to My Location"
        >
          <Compass className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Elegant Map Legend (Bottom Left Float) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-200/80 p-3.5 rounded-2xl shadow-lg w-48 font-sans space-y-2">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <h6 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Project Legend</h6>
        </div>
        
        <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-xs" />
            <span>Noticed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-xs" />
            <span>Filed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-xs" />
            <span>In Public Review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-50 border border-cyan-400 shadow-xs" />
            <span>Completed</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2 mt-2">
          <button
            type="button"
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="w-full text-left font-bold text-[9px] text-slate-400 hover:text-slate-600 transition-all uppercase tracking-wider cursor-pointer flex items-center justify-between"
          >
            <span>Disclaimer</span>
            <span>{showDisclaimer ? "▼" : "▶"}</span>
          </button>

          {showDisclaimer && (
            <p className="mt-1.5 text-[9px] text-slate-400 leading-normal font-medium animate-fade-in">
              Approximate community district centroid fallbacks are utilized with deterministic offsets for projects pending Socrata PLUTO coordinate resolution.
            </p>
          )}
        </div>
      </div>

      {/* Map Target Div container */}
      <div ref={containerRef} className="w-full h-full" id="nyc-zap-map" />
    </div>
  );
}
