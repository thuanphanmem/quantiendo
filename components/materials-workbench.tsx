"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";

import { RecordFormDialog } from "@/components/record-form-dialog";
import { cn, compactCurrency, toneForStatus } from "@/lib/utils";
import { displayText, type Primitive, type QueryResult, formatValue } from "@/lib/workbook-client";

type FormState = Record<string, Primitive>;

type MaterialsWorkbenchProps = {
  initialData: QueryResult;
  summary: {
    total: number;
    delayed: number;
    waitingOrder: number;
    needSoon: number;
    riskSuppliers: { name: string; count: number }[];
  };
  lookups: {
    projects: Record<string, string>;
  };
};

type MaterialPreset = {
  key: string;
  label: string;
  description: string;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

const PRESETS: MaterialPreset[] = [
  {
    key: "all",
    label: "Tất cả",
    description: "Toàn bộ vật tư theo ngày cần hàng gần nhất",
    sortBy: "ngay_can_hang",
    sortDir: "asc",
  },
  {
    key: "need-soon",
    label: "Sắp cần hàng",
    description: "Ưu tiên các vật tư cần hàng trong thời gian gần",
    sortBy: "ngay_can_hang",
    sortDir: "asc",
  },
  {
    key: "delayed",
    label: "Hàng chậm",
    description: "Theo dõi các mã đang giao chậm hoặc có rủi ro",
    filters: { hang_ve_cham: "Có" },
    sortBy: "ngay_can_hang",
    sortDir: "asc",
  },
  {
    key: "waiting",
    label: "Chờ mua",
    description: "Các dòng đang chờ duyệt hoặc chờ đặt hàng",
    search: "Chờ",
    sortBy: "ngay_can_hang",
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

function isDelayed(row: Record<string, Primitive>) {
  return String(row.hang_ve_cham ?? "") === "Có";
}

export function MaterialsWorkbench({ initialData, summary, lookups }: MaterialsWorkbenchProps) {
  const [dataset, setDataset] = useState<QueryResult>(initialData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activePresetKey, setActivePresetKey] = useState("all");
  const [sortBy, setSortBy] = useState("ngay_can_hang");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(String(initialData.items[0]?.item_id ?? "") || null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filterColumns = useMemo(
    () =>
      dataset.meta.columns
        .filter((column) =>
          ["trang_thai_mua_hang", "hang_ve_cham", "project_id", "nhom_vat_tu"].includes(column.key),
        )
        .filter((column) => dataset.options[column.key]?.length),
    [dataset.meta.columns, dataset.options],
  );

  const selectedItem =
    dataset.items.find((item) => String(item.item_id) === selectedItemId) ?? dataset.items[0] ?? null;

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
        const response = await fetch(`/api/sheets/vat-tu-mua-hang?${params.toString()}`, { signal: controller.signal });
        const nextData = (await response.json()) as QueryResult;
        startTransition(() => {
          setDataset(nextData);
          if (!nextData.items.some((item) => String(item.item_id) === selectedItemId)) {
            setSelectedItemId(String(nextData.items[0]?.item_id ?? "") || null);
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
  }, [deferredSearch, filters, page, pageSize, refreshKey, selectedItemId, sortBy, sortDir]);

  function resolveLookup(field: string, value: Primitive) {
    if (!value) return "—";
    if (field === "project_id") return lookups.projects[String(value)] ?? String(value);
    return displayText(value);
  }

  function applyPreset(preset: MaterialPreset) {
    setActivePresetKey(preset.key);
    setFilters(preset.filters ?? {});
    setSearch(preset.search ?? "");
    setSortBy(preset.sortBy ?? "ngay_can_hang");
    setSortDir(preset.sortDir ?? "asc");
    setPage(1);
  }

  function clearFilters() {
    setActivePresetKey("all");
    setSearch("");
    setFilters({});
    setSortBy("ngay_can_hang");
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
    const url = creating ? "/api/sheets/vat-tu-mua-hang" : `/api/sheets/vat-tu-mua-hang/${editing.item_id}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!response.ok) {
      alert("Không thể lưu vật tư.");
      return;
    }
    setEditing(null);
    setCreating(false);
    setRefreshKey((value) => value + 1);
  }

  async function removeRow(id: Primitive) {
    if (!id || !confirm("Xóa dòng vật tư này?")) return;
    const response = await fetch(`/api/sheets/vat-tu-mua-hang/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Không thể xóa vật tư.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }

  const selectedActions = selectedItem
    ? [
        isDelayed(selectedItem) ? "Liên hệ ngay nhà cung cấp để xác nhận lịch giao thực tế." : null,
        !selectedItem.ngay_dat_hang_du_kien ? "Bổ sung ngày đặt hàng dự kiến để tránh chậm lead time." : null,
        selectedItem.ngay_can_hang ? `Rà mốc cần hàng ${formatValue(selectedItem.ngay_can_hang, "date")}.` : null,
        selectedItem.trang_thai_mua_hang ? `Theo dõi trạng thái mua hàng: ${displayText(selectedItem.trang_thai_mua_hang)}.` : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng vật tư", value: summary.total, tone: "neutral" },
          { label: "Hàng chậm", value: summary.delayed, tone: "danger" },
          { label: "Chờ mua", value: summary.waitingOrder, tone: "warning" },
          { label: "Sắp cần hàng", value: summary.needSoon, tone: "primary" },
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
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">Vật tư và mua hàng</div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">Lead time rõ hơn</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Tập trung vào ngày cần hàng, trạng thái mua, hàng chậm và nhóm nhà cung cấp rủi ro để tránh tắc tiến độ.
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm vật tư
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
              <Truck className="h-4 w-4 text-warning" />
              Nhà cung cấp rủi ro
            </div>
            <div className="space-y-3">
              {summary.riskSuppliers.map((supplier) => (
                <div key={supplier.name} className="flex items-center justify-between rounded-2xl bg-white p-3">
                  <div>
                    <div className="font-medium text-text">{supplier.name}</div>
                    <div className="text-xs text-text-muted">Có vật tư đang giao chậm</div>
                  </div>
                  <div className="rounded-full bg-warning-soft px-3 py-1 text-sm font-semibold text-warning">
                    {supplier.count}
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
                  placeholder="Tìm theo vật tư, dự án, nhà cung cấp..."
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
            <div className="text-sm text-text-muted">{isPending ? "Đang tải..." : `${dataset.total} vật tư phù hợp`}</div>
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
                    ? "Đang xem toàn bộ vật tư. Dùng preset để vào nhóm cần đặt hàng hoặc đang chậm."
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
                    { key: "ten_vat_tu", label: "Vật tư" },
                    { key: "ten_du_an", label: "Dự án" },
                    { key: "nha_cung_cap", label: "Nhà cung cấp" },
                    { key: "ngay_can_hang", label: "Ngày cần hàng" },
                    { key: "trang_thai_mua_hang", label: "Trạng thái mua" },
                    { key: "hang_ve_cham", label: "Hàng chậm" },
                    { key: "thanh_tien_du_kien", label: "Dự toán" },
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
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="font-headline text-2xl font-bold tracking-tight text-text">Không còn vật tư phù hợp</div>
                      <div className="mt-2 text-sm text-text-muted">Hãy giảm bộ lọc hoặc thêm mới dòng vật tư nếu cần.</div>
                    </td>
                  </tr>
                ) : (
                  dataset.items.map((row) => {
                    const selected = String(row.item_id) === selectedItemId;
                    const rowDanger = isDelayed(row);
                    return (
                      <tr
                        key={String(row.item_id)}
                        className={cn(
                          "cursor-pointer border-t border-border/70 transition",
                          selected ? "bg-primary-soft/60" : "bg-white hover:bg-surface-subtle",
                          rowDanger && !selected && "bg-danger-soft/20",
                        )}
                        onClick={() => setSelectedItemId(String(row.item_id))}
                      >
                        <td className="table-cell">
                          <div className="max-w-[260px]">
                            <div className="truncate font-semibold text-text">{row.ten_vat_tu}</div>
                            <div className="mt-1 truncate text-xs text-text-muted">{displayText(row.nhom_vat_tu)}</div>
                          </div>
                        </td>
                        <td className="table-cell">{displayText(row.ten_du_an ?? resolveLookup("project_id", row.project_id))}</td>
                        <td className="table-cell">{displayText(row.nha_cung_cap)}</td>
                        <td className="table-cell">
                          <div className={cn("font-medium", rowDanger && "text-danger")}>{formatValue(row.ngay_can_hang, "date")}</div>
                        </td>
                        <td className="table-cell">
                          <span className={cn("badge", badgeClass(row.trang_thai_mua_hang))}>{displayText(row.trang_thai_mua_hang)}</span>
                        </td>
                        <td className="table-cell">
                          <span className={cn("badge", isDelayed(row) ? "bg-danger-soft text-danger" : "bg-surface-muted text-text")}>
                            {displayText(row.hang_ve_cham)}
                          </span>
                        </td>
                        <td className="table-cell font-semibold text-text">{compactCurrency(row.thanh_tien_du_kien)}</td>
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
                                removeRow(row.item_id);
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
          {selectedItem ? (
            <div className="sticky top-24 space-y-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary-soft text-primary">{selectedItem.item_id}</span>
                  <span className={cn("badge", badgeClass(selectedItem.trang_thai_mua_hang))}>{displayText(selectedItem.trang_thai_mua_hang)}</span>
                  {isDelayed(selectedItem) ? <span className="badge bg-danger-soft text-danger">Hàng chậm</span> : null}
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-text">{selectedItem.ten_vat_tu}</h2>
                <div className="mt-2 text-sm text-text-muted">
                  {displayText(selectedItem.ten_du_an ?? resolveLookup("project_id", selectedItem.project_id))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Nhà cung cấp</div>
                  <div className="mt-1 font-semibold text-text">{displayText(selectedItem.nha_cung_cap)}</div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Mốc cần hàng</div>
                  <div className={cn("mt-1 font-semibold", isDelayed(selectedItem) ? "text-danger" : "text-text")}>
                    {formatValue(selectedItem.ngay_can_hang, "date")}
                  </div>
                  <div className="mt-1 text-sm text-text-muted">
                    Dự kiến đặt: {formatValue(selectedItem.ngay_dat_hang_du_kien, "date")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Dự toán</div>
                  <div className="mt-1 font-semibold text-text">{compactCurrency(selectedItem.thanh_tien_du_kien)}</div>
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
                      <div>Dòng vật tư đang ổn. Có thể tiếp tục bám lịch giao và xác nhận đủ số lượng.</div>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  setCreating(false);
                  setEditing(selectedItem);
                }}
              >
                Sửa nhanh
              </button>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-text-muted">
              Chọn một dòng vật tư để xem preview.
            </div>
          )}
        </div>
      </section>

      <RecordFormDialog
        meta={dataset.meta}
        options={dataset.options}
        title="Vật tư"
        editing={editing}
        creating={creating}
        onClose={() => setEditing(null)}
        onSubmit={submitForm}
        setEditing={setEditing}
      />
    </div>
  );
}
