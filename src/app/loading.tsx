import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg-app)] space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-[var(--color-primary)] opacity-20"></div>
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
      </div>
      <div className="flex flex-col items-center">
        <p className="text-lg font-bold text-[var(--color-text)]">Memuat Halaman...</p>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Harap tunggu sebentar nggeh :D</p>
      </div>
    </div>
  );
}
