import { Toaster } from "react-hot-toast";
import Image from "next/image";

export default function TauziLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] relative flex flex-col items-center">
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(0,102,102,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,102,102,0.04) 0%, transparent 50%)",
        }}
      />
      <div className="border-b w-full flex justify-center bg-white sticky top-0 z-30" style={{ borderColor: 'var(--color-surface-hover)' }}>
        <header className="w-full max-w-3xl flex items-center gap-3 p-4">
          <Image
            src="/images/Logo Markaz.png"
            alt="Logo"
            width={36}
            height={36}
            className="rounded-lg shadow-sm"
          />
          <div>
            <h1 className="font-bold font-display" style={{ color: "var(--color-text)", lineHeight: 1 }}>Tauzi' Fushul</h1>
            <p className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: "var(--color-primary)" }}>Markaz Arabiyah</p>
          </div>
        </header>
      </div>
      <main className="flex-1 w-full max-w-3xl p-4 md:p-6 z-10">
        {children}
      </main>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontWeight: "600",
            fontSize: "14px",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-raised)",
            background: "var(--bg-card)",
            color: "var(--color-text)",
          },
        }}
      />
    </div>
  );
}
