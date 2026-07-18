import React, { useState, useEffect, useRef } from "react";
import { Project, TrackedProject } from "./types";
import ProjectCard from "./components/ProjectCard";
import ProjectFilters from "./components/ProjectFilters";
import TrackedList from "./components/TrackedList";
import SocrataPortalSync from "./components/SocrataPortalSync";
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
    <div className="min-h-screen bg-[#0A0C10] font-sans flex flex-col text-slate-300">
      {/* Header Bar */}
      <header className="bg-[#0F1218] text-white border-b border-slate-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2.5 rounded-xl text-black font-bold">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight uppercase font-display">
                  NYC Land-Use & ZAP Hearing Tracker
                </h1>
                <span className="bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Socrata Tunnel
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                NYC Zoning Application Portal (ZAP) database monitor & displacement risk analytics (Noticed & In Public Review)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 bg-[#131722] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
              <Database className="w-3.5 h-3.5 text-amber-500" />
              Dataset: hgx4-8ukb
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Socrata Connection, Stats, and Instructions */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Live Sync Manager Panel */}
          <SocrataPortalSync 
            onRefreshDatabase={() => fetchProjects(true)}
            isSyncing={isSyncing}
          />

          {/* Bento-Grid Stats Widget */}
          <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>Current Batch Stats ({filteredProjects.length})</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#131722] p-3 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Reviews</span>
                <p className="text-xl font-bold text-white mt-1 font-mono">{activeReviewsCount}</p>
              </div>

              <div className="bg-[#131722] p-3 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">MIH Affordable</span>
                <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                  {mihAffordableCount}
                  <span className="text-[9px] text-slate-500 ml-1 font-normal font-sans">
                    ({filteredProjects.length > 0 ? Math.round((mihAffordableCount / filteredProjects.length) * 100) : 0}%)
                  </span>
                </p>
              </div>

              <div className="bg-[#131722] p-3 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Top Borough</span>
                <p className="text-sm font-bold text-amber-400 mt-1 truncate" title={topBorough}>
                  {topBorough}
                </p>
              </div>

              <div className="bg-[#131722] p-3 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tracked Watchlist</span>
                <p className="text-xl font-bold text-blue-400 mt-1 font-mono">{trackedProjects.length}</p>
              </div>
            </div>
          </div>

          {/* Quick Informational Guide */}
          <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-500" />
              ZAP & ULURP Tracking
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zoning changes in NYC follow the Uniform Land Use Review Procedure (ULURP). This application monitors upcoming public hearing milestones:
            </p>
            <ul className="text-slate-500 text-[11px] space-y-1 list-disc pl-4 leading-normal">
              <li>CB Hearings: Local Community Boards provide advisory votes</li>
              <li>BP Votes: Borough Presidents submit recommendations</li>
              <li>CPC Reviews: City Planning Commission holds hearings and votes</li>
              <li>Council Decisions: City Council votes to approve or veto</li>
            </ul>
          </div>
        </section>

        {/* Right Column: Tab navigation & project catalog */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* Main Tabs */}
          <div className="flex bg-[#0F1218] p-1.5 border border-slate-800 rounded-xl shadow-xl">
            <button
              onClick={() => setActiveTab("agenda")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "agenda"
                  ? "bg-amber-500 text-black font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#131722]"
              }`}
            >
              <Layers className="w-4 h-4" />
              ZAP Land-Use Registry
              <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                activeTab === "agenda" ? "bg-black/20 text-black font-bold" : "bg-slate-800 text-slate-400"
              }`}>
                {filteredProjects.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("tracked")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "tracked"
                  ? "bg-amber-500 text-black font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#131722]"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              My Public Watchlist
              {trackedProjects.length > 0 && (
                <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "tracked" ? "bg-black/20 text-black font-bold" : "bg-amber-500/20 text-amber-400"
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

              {/* Status Message / Errors */}
              {error && (
                <div className="bg-red-950/20 border border-red-900/30 p-3.5 rounded-xl text-xs text-red-400 font-medium">
                  {error}
                </div>
              )}

              {/* Loader */}
              {isLoading ? (
                <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-16 text-center shadow-lg space-y-4 flex flex-col items-center justify-center min-h-[350px]">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-amber-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Quering Live NYC OpenData API...</h3>
                    <p className="text-xs text-slate-500 mt-1">Transmitting SoQL query to Socrata portal</p>
                  </div>
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((p) => {
                    const isTracked = trackedProjects.some((tp) => tp.project_id === p.project_id);

                    return (
                      <ProjectCard
                        key={p.project_id}
                        project={p}
                        isCurrentlyTracked={isTracked}
                        onToggleTrack={() => toggleTrack(p)}
                        onResolveDetails={handleResolveDetails}
                        scheduledCPC={scheduledCPC}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-12 text-center text-slate-400">
                  <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-white">No Projects Match Your Query</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No ULURP projects matched your selected combination of filters or keywords. Try resetting your search phrase.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedBorough("all");
                      setSelectedDisplacementRisk("all");
                      setSelectedCommunityDistrict("all");
                    }}
                    className="mt-4 px-3 py-1.5 bg-[#131722] border border-slate-800 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
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

      {/* Footer bar */}
      <footer className="bg-[#0F1218] text-slate-500 border-t border-slate-800 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] space-y-1.5">
          <p>
            NYC Land-Use & ZAP Hearing Tracker is powered by standard-compliant, secure Socrata connections and PLUTO geospatial mapping.
          </p>
          <p className="opacity-75 font-mono">
            All database lookup logs, custom public testimony remarks, and session watchlists are kept private and secure in your local environment.
          </p>
        </div>
      </footer>
    </div>
  );
}
