import { Sidebar } from "@/components/admin/sidebar";
import { Toaster } from "react-hot-toast";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // Ambil permission sesuai role
  let permissions: string[] = [];
  if (session) {
    if (session.role === "ADMIN") {
      permissions = ["*"]; // Admin bisa semua
    } else {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role: session.role as any },
        select: { permission: true }
      });
      permissions = rolePerms.map(p => p.permission);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar user={session} permissions={permissions} />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
      <Toaster position="bottom-center" toastOptions={{ style: { fontWeight: "600", fontSize: "14px" } }} />
    </div>
  );
}
