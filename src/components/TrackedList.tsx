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
  Building2, 
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
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Testified":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Reviewed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: // Followed
        return "bg-blue-50 text-blue-700 border-blue-200";
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
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <FileText className="w-12 h-12 text-slate-450 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Tracked Projects Yet</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
          Explore the live ZAP database, expand a project, and click the bookmark ribbon icon on any project card to begin tracking and saving notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Export & Actions bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {trackedProjects.length} TRACKED {trackedProjects.length === 1 ? "PROJECT" : "PROJECTS"}
        </span>

        <div className="flex gap-2">
          <button
            onClick={copyAsMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {copyStatus ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5" />}
            {copyStatus ? "Copied!" : "Copy MD"}
          </button>
          <button
            onClick={exportAsJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
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
              className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all duration-150 flex flex-col md:flex-row gap-5"
            >
              {/* Project Primary Info Panel */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-slate-50 text-slate-500 font-mono text-xs px-2.5 py-0.5 rounded border border-slate-200">
                    ID: {p.project_id}
                  </span>
                  
                  {p.current_milestone && (
                    <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200" title={p.current_milestone}>
                      Milestone: {p.current_milestone}
                    </span>
                  )}

                  {p.current_milestone_date && (
                    <span className="flex items-center gap-1 bg-slate-50 text-slate-500 px-2.5 py-0.5 rounded text-xs border border-slate-200 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      Milestone Date: {formatDate(p.current_milestone_date)}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  <a
                    href={`https://zap.planning.nyc.gov/projects/${p.project_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline hover:text-blue-600"
                  >
                    {p.project_name}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </h3>

                <p className="text-xs text-slate-600 leading-normal line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                  {p.project_brief || "No description provided."}
                </p>

                {isScheduledForNextCPC && scheduledCPC && (
                  <div className="bg-rose-50 rounded-lg p-3.5 border border-rose-200 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold uppercase tracking-wider text-[9px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>CPC Hearing Scheduled</span>
                    </div>
                    <p className="text-rose-950 font-bold">
                      Public hearing will be for next CPC meeting on {scheduledCPC.scheduledMeetingDate}!
                    </p>
                    <a
                      href={scheduledCPC.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-1 hover:underline"
                    >
                      View Commission Calendar PDF <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {p.borough} (CD {p.community_district?.replace(/^[A-Z]/, "")})
                    </span>
                    {p.applicant_type && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Applicant: <strong className="text-slate-700 font-semibold">{p.primary_applicant || "DCP"}</strong></span>
                      </span>
                    )}
                    {p.ulurp_numbers && (
                      <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50">
                        ULURP: {p.ulurp_numbers}
                      </span>
                    )}
                  </div>

                  {/* Micro Displacement Risks indicator */}
                  {p.displacementRisks && p.displacementRisks.length > 0 && (
                    <div className="bg-rose-50/40 rounded-lg px-2.5 py-1.5 border border-rose-100 text-xxs flex items-center justify-between text-rose-850 font-sans">
                      <span className="flex items-center gap-1 font-bold text-rose-700">
                        <ShieldAlert className="w-3 h-3 text-rose-500" /> Neighborhood Displacement Risk index:
                      </span>
                      <span className="font-mono bg-rose-100 px-1.5 py-0.5 rounded text-rose-800 font-bold border border-rose-200">
                        {p.displacementRisks[0].displacementRiskIndex} Risk
                      </span>
                    </div>
                  )}
                </div>

                {/* Save to Calendar Actions */}
                {meetingDate && (
                  <div className="border-t border-slate-100 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" /> Save Event:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getGoogleCalendarUrl({ projectName: p.project_name, meetingDate })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 hover:bg-blue-100 border border-blue-150 px-2 py-1 rounded transition-all"
                        title="Save to Google Calendar"
                      >
                        Google Calendar
                      </a>
                      <button
                        onClick={() => downloadIcsFile({ projectName: p.project_name, meetingDate })}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-800 hover:underline bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded transition-all cursor-pointer"
                        title="Download standard ICS calendar file"
                      >
                        iCal (.ics)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Action Logs Panel */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 flex flex-col justify-between gap-3">
                <div className="space-y-3">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      My Tracked Status
                    </label>
                    <select
                      value={p.status}
                      onChange={(e) => onUpdateStatus(p.project_id, p.project_name, e.target.value as TrackedProject["status"])}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors cursor-pointer ${getStatusColor(
                        p.status
                      )}`}
                    >
                      <option value="Followed" className="bg-white text-slate-700 font-semibold">Followed</option>
                      <option value="Attending Hearing" className="bg-white text-slate-700 font-semibold">Attending Hearing</option>
                      <option value="Testified" className="bg-white text-slate-700 font-semibold">Testified</option>
                      <option value="Reviewed" className="bg-white text-slate-700 font-semibold">Reviewed</option>
                    </select>
                  </div>

                  {/* Notes Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider">
                        My Private Notes
                      </label>
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveNotes(p, uniqueId)}
                          className="text-xxs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(p, uniqueId)}
                          className="text-xxs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
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
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-850 rounded-lg text-xs font-sans h-20 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 italic border border-slate-200/60 min-h-12 max-h-24 overflow-y-auto">
                        {p.notes || "No notes added yet. Click Edit Notes to add follow-up remarks, testimony records, or notes."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove track action */}
                <button
                  onClick={() => onRemoveTrack(p.project_id, p.project_name)}
                  className="w-full py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-700 rounded-lg flex items-center justify-center gap-1 transition-colors mt-auto cursor-pointer"
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
