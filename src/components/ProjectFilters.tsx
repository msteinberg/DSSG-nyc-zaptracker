import React from "react";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";

interface ProjectFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedBorough: string;
  setSelectedBorough: (b: string) => void;
  selectedDisplacementRisk: string;
  setSelectedDisplacementRisk: (risk: string) => void;
  selectedCommunityDistrict: string;
  setSelectedCommunityDistrict: (cd: string) => void;
  availableCommunityDistricts: { value: string; label: string }[];
  totalResults: number;
}

export default function ProjectFilters({
  searchQuery,
  setSearchQuery,
  selectedBorough,
  setSelectedBorough,
  selectedDisplacementRisk,
  setSelectedDisplacementRisk,
  selectedCommunityDistrict,
  setSelectedCommunityDistrict,
  availableCommunityDistricts,
  totalResults,
}: ProjectFiltersProps) {
  const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
  const riskLevels = [
    { value: "all", label: "All Risk Levels" },
    { value: "Highest", label: "Highest Risk Index" },
    { value: "High", label: "High Risk Index" },
    { value: "Intermediate", label: "Intermediate Risk" },
    { value: "Low", label: "Low Risk Index" },
    { value: "Lowest", label: "Lowest Risk Index" }
  ];

  return (
    <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-4 shadow-xl space-y-4 font-sans">
      <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
        <SlidersHorizontal className="w-4 h-4 text-amber-500" />
        <span>Filter ZAP Database (Noticed & In Public Review)</span>
        <span className="ml-auto text-slate-500 font-mono normal-case">{totalResults} matches loaded</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by project name, description, ULURP number, applicant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-800 rounded-lg text-sm bg-[#131722] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
      </div>

      {/* Grid of filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Borough Filters */}
        <div className="lg:col-span-6 space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Borough
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedBorough("all")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                selectedBorough === "all" || selectedBorough === ""
                  ? "bg-amber-500 border-amber-500 text-black shadow-sm font-bold"
                  : "bg-[#131722] border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              All
            </button>
            {boroughs.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBorough(b)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                  selectedBorough === b
                    ? "bg-amber-500 border-amber-500 text-black shadow-sm font-bold"
                    : "bg-[#131722] border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                {b.replace("Staten Island", "SI")}
              </button>
            ))}
          </div>
        </div>

        {/* Community District Filters */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Community District
          </label>
          <div className="relative">
            <select
              value={selectedCommunityDistrict}
              onChange={(e) => setSelectedCommunityDistrict(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 border border-slate-800 rounded-lg text-xs bg-[#131722] text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-semibold transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Districts ({availableCommunityDistricts.length})</option>
              {availableCommunityDistricts.map((cd) => (
                <option key={cd.value} value={cd.value}>
                  {cd.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Displacement Risk Filters */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Displacement Risk
          </label>
          <div className="relative">
            <select
              value={selectedDisplacementRisk}
              onChange={(e) => setSelectedDisplacementRisk(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 border border-slate-800 rounded-lg text-xs bg-[#131722] text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-semibold transition-all cursor-pointer appearance-none"
            >
              {riskLevels.map((rl) => (
                <option key={rl.value} value={rl.value}>
                  {rl.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
