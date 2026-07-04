import { NextRequest, NextResponse } from "next/server";
import { getProgramLayout, getGlobalLayout, getLayoutForRiwayat, saveLayout, deleteLayoutOverride } from "@/lib/syahadah-layout";
import { checkPermission } from "@/lib/permission";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const riwayatId = searchParams.get("riwayatId");
  const programId = searchParams.get("programId");

  try {
    let layout;
    if (riwayatId && programId) {
      layout = await getLayoutForRiwayat(riwayatId, programId);
    } else if (programId) {
      layout = await getProgramLayout(programId);
    } else {
      layout = await getGlobalLayout();
    }

    return NextResponse.json({ layout });
  } catch (error) {
    console.error("Error fetching layout:", error);
    return NextResponse.json({ error: "Failed to fetch layout" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const hasPermission = await checkPermission("syahadah_edit");
    if (!session || !hasPermission) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { riwayatId, programId, layoutData, mode } = body;

    if (!layoutData || typeof layoutData !== "object") {
      return NextResponse.json({ error: "Invalid layoutData" }, { status: 400 });
    }

    await saveLayout({ riwayatId, programId, mode }, layoutData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving layout:", error);
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const hasPermission = await checkPermission("syahadah_edit");
  if (!session || !hasPermission) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const riwayatId = searchParams.get("riwayatId");
  const programId = searchParams.get("programId");

  if (!riwayatId && !programId) {
    return NextResponse.json({ error: "riwayatId or programId is required" }, { status: 400 });
  }

  try {
    await deleteLayoutOverride({ riwayatId, programId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting layout:", error);
    return NextResponse.json({ error: "Failed to delete layout" }, { status: 500 });
  }
}
