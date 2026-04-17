import { NextRequest, NextResponse } from "next/server";

import { createRow, querySheet } from "@/lib/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ sheet: string }> }) {
  const { sheet } = await params;
  const filters = request.nextUrl.searchParams.get("filters");
  const result = await querySheet(sheet, {
    page: Number(request.nextUrl.searchParams.get("page") || 1),
    pageSize: Number(request.nextUrl.searchParams.get("pageSize") || 20),
    search: request.nextUrl.searchParams.get("search") || "",
    sortBy: request.nextUrl.searchParams.get("sortBy") || undefined,
    sortDir: (request.nextUrl.searchParams.get("sortDir") as "asc" | "desc" | null) || undefined,
    filters: filters ? JSON.parse(filters) : {},
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ sheet: string }> }) {
  try {
    const { sheet } = await params;
    const payload = await request.json();
    const result = await createRow(sheet, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo bản ghi." },
      { status: 400 },
    );
  }
}
