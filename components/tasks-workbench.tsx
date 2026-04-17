"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { RecordFormDialog } from "@/components/record-form-dialog";
import { cn, toneForStatus } from "@/lib/utils";
import { displayText, type Primitive, type QueryResult, formatValue } from "@/lib/workbook-client";

type FormState = Record<string, Primitive>;

type TasksWorkbenchProps = {
  initialData: QueryResult;
  summary: {
    total: number;
    unfinished: number;
    overdue: number;
    blocked: number;
    unassigned: number;
    external: number;
    topOwners: { user_id: Primitive; ho_ten: Primitive; count: number }[];
  };
  lookups: {
    users: Record<string, string>;
    projects: Record<string, string>;
  };
};

type TaskPreset = {
  key: string;
  label: string;
  description: string;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

const PRESETS: TaskPreset[] = [
  {
    key: "all",
    label: "Tất cả",
    description: "Toàn bộ task theo hạn xử lý gần nhất",
    sortBy: "han_xu_ly",
    sortDir: "asc",
  },
  {
    key: "overdue",
    label: "Quá hạn",
    description: "Tập trung các task sát hạn hoặc đã trễ",
    sortBy: "han_xu_ly",
    sortDir: "asc",
  },
  {
    key: "blocked",
    label: "Đang vướng",
    description: "Những task có vướng mắc cần gỡ",
    search: "Chờ",
    sortBy: "han_xu_ly",
    sortDir: "asc",
  },
  {
    key: "unassigned",
    label: "Chưa phân công",
    description: "Task thiếu người phụ trách",
    sortBy: "han_xu_ly",
    sortDir: "asc",
  },
  {
    key: "external",
    label: "Phát sinh",
    description: "Task phát sinh ngoài hợp đồng",
    filters: { phat_sinh_ngoai_hop_dong: "Có" },
    sortBy: "han_xu_ly",
    sortDir: "asc",
  },
];

function badgeClass(value: Primitive) {
  const tone = toneForStatus(value);
  if (tone === "success") return "bg-success-soft text-success";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "danger") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-text";
}

function isOverdue(row: Record<string, Primitive>) {
  if (String(row.trang_thai ?? "") === "Hoàn thành") return false;
  const date = Date.parse(String(row.han_xu_ly ?? ""));
  return !Number.isNaN(date) && date < Date.now();
}

