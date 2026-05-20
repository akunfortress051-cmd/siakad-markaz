import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Memeriksa apakah user saat ini memiliki permission yang diminta.
 * Jika tidak, akan me-redirect ke dashboard dengan pesan error.
 * 
 * @param permissionId ID permission yang dibutuhkan (contoh: "absen_kelas")
 * @returns boolean true jika memiliki akses, false jika tidak (hanya untuk pengecekan tanpa redirect)
 */
export async function checkPermission(permissionId: string): Promise<boolean> {
  const session = await getSession();
  
  if (!session) return false;
  if (session.role === "ADMIN") return true; // Admin punya akses penuh

  // Ambil permission dari database
  const rolePerm = await prisma.rolePermission.findUnique({
    where: {
      role_permission: {
        role: session.role as any,
        permission: permissionId,
      }
    }
  });

  return !!rolePerm;
}

/**
 * Memaksa halaman untuk mengecek permission. Jika gagal, redirect ke dashboard.
 * Panggil ini di bagian atas Server Component (page.tsx).
 * 
 * @param permissionId ID permission yang dibutuhkan
 */
export async function requirePermission(permissionId: string) {
  const hasAccess = await checkPermission(permissionId);
  
  if (!hasAccess) {
    // Redirect ke dashboard karena tidak punya izin
    redirect("/admin/dashboard?error=unauthorized");
  }
}
