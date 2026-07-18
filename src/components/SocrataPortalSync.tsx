import React, { useState, useEffect } from "react";
import { Database, ShieldCheck, RefreshCw, AlertCircle, Sparkles, Check, Server, Network } from "lucide-react";

interface SocrataPortalSyncProps {
  onRefreshDatabase: () => void;
  isSyncing: boolean;
}

export default function SocrataPortalSync({
  onRefreshDatabase,
  isSyncing,
}: SocrataPortalSyncProps) {
  const [healthStatus, setHealthStatus] = useState<"loading" | "healthy" | "error">("loading");
  const [healthDetails, setHealthDetails] = useState<any>(null);

  const checkHealth = async () => {
    setHealthStatus("loading");
    try {
      const res = await fetch("/api/socrata-health");
      if (!res.ok) throw new Error("Portal returned error status");
      const data = await res.json();
      if (data.status === "healthy") {
        setHealthStatus("healthy");
        setHealthDetails(data);
      } else {
        setHealthStatus("error");
      }
    } catch (err) {
      console.error("Health check failed:", err);
      setHealthStatus("error");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="bg-[#0F1218] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Database className="w-5 h-5 text-amber-500 animate-pulse" />
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">ZAP Live-Portal Status</h4>
          <p className="text-[10px] text-slate-500">NYC Socrata Open Data Connectivity</p>
        </div>
      </div>

      {/* Health Status Indicator */}
      {healthStatus === "loading" && (
        <div className="flex items-center gap-2 p-3 bg-slate-900/40 rounded-lg text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Verifying secure tunnel to NYC Open Data servers...</span>
        </div>
      )}

      {healthStatus === "healthy" && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-xs text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-white">Secure API Connection Established</p>
              <p className="opacity-90 mt-0.5">Tunnel is healthy. Direct SoQL queries enabled for ZAP project registry <code className="bg-emerald-950 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-400">{healthDetails?.datasetId}</code>.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
            <div className="bg-slate-950/40 p-2 rounded border border-slate-800/30 flex flex-col justify-center">
              <span className="text-slate-500 uppercase text-[8px] font-bold">API Provider</span>
              <span className="font-semibold text-slate-300 truncate mt-0.5">{healthDetails?.provider}</span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded border border-slate-800/30 flex flex-col justify-center">
              <span className="text-slate-500 uppercase text-[8px] font-bold">Health Verified</span>
              <span className="font-semibold text-slate-300 mt-0.5">Tunnel Active</span>
            </div>
          </div>
        </div>
      )}

      {healthStatus === "error" && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-white">NYC Data Portal Unreachable</p>
            <p className="opacity-90 mt-0.5">Failed to verify Socrata health. Queries might rely on fallback caches or rate-limited channels.</p>
            <button
              onClick={checkHealth}
              className="mt-2 text-rose-400 font-semibold underline hover:text-rose-300 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Manual Sync Trigger */}
      <button
        onClick={onRefreshDatabase}
        disabled={isSyncing}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold text-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
          isSyncing
            ? "bg-amber-500/45 cursor-not-allowed text-black/50"
            : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700"
        }`}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
            Synchronizing with ZAP registry...
          </>
        ) : (
          <>
            <Server className="w-4 h-4 text-black" />
            Force Live Socrata Sync
          </>
        )}
      </button>
    </div>
  );
}
