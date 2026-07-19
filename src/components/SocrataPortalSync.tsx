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
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Database className="w-5 h-5 text-blue-600 animate-pulse" />
        <div>
          <h4 className="text-sm font-bold text-slate-800 tracking-tight">ZAP Live-Portal Status</h4>
          <p className="text-[10px] text-slate-400 font-medium">NYC Socrata Open Data Connectivity</p>
        </div>
      </div>

      {/* Health Status Indicator */}
      {healthStatus === "loading" && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Verifying secure tunnel to NYC Open Data servers...</span>
        </div>
      )}

      {healthStatus === "healthy" && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-emerald-950">Secure API Connection Established</p>
              <p className="opacity-90 mt-0.5">Tunnel is healthy. Direct SoQL queries enabled for ZAP project registry <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-800 font-semibold">{healthDetails?.datasetId}</code>.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
            <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-400 uppercase text-[8px] font-bold">API Provider</span>
              <span className="font-semibold text-slate-700 truncate mt-0.5">{healthDetails?.provider}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-400 uppercase text-[8px] font-bold">Health Verified</span>
              <span className="font-semibold text-slate-700 mt-0.5">Tunnel Active</span>
            </div>
          </div>
        </div>
      )}

      {healthStatus === "error" && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-850 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-red-950">NYC Data Portal Unreachable</p>
            <p className="opacity-90 mt-0.5 text-red-800">Failed to verify Socrata health. Queries might rely on fallback caches or rate-limited channels.</p>
            <button
              onClick={checkHealth}
              className="mt-2 text-red-650 font-semibold underline hover:text-red-800 cursor-pointer"
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
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
          isSyncing
            ? "bg-slate-100 border border-slate-200 cursor-not-allowed text-slate-400"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
        }`}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            Synchronizing with ZAP registry...
          </>
        ) : (
          <>
            <Server className="w-4 h-4 text-white" />
            Force Live Socrata Sync
          </>
        )}
      </button>
    </div>
  );
}
