import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ambil semua permission yang ada di DB
    const permissions = await prisma.rolePermission.findMany();
    
    // Ambil list role unik dari tabel User dan RolePermission
    const dbRolesUser = await prisma.user.findMany({ select: { role: true }, distinct: ['role'] });
    const dbRolesPerm = await prisma.rolePermission.findMany({ select: { role: true }, distinct: ['role'] });
    
    const defaultRoles = ["ADMIN", "WALI_KELAS", "PENGAJAR", "KSU"];
    const uniqueRolesSet = new Set([
      ...defaultRoles,
      ...dbRolesUser.map(u => u.role),
      ...dbRolesPerm.map(p => p.role)
    ]);
    
    return NextResponse.json({
      roles: Array.from(uniqueRolesSet),
      permissions
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role, permissions } = await request.json(); // role: string, permissions: string[]

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Replace all permissions for this role
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { role: role }
      }),
      prisma.rolePermission.createMany({
        data: permissions.map(p => ({
          role: role,
          permission: p
        }))
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update role permissions" }, { status: 500 });
  }
}
