"use client";

import { cn } from "@/lib/utils";
import {
  displayText,
  type Primitive,
  type QueryResult,
} from "@/lib/workbook-client";

type FormState = Record<string, Primitive>;

function isStrictSelectField(key: string) {
  return (
    key.endsWith("_id") ||
    key.includes("trang_thai") ||
    key.includes("muc_uu_tien") ||
    key.includes("vai_tro") ||
    key.includes("bo_phan") ||
    key.includes("den_tin_hieu") ||
    key.includes("ket_qua") ||
    key.includes("cham_tien_do") ||
    key.includes("hang_ve_cham") ||
    key.includes("da_xu_ly_xong") ||
    key.includes("phat_sinh") ||
    key.includes("lien_quan_phat_sinh")
  );
}

type RecordFormDialogProps = {
  meta: QueryResult["meta"];
  options: QueryResult["options"];
  title: string;
  editing: FormState | null;
  creating: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setEditing: React.Dispatch<React.SetStateAction<FormState | null>>;
};

export function RecordFormDialog({
  meta,
  options,
  title,
  editing,
  creating,
  errorMessage,
  onClose,
  onSubmit,
  setEditing,
}: RecordFormDialogProps) {
  if (!editing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 p-6 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-5xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
              {creating ? "Tạo bản ghi" : "Chỉnh sửa bản ghi"}
            </div>
            <div className="font-headline text-2xl font-bold tracking-tight">
              {creating ? `Thêm mới ${title.toLowerCase()}` : String(editing[meta.primaryField] ?? "")}
            </div>
            <div className="mt-1 text-sm text-text-muted">
              Ưu tiên chọn từ danh sách sẵn có để dữ liệu nhất quán và dễ lọc hơn.
            </div>
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
        <form className="space-y-5 overflow-y-auto px-6 py-5" onSubmit={onSubmit}>
          {errorMessage ? (
            <div className="rounded-2xl border border-danger/20 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {meta.columns.map((column) => {
              const value = editing[column.key];
              const readOnly = !creating && column.key === meta.idField;
              const hasOptions = Boolean(options[column.key]?.length);
              const useStrictSelect = hasOptions && !readOnly && isStrictSelectField(column.key);
              const useSuggestionList =
                hasOptions &&
                !readOnly &&
                !useStrictSelect &&
                column.type !== "number" &&
                column.type !== "currency" &&
                column.type !== "date" &&
                column.type !== "textarea";

              if (creating && column.key === meta.idField) return null;

              return (
                <label
                  key={column.key}
                  className={cn("flex flex-col gap-2", column.type === "textarea" && "md:col-span-2 xl:col-span-3")}
                >
                  <span className="text-sm font-medium text-text">
                    {column.label}
                    {readOnly ? <span className="ml-2 text-xs text-text-muted">(Tự động)</span> : null}
                  </span>

                  {column.type === "textarea" ? (
                    <textarea
                      className="min-h-[120px] rounded-xl border border-border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      value={value === null ? "" : String(value)}
                      readOnly={readOnly}
                      placeholder={`Nhập ${column.label.toLowerCase()}...`}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                [column.key]: event.target.value || null,
                              }
                            : current,
                        )
                      }
                    />
                  ) : useStrictSelect ? (
                    <select
                      className="input-base"
                      value={value === null ? "" : String(value)}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                [column.key]: event.target.value || null,
                              }
                            : current,
                        )
                      }
                    >
                      <option value="">Chọn {column.label.toLowerCase()}</option>
                      {options[column.key].map((option) => (
                        <option key={option} value={option}>
                          {displayText(option)}
                        </option>
                      ))}
                    </select>
                  ) : useSuggestionList ? (
                    <>
                      <input
                        className="input-base"
                        type="text"
                        list={`suggestions-${column.key}`}
                        value={value === null ? "" : String(value)}
                        readOnly={readOnly}
                        placeholder={readOnly ? "" : `Nhập ${column.label.toLowerCase()}`}
                        onChange={(event) =>
                          setEditing((current) =>
                            current
                              ? {
                                  ...current,
                                  [column.key]: event.target.value || null,
                                }
                              : current,
                          )
                        }
                      />
                      <datalist id={`suggestions-${column.key}`}>
                        {options[column.key].map((option) => (
                          <option key={option} value={option}>
                            {displayText(option)}
                          </option>
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <input
                      className="input-base"
                      type={
                        column.type === "number" || column.type === "currency"
                          ? "number"
                          : column.type === "date"
                            ? "date"
                            : "text"
                      }
                      value={value === null ? "" : String(value)}
                      readOnly={readOnly}
                      placeholder={readOnly ? "" : `Nhập ${column.label.toLowerCase()}`}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                [column.key]:
                                  column.type === "number" || column.type === "currency"
                                    ? event.target.value === ""
                                      ? null
                                      : Number(event.target.value)
                                    : event.target.value || null,
                              }
                            : current,
                        )
                      }
                    />
                  )}

                  {useStrictSelect ? (
                    <span className="text-xs text-text-muted">
                      Chọn nhanh từ danh sách có sẵn để dữ liệu nhất quán và dễ lọc.
                    </span>
                  ) : useSuggestionList ? (
                    <span className="text-xs text-text-muted">
                      Có thể nhập mới hoàn toàn hoặc chọn nhanh từ gợi ý dữ liệu cũ.
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="btn-primary" type="submit">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
