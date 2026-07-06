import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/permission";

export async function GET(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_soal");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sesiTauziId = searchParams.get("sesiTauziId");
  const programId = searchParams.get("programId");

  if (!sesiTauziId || !programId) {
    return NextResponse.json({ error: "sesiTauziId dan programId param wajib ada" }, { status: 400 });
  }

  try {
    const soalList = await prisma.soalTauzi.findMany({
      where: { sesiTauziId, programId },
      include: {
        jawabanList: {
          orderBy: { urutan: 'asc' }
        }
      },
      orderBy: { urutan: 'asc' }
    });
    return NextResponse.json(soalList);
  } catch (error) {
    console.error("Error fetching soal:", error);
    return NextResponse.json({ error: "Gagal mengambil soal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const hasPermission = await checkPermission("tauzi_soal");
  if (!session || (!hasPermission && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sesiTauziId, programId, pertanyaan, urutan, jawabanList } = body;

    // jawabanList = [{ teks: string, isCorrect: boolean, urutan: number }]

    if (!sesiTauziId || !programId || !pertanyaan || !jawabanList || jawabanList.length === 0) {
      return NextResponse.json({ error: "Data wajib diisi (termasuk jawaban)" }, { status: 400 });
    }

    const newSoal = await prisma.soalTauzi.create({
      data: {
        sesiTauziId,
        programId,
        pertanyaan,
        urutan: urutan || 1,
        jawabanList: {
          create: jawabanList.map((j: any, index: number) => ({
            teks: j.teks,
            isCorrect: j.isCorrect || false,
            urutan: j.urutan ?? index + 1
          }))
        }
      },
      include: { jawabanList: true }
    });

    return NextResponse.json(newSoal, { status: 201 });
  } catch (error) {
    console.error("Error creating soal:", error);
    return NextResponse.json({ error: "Gagal membuat soal" }, { status: 500 });
  }
}
