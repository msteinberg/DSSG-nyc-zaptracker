import React, { useState, useEffect, useRef } from "react";
import { Project, TrackedProject } from "./types";
import ProjectCard from "./components/ProjectCard";
import ProjectFilters from "./components/ProjectFilters";
import TrackedList from "./components/TrackedList";
import SocrataPortalSync from "./components/SocrataPortalSync";
import ProjectMap from "./components/ProjectMap";
import { 
  Building2, 
  Layers, 
  Bookmark, 
  MapPin, 
  HelpCircle, 
  Clock, 
  Sparkles,
  ArrowUpRight,
  Info,
  Sliders,
  TrendingUp,
  Database,
  BarChart3,
  FlameKindling
} from "lucide-react";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [trackedProjects, setTrackedProjects] = useState<TrackedProject[]>(() => {
    try {
      const saved = localStorage.getItem("tracked_ulurp_projects_socrata");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"agenda" | "tracked">("agenda");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBorough, setSelectedBorough] = useState("all");
  const [selectedDisplacementRisk, setSelectedDisplacementRisk] = useState("all");
  const [selectedCommunityDistrict, setSelectedCommunityDistrict] = useState("all");

  // CPC Scheduled Projects State
  const [scheduledCPC, setScheduledCPC] = useState<{
    scheduledMeetingDate: string;
    calendarUrl: string;
    scheduledUlurps: string[];
    scheduledProjectIds?: string[];
    meetingDate?: string;
    schedulingDate?: string;
    sections?: {
      scheduling: { date: string; ulurps: string[]; projectIds: string[] };
      votes: { date: string; ulurps: string[]; projectIds: string[] };
      hearings: { date: string; ulurps: string[]; projectIds: string[] };
    };
  } | null>(null);

  // Dynamically compute available community districts based on loaded projects
  const availableCommunityDistricts = React.useMemo(() => {
    const cdsMap = new Map<string, string>();
    projects.forEach((p) => {
      if (p.community_district) {
        const cdVal = p.community_district.trim();
        if (!cdsMap.has(cdVal)) {
          // Format label: e.g. "Brooklyn CD 10" for "K10"
          const num = cdVal.replace(/^[A-Z]/, "").replace(/^0+/, "");
          const letter = cdVal.charAt(0).toUpperCase();
          let bName = p.borough || "";
          if (!bName) {
            if (letter === "M") bName = "Manhattan";
            else if (letter === "K") bName = "Brooklyn";
            else if (letter === "Q") bName = "Queens";
            else if (letter === "X") bName = "Bronx";
            else if (letter === "R" || letter === "S") bName = "Staten Island";
            else bName = letter;
          }
          cdsMap.set(cdVal, `${bName} CD ${num}`);
        }
      }
    });

    return Array.from(cdsMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  // Reset selected community district if it is no longer available
  useEffect(() => {
    if (selectedCommunityDistrict !== "all") {
      const exists = availableCommunityDistricts.some(
        (cd) => cd.value.toLowerCase() === selectedCommunityDistrict.toLowerCase()
      );
      if (!exists) {
        setSelectedCommunityDistrict("all");
      }
    }
  }, [availableCommunityDistricts, selectedCommunityDistrict]);

  // Keep track of resolved projects to avoid infinite fetch loops
  const resolvedRef = useRef<Set<string>>(new Set());

  // Persistence to Local Storage
  useEffect(() => {
    localStorage.setItem("tracked_ulurp_projects_socrata", JSON.stringify(trackedProjects));
  }, [trackedProjects]);

  // Fetch CPC scheduled projects on app mount
  useEffect(() => {
    fetch("/api/cpc-scheduled-projects")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load CPC scheduled projects");
      })
      .then((data) => setScheduledCPC(data))
      .catch((err) => console.error("Error loading scheduled CPC calendar:", err));
  }, []);

  // Fetch Projects from backend Socrata integration
  const fetchProjects = async (isManualSync = false) => {
    if (isManualSync) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    try {
      const params = new URLSearchParams();
      if (selectedBorough && selectedBorough !== "all") {
        params.append("borough", selectedBorough);
      }
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`NYC OpenData Socrata returned status ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        throw new Error("Invalid response schema from NYC OpenData server");
      }
    } catch (err: any) {
      console.error("Failed to query NYC ZAP database:", err);
      setError(err.message || "Could not synchronize with the NYC OpenData portal.");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Trigger query with a lightweight debounce when filters change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProjects();
    }, 350);

    return () => clearTimeout(handler);
  }, [selectedBorough, searchQuery]);

  // Background Auto-Resolver for Project Details (Displacement Risks & PLUTO data)
  useEffect(() => {
    let active = true;

    const resolveAllUnresolved = async () => {
      // Find all projects that don't have displacementRisks resolved yet and haven't been tried
      const unresolved = projects.filter(
        (p) => !p.displacementRisks && !resolvedRef.current.has(p.project_id)
      );

      for (const p of unresolved) {
        if (!active) break;
        resolvedRef.current.add(p.project_id);

        try {
          // Resolve one at a time to be gentle on Socrata rate limits
          const res = await fetch(`/api/resolve-project-nta?projectId=${p.project_id}`);
          if (res.ok) {
            const data = await res.json();
            if (active) {
              handleResolveDetails(p.project_id, data);
            }
          }
          // Brief sleep of 100ms between requests
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Background resolve failed for project ${p.project_id}:`, err);
        }
      }
    };

    if (projects.length > 0) {
      resolveAllUnresolved();
    }

    return () => {
      active = false;
    };
  }, [projects]);

  // Track / Untrack a project
  const toggleTrack = (project: Project) => {
    const alreadyTracked = trackedProjects.find((p) => p.project_id === project.project_id);

    if (alreadyTracked) {
      setTrackedProjects((prev) => prev.filter((p) => p.project_id !== project.project_id));
    } else {
      const newTracked: TrackedProject = {
        ...project,
        trackedAt: new Date().toISOString(),
        status: "Followed",
        notes: "",
      };
      setTrackedProjects((prev) => [newTracked, ...prev]);
    }
  };

  // Remove tracking directly from tracked tab
  const removeTrack = (projectId: string, projectName: string) => {
    setTrackedProjects((prev) => prev.filter((p) => p.project_id !== projectId));
  };

  // Update tracked notes in persistent state
  const updateTrackNotes = (projectId: string, projectName: string, notes: string) => {
    setTrackedProjects((prev) =>
      prev.map((p) => (p.project_id === projectId ? { ...p, notes } : p))
    );
  };

  // Update tracked status ("Followed", "Attending Hearing", "Testified", "Reviewed")
  const updateTrackStatus = (
    projectId: string,
    projectName: string,
    status: TrackedProject["status"]
  ) => {
    setTrackedProjects((prev) =>
      prev.map((p) => (p.project_id === projectId ? { ...p, status } : p))
    );
  };

  // When a project's details (NTA, BBLs, displacement risks) are resolved on-demand
  const handleResolveDetails = (projectId: string, resolvedDetails: any) => {
    // 1. Update in active search results
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project_id === projectId) {
          return {
            ...p,
            bbls: resolvedDetails.bbls,
            ntaCode: resolvedDetails.ntaCode,
            ntaName: resolvedDetails.ntaName,
            displacementRisks: resolvedDetails.displacementRisks,
            applicant_type: resolvedDetails.applicantType,
            current_milestone: resolvedDetails.currentMilestone || p.current_milestone,
            current_milestone_date: resolvedDetails.currentMilestoneDate || p.current_milestone_date,
            public_status: resolvedDetails.publicStatus || p.public_status,
            certified_referred: resolvedDetails.certifiedReferred || p.certified_referred,
            latitude: resolvedDetails.latitude,
            longitude: resolvedDetails.longitude,
          };
        }
        return p;
      })
    );

    // 2. Update in tracked projects as well to save permanently in localStorage
    setTrackedProjects((prev) =>
      prev.map((p) => {
        if (p.project_id === projectId) {
          return {
            ...p,
            bbls: resolvedDetails.bbls,
            ntaCode: resolvedDetails.ntaCode,
            ntaName: resolvedDetails.ntaName,
            displacementRisks: resolvedDetails.displacementRisks,
            applicant_type: resolvedDetails.applicantType,
            current_milestone: resolvedDetails.currentMilestone || p.current_milestone,
            current_milestone_date: resolvedDetails.currentMilestoneDate || p.current_milestone_date,
            public_status: resolvedDetails.publicStatus || p.public_status,
            certified_referred: resolvedDetails.certifiedReferred || p.certified_referred,
            latitude: resolvedDetails.latitude,
            longitude: resolvedDetails.longitude,
          };
        }
        return p;
      })
    );
  };

  // Filter projects by Displacement Risk and Community District
  const filteredProjects = projects.filter((p) => {
    // 1. Filter by Displacement Risk
    if (selectedDisplacementRisk !== "all") {
      if (!p.displacementRisks || p.displacementRisks.length === 0) return false;
      const matchRisk = p.displacementRisks.some(
        (r) => r.displacementRiskIndex.toLowerCase() === selectedDisplacementRisk.toLowerCase()
      );
      if (!matchRisk) return false;
    }

    // 2. Filter by Community District
    if (selectedCommunityDistrict !== "all") {
      if (!p.community_district || p.community_district.toLowerCase() !== selectedCommunityDistrict.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // Compute stats for the Bento Grid overview
  const activeReviewsCount = filteredProjects.length;
  const mihAffordableCount = filteredProjects.filter((p) => p.mih_flag === "true").length;
  const boroughCounts = filteredProjects.reduce((acc, p) => {
    if (p.borough) acc[p.borough] = (acc[p.borough] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topBorough = (Object.entries(boroughCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col text-slate-600 selection:bg-blue-500/20 selection:text-blue-900">
      {/* Header Bar */}
      <header className="bg-white text-slate-900 border-b border-slate-200/80 shadow-xs sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://www.nyc-dssg.org/images/logo3.png" 
              alt="NYC DSSG Logo" 
              className="h-10 md:h-12 w-auto object-contain bg-transparent p-0.5"
              referrerPolicy="no-referrer"
            />
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider uppercase font-display text-blue-900">
                  NYC DSSG PORTAL
                </h1>
                <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Socrata Tunnel Active
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">
                NYC Civic Land-Use Zoning Application Portal (ZAP) Database Resolver
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] font-semibold">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Socrata: hgx4-8ukb
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-6">
        
        {/* Immersive DSSG Skyline Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white my-6 shadow-xs">
          {/* NYC Skyline Background with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-luminosity scale-105" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&h=600&q=80')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-slate-50/30 to-transparent" />
          
          {/* Hero Content */}
          <div className="relative z-10 px-6 py-8 md:p-10 max-w-3xl space-y-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              Data Science for Social Good
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 font-display uppercase leading-tight">
              NYC Civic Land-Use <br/>
              <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 bg-clip-text text-transparent">
                Hearing & ZAP Tracker
              </span>
            </h2>
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-2xl font-medium">
              Leveraging live Socrata open data streams, PLUTO tax maps, and neighborhood displacement vulnerability indexes to democratize zoning changes, map public hearings, and track permanently affordable housing programs.
            </p>
            
            <div className="flex items-center gap-3 pt-1 text-[10px] md:text-xs">
              <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-250/60 font-mono font-semibold">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Socrata API Gateway
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-250/60 font-mono font-semibold">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                PLUTO Geospatial Map
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Socrata Connection, Stats, and Instructions */}
          <section className="lg:col-span-4 space-y-6">
            
            {/* Live Sync Manager Panel */}
            <SocrataPortalSync 
              onRefreshDatabase={() => fetchProjects(true)}
              isSyncing={isSyncing}
            />

            {/* Bento-Grid Stats Widget */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Current Batch Metrics ({filteredProjects.length})</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Reviews</span>
                  <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{activeReviewsCount}</p>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">MIH Affordable</span>
                  <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                    {mihAffordableCount}
                    <span className="text-[9px] text-slate-400 ml-1 font-normal font-sans">
                      ({filteredProjects.length > 0 ? Math.round((mihAffordableCount / filteredProjects.length) * 100) : 0}%)
                    </span>
                  </p>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Top Borough</span>
                  <p className="text-sm font-bold text-blue-700 mt-1.5 truncate" title={topBorough}>
                    {topBorough}
                  </p>
                </div>

                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Watchlist Size</span>
                  <p className="text-xl font-bold text-indigo-700 mt-1 font-mono">{trackedProjects.length}</p>
                </div>
              </div>
            </div>

            {/* Quick Informational Guide */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="w-4 h-4 text-blue-600" />
                ULURP Land-Use Milestones
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Zoning applications in New York follow the Uniform Land Use Review Procedure (ULURP). This community portal acts as a transparent window into major public review gates:
              </p>
              <ul className="text-slate-500 text-[11px] space-y-1.5 list-disc pl-4 leading-normal font-medium">
                <li><strong className="text-slate-700">CB Hearings</strong>: Local advisory feedback</li>
                <li><strong className="text-slate-700">Borough Presidents</strong>: Official recommendations</li>
                <li><strong className="text-slate-700">CPC Reviews</strong>: City Planning votes and agenda schedules</li>
                <li><strong className="text-slate-700">City Council</strong>: Final approval, modification, or veto</li>
              </ul>
            </div>
          </section>

          {/* Right Column: Tab navigation & project catalog */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Main Tabs */}
            <div className="flex bg-white p-1.5 border border-slate-200 rounded-xl shadow-xs">
              <button
                onClick={() => setActiveTab("agenda")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "agenda"
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-4 h-4" />
                ZAP Land-Use Registry
                <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "agenda" ? "bg-white/20 text-white font-bold border border-white/10" : "bg-slate-100 text-slate-500"
                }`}>
                  {filteredProjects.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("tracked")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "tracked"
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                My Public Watchlist
                {trackedProjects.length > 0 && (
                  <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                    activeTab === "tracked" ? "bg-white/20 text-white font-bold border border-white/10" : "bg-blue-50 text-blue-600"
                  }`}>
                    {trackedProjects.length}
                  </span>
                )}
              </button>
            </div>

            {/* Active Agenda/Database Tab */}
            {activeTab === "agenda" && (
              <div className="space-y-4">
                
                {/* Dynamic Filter Controls */}
                <ProjectFilters
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedBorough={selectedBorough}
                  setSelectedBorough={setSelectedBorough}
                  selectedDisplacementRisk={selectedDisplacementRisk}
                  setSelectedDisplacementRisk={setSelectedDisplacementRisk}
                  selectedCommunityDistrict={selectedCommunityDistrict}
                  setSelectedCommunityDistrict={setSelectedCommunityDistrict}
                  availableCommunityDistricts={availableCommunityDistricts}
                  totalResults={filteredProjects.length}
                />

                {/* Interactive Project Map Display */}
                <ProjectMap
                  projects={filteredProjects}
                  onSelectProject={(p) => {
                    const cardEl = document.getElementById(`project-card-${p.project_id}`);
                    if (cardEl) {
                      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
                      // Add custom temporary focus glow/ring effect
                      cardEl.classList.add("ring-4", "ring-blue-500/50", "scale-[1.01]", "shadow-lg");
                      setTimeout(() => {
                        cardEl.classList.remove("ring-4", "ring-blue-500/50", "scale-[1.01]", "shadow-lg");
                      }, 2500);
                    }
                  }}
                />

                {/* Status Message / Errors */}
                {error && (
                  <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-600 font-bold shadow-xs">
                    {error}
                  </div>
                )}

                {/* Loader */}
                {isLoading ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs space-y-4 flex flex-col items-center justify-center min-h-[350px]">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-blue-600 animate-spin" />
                      <Sparkles className="w-6 h-6 text-blue-500 absolute animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Querying Live NYC OpenData API...</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Transmitting SoQL query to Socrata portal</p>
                    </div>
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProjects.map((p) => {
                      const isTracked = trackedProjects.some((tp) => tp.project_id === p.project_id);

                      return (
                        <div 
                          key={p.project_id} 
                          id={`project-card-${p.project_id}`} 
                          className="scroll-mt-24 rounded-2xl transition-all duration-500"
                        >
                          <ProjectCard
                            project={p}
                            isCurrentlyTracked={isTracked}
                            onToggleTrack={() => toggleTrack(p)}
                            onResolveDetails={handleResolveDetails}
                            scheduledCPC={scheduledCPC}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
                    <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 text-base">No Projects Match Your Query</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed font-medium">
                      No ULURP projects matched your selected combination of filters or keywords. Try resetting your search phrase.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedBorough("all");
                        setSelectedDisplacementRisk("all");
                        setSelectedCommunityDistrict("all");
                      }}
                      className="mt-4 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-blue-600 hover:text-blue-700 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs"
                    >
                      Reset Filter Options
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tracked Projects Tab */}
            {activeTab === "tracked" && (
              <TrackedList
                trackedProjects={trackedProjects}
                onRemoveTrack={removeTrack}
                onUpdateNotes={updateTrackNotes}
                onUpdateStatus={updateTrackStatus}
                scheduledCPC={scheduledCPC}
              />
            )}
          </section>
        </main>

      </div>

      {/* Footer bar */}
      <footer className="bg-white text-slate-500 border-t border-slate-200/80 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px] space-y-1.5 font-medium">
          <p className="text-slate-600">
            NYC Land-Use & ZAP Hearing Tracker is built in alignment with DSSG standard-compliant open data pipelines.
          </p>
          <p className="text-slate-400 font-mono text-[10px]">
            Powered by direct Socrata tunnels, PLUTO geospatial maps, and secure client-side database indexing.
          </p>
        </div>
      </footer>
    </div>
  );
}
