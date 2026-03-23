import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveDufahName } from "@/lib/absensi";

export async function GET() {
  try {
    const activeDufahName = await getActiveDufahName();

    if (!activeDufahName) {
      return NextResponse.json({ activeDufah: null, activeUsbu: null, usbuLabel: "Tidak Ada Aktif" });
    }

    const dufah = await prisma.dufah.findUnique({ where: { nama: activeDufahName } });

    if (!dufah) {
      return NextResponse.json({ activeDufah: activeDufahName, activeUsbu: 1, usbuLabel: "Usbu' 1" });
    }

    let usbuLabel = "Usbu' 1";
    let activeUsbu = 1;

    // Gunakan tanggal WIB hari ini untuk dicocokkan dengan batas cut-off @db.Date (UTC midnight literal)
    const nowLocal = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const todayStr = nowLocal.toISOString().split("T")[0];
    const todayWibAsUtcMidnight = new Date(`${todayStr}T00:00:00Z`).getTime();

    const u1 = dufah.usbu1EndDate ? new Date(dufah.usbu1EndDate).getTime() : Infinity;
    const u2 = dufah.usbu2EndDate ? new Date(dufah.usbu2EndDate).getTime() : Infinity;

    if (todayWibAsUtcMidnight <= u1) {
      usbuLabel = "Usbu' 1";
      activeUsbu = 1;
    } else if (todayWibAsUtcMidnight <= u2) {
      usbuLabel = "Usbu' 2";
      activeUsbu = 2;
    } else {
      usbuLabel = "Nihai";
      activeUsbu = 3;
    }

    return NextResponse.json({
      activeDufah: activeDufahName,
      activeUsbu,
      usbuLabel,
    });
  } catch (error) {
    console.error("Error active context:", error);
    return NextResponse.json({ error: "Gagal mengambil konteks aktif" }, { status: 500 });
  }
}