export function TasksWorkbench({ initialData, summary, lookups }: TasksWorkbenchProps) {
  const [dataset, setDataset] = useState<QueryResult>(initialData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activePresetKey, setActivePresetKey] = useState("all");
  const [sortBy, setSortBy] = useState("han_xu_ly");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(String(initialData.items[0]?.task_id ?? "") || null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filterColumns = useMemo(
    () =>
      dataset.meta.columns
        .filter((column) =>
          ["trang_thai", "nguoi_phu_trach_id", "project_id", "phat_sinh_ngoai_hop_dong"].includes(column.key),
        )
        .filter((column) => dataset.options[column.key]?.length),
    [dataset.meta.columns, dataset.options],
  );

  const selectedTask =
    dataset.items.find((item) => String(item.task_id) === selectedTaskId) ?? dataset.items[0] ?? null;

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
        const response = await fetch(`/api/sheets/cong-viec?${params.toString()}`, { signal: controller.signal });
        const nextData = (await response.json()) as QueryResult;
        startTransition(() => {
          setDataset(nextData);
          if (!nextData.items.some((item) => String(item.task_id) === selectedTaskId)) {
            setSelectedTaskId(String(nextData.items[0]?.task_id ?? "") || null);
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
  }, [deferredSearch, filters, page, pageSize, refreshKey, selectedTaskId, sortBy, sortDir]);

  function resolveLookup(field: string, value: Primitive) {
    if (!value) return "—";
    if (field === "nguoi_phu_trach_id") return lookups.users[String(value)] ?? String(value);
    if (field === "project_id") return lookups.projects[String(value)] ?? String(value);
    return displayText(value);
  }

  function applyPreset(preset: TaskPreset) {
    setActivePresetKey(preset.key);
    setFilters(preset.filters ?? {});
    setSearch(preset.search ?? "");
    setSortBy(preset.sortBy ?? "han_xu_ly");
    setSortDir(preset.sortDir ?? "asc");
    setPage(1);
  }

  function clearFilters() {
    setActivePresetKey("all");
    setSearch("");
    setFilters({});
    setSortBy("han_xu_ly");
    setSortDir("asc");
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
    const url = creating ? "/api/sheets/cong-viec" : `/api/sheets/cong-viec/${editing.task_id}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!response.ok) {
      alert("Không thể lưu công việc.");
      return;
    }
    setEditing(null);
    setCreating(false);
    setRefreshKey((value) => value + 1);
  }

  async function removeRow(id: Primitive) {
    if (!id || !confirm("Xóa công việc này?")) return;
    const response = await fetch(`/api/sheets/cong-viec/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Không thể xóa công việc.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }

  const selectedActions = selectedTask
    ? [
        isOverdue(selectedTask) ? "Đổi ngay người xử lý hoặc chốt cam kết hoàn thành." : null,
        selectedTask.vuong_mac ? `Gỡ vướng mắc: ${String(selectedTask.vuong_mac)}` : null,
        !selectedTask.nguoi_phu_trach_id ? "Phân công người phụ trách để tránh task bị treo." : null,
        String(selectedTask.phat_sinh_ngoai_hop_dong ?? "") === "Có"
          ? "Xác nhận phạm vi phát sinh ngoài hợp đồng với dự án."
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Tổng task", value: summary.total, tone: "neutral" },
          { label: "Chưa hoàn thành", value: summary.unfinished, tone: "primary" },
          { label: "Quá hạn", value: summary.overdue, tone: "danger" },
          { label: "Đang vướng", value: summary.blocked, tone: "warning" },
          { label: "Chưa phân công", value: summary.unassigned, tone: "warning" },
          { label: "Phát sinh", value: summary.external, tone: "neutral" },
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
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">Điều phối công việc</div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">Task dễ bám hơn</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Ưu tiên theo hạn xử lý, vướng mắc và người phụ trách để điều phối nhanh trong cùng một màn hình.
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm công việc
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl bg-surface-subtle p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <ArrowDownWideNarrow className="h-4 w-4 text-primary" />
              Saved views
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              <UserRound className="h-4 w-4 text-primary" />
              Người đang giữ nhiều việc
            </div>
            <div className="space-y-3">
              {summary.topOwners.map((owner) => (
                <div key={String(owner.user_id)} className="flex items-center justify-between rounded-2xl bg-white p-3">
                  <div>
                    <div className="font-medium text-text">{displayText(owner.ho_ten)}</div>
                    <div className="text-xs text-text-muted">Cần theo dõi khối lượng đang mở</div>
                  </div>
                  <div className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                    {owner.count}
                  </div>
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
                  placeholder="Tìm theo công việc, dự án, người phụ trách..."
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
            <div className="text-sm text-text-muted">{isPending ? "Đang tải..." : `${dataset.total} công việc phù hợp`}</div>
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
                    ? "Đang xem toàn bộ task. Dùng preset để vào đúng nhóm cần xử lý ngay."
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

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full">
              <thead className="bg-surface-subtle">
                <tr>
                  {[
                    { key: "ten_cong_viec", label: "Công việc" },
                    { key: "ten_du_an", label: "Dự án" },
                    { key: "nguoi_phu_trach_id", label: "Phụ trách" },
                    { key: "han_xu_ly", label: "Hạn xử lý" },
                    { key: "trang_thai", label: "Trạng thái" },
                    { key: "phat_sinh_ngoai_hop_dong", label: "Phát sinh" },
                  ].map((column) => (
                    <th key={column.key} className="table-head">
                      <button
                        className="inline-flex items-center gap-2"
                        onClick={() => {
                          if (sortBy === column.key) {
                            setSortDir((current) => (current === "asc" ? "desc" : "asc"));
                          } else {
                            setSortBy(column.key);
                            setSortDir("asc");
                          }
                        }}
                      >
                        {column.label}
                        <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  ))}
                  <th className="table-head text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dataset.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="font-headline text-2xl font-bold tracking-tight text-text">Không còn công việc phù hợp</div>
                      <div className="mt-2 text-sm text-text-muted">Hãy giảm bộ lọc hoặc thêm mới công việc nếu cần.</div>
                    </td>
                  </tr>
                ) : (
                  dataset.items.map((row) => {
                    const selected = String(row.task_id) === selectedTaskId;
                    const rowDanger = isOverdue(row);
                    return (
                      <tr
                        key={String(row.task_id)}
                        className={cn(
                          "cursor-pointer border-t border-border/70 transition",
                          selected ? "bg-primary-soft/60" : "bg-white hover:bg-surface-subtle",
                          rowDanger && !selected && "bg-danger-soft/20",
                        )}
                        onClick={() => setSelectedTaskId(String(row.task_id))}
                      >
                        <td className="table-cell">
                          <div className="max-w-[280px]">
                            <div className="truncate font-semibold text-text">{row.ten_cong_viec}</div>
                            <div className="mt-1 truncate text-xs text-text-muted">{displayText(row.vuong_mac ?? "Không có vướng mắc")}</div>
                          </div>
                        </td>
                        <td className="table-cell">{displayText(row.ten_du_an ?? resolveLookup("project_id", row.project_id))}</td>
                        <td className="table-cell">{resolveLookup("nguoi_phu_trach_id", row.nguoi_phu_trach_id)}</td>
                        <td className="table-cell">
                          <div className={cn("font-medium", rowDanger && "text-danger")}>{formatValue(row.han_xu_ly, "date")}</div>
                        </td>
                        <td className="table-cell">
                          <span className={cn("badge", badgeClass(row.trang_thai))}>{displayText(row.trang_thai)}</span>
                        </td>
                        <td className="table-cell">
                          <span
                            className={cn(
                              "badge",
                              String(row.phat_sinh_ngoai_hop_dong ?? "") === "Có"
                                ? "bg-warning-soft text-warning"
                                : "bg-surface-muted text-text",
                            )}
                          >
                            {displayText(row.phat_sinh_ngoai_hop_dong)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex justify-end gap-2">
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
                                removeRow(row.task_id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Trang {dataset.page}/{dataset.pageCount}
            </div>
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
          {selectedTask ? (
            <div className="sticky top-24 space-y-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary-soft text-primary">{selectedTask.task_id}</span>
                  <span className={cn("badge", badgeClass(selectedTask.trang_thai))}>{displayText(selectedTask.trang_thai)}</span>
                  {isOverdue(selectedTask) ? <span className="badge bg-danger-soft text-danger">Quá hạn</span> : null}
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-text">{selectedTask.ten_cong_viec}</h2>
                <div className="mt-2 text-sm text-text-muted">
                  {displayText(selectedTask.ten_du_an ?? resolveLookup("project_id", selectedTask.project_id))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Người phụ trách</div>
                  <div className="mt-1 font-semibold text-text">{resolveLookup("nguoi_phu_trach_id", selectedTask.nguoi_phu_trach_id)}</div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Hạn xử lý</div>
                  <div className={cn("mt-1 font-semibold", isOverdue(selectedTask) ? "text-danger" : "text-text")}>
                    {formatValue(selectedTask.han_xu_ly, "date")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Vướng mắc</div>
                  <div className="mt-1 text-sm text-text">{displayText(selectedTask.vuong_mac ?? "Chưa có vướng mắc")}</div>
                </div>
                <div className="rounded-2xl bg-primary-soft p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Tiếp theo nên làm gì
                  </div>
                  <div className="space-y-2 text-sm text-text">
                    {selectedActions.length > 0 ? (
                      selectedActions.map((action) => <div key={action}>{action}</div>)
                    ) : (
                      <div>Task đang ổn. Có thể tiếp tục bám tiến độ đến hạn xử lý.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/du-an" className="btn-secondary">
                  <Eye className="h-4 w-4" />
                  Mở dự án
                </Link>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setCreating(false);
                    setEditing(selectedTask);
                  }}
                >
                  Sửa nhanh
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-text-muted">
              Chọn một công việc để xem preview.
            </div>
          )}
        </div>
      </section>

      <RecordFormDialog
        meta={dataset.meta}
        options={dataset.options}
        title="Công việc"
        editing={editing}
        creating={creating}
        onClose={() => setEditing(null)}
        onSubmit={submitForm}
        setEditing={setEditing}
      />
    </div>
  );
}
