export type Primitive = string | number | boolean | null;
export type ColumnType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "status"
  | "textarea";

export type SheetColumn = {
  key: string;
  label: string;
  type: ColumnType;
  editable: boolean;
  required?: boolean;
  filterable?: boolean;
  prominent?: boolean;
};

export type ResolvedSheetMeta = {
  slug: string;
  sheetName: string;
  label: string;
  description: string;
  idField: string;
  primaryField: string;
  columns: SheetColumn[];
  allowCreate?: boolean;
  allowDelete?: boolean;
};

export type QueryResult = {
  meta: ResolvedSheetMeta;
  items: Record<string, Primitive>[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  options: Record<string, string[]>;
};

const DISPLAY_MAP: Record<string, string> = {
  construction: "Đang thi công",
  planning: "Lập kế hoạch",
  procurement: "Mua hàng",
  design: "Thiết kế",
  handover: "Chờ bàn giao",
  completed: "Hoàn thành",
  on_hold: "Tạm dừng",
  fnb: "Nhà hàng / Cafe",
  van_phong: "Văn phòng",
  biet_thu: "Biệt thự",
  showroom: "Showroom",
  pm: "Quản lý dự án",
  director: "Giám đốc",
  designer: "Thiết kế",
  engineer: "Kỹ thuật",
  site_lead: "Chỉ huy công trình",
  site_supervisor: "Giám sát công trình",
  procurement_staff: "Mua hàng",
  finance: "Tài chính",
  "Thu khách hàng": "Thu khách hàng",
};

export function displayText(value: Primitive) {
  if (value === null || value === "") return "—";
  const text = String(value);
  return DISPLAY_MAP[text] ?? text;
}

export function formatValue(value: Primitive, type: ColumnType) {
  if (value === null || value === "") return "—";
  if (type === "currency") {
    const amount = Number(value);
    if (Number.isNaN(amount)) return String(value);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  if (type === "number") {
    const amount = Number(value);
    if (Number.isNaN(amount)) return String(value);
    return new Intl.NumberFormat("vi-VN").format(amount);
  }
  if (type === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return displayText(value);
}
