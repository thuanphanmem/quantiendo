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
  WalletCards,
} from "lucide-react";

import { RecordFormDialog } from "@/components/record-form-dialog";
import { cn, compactCurrency, toneForStatus } from "@/lib/utils";
import { displayText, type Primitive, type QueryResult, formatValue } from "@/lib/workbook-client";

type FormState = Record<string, Primitive>;

type PaymentsWorkbenchProps = {
  initialData: QueryResult;
  summary: {
    total: number;
    overdue: number;
    dueSoon: number;
    receivable: number;
    payable: number;
    topRiskProjects: { name: string; amount: number }[];
  };
  lookups: {
    projects: Record<string, string>;
  };
};

type PaymentPreset = {
  key: string;
  label: string;
  description: string;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

const PRESETS: PaymentPreset[] = [
  { key: "all", label: "Tất cả", description: "Toàn bộ phiếu theo ngày đến hạn", sortBy: "ngay_den_han", sortDir: "asc" },
  { key: "overdue", label: "Quá hạn", description: "Các phiếu cần nhắc ngay", filters: { trang_thai: "Quá hạn" }, sortBy: "ngay_den_han", sortDir: "asc" },
  { key: "receivable", label: "Thu khách", description: "Các khoản cần thu từ khách hàng", filters: { loai: "Thu khách hàng" }, sortBy: "ngay_den_han", sortDir: "asc" },
  { key: "due-soon", label: "Sắp đến hạn", description: "Rà các phiếu sắp đến hạn thanh toán", sortBy: "ngay_den_han", sortDir: "asc" },
];

function badgeClass(value: Primitive) {
  const tone = toneForStatus(value);
  if (tone === "success") return "bg-success-soft text-success";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "danger") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-text";
}

function isOverdue(row: Record<string, Primitive>) {
  return String(row.trang_thai ?? "") === "Quá hạn";
}

