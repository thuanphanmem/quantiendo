"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDownWideNarrow,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { RecordFormDialog } from "@/components/record-form-dialog";
import { cn, toneForStatus } from "@/lib/utils";
import { displayText, type Primitive, type QueryResult, formatValue } from "@/lib/workbook-client";

type FormState = Record<string, Primitive>;

type NotesWorkbenchProps = {
  initialData: QueryResult;
  summary: {
    total: number;
    red: number;
    yellow: number;
    latest: Record<string, Primitive>[];
    topUpdaters: { user_id: Primitive; ho_ten: Primitive; count: number }[];
  };
  lookups: {
    users: Record<string, string>;
    projects: Record<string, string>;
  };
};

type NotePreset = {
  key: string;
  label: string;
  description: string;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

const PRESETS: NotePreset[] = [
  { key: "all", label: "Tất cả", description: "Toàn bộ ghi chú theo cập nhật mới nhất", sortBy: "ngay_cap_nhat", sortDir: "desc" },
  { key: "red", label: "Tín hiệu đỏ", description: "Ưu tiên các ghi chú báo động đỏ", filters: { den_tin_hieu: "Đỏ" }, sortBy: "ngay_cap_nhat", sortDir: "desc" },
  { key: "yellow", label: "Tín hiệu vàng", description: "Những cảnh báo cần bám tiếp", filters: { den_tin_hieu: "Vàng" }, sortBy: "ngay_cap_nhat", sortDir: "desc" },
  { key: "action", label: "Cần hành động", description: "Những ghi chú đã có hướng xử lý tiếp theo", sortBy: "ngay_cap_nhat", sortDir: "desc" },
];

function badgeClass(value: Primitive) {
  const tone = toneForStatus(value);
  if (tone === "success") return "bg-success-soft text-success";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "danger") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-text";
}

