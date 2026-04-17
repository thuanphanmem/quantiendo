"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { RecordFormDialog } from "@/components/record-form-dialog";
import { cn, toneForStatus } from "@/lib/utils";
import { displayText, type Primitive, type QueryResult, formatValue } from "@/lib/workbook-client";

type WorkbenchProps = {
  title: string;
  description: string;
  slug: string;
  initialData: QueryResult;
  detailPathField?: string;
  detailPathPrefix?: string;
  summaryCards?: Array<{
    label: string;
    value: Primitive | string;
    tone?: "neutral" | "primary" | "warning" | "danger";
  }>;
  spotlightTitle?: string;
  spotlightItems?: Array<{
    title: string;
    meta?: string;
    value?: string;
  }>;
};

type FormState = Record<string, Primitive>;

function badgeClass(value: Primitive) {
  const tone = toneForStatus(value);
  if (tone === "success") return "bg-success-soft text-success";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "danger") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-text";
}

export function Workbench({
  title,
  description,
  slug,
  initialData,
  detailPathField,
  detailPathPrefix,
  summaryCards,
  spotlightTitle,
  spotlightItems,
}: WorkbenchProps) {
  const [dataset, setDataset] = useState<QueryResult>(initialData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortBy, setSortBy] = useState(initialData.meta.primaryField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setFormError(null);
    }
  }, [editing]);

  const filterColumns = useMemo(
    () =>
      dataset.meta.columns
        .filter((column) => column.filterable && dataset.options[column.key]?.length)
        .slice(0, 4),
    [dataset.meta.columns, dataset.options],
  );

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
        const response = await fetch(`/api/sheets/${slug}?${params.toString()}`, {
          signal: controller.signal,
        });
        const nextData = (await response.json()) as QueryResult;
        startTransition(() => {
          setDataset(nextData);
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error;
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [deferredSearch, filters, page, pageSize, refreshKey, slug, sortBy, sortDir]);

  function openCreate() {
    const nextState: FormState = {};
    dataset.meta.columns.forEach((column) => {
      if (column.key !== dataset.meta.idField) nextState[column.key] = null;
    });
    setFormError(null);
    setCreating(true);
    setEditing(nextState);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const method = creating ? "POST" : "PATCH";
    const url = creating
      ? `/api/sheets/${slug}`
      : `/api/sheets/${slug}/${editing[dataset.meta.idField]}`;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFormError(payload?.message ?? "Không thể lưu bản ghi.");
      return;
    }

    setFormError(null);
    setEditing(null);
    setCreating(false);
    setPage(1);
    setRefreshKey((value) => value + 1);
  }

  async function removeRow(id: Primitive) {
    if (!id || !confirm("Xóa bản ghi này?")) return;
    const response = await fetch(`/api/sheets/${slug}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert("Không thể xóa bản ghi.");
      return;
    }
    setPage(1);
    setRefreshKey((value) => value + 1);
  }

  function resolveDetailHref(row: Record<string, Primitive>) {
    if (!detailPathField || !detailPathPrefix) return null;
    const value = row[detailPathField];
    if (!value) return null;
    return `${detailPathPrefix}/${value}`;
  }

  function clearFilters() {
    setSearch("");
    setFilters({});
    setPage(1);
    setSortBy(initialData.meta.primaryField);
    setSortDir("asc");
  }

  return (
    <div className="space-y-6">
      {summaryCards?.length ? (
        <section className={cn("grid gap-4", summaryCards.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3")}>
          {summaryCards.map((item) => (
            <div key={item.label} className="panel p-5">
              <div className="text-sm font-medium text-text-muted">{item.label}</div>
              <div className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-text">
                {typeof item.value === "string" ? item.value : formatValue(item.value, "number")}
              </div>
              <div
                className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", {
                  "bg-danger-soft text-danger": item.tone === "danger",
                  "bg-warning-soft text-warning": item.tone === "warning",
                  "bg-primary-soft text-primary": item.tone === "primary",
                  "bg-surface-subtle text-text": !item.tone || item.tone === "neutral",
                })}
              >
                {item.label}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            Workbench dữ liệu
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {dataset.meta.allowCreate ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm mới
            </button>
          ) : null}
        </div>
      </section>

      {spotlightItems?.length ? (
        <section className="panel p-5">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            {spotlightTitle ?? "Điểm cần nhìn nhanh"}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {spotlightItems.map((item) => (
              <div key={`${item.title}-${item.value ?? ""}`} className="rounded-2xl bg-surface-subtle p-4">
                <div className="font-medium text-text">{item.title}</div>
                {item.meta ? <div className="mt-1 text-sm text-text-muted">{item.meta}</div> : null}
                {item.value ? <div className="mt-2 text-sm font-semibold text-primary">{item.value}</div> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                className="input-base w-full pl-11"
                value={search}
                placeholder="Tìm kiếm toàn bảng..."
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
            {isPending ? "Đang tải..." : `Hiển thị ${dataset.items.length}/${dataset.total} bản ghi`}
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

        <div className="mt-4 rounded-2xl bg-surface-subtle p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-text-muted">
              {search || Object.values(filters).some(Boolean)
                ? "Đang xem dữ liệu đã lọc. Có thể bỏ bớt bộ lọc để thấy đầy đủ hơn."
                : "Đang xem toàn bộ dữ liệu. Dùng tìm kiếm và bộ lọc để vào đúng nhóm bản ghi."}
            </div>
            {(search || Object.values(filters).some(Boolean)) && (
              <button className="btn-secondary px-3 py-2 text-xs" onClick={clearFilters}>
                Xóa toàn bộ bộ lọc
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {Object.entries(filters)
            .filter(([, value]) => Boolean(value))
            .map(([key, value]) => {
              const column = dataset.meta.columns.find((item) => item.key === key);
              return (
                <button
                  key={key}
                  className="badge bg-primary-soft text-primary"
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
          {search ? <span className="badge bg-primary-soft text-primary">Từ khóa: {search}</span> : null}
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full">
            <thead className="bg-surface-subtle">
              <tr>
                {dataset.meta.columns.map((column) => (
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
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                ))}
                <th className="table-head text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dataset.items.length === 0 ? (
                <tr>
                  <td colSpan={dataset.meta.columns.length + 1} className="px-6 py-16 text-center">
                    <div className="font-headline text-2xl font-bold tracking-tight text-text">
                      Không có dữ liệu phù hợp
                    </div>
                    <div className="mt-2 text-sm text-text-muted">
                      Thử giảm bộ lọc hoặc thêm mới bản ghi nếu sheet cho phép.
                    </div>
                  </td>
                </tr>
              ) : (
                dataset.items.map((row) => {
                const detailHref = resolveDetailHref(row);
                return (
                  <tr
                    key={String(row[dataset.meta.idField])}
                    className="border-t border-border/70 bg-white transition hover:bg-surface-subtle"
                  >
                    {dataset.meta.columns.map((column) => (
                      <td key={column.key} className="table-cell">
                        <div className={cn(column.prominent ? "font-semibold" : "font-normal", "max-w-[280px] truncate")}>
                          {column.type === "status" ? (
                            <span className={cn("badge", badgeClass(row[column.key]))}>{displayText(row[column.key])}</span>
                          ) : (
                            formatValue(row[column.key], column.type)
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        {detailHref ? (
                          <Link className="btn-secondary px-3 py-2 text-xs" href={detailHref}>
                            Xem
                          </Link>
                        ) : null}
                        <button
                          className="btn-secondary px-3 py-2 text-xs"
                          onClick={() => {
                            setCreating(false);
                            setEditing(row);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        {dataset.meta.allowDelete ? (
                          <button
                            className="btn-secondary px-3 py-2 text-xs text-danger"
                            onClick={() => removeRow(row[dataset.meta.idField])}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        ) : null}
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
            <button
              className="btn-secondary px-3"
              disabled={dataset.page >= dataset.pageCount}
              onClick={() => setPage((value) => Math.min(dataset.pageCount, value + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <RecordFormDialog
        meta={dataset.meta}
        options={dataset.options}
        title={title}
        editing={editing}
        creating={creating}
        errorMessage={formError}
        onClose={() => {
          setEditing(null);
          setFormError(null);
        }}
        onSubmit={submitForm}
        setEditing={setEditing}
      />
    </div>
  );
}
