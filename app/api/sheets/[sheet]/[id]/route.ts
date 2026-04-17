import { NextRequest, NextResponse } from "next/server";

import { deleteRow, getSheetRow, updateRow } from "@/lib/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sheet: string; id: string }> },
) {
  const { sheet, id } = await params;
  const row = await getSheetRow(sheet, id);
  if (!row) return NextResponse.json({ message: "Không tìm thấy bản ghi" }, { status: 404 });
  return NextResponse.json(row, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sheet: string; id: string }> },
) {
  try {
    const { sheet, id } = await params;
    const payload = await request.json();
    const result = await updateRow(sheet, id, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể cập nhật bản ghi." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sheet: string; id: string }> },
) {
  const { sheet, id } = await params;
  await deleteRow(sheet, id);
  return NextResponse.json({ success: true });
}
