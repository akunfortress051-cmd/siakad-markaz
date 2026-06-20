"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SyahadahOnlineDocument, SyahadahOnlineDocumentData } from "@/components/syahadah-online-document";
import {
  OnlineLayoutData,
  OnlineLayoutElementKey,
  ONLINE_LAYOUT_ELEMENT_KEYS,
  ONLINE_ELEMENT_LABELS,
  getDefaultOnlineLayout,
  ONLINE_PAPER_WIDTH_MM,
  ONLINE_PAPER_HEIGHT_MM,
} from "@/lib/syahadah-online-layout";

type Props = {
  qrUrl: string;
  data: SyahadahOnlineDocumentData;
  initialLayout: OnlineLayoutData;
  recordId: string;
  backHref: string;
  backLabel: string;
};

const STEP_OPTIONS = [0.5, 1, 2, 5];

// Group elements for cleaner chip display
const ELEMENT_GROUPS: { label: string; keys: OnlineLayoutElementKey[] }[] = [
  {
    label: "Konten",
    keys: ["paragrafPembuka", "namaSantri", "pengantarProgram", "teksProgram", "teksPeriode", "rataRata", "doaPenutup"],
  },
  {
    label: "TTD Kiri",
    keys: ["jabatanKiri", "stempelKiri", "ttdKiri", "namaKiri"],
  },
  {
    label: "TTD Kanan",
    keys: ["jabatanKanan", "ttdKanan", "namaKanan"],
  },
  {
    label: "Lainnya",
    keys: ["tanggalCetak", "qrCode"],
  },
];