export function PaymentsWorkbench({ initialData, summary, lookups }: PaymentsWorkbenchProps) {
  const [dataset, setDataset] = useState<QueryResult>(initialData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activePresetKey, setActivePresetKey] = useState("all");
  const [sortBy, setSortBy] = useState("ngay_den_han");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(String(initialData.items[0]?.payment_id ?? "") || null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filterColumns = useMemo(
    () =>
      dataset.meta.columns
        .filter((column) => ["trang_thai", "loai", "project_id"].includes(column.key))
        .filter((column) => dataset.options[column.key]?.length),
    [dataset.meta.columns, dataset.options],
  );

  const selectedPayment =
    dataset.items.find((item) => String(item.payment_id) === selectedPaymentId) ?? dataset.items[0] ?? null;

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
        const response = await fetch(`/api/sheets/thanh-toan-hoa-don?${params.toString()}`, { signal: controller.signal });
        const nextData = (await response.json()) as QueryResult;
        startTransition(() => {
          setDataset(nextData);
          if (!nextData.items.some((item) => String(item.payment_id) === selectedPaymentId)) {
            setSelectedPaymentId(String(nextData.items[0]?.payment_id ?? "") || null);
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
  }, [deferredSearch, filters, page, pageSize, refreshKey, selectedPaymentId, sortBy, sortDir]);

  function resolveProject(value: Primitive) {
    if (!value) return "—";
    return lookups.projects[String(value)] ?? String(value);
  }

  function applyPreset(preset: PaymentPreset) {
    setActivePresetKey(preset.key);
    setFilters(preset.filters ?? {});
    setSearch(preset.search ?? "");
    setSortBy(preset.sortBy ?? "ngay_den_han");
    setSortDir(preset.sortDir ?? "asc");
    setPage(1);
  }

  function clearFilters() {
    setActivePresetKey("all");
    setSearch("");
    setFilters({});
    setSortBy("ngay_den_han");
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
    const url = creating ? "/api/sheets/thanh-toan-hoa-don" : `/api/sheets/thanh-toan-hoa-don/${editing.payment_id}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!response.ok) {
      alert("Không thể lưu phiếu thanh toán.");
      return;
    }
    setEditing(null);
    setCreating(false);
    setRefreshKey((value) => value + 1);
  }

  async function removeRow(id: Primitive) {
    if (!id || !confirm("Xóa phiếu này?")) return;
    const response = await fetch(`/api/sheets/thanh-toan-hoa-don/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Không thể xóa phiếu.");
      return;
    }
    setRefreshKey((value) => value + 1);
  }

  const selectedActions = selectedPayment
    ? [
        isOverdue(selectedPayment) ? "Nhắc ngay khách hàng hoặc xác nhận lịch xử lý với bộ phận liên quan." : null,
        selectedPayment.ngay_den_han ? `Theo dõi mốc đến hạn ${formatValue(selectedPayment.ngay_den_han, "date")}.` : null,
        selectedPayment.ghi_chu ? `Lưu ý: ${String(selectedPayment.ghi_chu)}` : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng phiếu", value: summary.total, tone: "neutral" },
          { label: "Quá hạn", value: summary.overdue, tone: "danger" },
          { label: "Sắp đến hạn", value: summary.dueSoon, tone: "warning" },
          { label: "Phải thu", value: summary.receivable, tone: "primary", currency: true },
        ].map((item) => (
          <div key={item.label} className="panel p-5">
            <div className="text-sm font-medium text-text-muted">{item.label}</div>
            <div className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-text">
              {item.currency ? compactCurrency(item.value) : item.value}
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
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">Thanh toán và công nợ</div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">Phiếu dễ bám hơn</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Ưu tiên theo ngày đến hạn, trạng thái và dự án để người vận hành biết ngay khoản nào cần nhắc.
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm phiếu
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
              <WalletCards className="h-4 w-4 text-danger" />
              Dự án cần bám công nợ
            </div>
            <div className="space-y-3">
              {summary.topRiskProjects.map((project) => (
                <div key={project.name} className="flex items-center justify-between rounded-2xl bg-white p-3">
                  <div>
                    <div className="font-medium text-text">{project.name}</div>
                    <div className="text-xs text-text-muted">Có phiếu quá hạn cần xử lý</div>
                  </div>
                  <div className="rounded-full bg-danger-soft px-3 py-1 text-sm font-semibold text-danger">
                    {compactCurrency(project.amount)}
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
                  placeholder="Tìm theo đợt thanh toán, dự án, ghi chú..."
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
            <div className="text-sm text-text-muted">{isPending ? "Đang tải..." : `${dataset.total} phiếu phù hợp`}</div>
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
                    ? "Đang xem toàn bộ phiếu. Dùng preset để vào đúng nhóm cần nhắc ngay."
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

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full">
              <thead className="bg-surface-subtle">
                <tr>
                  {[
                    { key: "dot_thanh_toan", label: "Đợt thanh toán" },
                    { key: "ten_du_an", label: "Dự án" },
                    { key: "loai", label: "Loại" },
                    { key: "ngay_den_han", label: "Đến hạn" },
                    { key: "trang_thai", label: "Trạng thái" },
                    { key: "so_tien", label: "Số tiền" },
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
                      <div className="font-headline text-2xl font-bold tracking-tight text-text">Không còn phiếu phù hợp</div>
                      <div className="mt-2 text-sm text-text-muted">Hãy giảm bộ lọc hoặc thêm mới phiếu nếu cần.</div>
                    </td>
                  </tr>
                ) : (
                  dataset.items.map((row) => (
                    <tr
                      key={String(row.payment_id)}
                      className={cn(
                        "cursor-pointer border-t border-border/70 transition",
                        String(row.payment_id) === selectedPaymentId ? "bg-primary-soft/60" : "bg-white hover:bg-surface-subtle",
                        isOverdue(row) && String(row.payment_id) !== selectedPaymentId && "bg-danger-soft/20",
                      )}
                      onClick={() => setSelectedPaymentId(String(row.payment_id))}
                    >
                      <td className="table-cell">
                        <div className="max-w-[260px]">
                          <div className="truncate font-semibold text-text">{row.dot_thanh_toan}</div>
                          <div className="mt-1 truncate text-xs text-text-muted">{displayText(row.ghi_chu ?? "Không có ghi chú")}</div>
                        </div>
                      </td>
                      <td className="table-cell">{displayText(row.ten_du_an ?? resolveProject(row.project_id))}</td>
                      <td className="table-cell">{displayText(row.loai)}</td>
                      <td className="table-cell">
                        <div className={cn("font-medium", isOverdue(row) && "text-danger")}>{formatValue(row.ngay_den_han, "date")}</div>
                      </td>
                      <td className="table-cell">
                        <span className={cn("badge", badgeClass(row.trang_thai))}>{displayText(row.trang_thai)}</span>
                      </td>
                      <td className="table-cell font-semibold text-text">{compactCurrency(row.so_tien)}</td>
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
                              removeRow(row.payment_id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
          {selectedPayment ? (
            <div className="sticky top-24 space-y-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary-soft text-primary">{selectedPayment.payment_id}</span>
                  <span className={cn("badge", badgeClass(selectedPayment.trang_thai))}>{displayText(selectedPayment.trang_thai)}</span>
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-text">{selectedPayment.dot_thanh_toan}</h2>
                <div className="mt-2 text-sm text-text-muted">{displayText(selectedPayment.ten_du_an ?? resolveProject(selectedPayment.project_id))}</div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Số tiền</div>
                  <div className="mt-1 font-semibold text-text">{compactCurrency(selectedPayment.so_tien)}</div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Ngày đến hạn</div>
                  <div className={cn("mt-1 font-semibold", isOverdue(selectedPayment) ? "text-danger" : "text-text")}>
                    {formatValue(selectedPayment.ngay_den_han, "date")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-subtle p-4">
                  <div className="text-sm text-text-muted">Loại</div>
                  <div className="mt-1 text-sm text-text">{displayText(selectedPayment.loai)}</div>
                </div>
                <div className="rounded-2xl bg-primary-soft p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Tiếp theo nên làm gì
                  </div>
                  <div className="space-y-2 text-sm text-text">
                    {selectedActions.length > 0 ? selectedActions.map((action) => <div key={action}>{action}</div>) : <div>Phiếu đang ổn. Có thể tiếp tục theo dõi đến ngày xử lý.</div>}
                  </div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  setCreating(false);
                  setEditing(selectedPayment);
                }}
              >
                Sửa nhanh
              </button>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-text-muted">Chọn một phiếu để xem preview.</div>
          )}
        </div>
      </section>

      <RecordFormDialog
        meta={dataset.meta}
        options={dataset.options}
        title="Phiếu thanh toán"
        editing={editing}
        creating={creating}
        onClose={() => setEditing(null)}
        onSubmit={submitForm}
        setEditing={setEditing}
      />
    </div>
  );
}
