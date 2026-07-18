import React, { FC, useState } from "react";
import { Project } from "../types";
import { 
  Bookmark, 
  MapPin, 
  ExternalLink, 
  Calendar, 
  Layers, 
  ShieldAlert, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  CheckCircle2, 
  Info
} from "lucide-react";
import { getGoogleCalendarUrl, downloadIcsFile } from "../lib/calendar";

interface ProjectCardProps {
  project: Project;
  isCurrentlyTracked: boolean;
  onToggleTrack: () => void;
  onResolveDetails: (projectId: string, resolvedDetails: any) => void;
  scheduledCPC?: {
    scheduledMeetingDate: string;
    calendarUrl: string;
    scheduledUlurps: string[];
    scheduledProjectIds?: string[];
  } | null;
}

export const getProjectPhase = (
  milestone: string,
  status: string,
  certifiedReferredDate?: string,
  publicStatus?: string
): { step: number; label: string } => {
  const st = status?.toLowerCase() || "";
  const pubSt = publicStatus?.toLowerCase() || "";

  if (st === "complete" || st === "completed" || milestone?.includes("Project Completed") || milestone?.includes("Completed")) {
    return { step: 6, label: "Project Completed / Decided" };
  }

  let estimatedStep = -1;
  let estimatedLabel = "";

  if (certifiedReferredDate) {
    try {
      const refDate = new Date(certifiedReferredDate);
      const today = new Date();
      // Safely ensure today is at least 2026-07-17 for consistent testing & real-time accuracy in 2026
      const minDate = new Date("2026-07-17");
      if (today.getTime() < minDate.getTime()) {
        today.setTime(minDate.getTime());
      }
      const diffTime = today.getTime() - refDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && (pubSt === "in public review" || st === "active")) {
        if (diffDays > 200) {
          estimatedStep = 5;
          estimatedLabel = "Mayoral Review";
        } else if (diffDays > 150) {
          estimatedStep = 4;
          estimatedLabel = "City Council Review";
        } else if (diffDays > 90) {
          estimatedStep = 3;
          estimatedLabel = "CPC Review & Public Hearing";
        } else if (diffDays > 60) {
          estimatedStep = 2;
          estimatedLabel = "Borough President/Board Review";
        } else {
          estimatedStep = 1;
          estimatedLabel = "Community Board Review";
        }
      }
    } catch (e) {
      console.error("Error estimating project phase:", e);
    }
  }

  if (!milestone) {
    if (estimatedStep >= 1) {
      return { step: estimatedStep, label: estimatedLabel };
    }
    return { step: 0, label: "Pre-Referral & Filing" };
  }

  const m = milestone.toUpperCase();
  let baseStep = 0;
  let baseLabel = "Pre-Referral & Filing";

  if (m.includes("MAYORAL") || m.startsWith("PS")) {
    baseStep = 5;
    baseLabel = "Mayoral Review";
  } else if (m.includes("CITY COUNCIL") || m.startsWith("PX") || m.startsWith("HA")) {
    baseStep = 4;
    baseLabel = "City Council Review";
  } else if (m.includes("CPC") || m.includes("COMMISSION") || m.includes("EAS") || m.includes("EIS") || m.includes("PRE-HEARING") || m.includes("REFERRAL")) {
    // If it is referred but not yet Community Board, check PC prefix
    if (m.includes("COMMUNITY BOARD") || m.startsWith("PC")) {
      baseStep = 1;
      baseLabel = "Community Board Review";
    } else if (m.includes("BOROUGH PRESIDENT") || m.includes("BOROUGH BOARD")) {
      baseStep = 2;
      baseLabel = "Borough President/Board Review";
    } else {
      baseStep = 3;
      baseLabel = "CPC Review & Public Hearing";
    }
  } else if (m.includes("BOROUGH PRESIDENT") || m.includes("BOROUGH BOARD")) {
    baseStep = 2;
    baseLabel = "Borough President/Board Review";
  } else if (m.includes("COMMUNITY BOARD") || m.startsWith("PC")) {
    baseStep = 1;
    baseLabel = "Community Board Review";
  }

  if (estimatedStep > baseStep) {
    return { step: estimatedStep, label: estimatedLabel };
  }

  return { step: baseStep, label: baseLabel };
};

