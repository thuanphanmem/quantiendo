import { NextResponse } from "next/server";

import { refreshWorkbookCache } from "@/lib/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const status = await refreshWorkbookCache();
    return NextResponse.json(status, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể làm mới dữ liệu." },
      { status: 500 },
    );
  }
}
