import { Metadata } from "next";
import PerizinanPublicClient from "@/components/public/perizinan-public-client";
import Image from "next/image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Perizinan Santri - Markaz Arabiyah",
  description: "Layanan permohonan izin santri Markaz Arabiyah",
};

export default function PublicPerizinanPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        <div className="bg-[var(--color-primary)] p-8 text-center text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center gap-4">
            <Image
              src="/images/Logo Markaz.png"
              alt="Logo Markaz Arabiyah"
              width={72}
              height={72}
              className="rounded-2xl shadow-lg border-2 border-white/20"
            />
            <div>
              <h1 className="text-2xl font-black tracking-tight font-display">Markaz Arabiyah</h1>
              <p className="text-[var(--color-primary-100)] font-medium mt-1">Layanan Permohonan Izin Santri</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <PerizinanPublicClient />
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
          Pengajuan izin akan diproses oleh Divisi Keamanan Markaz Arabiyah
        </div>
      </div>
    </div>
  );
}