export function SyahadahOnlineEditor({ qrUrl, data, initialLayout, recordId, backHref, backLabel }: Props) {
  const [layout, setLayout] = useState<OnlineLayoutData>(initialLayout);
  const [selectedElement, setSelectedElement] = useState<OnlineLayoutElementKey | null>(null);
  const [stepSize, setStepSize] = useState(1);
  const [editorActive, setEditorActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<OnlineLayoutData[]>([initialLayout]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const pushHistory = useCallback(
    (newLayout: OnlineLayoutData) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, newLayout];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLayout(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/syahadah-online-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, layoutData: layout }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [layout, recordId]);

  const handleReset = async () => {
    const defaultLayout = getDefaultOnlineLayout();
    setLayout(defaultLayout);
    pushHistory(defaultLayout);
    setSelectedElement(null);
    await fetch(`/api/admin/syahadah-online-layout?id=${recordId}`, { method: "DELETE" });
  };

  // ─── Export PDF via html2canvas + jsPDF ───────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);

    // Temporarily disable editor mode visuals during capture
    const prevEditorActive = editorActive;
    setEditorActive(false);

    // Wait a tick for DOM to update (editor styles removed)
    await new Promise((r) => setTimeout(r, 150));

    try {
      const docEl = document.getElementById("syahadah-online-doc");
      if (!docEl) {
        alert("Elemen dokumen tidak ditemukan.");
        return;
      }

      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      // F4 landscape: 330mm × 215mm → 96dpi ≈ 1248 × 813px, use scale=3 for quality
      const canvas = await html2canvas(docEl as HTMLElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: docEl.offsetWidth,
        height: docEl.offsetHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // F4 = 215mm × 330mm portrait. Landscape: 330mm × 215mm
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [ONLINE_PAPER_WIDTH_MM, ONLINE_PAPER_HEIGHT_MM], // [330, 215]
      });

      pdf.addImage(imgData, "JPEG", 0, 0, ONLINE_PAPER_WIDTH_MM, ONLINE_PAPER_HEIGHT_MM);
      pdf.save(`${data.nama}.pdf`);
    } catch (err) {
      console.error("Export PDF failed:", err);
      alert("Gagal mengekspor PDF. Silakan coba lagi.");
    } finally {
      setExporting(false);
      // Restore editor state
      if (prevEditorActive) setEditorActive(true);
    }
  }, [exporting, editorActive, data.nama]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.key === "Escape") {
        setSelectedElement(null);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setSelectedElement((prev) => {
          if (!prev) return ONLINE_LAYOUT_ELEMENT_KEYS[0];
          const idx = ONLINE_LAYOUT_ELEMENT_KEYS.indexOf(prev);
          const nextIdx = e.shiftKey
            ? (idx - 1 + ONLINE_LAYOUT_ELEMENT_KEYS.length) % ONLINE_LAYOUT_ELEMENT_KEYS.length
            : (idx + 1) % ONLINE_LAYOUT_ELEMENT_KEYS.length;
          return ONLINE_LAYOUT_ELEMENT_KEYS[nextIdx];
        });
        return;
      }
      if (!selectedElement) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();
      const multiplier = e.shiftKey ? 5 : 1;
      const delta = stepSize * multiplier;

      setLayout((prev) => {
        const el = { ...prev[selectedElement] };
        switch (e.key) {
          case "ArrowLeft":  el.offsetX -= delta; break;
          case "ArrowRight": el.offsetX += delta; break;
          case "ArrowUp":    el.offsetY -= delta; break;
          case "ArrowDown":  el.offsetY += delta; break;
        }
        const newLayout = { ...prev, [selectedElement]: el };
        pushHistory(newLayout);
        return newLayout;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorActive, selectedElement, stepSize, pushHistory, undo, handleSave]);

  // Font size control
  const handleFontSizeChange = (delta: number) => {
    if (selectedElement !== "namaSantri") return;
    setLayout((prev) => {
      const el = { ...prev.namaSantri };
      el.fontSize = Math.max(10, Math.min(60, (el.fontSize ?? 32) + delta));
      const newLayout = { ...prev, namaSantri: el };
      pushHistory(newLayout);
      return newLayout;
    });
  };

  const selectedOffset = selectedElement ? layout[selectedElement] : null;

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: #111 !important; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: ${ONLINE_PAPER_WIDTH_MM}mm ${ONLINE_PAPER_HEIGHT_MM}mm; margin: 0; }
          .editor-toolbar, .editor-panel { display: none !important; }
          .editor-crosshair { display: none !important; }
        }
        .syahadah-element:hover { outline: 1.5px dashed rgba(59,130,246,0.55); outline-offset: 1px; }
        .syahadah-element.selected { outline: 2px solid #3b82f6 !important; outline-offset: 1px; }
        .syahadah-element.selected::after {
          content: attr(data-label);
          position: absolute;
          top: -20px; left: 0;
          background: #3b82f6; color: #fff;
          font-size: 9px; font-family: sans-serif;
          padding: 2px 6px; border-radius: 3px;
          white-space: nowrap; z-index: 999; pointer-events: none;
        }
      `}</style>

      <div className="min-h-screen px-4 py-6 print:bg-white print:p-0" style={{ background: "#111" }} ref={containerRef}>

        {/* ── Top Toolbar ── */}
        <div className="editor-toolbar mx-auto mb-5 flex w-full items-center justify-between gap-3 print:hidden" style={{ maxWidth: "330mm" }}>
          <div className="flex items-center gap-3">
            <a
              href={backHref}
              className="rounded-full border border-neutral-600 bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-neutral-400 hover:bg-neutral-700 hover:text-white"
            >
              {backLabel}
            </a>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white">Layout Syahadah Online — {data.nama}</h1>
              <p className="text-[11px] text-slate-500">Kertas F4 (330×215mm) · Klik elemen → Arrow keys untuk geser</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorActive(!editorActive)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                editorActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500"
                  : "bg-neutral-700 text-slate-300 hover:bg-neutral-600"
              }`}
            >
              {editorActive ? "🎨 Editor Aktif" : "🎨 Mode Editor"}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: exporting ? "#059669aa" : "#059669" }}
            >
              {exporting ? "⏳ Memproses..." : "📄 Export PDF"}
            </button>
          </div>
        </div>

        {/* ── Editor Control Panel ── */}
        {editorActive && (
          <div className="editor-panel mx-auto mb-5 print:hidden" style={{ maxWidth: "330mm" }}>
            <div className="overflow-hidden rounded-2xl border border-neutral-700/80 bg-neutral-800/95 shadow-2xl shadow-black/30 backdrop-blur-md">

              {/* Row 1: Step + selected info + actions */}
              <div className="flex flex-wrap items-start gap-4 px-5 py-3.5">
                {/* Step size */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Step</span>
                  <div className="flex rounded-lg bg-neutral-900/60 p-0.5">
                    {STEP_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStepSize(s)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          stepSize === s ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}mm
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-6 w-px bg-neutral-700/60 self-center shrink-0" />

                {/* Selected element info */}
                <div className="flex-1 min-w-0">
                  {selectedElement ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex rounded-md bg-blue-600/15 border border-blue-500/30 px-2.5 py-1 text-[11px] font-bold text-blue-400 shrink-0">
                          {ONLINE_ELEMENT_LABELS[selectedElement]}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          X <strong className="text-slate-300">{selectedOffset?.offsetX?.toFixed(1) ?? 0}</strong>mm
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Y <strong className="text-slate-300">{selectedOffset?.offsetY?.toFixed(1) ?? 0}</strong>mm
                        </span>
                      </div>
                      {selectedElement === "namaSantri" && (
                        <div className="border-t border-neutral-700 pt-2">
                          <p className="mb-2 text-xs font-semibold text-slate-400">Ukuran Font (pt): {layout.namaSantri.fontSize ?? 32}</p>
                          <div className="flex gap-2">
                            {[-5, -1, 1, 5].map((d) => (
                              <button key={d} onClick={() => handleFontSizeChange(d)} className="flex-1 rounded-md bg-neutral-700 py-1.5 text-sm text-white hover:bg-neutral-600">
                                {d > 0 ? `+${d}` : d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Pilih elemen untuk mulai mengatur posisi</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button onClick={undo} disabled={historyIndex <= 0}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-neutral-700 hover:text-white disabled:opacity-25"
                    title="Undo (Ctrl+Z)">
                    ↩ Undo
                  </button>
                  <button onClick={handleReset}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-amber-400/80 transition hover:bg-neutral-700 hover:text-amber-300">
                    ⟲ Reset
                  </button>
                  <div className="h-5 w-px bg-neutral-700/60 mx-1" />
                  <button onClick={handleSave} disabled={saving}
                    className={`rounded-lg px-4 py-1.5 text-[11px] font-bold transition ${
                      saved ? "bg-emerald-600 text-white" : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}>
                    {saving ? "Menyimpan..." : saved ? "✓ Tersimpan!" : "💾 Simpan Layout"}
                  </button>
                </div>
              </div>

              {/* Row 2: Element chips — grouped */}
              <div className="border-t border-neutral-700/50 bg-neutral-900/30 px-5 py-3 space-y-2">
                {ELEMENT_GROUPS.map((group) => (
                  <div key={group.label} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 w-14 shrink-0">{group.label}</span>
                    {group.keys.map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedElement(key)}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                          selectedElement === key
                            ? "bg-blue-600 text-white shadow"
                            : "text-slate-500 hover:bg-neutral-700 hover:text-slate-300"
                        }`}
                      >
                        {ONLINE_ELEMENT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Row 3: Keyboard hints */}
              <div className="border-t border-neutral-700/30 bg-neutral-900/20 px-5 py-2">
                <p className="text-[10px] text-slate-600">
                  <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-slate-400">←→↑↓</kbd> geser
                  {" · "}<kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-slate-400">Shift</kbd>+Arrow = 5×
                  {" · "}<kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-slate-400">Tab</kbd> pindah elemen
                  {" · "}<kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-slate-400">Ctrl+S</kbd> simpan
                  {" · "}<kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-slate-400">Ctrl+Z</kbd> undo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Preview */}
        <div className="flex flex-col items-center gap-10 print:gap-0">
          <SyahadahOnlineDocument
            data={data}
            qrUrl={qrUrl}
            layout={layout}
            editorMode={editorActive}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
          />
        </div>
      </div>
    </>
  );
}
