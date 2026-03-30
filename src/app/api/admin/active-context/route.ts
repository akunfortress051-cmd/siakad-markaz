import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveDufahName } from "@/lib/absensi";

export const dynamic = "force-dynamic";

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

    const tTime = Date.now();
    let usbuLabel = "Di Luar Usbu'";
    let activeUsbu = 0;

    const isActive = (startDay: Date | null, endDay: Date | null, active: boolean) => {
      if (!active) return false;
      const start = startDay ? new Date(startDay).getTime() : 0;
      // Tambahkan 23 jam 59 menit 59 detik agar batas harinya penuh sampai malam hari
      const end = endDay ? new Date(endDay).getTime() + 86399999 : Infinity;
      return tTime >= start && tTime <= end;
    };

    if (isActive(dufah.usbu1StartDate, dufah.usbu1EndDate, dufah.usbu1Active)) {
      activeUsbu = 1;
      usbuLabel = "Usbu' 1";
    } else if (isActive(dufah.usbu2StartDate, dufah.usbu2EndDate, dufah.usbu2Active)) {
      activeUsbu = 2;
      usbuLabel = "Usbu' 2";
    } else if (isActive(dufah.usbu3StartDate, dufah.usbu3EndDate, dufah.usbu3Active)) {
      activeUsbu = 3;
      usbuLabel = "Nihai";
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
