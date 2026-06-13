import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-[var(--color-primary)] opacity-20"></div>
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
      </div>
      <div className="flex flex-col items-center">
        <p className="text-lg font-bold text-[var(--color-text)]">Memuat Data...</p>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Harap tunggu sebentar nggeh :D</p>
      </div>
    </div>
  );
}