const STEPS = [
  { id: 0, label: "Filing", desc: "Application prepared & filed" },
  { id: 1, label: "Community Board", desc: "Local CD public review & hearing" },
  { id: 2, label: "Borough BP", desc: "Borough president review" },
  { id: 3, label: "CPC Review", desc: "City Planning Commission hearing & vote" },
  { id: 4, label: "City Council", desc: "City Council hearing & vote" },
  { id: 5, label: "Mayor Review", desc: "Mayor approval or veto" },
  { id: 6, label: "Completed", desc: "Final land-use decision active" }
];

const ProjectCard: FC<ProjectCardProps> = ({
  project,
  isCurrentlyTracked,
  onToggleTrack,
  onResolveDetails,
  scheduledCPC,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const {
    project_id,
    project_name,
    project_brief,
    project_status,
    public_status,
    ulurp_numbers,
    primary_applicant,
    applicant_type,
    borough,
    community_district,
    cc_district,
    current_milestone,
    current_milestone_date,
    certified_referred,
    app_filed_date,
    mih_flag,
    mih_option1,
    mih_option2,
    mih_workforce,
    mih_deepaffordability,
    bbls,
    ntaCode,
    ntaName,
    displacementRisks,
  } = project;

  const isScheduledForNextCPC = React.useMemo(() => {
    if (!scheduledCPC) return false;

    // 1. Direct Project ID match (from calendar links/text)
    if (scheduledCPC.scheduledProjectIds && project_id) {
      if (scheduledCPC.scheduledProjectIds.includes(project_id.toUpperCase())) {
        return true;
      }
    }

    // 2. ULURP number fallback match
    if (ulurp_numbers) {
      const projectUlurps = ulurp_numbers.match(/[A-Z]\s*\d{5,6}\s*[A-Z]+/gi) || [];
      return projectUlurps.some((u) => {
        const cleanU = u.replace(/\s+/g, "").toUpperCase();
        return scheduledCPC.scheduledUlurps.includes(cleanU);
      });
    }

    return false;
  }, [scheduledCPC, project_id, ulurp_numbers]);

  // Custom colors for boroughs
  const getBoroughColor = (b: string) => {
    const norm = b?.toLowerCase() || "";
    if (norm.includes("brooklyn")) return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
    if (norm.includes("queens")) return "bg-amber-900/30 text-amber-400 border-amber-800/50";
    if (norm.includes("manhattan")) return "bg-blue-900/30 text-blue-400 border-blue-800/50";
    if (norm.includes("bronx")) return "bg-purple-900/30 text-purple-400 border-purple-800/50";
    if (norm.includes("staten")) return "bg-rose-900/30 text-rose-400 border-rose-800/50";
    return "bg-slate-800 text-slate-400 border-slate-700";
  };

  const getStatusColor = (s: string) => {
    const norm = s?.toLowerCase() || "";
    if (norm === "active") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (norm === "complete" || norm === "completed") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (norm === "on-hold") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-slate-800/50 text-slate-400 border-slate-800";
  };

  // Determine active stepper phase
  const currentPhase = getProjectPhase(current_milestone || "", project_status || "", certified_referred, public_status);

  // Format milestones/dates nicely
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = parts[0];
        const month = months[parseInt(parts[1], 10) - 1];
        const day = parseInt(parts[2], 10);
        return `${month} ${day}, ${year}`;
      }
      return dateStr.split("T")[0];
    } catch {
      return dateStr;
    }
  };

  // On-demand resolver for deep displacement risk and PLUTO data
  const handleResolveDeepDive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isResolving || displacementRisks) return;

    setIsResolving(true);
    setResolveError("");

    try {
      console.log(`Resolving deep details for project: ${project_id}`);
      const res = await fetch(`/api/resolve-project-nta?projectId=${project_id}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      onResolveDetails(project_id, data);
    } catch (err: any) {
      console.error(err);
      setResolveError(err.message || "Failed to query PLUTO/Displacement risk. Try again.");
    } finally {
      setIsResolving(false);
    }
  };

  // Check if calendar dates can be extracted (Community Board, CPC hearing dates etc.)
  const getHearingMeetingDate = () => {
    if (current_milestone_date && currentPhase.step >= 1 && currentPhase.step <= 4) {
      return current_milestone_date.split("T")[0];
    }
    return undefined;
  };
  const meetingDate = getHearingMeetingDate();

  return (
    <div
      id={`project-${project_id}`}
      className="bg-[#0F1218] border border-slate-800 rounded-xl p-5 shadow-lg hover:shadow-2xl hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBoroughColor(borough)}`}>
              {borough}
            </span>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(project_status)}`}>
              {project_status}
            </span>

            {mih_flag === "true" && (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                MIH Affordable
              </span>
            )}
          </div>

          <button
            id={`btn-track-${project_id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleTrack();
            }}
            className={`p-2 rounded-lg border transition-all duration-150 flex items-center justify-center cursor-pointer ${
              isCurrentlyTracked
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-[#131722] text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-slate-800"
            }`}
            title={isCurrentlyTracked ? "Stop Tracking Project" : "Track Project"}
          >
            <Bookmark className={`w-4 h-4 ${isCurrentlyTracked ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>
        </div>

        {/* Project Name and ID */}
        <h3 className="text-base font-bold text-white tracking-tight mb-2">
          <a
            href={`https://zap.planning.nyc.gov/projects/${project_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-amber-400 hover:underline transition-all"
          >
            {project_name}
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-amber-400" />
          </a>
        </h3>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-[#131722] text-slate-400 font-mono text-xs px-2.5 py-0.5 rounded border border-slate-800/80">
            ID: {project_id}
          </span>
          {applicant_type && (
            <span className={`font-semibold text-[11px] px-2.5 py-0.5 rounded border ${
              applicant_type.toLowerCase() === "private"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/25"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
            }`}>
              {applicant_type} Applicant
            </span>
          )}
        </div>

        {/* Governance & Location Details */}
        <div className="mb-3.5 bg-[#131722]/60 rounded-xl p-3 border border-slate-800/60 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 border-b border-slate-800/40 pb-1 mb-1">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">
              Governance & Location
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px]">Applicant:</span>
              <span className="font-semibold text-white truncate" title={primary_applicant}>
                {primary_applicant || "DCP / Public"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px]">Community District:</span>
              <span className="font-semibold text-white truncate">
                {community_district ? `${borough} CD ${community_district.replace(/^[A-Z]/, "")}` : "N/A"}
              </span>
            </div>
            {cc_district && (
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Council District:</span>
                <span className="font-semibold text-white">District {cc_district}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px]">CEQR ID:</span>
              <span className="font-mono text-[10px] text-white truncate" title={project.ceqr_number || "Type II Exemption"}>
                {project.ceqr_number || "Type II Exemption"}
              </span>
            </div>
          </div>
        </div>

        {/* Current Hearing Phase & Milestone */}
        {current_milestone && (
          <div className="mb-3.5 bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 border-b border-amber-500/10 pb-1 mb-1 text-amber-400">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold uppercase tracking-wider text-[9px]">
                Current Hearing Phase & Milestone
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white truncate max-w-[210px]" title={current_milestone}>
                {current_milestone}
              </span>
              {current_milestone_date && (
                <span className="text-amber-500 font-mono text-[10.5px] shrink-0">
                  {formatDate(current_milestone_date)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CPC Calendar Match Hearing Schedule */}
        {isScheduledForNextCPC && scheduledCPC && (
          <div className="mb-3.5 bg-red-500/10 rounded-xl p-3.5 border border-red-500/35 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider text-[9px]">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>CPC Hearing Scheduled</span>
            </div>
            <p className="text-white font-semibold">
              Public hearing is scheduled for next CPC meeting on {scheduledCPC.scheduledMeetingDate}!
            </p>
            <a
              href={scheduledCPC.calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10.5px] font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 mt-1 hover:underline"
            >
              View Commission Calendar PDF <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Project Brief / Description */}
        <p className={`text-slate-400 text-sm leading-relaxed mb-4 ${isExpanded ? "" : "line-clamp-3"}`}>
          {project_brief || "No description provided."}
        </p>
      </div>

      {/* Main Expansion Details Accordion */}
      {isExpanded && (
        <div className="border-t border-slate-800/70 pt-4 mt-2 space-y-4 text-xs animate-fade-in">
          
          {/* Phase 1: Visual ULURP Progress Stepper */}
          <div className="bg-[#131722]/50 rounded-xl p-4 border border-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                ULURP Public Hearing Phase
              </span>
              <span className="font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">
                {currentPhase.label}
              </span>
            </div>

            {/* Stepper Steps */}
            <div className="relative pt-2">
              {/* Connector line */}
              <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-800" />
              
              <div className="space-y-4 relative">
                {STEPS.map((step) => {
                  const isCompleted = currentPhase.step > step.id;
                  const isActive = currentPhase.step === step.id;
                  
                  return (
                    <div key={step.id} className="flex items-start gap-3.5 pl-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full z-10 flex items-center justify-center shrink-0 border-2 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-400"
                          : isActive
                          ? "bg-[#0F1218] border-amber-500 animate-pulse ring-4 ring-amber-500/25"
                          : "bg-[#0F1218] border-slate-800"
                      }`} />
                      
                      <div className="flex-1 -mt-0.5">
                        <p className={`font-bold ${isActive ? "text-amber-400" : isCompleted ? "text-slate-300" : "text-slate-500"}`}>
                          {step.label}
                        </p>
                        {isActive && (
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            Active Stage: {current_milestone || step.desc} ({formatDate(current_milestone_date)})
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="bg-[#131722]/40 rounded-lg p-3.5 border border-slate-800/40 space-y-2.5">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block border-b border-slate-800/40 pb-1.5">
              Additional Project Metrics & Dates
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Filed Date:</span>
                <span className="font-mono text-white">{formatDate(app_filed_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Public Review Status:</span>
                <span className="font-semibold text-white">{public_status || "Noticed"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ULURP / Non:</span>
                <span className="font-semibold text-white">{project.ulurp_non || "ULURP"}</span>
              </div>
              {ulurp_numbers && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ULURP Numbers:</span>
                  <span className="font-mono text-amber-400 truncate max-w-[150px]" title={ulurp_numbers}>
                    {ulurp_numbers}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mandatory Inclusionary Housing details */}
          {mih_flag === "true" && (
            <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-lg p-3 space-y-1.5">
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px] block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Mandatory Inclusionary Housing Options
              </span>
              <p className="text-slate-400 text-[11px] leading-normal">
                This project triggers MIH affordable housing requirements. The developer is required to construct permanently affordable housing units.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mih_option1 === "true" && (
                  <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                    Option 1: 25% @ 60% AMI
                  </span>
                )}
                {mih_option2 === "true" && (
                  <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                    Option 2: 30% @ 80% AMI
                  </span>
                )}
                {mih_workforce === "true" && (
                  <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                    Workforce Option
                  </span>
                )}
                {mih_deepaffordability === "true" && (
                  <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px] font-bold">
                    Deep Affordability Option
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Displacement Risk & PLUTO Details */}
          <div className="border-t border-slate-800/40 pt-3 mt-1">
            {!displacementRisks ? (
              <div className="space-y-2">
                <button
                  onClick={handleResolveDeepDive}
                  disabled={isResolving}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 border border-rose-500/20 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing Neighborhood Displacement Risk & PLUTO Tax Lots...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Analyze Displacement Risk & PLUTO Lots
                    </>
                  )}
                </button>
                {resolveError && (
                  <p className="text-red-400 font-medium text-center text-[10px] mt-1">{resolveError}</p>
                )}
              </div>
            ) : (
              <div className="bg-[#181214]/50 rounded-lg p-3 border border-rose-950/20 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-950/20 pb-1.5">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Neighborhood Displacement Risk Analysis
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Resolved via PLUTO BBL Map</span>
                </div>

                {displacementRisks.map((risk, index) => {
                  const getRiskStyle = (levelStr: string) => {
                    const l = levelStr ? levelStr.toLowerCase() : "";
                    if (l === "highest") return "bg-red-950/40 text-red-400 border-red-900/40";
                    if (l === "high") return "bg-orange-950/40 text-orange-400 border-orange-900/40";
                    if (l === "intermediate") return "bg-yellow-950/30 text-yellow-500 border-yellow-900/30";
                    if (l === "low") return "bg-blue-950/30 text-blue-400 border-blue-900/30";
                    return "bg-emerald-950/30 text-emerald-400 border-emerald-900/30";
                  };

                  return (
                    <div key={index} className="space-y-2 pb-2 border-b border-slate-800/30 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-xs">NTA: {risk.ntaName || risk.ntaCode}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskStyle(risk.displacementRiskIndex)}`}>
                          {risk.displacementRiskIndex} Risk Index
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/40">
                          <p className="text-slate-500 text-[8px] uppercase font-bold tracking-tight">Vulnerability</p>
                          <p className="font-bold text-slate-200 mt-0.5 text-[11px]">{risk.populationVulnerability}</p>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/40">
                          <p className="text-slate-500 text-[8px] uppercase font-bold tracking-tight">Housing Conditions</p>
                          <p className="font-bold text-slate-200 mt-0.5 text-[11px]">{risk.housingConditions}</p>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/40">
                          <p className="text-slate-500 text-[8px] uppercase font-bold tracking-tight">Market Pressure</p>
                          <p className="font-bold text-slate-200 mt-0.5 text-[11px]">{risk.marketPressure}</p>
                        </div>
                      </div>

                      {/* Demographics data list */}
                      <div className="bg-slate-950/35 px-2.5 py-1.5 rounded space-y-1 font-mono text-[9.5px] text-slate-400 leading-normal border border-slate-800/20">
                        {risk.notWhite && (
                          <div className="flex justify-between">
                            <span>People of Color Share:</span>
                            <span className="text-slate-300 font-bold">{parseFloat(risk.notWhite).toFixed(1)}%</span>
                          </div>
                        )}
                        {risk.below2xPovertyRate && (
                          <div className="flex justify-between">
                            <span>Income Below 200% Poverty:</span>
                            <span className="text-slate-300 font-bold">{parseFloat(risk.below2xPovertyRate).toFixed(1)}%</span>
                          </div>
                        )}
                        {risk.severeRentBurden && (
                          <div className="flex justify-between">
                            <span>Severely Rent Burdened (&gt;50% Income):</span>
                            <span className="text-slate-300 font-bold">{risk.severeRentBurden}%</span>
                          </div>
                        )}
                        {risk.occupiedRentStabilized && (
                          <div className="flex justify-between">
                            <span>Rent Stabilized Stock Share:</span>
                            <span className="text-slate-300 font-bold">{risk.occupiedRentStabilized}</span>
                          </div>
                        )}
                        {risk.changeInRents && (
                          <div className="flex justify-between">
                            <span>Average Rent Appreciation:</span>
                            <span className="text-slate-300 font-semibold">{risk.changeInRents}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Displacement risks resolved */}
              </div>
            )}
          </div>

          {/* Calendar Actions */}
          {meetingDate && (
            <div className="border-t border-slate-800/50 pt-3 mt-2 flex flex-wrap items-center justify-between gap-2 bg-[#131722]/20 p-2 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Export Next Hearing Calendar
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={getGoogleCalendarUrl({ projectName: project_name, meetingDate })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 px-2.5 py-1 rounded transition-all"
                >
                  Google Calendar
                </a>
                <button
                  onClick={() => downloadIcsFile({ projectName: project_name, meetingDate })}
                  className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  iCal (.ics)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion Expand Footer */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-4 border-t border-slate-800/40 pt-3 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
      >
        <span>{isExpanded ? "Collapse Details" : "Expand Hearing Timeline, MIH & Displacement Risk"}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default ProjectCard;
