import React, { useState } from "react";
import { TrackedProject } from "../types";
import { 
  Trash2, 
  FileText, 
  Clipboard, 
  Download, 
  Check, 
  Save, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Tag, 
  Building2, 
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { getGoogleCalendarUrl, downloadIcsFile } from "../lib/calendar";
import { getProjectPhase } from "./ProjectCard";

interface TrackedListProps {
  trackedProjects: TrackedProject[];
  onRemoveTrack: (projectId: string, projectName: string) => void;
  onUpdateNotes: (projectId: string, projectName: string, notes: string) => void;
  onUpdateStatus: (projectId: string, projectName: string, status: TrackedProject["status"]) => void;
  scheduledCPC?: {
    scheduledMeetingDate: string;
    calendarUrl: string;
    scheduledUlurps: string[];
    scheduledProjectIds?: string[];
  } | null;
}

export default function TrackedList({
  trackedProjects,
  onRemoveTrack,
  onUpdateNotes,
  onUpdateStatus,
  scheduledCPC,
}: TrackedListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [copyStatus, setCopyStatus] = useState(false);

  const getStatusColor = (status: TrackedProject["status"]) => {
    switch (status) {
      case "Attending Hearing":
        return "bg-amber-950/40 text-amber-400 border-amber-900/50";
      case "Testified":
        return "bg-[#181214]/50 text-rose-400 border-rose-900/40";
      case "Reviewed":
        return "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";
      default: // Followed
        return "bg-blue-950/40 text-blue-400 border-blue-900/50";
    }
  };

  const handleStartEdit = (p: TrackedProject, id: string) => {
    setEditingId(id);
    setTempNotes(p.notes || "");
  };

  const handleSaveNotes = (p: TrackedProject, id: string) => {
    onUpdateNotes(p.project_id, p.project_name, tempNotes);
    setEditingId(null);
  };

  const exportAsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trackedProjects, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "tracked_ulurp_projects.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return dateStr.split("T")[0];
    } catch {
      return dateStr;
    }
  };

  const copyAsMarkdown = () => {
    let md = `# My Tracked NYC ULURP Projects\n\n`;
    trackedProjects.forEach((p, idx) => {
      md += `### ${idx + 1}. ${p.project_name}\n`;
      md += `- **Project ID:** ${p.project_id}\n`;
      md += `- **ZAP Portal Link:** https://zap.planning.nyc.gov/projects/${p.project_id}\n`;
      md += `- **Borough:** ${p.borough}\n`;
      md += `- **Community District:** ${p.borough} CD ${p.community_district?.replace(/^[A-Z]/, "") || "N/A"}\n`;
      md += `- **Primary Applicant:** ${p.primary_applicant || "DCP"}\n`;
      md += `- **Current Milestone:** ${p.current_milestone || "N/A"}\n`;
      md += `- **Milestone Date:** ${formatDate(p.current_milestone_date)}\n`;
      if (p.ulurp_numbers) md += `- **ULURP Numbers:** ${p.ulurp_numbers}\n`;
      md += `- **Track Status:** ${p.status}\n`;
      md += `- **My Private Notes:** ${p.notes || "None"}\n\n`;
      md += `---\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  if (trackedProjects.length === 0) {
    return (
      <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-8 text-center shadow-xl">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">No Tracked Projects Yet</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Explore the live ZAP database, expand a project, and click the bookmark ribbon icon on any project card to begin tracking and saving notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Export & Actions bar */}
      <div className="flex items-center justify-between bg-[#0F1218] border border-slate-800 p-3 rounded-lg">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {trackedProjects.length} TRACKED {trackedProjects.length === 1 ? "PROJECT" : "PROJECTS"}
        </span>

        <div className="flex gap-2">
          <button
            onClick={copyAsMarkdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#131722] border border-slate-800 text-xs font-semibold text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            {copyStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
            {copyStatus ? "Copied!" : "Copy MD"}
          </button>
          <button
            onClick={exportAsJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#131722] border border-slate-800 text-xs font-semibold text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Tracked Projects List */}
      <div className="grid grid-cols-1 gap-4">
        {trackedProjects.map((p) => {
          const uniqueId = p.project_id;
          const isEditing = editingId === uniqueId;
          const phase = getProjectPhase(p.current_milestone || "", p.project_status || "", p.certified_referred, p.public_status);
          const meetingDate = p.current_milestone_date ? p.current_milestone_date.split("T")[0] : undefined;

          const isScheduledForNextCPC = scheduledCPC
            ? (
                (scheduledCPC.scheduledProjectIds && p.project_id && scheduledCPC.scheduledProjectIds.includes(p.project_id.toUpperCase())) ||
                (p.ulurp_numbers && (p.ulurp_numbers.match(/[A-Z]\s*\d{5,6}\s*[A-Z]+/gi) || []).some((u) => {
                  const cleanU = u.replace(/\s+/g, "").toUpperCase();
                  return scheduledCPC.scheduledUlurps.includes(cleanU);
                }))
              )
            : false;

          return (
            <div
              key={uniqueId}
              className="bg-[#0F1218] border border-slate-800 rounded-xl p-5 shadow-lg hover:border-slate-700 transition-all duration-150 flex flex-col md:flex-row gap-5"
            >
              {/* Project Primary Info Panel */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#131722] text-slate-300 font-mono text-xs px-2 py-0.5 rounded border border-slate-800">
                    ID: {p.project_id}
                  </span>
                  
                  {p.current_milestone && (
                    <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20" title={p.current_milestone}>
                      Milestone: {p.current_milestone}
                    </span>
                  )}

                  {p.current_milestone_date && (
                    <span className="flex items-center gap-1 bg-[#131722] text-slate-300 px-2 py-0.5 rounded text-xs border border-slate-800 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      Milestone Date: {formatDate(p.current_milestone_date)}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  <a
                    href={`https://zap.planning.nyc.gov/projects/${p.project_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline hover:text-amber-400"
                  >
                    {p.project_name}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </h3>

                <p className="text-xs text-slate-400 leading-normal line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                  {p.project_brief || "No description provided."}
                </p>

                {isScheduledForNextCPC && scheduledCPC && (
                  <div className="bg-red-500/10 rounded-lg p-3.5 border border-red-500/35 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider text-[9px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>CPC Hearing Scheduled</span>
                    </div>
                    <p className="text-white font-semibold">
                      Public hearing will be for next CPC meeting on {scheduledCPC.scheduledMeetingDate}!
                    </p>
                    <a
                      href={scheduledCPC.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 mt-1 hover:underline"
                    >
                      View Commission Calendar PDF <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/50">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {p.borough} (CD {p.community_district?.replace(/^[A-Z]/, "")})
                    </span>
                    {p.applicant_type && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Applicant: <strong className="text-slate-300 font-semibold">{p.primary_applicant || "DCP"}</strong></span>
                      </span>
                    )}
                    {p.ulurp_numbers && (
                      <span className="font-mono text-slate-400 bg-slate-900/55 px-1.5 py-0.5 rounded border border-slate-800/40">
                        ULURP: {p.ulurp_numbers}
                      </span>
                    )}
                  </div>

                  {/* Micro Displacement Risks indicator */}
                  {p.displacementRisks && p.displacementRisks.length > 0 && (
                    <div className="bg-[#181214]/30 rounded-lg px-2.5 py-1.5 border border-rose-950/20 text-xxs flex items-center justify-between text-rose-300 font-sans">
                      <span className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3 h-3 text-rose-500" /> Neighborhood Displacement Risk index:
                      </span>
                      <span className="font-mono bg-rose-500/10 px-1.5 py-0.5 rounded text-rose-400 font-bold border border-rose-500/20">
                        {p.displacementRisks[0].displacementRiskIndex} Risk
                      </span>
                    </div>
                  )}
                </div>

                {/* Save to Calendar Actions */}
                {meetingDate && (
                  <div className="border-t border-slate-800/50 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-[#131722]/10 p-2 rounded-lg">
                    <span className="text-xxs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> Save Event:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getGoogleCalendarUrl({ projectName: p.project_name, meetingDate })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:underline bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 px-2 py-1 rounded transition-all"
                        title="Save to Google Calendar"
                      >
                        Google Calendar
                      </a>
                      <button
                        onClick={() => downloadIcsFile({ projectName: p.project_name, meetingDate })}
                        className="text-[10px] font-semibold text-slate-300 hover:text-white hover:underline bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 px-2 py-1 rounded transition-all cursor-pointer"
                        title="Download standard ICS calendar file"
                      >
                        iCal (.ics)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Action Logs Panel */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-4 flex flex-col justify-between gap-3">
                <div className="space-y-3">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xxs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      My Tracked Status
                    </label>
                    <select
                      value={p.status}
                      onChange={(e) => onUpdateStatus(p.project_id, p.project_name, e.target.value as TrackedProject["status"])}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors cursor-pointer ${getStatusColor(
                        p.status
                      )}`}
                    >
                      <option value="Followed" className="bg-[#0F1218] text-slate-300">Followed</option>
                      <option value="Attending Hearing" className="bg-[#0F1218] text-slate-300">Attending Hearing</option>
                      <option value="Testified" className="bg-[#0F1218] text-slate-300">Testified</option>
                      <option value="Reviewed" className="bg-[#0F1218] text-slate-300">Reviewed</option>
                    </select>
                  </div>

                  {/* Notes Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xxs font-semibold text-slate-400 uppercase tracking-wider">
                        My Private Notes
                      </label>
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveNotes(p, uniqueId)}
                          className="text-xxs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(p, uniqueId)}
                          className="text-xxs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          Edit Notes
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <textarea
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Add testimony logs, meeting reminders, or notes here..."
                        className="w-full p-2 bg-[#131722] border border-slate-800 text-white rounded-lg text-xs font-sans h-20 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                      />
                    ) : (
                      <div className="p-2.5 bg-[#131722] rounded-lg text-xs text-slate-400 italic border border-slate-800/60 min-h-12 max-h-24 overflow-y-auto">
                        {p.notes || "No notes added yet. Click Edit Notes to add follow-up remarks, testimony records, or notes."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove track action */}
                <button
                  onClick={() => onRemoveTrack(p.project_id, p.project_name)}
                  className="w-full py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg flex items-center justify-center gap-1 transition-colors mt-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Stop Tracking
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
