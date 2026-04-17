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
} from "lucide-react";

import { RecordFormDialog } from "@/components/record-form-dialog";
import { cn, compactCurrency, toneForStatus } from "@/lib/utils";
import { displayText, type Primitive, type QueryResult, formatValue } from "@/lib/workbook-client";

type FormState = Record<string, Primitive>;

type ProjectsWorkbenchProps = {
  initialData: QueryResult;
  summary: {
    total: number;
    construction: number;
    blocked: number;
    highDebt: number;
    handoverSoon: number;
    warning: number;
    topProjects: Record<string, Primitive>[];
  };
  lookups: {
    users: Record<string, string>;
    clients: Record<string, string>;
    services: Record<string, string>;
  };
};

type ProjectPreset = {
  key: string;
  label: string;
  description: string;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

const PROJECT_COLUMNS = [
  "ma_du_an",
  "ten_du_an",
  "trang_thai",
  "muc_uu_tien",
  "pm_id",
  "tien_do_tong_phan_tram",
  "cong_no_khach_hang",
  "hang_muc_dang_tac",
  "canh_bao_chinh",
  "ngay_ban_giao_du_kien",
  "cap_nhat_gan_nhat",
];

const PRESETS: ProjectPreset[] = [
  {
    key: "all",
    label: "Tất cả",
    description: "Xem toàn bộ dự án theo cập nhật mới nhất",
    sortBy: "cap_nhat_gan_nhat",
    sortDir: "desc",
  },
  {
    key: "construction",
    label: "Đang thi công",
    description: "Tập trung các dự án đang chạy hiện trường",
    filters: { trang_thai: "construction" },
    sortBy: "ngay_ban_giao_du_kien",
    sortDir: "asc",
  },
  {
    key: "blocked",
    label: "Đang tắc",
    description: "Ưu tiên dự án có hạng mục tắc hoặc chờ vật liệu",
    search: "Chờ",
    sortBy: "ngay_ban_giao_du_kien",
    sortDir: "asc",
  },
  {
    key: "debt",
    label: "Công nợ cao",
    description: "Sắp theo công nợ khách hàng giảm dần",
    sortBy: "cong_no_khach_hang",
    sortDir: "desc",
  },
  {
    key: "handover",
    label: "Sắp bàn giao",
    description: "Ưu tiên rà các dự án chuẩn bị bàn giao",
    sortBy: "ngay_ban_giao_du_kien",
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

export function ProjectsWorkbench({ initialData, summary, lookups }: ProjectsWorkbenchProps) {
  const [dataset, setDataset] = useState<QueryResult>(initialData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activePresetKey, setActivePresetKey] = useState("all");
  const [sortBy, setSortBy] = useState(initialData.meta.primaryField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    String(initialData.items[0]?.project_id ?? "") || null,
  );
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filterColumns = useMemo(
    () =>
      dataset.meta.columns
        .filter((column) => ["trang_thai", "muc_uu_tien", "pm_id", "loai_du_an"].includes(column.key))
        .filter((column) => dataset.options[column.key]?.length),
    [dataset.meta.columns, dataset.options],
  );

  const visibleColumns = useMemo(
    () => dataset.meta.columns.filter((column) => PROJECT_COLUMNS.includes(column.key)),
    [dataset.meta.columns],
  );

  const selectedProject =
    dataset.items.find((item) => String(item.project_id) === selectedProjectId) ?? dataset.items[0] ?? null;

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
        const response = await fetch(`/api/sheets/du-an?${params.toString()}`, {
          signal: controller.signal,
        });
        const nextData = (await response.json()) as QueryResult;
        startTransition(() => {
          setDataset(nextData);
          if (!nextData.items.some((item) => String(item.project_id) === selectedProjectId)) {
            setSelectedProjectId(String(nextData.items[0]?.project_id ?? "") || null);
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
  }, [deferredSearch, filters, page, pageSize, refreshKey, selectedProjectId, sortBy, sortDir]);

  function resolveLookup(field: string, value: Primitive) {
    if (!value) return "—";
    if (field === "pm_id") return lookups.users[String(value)] ?? String(value);
    if (field === "client_id") return lookups.clients[String(value)] ?? String(value);
    if (field === "service_id") return lookups.services[String(value)] ?? String(value);
    return displayText(value);
  }

  function applyPreset(preset: ProjectPreset) {
    setActivePresetKey(preset.key);
    setFilters(preset.filters ?? {});
    setSearch(preset.search ?? "");
    setSortBy(preset.sortBy ?? initialData.meta.primaryField);
    setSortDir(preset.sortDir ?? "asc");
    setPage(1);
  }

  function clearFilters() {
    setActivePresetKey("all");
    setSearch("");
    setFilters({});
    setSortBy(initialData.meta.primaryField);
    setSortDir("asc");
    setPage(1);
  }

  const selectedProjectActions = selectedProject
    ? [
        selectedProject.canh_bao_chinh
          ? `Gỡ cảnh báo chính: ${displayText(selectedProject.canh_bao_chinh)}`
          : null,
        String(selectedProject.hang_muc_dang_tac ?? "") &&
        String(selectedProject.hang_muc_dang_tac ?? "") !== "Không có"
          ? `Xử lý hạng mục đang tắc: ${displayText(selectedProject.hang_muc_dang_tac)}`
          : null,
        Number(selectedProject.cong_no_khach_hang ?? 0) > 0
          ? "Bám lịch thanh toán và xác nhận công nợ khách hàng"
          : null,
        selectedProject.ngay_ban_giao_du_kien
          ? `Rà mốc bàn giao dự kiến ${formatValue(selectedProject.ngay_ban_giao_du_kien, "date")}`
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];

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
    const url = creating ? "/api/sheets/du-an" : `/api/sheets/du-an/${editing.project_id}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });

    if (!response.ok) {
      alert("Không thể lưu dự án.");
      return;
    }

    setEditing(null);
    setCreating(false);
    setRefreshKey((value) => value + 1);
  }

  async function removeRow(id: Primitive) {
    if (!id || !confirm("Xóa dự án này?")) return;
    const response = await fetch(`/api/sheets/du-an/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Không thể xóa dự án.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Tổng dự án", value: summary.total, tone: "neutral" },
          { label: "Đang thi công", value: summary.construction, tone: "primary" },
          { label: "Đang tắc", value: summary.blocked, tone: "danger" },
          { label: "Có cảnh báo", value: summary.warning, tone: "warning" },
          { label: "Công nợ cao", value: summary.highDebt, tone: "warning" },
          { label: "Sắp bàn giao", value: summary.handoverSoon, tone: "neutral" },
        ].map((item) => (
          <div key={item.label} className="panel p-5">
            <div className="text-sm font-medium text-text-muted">{item.label}</div>
            <div className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-text">
              {item.value}
            </div>
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
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
              Workbench dự án
            </div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">
              Dự án dễ điều hành hơn
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Dùng preset để vào đúng nhóm dự án cần xử lý, quét bảng nhanh, rồi mở panel chi tiết ngay trong cùng màn hình.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm dự án
            </button>
          </div>
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
                    activePresetKey === preset.key
                      ? "bg-primary-soft ring-1 ring-primary/20"
                      : "bg-white hover:bg-primary-soft",
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
              <AlertTriangle className="h-4 w-4 text-danger" />
              Công nợ cần nhìn ngay
            </div>
            <div className="space-y-3">
              {summary.topProjects.map((project) => (
                <button
                  key={String(project.project_id)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white p-3 text-left transition hover:bg-primary-soft"
                  onClick={() => setSelectedProjectId(String(project.project_id))}
                >
                  <div>
                    <div className="font-medium text-text">{project.ten_du_an}</div>
                    <div className="text-xs text-text-muted">{resolveLookup("pm_id", project.pm_id)}</div>
                  </div>
                  <div className="text-right text-sm font-semibold text-danger">
                    {compactCurrency(project.cong_no_khach_hang)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="panel min-w-0 overflow-hidden p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative max-w-xl flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base w-full pl-11"
                  value={search}
                  placeholder="Tìm theo tên dự án, cảnh báo, hạng mục tắc..."
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
            <div className="text-sm text-text-muted">
              {isPending ? "Đang tải..." : `${dataset.total} dự án phù hợp`}
            </div>
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
                    ? "Đang xem toàn bộ danh sách. Dùng preset hoặc bộ lọc để vào đúng nhóm việc."
                    : `Đang áp dụng preset ${
                        PRESETS.find((item) => item.key === activePresetKey)?.label ?? "đã chọn"
                      }.`}
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

          <div className="mt-4 max-w-full overflow-hidden rounded-2xl border border-border">
            <div className="project-table-scroll max-w-full overflow-x-auto overscroll-x-contain">
              <table className="min-w-[1280px]">
              <thead className="sticky top-0 z-10 bg-surface-subtle">
                <tr>
                  {visibleColumns.map((column) => (
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
                  <th className="table-head sticky right-0 bg-surface-subtle text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dataset.items.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center">
                      <div className="font-headline text-2xl font-bold tracking-tight text-text">
                        Không còn dự án phù hợp
                      </div>
                      <div className="mt-2 text-sm text-text-muted">
                        Hãy giảm bộ lọc, đổi preset hoặc thêm dự án mới nếu cần.
                      </div>
                    </td>
                  </tr>
                ) : dataset.items.map((row) => {
                  const selected = String(row.project_id) === selectedProjectId;
                  const rowTone =
                    toneForStatus(row.canh_bao_chinh) === "danger" || toneForStatus(row.ly_do_tac) === "danger";

                  return (
                    <tr
                      key={String(row.project_id)}
                      className={cn(
                        "cursor-pointer border-t border-border/70 transition",
                        selected ? "bg-primary-soft/60" : "bg-white hover:bg-surface-subtle",
                        rowTone && !selected && "bg-danger-soft/20",
                      )}
                      onClick={() => setSelectedProjectId(String(row.project_id))}
                    >
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className="table-cell"
                        >
                          <div className={cn("max-w-[280px] truncate", column.key === "ten_du_an" && "font-semibold")}>
                            {column.type === "status" ? (
                              <span className={cn("badge", badgeClass(row[column.key]))}>
                                {displayText(row[column.key])}
                              </span>
                            ) : column.key === "tien_do_tong_phan_tram" ? (
                              <div className="min-w-[120px]">
                                <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                                  <span>{row[column.key]}%</span>
                                  <span>{row.ngay_ban_giao_du_kien ? String(row.ngay_ban_giao_du_kien) : "—"}</span>
                                </div>
                                <div className="h-2 rounded-full bg-surface-muted">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${Math.min(100, Number(row[column.key] ?? 0))}%` }}
                                  />
                                </div>
                              </div>
                            ) : column.key === "cong_no_khach_hang" ? (
                              <span className="font-semibold text-danger">{compactCurrency(row[column.key])}</span>
                            ) : column.key === "pm_id" ? (
                              resolveLookup("pm_id", row.pm_id)
                            ) : (
                              resolveLookup(column.key, row[column.key]) === displayText(row[column.key]) &&
                              column.type !== "date" &&
                              column.type !== "currency" &&
                              column.type !== "number"
                                ? resolveLookup(column.key, row[column.key])
                                : formatValue(row[column.key], column.type)
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="table-cell sticky right-0 bg-inherit">
                        <div className="flex justify-end gap-2 bg-inherit">
                          <Link className="btn-secondary px-3 py-2 text-xs" href={`/du-an/${row.project_id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Mở
                          </Link>
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
                              removeRow(row.project_id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
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
          {selectedProject ? (
            <div className="sticky top-24 space-y-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary-soft text-primary">{selectedProject.ma_du_an}</span>
                  <span className={cn("badge", badgeClass(selectedProject.trang_thai))}>{displayText(selectedProject.trang_thai)}</span>
                  <span className={cn("badge", badgeClass(selectedProject.muc_uu_tien))}>{displayText(selectedProject.muc_uu_tien)}</span>
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-text">
                  {selectedProject.ten_du_an}
                </h2>
                <div className="mt-2 text-sm text-text-muted">
                  PM {resolveLookup("pm_id", selectedProject.pm_id)} · khách hàng{" "}
                  {resolveLookup("client_id", selectedProject.client_id)}
                </div>
              </div>

              <div className="rounded-2xl bg-surface-subtle p-4">
                <div className="mb-1 text-sm text-text-muted">Tiến độ tổng</div>
                <div className="font-headline text-3xl font-extrabold text-text">
                  {selectedProject.tien_do_tong_phan_tram}%
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Number(selectedProject.tien_do_tong_phan_tram ?? 0))}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Cảnh báo chính</div>
                  <div className="mt-1 font-semibold text-text">
                    {displayText(selectedProject.canh_bao_chinh ?? "Chưa có cảnh báo")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Hạng mục đang tắc</div>
                  <div className="mt-1 font-semibold text-danger">
                    {String(selectedProject.hang_muc_dang_tac ?? "Không có")}
                  </div>
                  <div className="mt-1 text-sm text-text-muted">{String(selectedProject.ly_do_tac ?? "Không có lý do tắc")}</div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Công nợ khách hàng</div>
                  <div className="mt-1 font-semibold text-danger">
                    {compactCurrency(selectedProject.cong_no_khach_hang)}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="mb-1 text-sm text-text-muted">Thông tin triển khai</div>
                  <div className="font-semibold text-text">{resolveLookup("service_id", selectedProject.service_id)}</div>
                  <div className="mt-1 text-sm text-text-muted">
                    Thiết kế: {displayText(selectedProject.thiet_ke_chinh_name ?? selectedProject.thiet_ke_chinh_id)}
                  </div>
                  <div className="mt-1 text-sm text-text-muted">
                    Thi công: {displayText(selectedProject.chi_huy_name ?? selectedProject.chi_huy_cong_trinh_id)}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Mốc bàn giao</div>
                  <div className="mt-1 font-semibold text-text">Bàn giao dự kiến</div>
                  <div className="mt-1 text-sm text-text-muted">
                    Bàn giao dự kiến {formatValue(selectedProject.ngay_ban_giao_du_kien, "date")}
                  </div>
                </div>
                <div className="rounded-2xl bg-primary-soft p-4">
                  <div className="mb-2 text-sm font-semibold text-primary">Tiếp theo nên làm gì</div>
                  <div className="space-y-2 text-sm text-text">
                    {selectedProjectActions.length > 0 ? (
                      selectedProjectActions.map((action) => <div key={action}>{action}</div>)
                    ) : (
                      <div>Hiện chưa có cảnh báo nổi bật. Có thể tiếp tục bám tiến độ tổng và mốc bàn giao.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/du-an/${selectedProject.project_id}`} className="btn-primary">
                  Mở chi tiết dự án
                </Link>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setCreating(false);
                    setEditing(selectedProject);
                  }}
                >
                  Sửa nhanh
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-text-muted">
              Chọn một dự án để xem preview.
            </div>
          )}
        </div>
      </section>

      <RecordFormDialog
        meta={dataset.meta}
        options={dataset.options}
        title="Dự án"
        editing={editing}
        creating={creating}
        onClose={() => setEditing(null)}
        onSubmit={submitForm}
        setEditing={setEditing}
      />
    </div>
  );
}
