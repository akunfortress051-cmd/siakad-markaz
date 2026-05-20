import { NextResponse } from "next/server";
import { getMasterSantriList } from "@/lib/santri-api";

export async function GET() {
  try {
    const masterSantri = await getMasterSantriList();
    const sakanSet = new Set<string>();
    masterSantri.forEach(s => {
      if (s.sakan && s.sakan !== "-") sakanSet.add(s.sakan);
    });
    
    return NextResponse.json(Array.from(sakanSet).sort());
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil daftar sakan" }, { status: 500 });
  }
}
