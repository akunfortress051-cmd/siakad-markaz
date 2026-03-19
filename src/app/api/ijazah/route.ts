import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint lama sudah tidak dipakai. Gunakan route /api/admin/santri/[id].",
    },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint lama sudah tidak dipakai. Gunakan route /api/admin/santri/[id].",
    },
    { status: 410 },
  );
}
