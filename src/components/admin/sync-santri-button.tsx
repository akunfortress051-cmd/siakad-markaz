"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export function SyncSantriButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sync-santri")
      .then((res) => res.json())
      .then((data) => {
        if (data.lastSyncedAt) {
          setLastSynced(data.lastSyncedAt);
        }
      })
      .catch((err) => console.error("Failed to fetch sync status", err));
  }, []);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/admin/sync-santri", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal sinkronisasi");

      setLastSynced(data.timestamp);
      toast.success(
        `Sinkronisasi berhasil! ${data.syncedCount} santri & ${data.newDufahCount} angkatan diperbarui.`
      );
      
      // Refresh halaman agar data baru ter-load
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="px-3 mb-4">
      <div className="neu-inset p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Data Lokal
          </span>
          {lastSynced && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-success)] font-medium">
              <CheckCircle2 size={12} /> Tersinkron
            </span>
          )}
        </div>
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="neu-button-primary w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
        >
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Menyinkronkan..." : "Sinkronisasi PPDB"}
        </button>

        {lastSynced && (
          <p className="text-[10px] text-center text-[var(--color-text-muted)]">
            Terakhir: {new Date(lastSynced).toLocaleString("id-ID", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
            })}
          </p>
        )}
      </div>
    </div>
  );
}
