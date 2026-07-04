"use client";

import { useState } from "react";
import { SyahadahEditor } from "@/components/syahadah-editor";
import { LayoutData } from "@/lib/syahadah-layout";

type ProgramLayoutEditorClientProps = {
  initialLayout: LayoutData;
  initialMusyarokahLayout: LayoutData;
  sampleData: any;
  musyarokahSampleData: any;
  sampleQrUrl: string;
  programId: string | null;
  programName: string;
  isTurats?: boolean;
};

export function ProgramLayoutEditorClient({
  initialLayout,
  initialMusyarokahLayout,
  sampleData,
  musyarokahSampleData,
  sampleQrUrl,
  programId,
  programName,
  isTurats = false,
}: ProgramLayoutEditorClientProps) {
  const [activeTab, setActiveTab] = useState<"lulus" | "musyarokah">("lulus");

  return (
    <div>
      {/* Tab Toggle */}
      <div className="mx-auto flex items-center justify-center gap-1 py-4 print:hidden" style={{ maxWidth: "330mm" }}>
        <button
          onClick={() => setActiveTab("lulus")}
          className={`rounded-l-full px-6 py-2.5 text-sm font-bold transition ${
            activeTab === "lulus"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-neutral-800 text-slate-400 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          Template Lulus
        </button>
        <button
          onClick={() => setActiveTab("musyarokah")}
          className={`rounded-r-full px-6 py-2.5 text-sm font-bold transition ${
            activeTab === "musyarokah"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
              : "bg-neutral-800 text-slate-400 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          Template Musyarokah
        </button>
      </div>

      {/* Lulus Editor */}
      {activeTab === "lulus" && (
        <SyahadahEditor
          qrUrl={sampleQrUrl}
          data={sampleData}
          initialLayout={initialLayout}
          riwayatId={null}
          programId={programId}
          mode={programId ? "per-program" : "global"}
          backHref="/layout-editor"
          backLabel="← Kembali ke Pilihan Program"
          titleLabel={`Layout Editor — ${programName}`}
          isTurats={isTurats}
        />
      )}

      {/* Musyarokah Editor */}
      {activeTab === "musyarokah" && (
        <SyahadahEditor
          qrUrl={sampleQrUrl}
          data={musyarokahSampleData}
          initialLayout={initialMusyarokahLayout}
          riwayatId={null}
          programId={programId}
          mode={programId ? "per-program" : "global"}
          musyarokah={true}
          backHref="/layout-editor"
          backLabel="← Kembali ke Pilihan Program"
          titleLabel={`Layout Musyarokah — ${programName}`}
          isTurats={isTurats}
        />
      )}
    </div>
  );
}