export function NotesWorkbench({ initialData, summary, lookups }: NotesWorkbenchProps) {
  const [dataset, setDataset] = useState<QueryResult>(initialData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activePresetKey, setActivePresetKey] = useState("all");
  const [sortBy, setSortBy] = useState("ngay_cap_nhat");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(String(initialData.items[0]?.note_id ?? "") || null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filterColumns = useMemo(
    () =>
      dataset.meta.columns
        .filter((column) => ["den_tin_hieu", "project_id", "nguoi_cap_nhat_id"].includes(column.key))
        .filter((column) => dataset.options[column.key]?.length),
    [dataset.meta.columns, dataset.options],
  );

  const selectedNote =
    dataset.items.find((item) => String(item.note_id) === selectedNoteId) ?? dataset.items[0] ?? null;

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: deferredSearch,
          sortBy,
          sortDir,
          filters: JSON.stringify(filters),
        });
        const response = await fetch(`/api/sheets/ghi-chu-dieu-hanh?${params.toString()}`, { signal: controller.signal });
        const nextData = (await response.json()) as QueryResult;
        startTransition(() => {
          setDataset(nextData);
          if (!nextData.items.some((item) => String(item.note_id) === selectedNoteId)) {
            setSelectedNoteId(String(nextData.items[0]?.note_id ?? "") || null);
          }
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error;
        }
      }
    };
    void run();
    return () => controller.abort();
  }, [deferredSearch, filters, page, pageSize, refreshKey, selectedNoteId, sortBy, sortDir]);

  function resolveUser(value: Primitive) {
    if (!value) return "—";
    return lookups.users[String(value)] ?? String(value);
  }

  function resolveProject(value: Primitive) {
    if (!value) return "—";
    return lookups.projects[String(value)] ?? String(value);
  }

  function applyPreset(preset: NotePreset) {
    setActivePresetKey(preset.key);
    setFilters(preset.filters ?? {});
    setSearch(preset.search ?? "");
    setSortBy(preset.sortBy ?? "ngay_cap_nhat");
    setSortDir(preset.sortDir ?? "desc");
    setPage(1);
  }

  function clearFilters() {
    setActivePresetKey("all");
    setSearch("");
    setFilters({});
    setSortBy("ngay_cap_nhat");
    setSortDir("desc");
    setPage(1);
  }

  function openCreate() {
    const nextState: FormState = {};
    dataset.meta.columns.forEach((column) => {
      if (column.key !== dataset.meta.idField) nextState[column.key] = null;
    });
    setCreating(true);
    setEditing(nextState);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const method = creating ? "POST" : "PATCH";
    const url = creating ? "/api/sheets/ghi-chu-dieu-hanh" : `/api/sheets/ghi-chu-dieu-hanh/${editing.note_id}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!response.ok) {
      alert("Không thể lưu ghi chú.");
      return;
    }
    setEditing(null);
    setCreating(false);
    setRefreshKey((value) => value + 1);
  }

  async function removeRow(id: Primitive) {
    if (!id || !confirm("Xóa ghi chú này?")) return;
    const response = await fetch(`/api/sheets/ghi-chu-dieu-hanh/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Không thể xóa ghi chú.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng ghi chú", value: summary.total, tone: "neutral" },
          { label: "Tín hiệu đỏ", value: summary.red, tone: "danger" },
          { label: "Tín hiệu vàng", value: summary.yellow, tone: "warning" },
          { label: "Người cập nhật nhiều", value: summary.topUpdaters[0]?.count ?? 0, tone: "primary" },
        ].map((item) => (
          <div key={item.label} className="panel p-5">
            <div className="text-sm font-medium text-text-muted">{item.label}</div>
            <div className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-text">{item.value}</div>
            <div className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", {
              "bg-danger-soft text-danger": item.tone === "danger",
              "bg-warning-soft text-warning": item.tone === "warning",
              "bg-primary-soft text-primary": item.tone === "primary",
              "bg-surface-subtle text-text": item.tone === "neutral",
            })}>
              {item.label}
            </div>
          </div>
        ))}
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">Ghi chú điều hành</div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">Nhật ký dễ đọc hơn</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Tập trung vào tín hiệu, vướng mắc chính, hành động tiếp theo và người cập nhật để quản lý quét nhanh.
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm ghi chú
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl bg-surface-subtle p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <ArrowDownWideNarrow className="h-4 w-4 text-primary" />
              Saved views
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  className={cn(
                    "rounded-2xl p-4 text-left transition",
                    activePresetKey === preset.key ? "bg-primary-soft ring-1 ring-primary/20" : "bg-white hover:bg-primary-soft",
                  )}
                  onClick={() => applyPreset(preset)}
                >
                  <div className="font-semibold text-text">{preset.label}</div>
                  <div className="mt-1 text-sm text-text-muted">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-subtle p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <ShieldAlert className="h-4 w-4 text-danger" />
              Cập nhật gần nhất
            </div>
            <div className="space-y-3">
              {summary.latest.map((note) => (
                <div key={String(note.note_id)} className="rounded-2xl bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className={cn("badge", badgeClass(note.den_tin_hieu))}>{displayText(note.den_tin_hieu)}</span>
                    <span className="text-xs text-text-muted">{formatValue(note.ngay_cap_nhat, "date")}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-text">{note.noi_dung_tom_tat}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="panel p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative max-w-xl flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base w-full pl-11"
                  value={search}
                  placeholder="Tìm theo nội dung, dự án, hành động tiếp theo..."
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </div>
              <select
                className="input-base w-[180px]"
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
              >
                {[20, 30, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} dòng
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-text-muted">{isPending ? "Đang tải..." : `${dataset.total} ghi chú phù hợp`}</div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-text">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Trạng thái đang xem
                </div>
                <div className="mt-1 text-sm text-text-muted">
                  {activePresetKey === "all"
                    ? "Đang xem toàn bộ ghi chú. Dùng preset để vào nhóm báo động hoặc cần hành động tiếp."
                    : `Đang áp dụng preset ${PRESETS.find((item) => item.key === activePresetKey)?.label ?? "đã chọn"}.`}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters)
                  .filter(([, value]) => Boolean(value))
                  .map(([key, value]) => {
                    const column = dataset.meta.columns.find((item) => item.key === key);
                    return (
                      <button
                        key={key}
                        className="badge bg-white text-text"
                        onClick={() =>
                          setFilters((current) => ({
                            ...current,
                            [key]: "",
                          }))
                        }
                      >
                        {column?.label}: {displayText(value)} ×
                      </button>
                    );
                  })}
                {(search || Object.values(filters).some(Boolean) || activePresetKey !== "all") && (
                  <button className="btn-secondary px-3 py-2 text-xs" onClick={clearFilters}>
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filterColumns.map((column) => (
              <select
                key={column.key}
                className="input-base"
                value={filters[column.key] ?? ""}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({
                    ...current,
                    [column.key]: event.target.value,
                  }));
                }}
              >
                <option value="">{column.label}: tất cả</option>
                {dataset.options[column.key].map((option) => (
                  <option key={option} value={option}>
                    {displayText(option)}
                  </option>
                ))}
              </select>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {dataset.items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white px-6 py-16 text-center">
                <div className="font-headline text-2xl font-bold tracking-tight text-text">Không còn ghi chú phù hợp</div>
                <div className="mt-2 text-sm text-text-muted">Hãy giảm bộ lọc hoặc thêm mới ghi chú nếu cần.</div>
              </div>
            ) : (
              dataset.items.map((row) => (
                <div
                  key={String(row.note_id)}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "block w-full rounded-2xl border p-4 text-left transition",
                    String(row.note_id) === selectedNoteId
                      ? "border-primary/20 bg-primary-soft/60"
                      : "border-border bg-white hover:bg-surface-subtle",
                  )}
                  onClick={() => setSelectedNoteId(String(row.note_id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedNoteId(String(row.note_id));
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("badge", badgeClass(row.den_tin_hieu))}>{displayText(row.den_tin_hieu)}</span>
                        <span className="text-xs text-text-muted">{formatValue(row.ngay_cap_nhat, "date")}</span>
                      </div>
                      <div className="mt-2 font-semibold text-text">{row.noi_dung_tom_tat}</div>
                      <div className="mt-1 text-sm text-text-muted">{displayText(row.vuong_mac_chinh ?? "Chưa nêu vướng mắc chính")}</div>
                      <div className="mt-2 text-sm text-text">{displayText(row.hanh_dong_tiep_theo ?? "Chưa có hành động tiếp theo")}</div>
                      <div className="mt-2 text-xs text-text-muted">
                        {displayText(row.ten_du_an ?? resolveProject(row.project_id))} · {resolveUser(row.nguoi_cap_nhat_id)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        className="btn-secondary px-3 py-2 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCreating(false);
                          setEditing(row);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        className="btn-secondary px-3 py-2 text-xs text-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeRow(row.note_id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-text-muted">Trang {dataset.page}/{dataset.pageCount}</div>
            <div className="flex gap-2">
              <button className="btn-secondary px-3" disabled={dataset.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="btn-secondary px-3" disabled={dataset.page >= dataset.pageCount} onClick={() => setPage((value) => Math.min(dataset.pageCount, value + 1))}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="panel p-5">
          {selectedNote ? (
            <div className="sticky top-24 space-y-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary-soft text-primary">{selectedNote.note_id}</span>
                  <span className={cn("badge", badgeClass(selectedNote.den_tin_hieu))}>{displayText(selectedNote.den_tin_hieu)}</span>
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-text">{selectedNote.noi_dung_tom_tat}</h2>
                <div className="mt-2 text-sm text-text-muted">{displayText(selectedNote.ten_du_an ?? resolveProject(selectedNote.project_id))}</div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Vướng mắc chính</div>
                  <div className="mt-1 text-sm text-text">{displayText(selectedNote.vuong_mac_chinh ?? "Chưa nêu vướng mắc")}</div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Hành động tiếp theo</div>
                  <div className="mt-1 text-sm text-text">{displayText(selectedNote.hanh_dong_tiep_theo ?? "Chưa có hành động tiếp theo")}</div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Người cập nhật</div>
                  <div className="mt-1 font-semibold text-text">{resolveUser(selectedNote.nguoi_cap_nhat_id)}</div>
                  <div className="mt-1 text-sm text-text-muted">{formatValue(selectedNote.ngay_cap_nhat, "date")}</div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  setCreating(false);
                  setEditing(selectedNote);
                }}
              >
                Sửa nhanh
              </button>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-text-muted">Chọn một ghi chú để xem preview.</div>
          )}
        </div>
      </section>

      <RecordFormDialog
        meta={dataset.meta}
        options={dataset.options}
        title="Ghi chú điều hành"
        editing={editing}
        creating={creating}
        onClose={() => setEditing(null)}
        onSubmit={submitForm}
        setEditing={setEditing}
      />
    </div>
  );
}
