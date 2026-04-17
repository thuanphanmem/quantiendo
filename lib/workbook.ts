import "server-only";

import fs from "node:fs";
import { google, type sheets_v4 } from "googleapis";
import { z } from "zod";

export type Primitive = string | number | boolean | null;
export type RowRecord = Record<string, Primitive>;
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

export type SheetMeta = {
  slug: string;
  sheetName: string;
  label: string;
  description: string;
  idField: string;
  primaryField: string;
  columns?: SheetColumn[];
  allowCreate?: boolean;
  allowDelete?: boolean;
};

type SheetDataset = {
  meta: ResolvedSheetMeta;
  rows: RowRecord[];
};

type WorkbookDataset = Record<string, SheetDataset>;

type QueryInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, string>;
};

type QueryResult = {
  meta: ResolvedSheetMeta;
  items: RowRecord[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  options: Record<string, string[]>;
};

export type ResolvedSheetMeta = SheetMeta & {
  columns: SheetColumn[];
};

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "1cYjtsDuKzMsS6HS3D7vrab5TDCcce0W86t-qyLDA8UA";
const GOOGLE_SERVICE_ACCOUNT_PATH = process.cwd() + "/KeyAPICaNhan.json";
const WORKBOOK_CACHE_TTL_MS = 15_000;
const WORKBOOK_STALE_TTL_MS = 5 * 60_000;

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

const SHEETS: SheetMeta[] = [
  {
    slug: "du-an",
    sheetName: "du-an",
    label: "Dự án",
    description: "Bảng điều hành trung tâm cho toàn bộ dự án nội thất.",
    idField: "project_id",
    primaryField: "ten_du_an",
  },
  {
    slug: "cong-viec",
    sheetName: "cong-viec",
    label: "Công việc",
    description: "Điều phối task, deadline, vướng mắc và phát sinh.",
    idField: "task_id",
    primaryField: "ten_cong_viec",
  },
  {
    slug: "vat-tu-mua-hang",
    sheetName: "vat-tu-mua-hang",
    label: "Vật tư",
    description: "Theo dõi lead time, trạng thái mua hàng và giao nhận.",
    idField: "item_id",
    primaryField: "ten_vat_tu",
  },
  {
    slug: "thanh-toan-hoa-don",
    sheetName: "thanh-toan-hoa-don",
    label: "Thanh toán",
    description: "Theo dõi các đợt thu, chi và công nợ phát sinh.",
    idField: "payment_id",
    primaryField: "dot_thanh_toan",
  },
  {
    slug: "ghi-chu-dieu-hanh",
    sheetName: "ghi-chu-dieu-hanh",
    label: "Ghi chú điều hành",
    description: "Nhật ký điều hành, tín hiệu và hành động tiếp theo.",
    idField: "note_id",
    primaryField: "noi_dung_tom_tat",
  },
  {
    slug: "hang-muc-khong-gian",
    sheetName: "hang-muc-khong-gian",
    label: "Không gian",
    description: "Theo dõi từng phòng/khu vực và điểm nghẽn thực địa.",
    idField: "room_id",
    primaryField: "ten_khong_gian",
  },
  {
    slug: "tien-do-giai-doan",
    sheetName: "tien-do-giai-doan",
    label: "Giai đoạn",
    description: "Timeline, tiến độ và cảnh báo theo phase dự án.",
    idField: "stage_id",
    primaryField: "ten_giai_doan",
  },
  {
    slug: "chi-phi",
    sheetName: "chi-phi",
    label: "Chi phí",
    description: "Theo dõi chi phí thực tế và phát sinh theo dự án.",
    idField: "cost_id",
    primaryField: "noi_dung_chi",
  },
  {
    slug: "nghiem-thu-ban-giao",
    sheetName: "nghiem-thu-ban-giao",
    label: "Nghiệm thu",
    description: "Theo dõi nghiệm thu, bàn giao và tồn sau nghiệm thu.",
    idField: "acceptance_id",
    primaryField: "loai_nghiem_thu",
  },
  {
    slug: "khach-hang",
    sheetName: "khach-hang",
    label: "Khách hàng",
    description: "Thông tin khách hàng và nguồn khách.",
    idField: "client_id",
    primaryField: "ten_khach_hang",
  },
  {
    slug: "nhan-su",
    sheetName: "nhan-su",
    label: "Nhân sự",
    description: "Danh bạ nhân sự nội bộ.",
    idField: "user_id",
    primaryField: "ho_ten",
  },
  {
    slug: "goi-dich-vu",
    sheetName: "goi-dich-vu",
    label: "Gói dịch vụ",
    description: "Danh mục gói dịch vụ và đơn giá.",
    idField: "service_id",
    primaryField: "ten_goi_dich_vu",
  },
  {
    slug: "tong-quan",
    sheetName: "tong-quan",
    label: "Tổng quan",
    description: "Chỉ số tổng hợp từ file nguồn.",
    idField: "chi_so",
    primaryField: "chi_so",
    allowCreate: false,
    allowDelete: false,
  },
  {
    slug: "mo-ta",
    sheetName: "mo-ta",
    label: "Mô tả",
    description: "Tài liệu giải thích ý nghĩa các sheet.",
    idField: "sheet_name",
    primaryField: "sheet_name",
    allowCreate: false,
    allowDelete: false,
  },
];

const SHEET_MAP = new Map(SHEETS.map((sheet) => [sheet.slug, sheet]));

const LABELS: Record<string, string> = {
  sheet_name: "Tên sheet",
  muc_dich: "Mục đích",
  dung_de_lam_gi: "Dùng để làm gì",
  user_id: "Mã nhân sự",
  ho_ten: "Họ tên",
  chuc_danh: "Chức danh",
  bo_phan: "Bộ phận",
  vai_tro: "Vai trò",
  so_dien_thoai: "Số điện thoại",
  email: "Email",
  trang_thai: "Trạng thái",
  chi_phi_ngay: "Chi phí ngày",
  ngay_vao_lam: "Ngày vào làm",
  client_id: "Mã khách hàng",
  ten_khach_hang: "Tên khách hàng",
  loai_cong_trinh: "Loại công trình",
  nguoi_lien_he: "Người liên hệ",
  dia_chi: "Địa chỉ",
  nguon_khach: "Nguồn khách",
  service_id: "Mã dịch vụ",
  ten_goi_dich_vu: "Tên gói dịch vụ",
  don_vi_tinh: "Đơn vị tính",
  don_gia_mac_dinh: "Đơn giá mặc định",
  project_id: "Mã dự án",
  ma_du_an: "Mã nội bộ",
  ten_du_an: "Tên dự án",
  loai_du_an: "Loại dự án",
  phong_cach: "Phong cách",
  dien_tich_m2: "Diện tích m2",
  pm_id: "Quản lý dự án",
  thiet_ke_chinh_id: "Thiết kế chính",
  chi_huy_cong_trinh_id: "Chỉ huy công trình",
  muc_uu_tien: "Mức ưu tiên",
  ngay_khoi_cong: "Ngày khởi công",
  ngay_ban_giao_du_kien: "Ngày bàn giao dự kiến",
  ngay_ban_giao_thuc_te: "Ngày bàn giao thực tế",
  tien_do_tong_phan_tram: "Tiến độ tổng",
  gia_tri_hop_dong: "Giá trị hợp đồng",
  chi_phi_ke_hoach: "Chi phí kế hoạch",
  chi_phi_thuc_te: "Chi phí thực tế",
  chi_phi_phat_sinh: "Chi phí phát sinh",
  cong_no_khach_hang: "Công nợ khách hàng",
  cong_no_nha_cung_cap: "Công nợ nhà cung cấp",
  hang_muc_dang_tac: "Hạng mục đang tắc",
  ly_do_tac: "Lý do tắc",
  canh_bao_chinh: "Cảnh báo chính",
  cap_nhat_gan_nhat: "Cập nhật gần nhất",
  room_id: "Mã không gian",
  ten_khong_gian: "Tên không gian",
  trang_thai_thiet_ke: "Trạng thái thiết kế",
  trang_thai_thi_cong: "Trạng thái thi công",
  ngay_can_chot_vat_tu: "Ngày cần chốt vật tư",
  ngay_can_dat_hang: "Ngày cần đặt hàng",
  ngay_thi_cong_du_kien: "Ngày thi công dự kiến",
  ton_sau_nghiem_thu: "Tồn sau nghiệm thu",
  ghi_chu: "Ghi chú",
  stage_id: "Mã giai đoạn",
  ten_giai_doan: "Tên giai đoạn",
  ma_giai_doan: "Mã phase",
  ty_trong_phan_tram: "Tỷ trọng",
  nguoi_phu_trach_id: "Người phụ trách",
  ngay_bat_dau_ke_hoach: "Ngày bắt đầu kế hoạch",
  ngay_ket_thuc_ke_hoach: "Ngày kết thúc kế hoạch",
  ngay_ket_thuc_thuc_te: "Ngày kết thúc thực tế",
  cham_tien_do: "Chậm tiến độ",
  vuong_chinh: "Vướng chính",
  task_id: "Mã công việc",
  ten_cong_viec: "Tên công việc",
  ngay_bat_dau: "Ngày bắt đầu",
  han_xu_ly: "Hạn xử lý",
  ngay_hoan_thanh: "Ngày hoàn thành",
  vuong_mac: "Vướng mắc",
  phat_sinh_ngoai_hop_dong: "Phát sinh ngoài hợp đồng",
  item_id: "Mã vật tư",
  ten_vat_tu: "Tên vật tư",
  nhom_vat_tu: "Nhóm vật tư",
  nha_cung_cap: "Nhà cung cấp",
  don_vi: "Đơn vị",
  so_luong: "Số lượng",
  don_gia_du_kien: "Đơn giá dự kiến",
  thanh_tien_du_kien: "Thành tiền dự kiến",
  ngay_can_hang: "Ngày cần hàng",
  ngay_dat_hang_du_kien: "Ngày đặt hàng dự kiến",
  ngay_giao_hang_thuc_te: "Ngày giao hàng thực tế",
  trang_thai_mua_hang: "Trạng thái mua hàng",
  hang_ve_cham: "Hàng về chậm",
  cost_id: "Mã chi phí",
  ngay_chi: "Ngày chi",
  nhom_chi_phi: "Nhóm chi phí",
  noi_dung_chi: "Nội dung chi",
  so_tien: "Số tiền",
  lien_quan_phat_sinh: "Liên quan phát sinh",
  payment_id: "Mã thanh toán",
  dot_thanh_toan: "Đợt thanh toán",
  loai: "Loại",
  ngay_du_kien: "Ngày dự kiến",
  ngay_den_han: "Ngày đến hạn",
  ngay_thanh_toan: "Ngày thanh toán",
  acceptance_id: "Mã nghiệm thu",
  lan_nghiem_thu: "Lần nghiệm thu",
  loai_nghiem_thu: "Loại nghiệm thu",
  ngay_nghiem_thu: "Ngày nghiệm thu",
  ket_qua: "Kết quả",
  ngay_hen_xu_ly_ton: "Ngày hẹn xử lý tồn",
  da_xu_ly_xong: "Đã xử lý xong",
  bien_ban_so: "Biên bản số",
  note_id: "Mã ghi chú",
  ngay_cap_nhat: "Ngày cập nhật",
  den_tin_hieu: "Đèn tín hiệu",
  noi_dung_tom_tat: "Nội dung tóm tắt",
  vuong_mac_chinh: "Vướng mắc chính",
  hanh_dong_tiep_theo: "Hành động tiếp theo",
  nguoi_cap_nhat_id: "Người cập nhật",
  chi_so: "Chỉ số",
  gia_tri: "Giá trị",
  ghi_chu_2: "Ghi chú",
};

const COLUMN_TYPE_OVERRIDES: Record<string, ColumnType> = {
  tien_do_tong_phan_tram: "number",
  tien_do_phan_tram: "number",
  ty_trong_phan_tram: "number",
  dien_tich_m2: "number",
  chi_phi_ngay: "currency",
  nhom_chi_phi: "text",
  gia_tri: "number",
};

const writeSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

let writeQueue: Promise<void> = Promise.resolve();

function inferColumnType(key: string, values: Primitive[]): ColumnType {
  if (COLUMN_TYPE_OVERRIDES[key]) {
    return COLUMN_TYPE_OVERRIDES[key];
  }
  if (
    key.includes("ngay") ||
    key.includes("date") ||
    key.includes("han_") ||
    key.endsWith("_luc")
  ) {
    return "date";
  }
  if (
    key.includes("gia_tri") ||
    key.includes("chi_phi") ||
    key.includes("cong_no") ||
    key.includes("don_gia") ||
    key.includes("so_tien") ||
    key.includes("thanh_tien")
  ) {
    return "currency";
  }
  if (
    key.includes("phan_tram") ||
    key.includes("m2") ||
    key.includes("so_luong") ||
    key.includes("lan_") ||
    key.includes("ty_trong")
  ) {
    return "number";
  }
  if (
    key.includes("trang_thai") ||
    key.includes("muc_uu_tien") ||
    key.includes("canh_bao") ||
    key.includes("den_tin_hieu") ||
    key.includes("ket_qua")
  ) {
    return "status";
  }
  if (
    key.includes("ghi_chu") ||
    key.includes("ly_do") ||
    key.includes("vuong") ||
    key.includes("hanh_dong") ||
    key.includes("noi_dung")
  ) {
    return "textarea";
  }
  const nonNull = values.filter((value) => value !== null);
  if (nonNull.every((value) => typeof value === "number")) {
    return "number";
  }
  return "text";
}

function normalizeLabel(key: string) {
  return (
    LABELS[key] ??
    key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

let sheetsClientPromise: Promise<sheets_v4.Sheets> | null = null;
let workbookCache: { expiresAt: number; staleUntil: number; dataset: WorkbookDataset } | null = null;
let workbookInFlightPromise: Promise<WorkbookDataset> | null = null;
let workbookRuntimeStatus: {
  source: "fresh" | "stale" | "empty";
  lastSuccessfulSyncAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage: string | null;
} = {
  source: "empty",
  lastSuccessfulSyncAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
};

function getSheetsClient() {
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
      let auth: InstanceType<typeof google.auth.GoogleAuth>;

      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
          scopes,
        });
      } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
          scopes,
        });
      } else if (fs.existsSync(GOOGLE_SERVICE_ACCOUNT_PATH)) {
        auth = new google.auth.GoogleAuth({
          keyFile: GOOGLE_SERVICE_ACCOUNT_PATH,
          scopes,
        });
      } else {
        throw new Error(
          "Thiếu cấu hình Google Sheets. Cần GOOGLE_SERVICE_ACCOUNT_JSON hoặc GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.",
        );
      }

      return google.sheets({
        version: "v4",
        auth,
      });
    })();
  }

  return sheetsClientPromise;
}

function isDateLikeKey(key: string) {
  return (
    key.includes("ngay") ||
    key.includes("date") ||
    key.includes("han_") ||
    key.endsWith("_luc")
  );
}

function normalizeDateString(text: string) {
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return trimmed;
}

function normalizeCellValue(key: string, value: unknown): Primitive {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (isDateLikeKey(key)) return normalizeDateString(trimmed);
      return trimmed;
    }
    return value;
  }
  return String(value);
}

function clearWorkbookCache() {
  workbookCache = null;
  workbookInFlightPromise = null;
}

export function getWorkbookRuntimeStatus() {
  return workbookRuntimeStatus;
}

export async function refreshWorkbookCache() {
  clearWorkbookCache();
  await readWorkbook();
  return getWorkbookRuntimeStatus();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableSheetsError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code?: number | string }).code)
      : null;
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504;
}

async function batchGetSheetValues() {
  const sheets = await getSheetsClient();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: GOOGLE_SHEET_ID,
        ranges: SHEETS.map((meta) => `'${meta.sheetName}'`),
        majorDimension: "ROWS",
        valueRenderOption: "FORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });

      return response.data.valueRanges ?? [];
    } catch (error) {
      lastError = error;
      if (!isRetryableSheetsError(error) || attempt === 2) {
        throw error;
      }
      await sleep(400 * (attempt + 1));
    }
  }

  throw lastError;
}

function parseComparable(value: Primitive) {
  if (value === null || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const asNumber = Number(String(value).replaceAll(",", "").replaceAll("₫", "").trim());
  if (!Number.isNaN(asNumber) && String(value).trim() !== "") return asNumber;
  const asDate = Date.parse(String(value));
  if (!Number.isNaN(asDate) && String(value).includes("-")) return asDate;
  return String(value).toLowerCase();
}

function formatDateLike(value: Primitive) {
  if (value === null || value === "") return "";
  if (typeof value === "number") return String(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${day}/${month}/${year}`;
  }
  return text;
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
  if (type === "date") return formatDateLike(value);
  return DISPLAY_MAP[String(value)] ?? String(value);
}

async function readWorkbook(): Promise<WorkbookDataset> {
  const now = Date.now();
  if (workbookCache && workbookCache.expiresAt > now) {
    return workbookCache.dataset;
  }

  if (workbookInFlightPromise) {
    return workbookInFlightPromise;
  }

  workbookInFlightPromise = (async () => {
    const dataset: WorkbookDataset = {};
    const ranges = await batchGetSheetValues();

    for (const [index, meta] of SHEETS.entries()) {
      const values = ranges[index]?.values ?? [];
      if (values.length === 0) continue;

      const headers = (values[0] ?? [])
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      if (headers.length === 0) continue;

      const rows: RowRecord[] = [];
      for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
        const row = values[rowIndex] ?? [];
        const record: RowRecord = {};
        let hasValue = false;
        headers.forEach((header, cellIndex) => {
          const cellValue = normalizeCellValue(header, row[cellIndex]);
          record[header] = cellValue;
          if (cellValue !== null && cellValue !== "") hasValue = true;
        });
        if (hasValue) rows.push(record);
      }

      const columns: SheetColumn[] =
        meta.columns ??
        headers.map((header) => ({
          key: header,
          label: normalizeLabel(header),
          type: inferColumnType(
            header,
            rows.map((row) => row[header] ?? null),
          ),
          editable: header !== meta.idField,
          required: header === meta.primaryField,
          filterable: header !== meta.idField,
          prominent:
            header === meta.primaryField ||
            header === "trang_thai" ||
            header === "muc_uu_tien" ||
            header === "ngay_den_han" ||
            header === "han_xu_ly",
        }));

      dataset[meta.slug] = {
        meta: {
          ...meta,
          allowCreate: meta.allowCreate ?? true,
          allowDelete: meta.allowDelete ?? true,
          columns,
        },
        rows,
      };
    }

    workbookCache = {
      dataset,
      expiresAt: Date.now() + WORKBOOK_CACHE_TTL_MS,
      staleUntil: Date.now() + WORKBOOK_STALE_TTL_MS,
    };
    workbookRuntimeStatus = {
      source: "fresh",
      lastSuccessfulSyncAt: Date.now(),
      lastErrorAt: null,
      lastErrorMessage: null,
    };
    workbookInFlightPromise = null;
    return dataset;
  })();

  try {
    return await workbookInFlightPromise;
  } catch (error) {
    workbookInFlightPromise = null;
    if (workbookCache && workbookCache.staleUntil > Date.now()) {
      workbookRuntimeStatus = {
        source: "stale",
        lastSuccessfulSyncAt: workbookRuntimeStatus.lastSuccessfulSyncAt,
        lastErrorAt: Date.now(),
        lastErrorMessage: error instanceof Error ? error.message : "Không thể đồng bộ dữ liệu từ Google Sheets.",
      };
      return workbookCache.dataset;
    }
    workbookRuntimeStatus = {
      source: "empty",
      lastSuccessfulSyncAt: workbookRuntimeStatus.lastSuccessfulSyncAt,
      lastErrorAt: Date.now(),
      lastErrorMessage: error instanceof Error ? error.message : "Không thể đồng bộ dữ liệu từ Google Sheets.",
    };
    throw error;
  }
}

function buildOptions(rows: RowRecord[], columns: SheetColumn[]) {
  const result: Record<string, string[]> = {};
  for (const column of columns.filter((item) => item.filterable)) {
    const unique = Array.from(
      new Set(
        rows
          .map((row) => row[column.key])
          .filter((value): value is string | number | boolean => value !== null && value !== "")
          .map((value) => String(value)),
      ),
    ).slice(0, 20);
    if (unique.length > 0 && unique.length <= 20) {
      result[column.key] = unique;
    }
  }
  return result;
}

function matchesFilters(row: RowRecord, filters: Record<string, string>) {
  return Object.entries(filters).every(([key, expected]) => {
    if (!expected) return true;
    return String(row[key] ?? "").toLowerCase() === expected.toLowerCase();
  });
}

function buildLookup(rows: RowRecord[], idField: string, labelField: string) {
  return Object.fromEntries(rows.map((row) => [String(row[idField] ?? ""), String(row[labelField] ?? "")]));
}

function decorateProjectRow(
  row: RowRecord,
  lookups: {
    users: Record<string, string>;
    clients: Record<string, string>;
    services: Record<string, string>;
  },
): RowRecord {
  return {
    ...row,
    pm_name: lookups.users[String(row.pm_id ?? "")] ?? row.pm_id,
    thiet_ke_chinh_name: lookups.users[String(row.thiet_ke_chinh_id ?? "")] ?? row.thiet_ke_chinh_id,
    chi_huy_name: lookups.users[String(row.chi_huy_cong_trinh_id ?? "")] ?? row.chi_huy_cong_trinh_id,
    client_name: lookups.clients[String(row.client_id ?? "")] ?? row.client_id,
    service_name: lookups.services[String(row.service_id ?? "")] ?? row.service_id,
  };
}

function decorateTaskRow(
  row: RowRecord,
  lookups: {
    users: Record<string, string>;
    projects: Record<string, string>;
  },
): RowRecord {
  return {
    ...row,
    nguoi_phu_trach_name: lookups.users[String(row.nguoi_phu_trach_id ?? "")] ?? row.nguoi_phu_trach_id,
    ten_du_an: lookups.projects[String(row.project_id ?? "")] ?? row.project_id,
  };
}

function decorateNoteRow(
  row: RowRecord,
  lookups: {
    users: Record<string, string>;
    projects: Record<string, string>;
  },
): RowRecord {
  return {
    ...row,
    nguoi_cap_nhat_name: lookups.users[String(row.nguoi_cap_nhat_id ?? "")] ?? row.nguoi_cap_nhat_id,
    ten_du_an: lookups.projects[String(row.project_id ?? "")] ?? row.project_id,
  };
}

function decorateMaterialRow(
  row: RowRecord,
  lookups: {
    projects: Record<string, string>;
  },
): RowRecord {
  return {
    ...row,
    ten_du_an: lookups.projects[String(row.project_id ?? "")] ?? row.project_id,
  };
}

function decoratePaymentRow(
  row: RowRecord,
  lookups: {
    projects: Record<string, string>;
  },
): RowRecord {
  return {
    ...row,
    ten_du_an: lookups.projects[String(row.project_id ?? "")] ?? row.project_id,
  };
}

function decorateProjectLinkedRow(
  row: RowRecord,
  lookups: {
    projects: Record<string, string>;
    users?: Record<string, string>;
  },
): RowRecord {
  return {
    ...row,
    ten_du_an: lookups.projects[String(row.project_id ?? "")] ?? row.project_id,
    nguoi_phu_trach_name: lookups.users
      ? lookups.users[String(row.nguoi_phu_trach_id ?? "")] ?? row.nguoi_phu_trach_id
      : row.nguoi_phu_trach_id,
  };
}

function decorateRowsForSheet(dataset: WorkbookDataset, slug: string, rows: RowRecord[]) {
  if (rows.length === 0) return rows;

  const users = dataset["nhan-su"]?.rows ?? [];
  const clients = dataset["khach-hang"]?.rows ?? [];
  const services = dataset["goi-dich-vu"]?.rows ?? [];
  const projects = dataset["du-an"]?.rows ?? [];

  const lookups = {
    users: buildLookup(users, "user_id", "ho_ten"),
    clients: buildLookup(clients, "client_id", "ten_khach_hang"),
    services: buildLookup(services, "service_id", "ten_goi_dich_vu"),
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  if (slug === "du-an") {
    return rows.map((row) => decorateProjectRow(row, lookups));
  }
  if (slug === "cong-viec") {
    return rows.map((row) => decorateTaskRow(row, lookups));
  }
  if (slug === "vat-tu-mua-hang") {
    return rows.map((row) => decorateMaterialRow(row, lookups));
  }
  if (slug === "ghi-chu-dieu-hanh") {
    return rows.map((row) => decorateNoteRow(row, lookups));
  }
  if (slug === "thanh-toan-hoa-don") {
    return rows.map((row) => decoratePaymentRow(row, lookups));
  }
  if (slug === "chi-phi" || slug === "hang-muc-khong-gian" || slug === "tien-do-giai-doan") {
    return rows.map((row) => decorateProjectLinkedRow(row, lookups));
  }
  return rows;
}

function buildProjectActions(input: {
  project: RowRecord;
  overdueTaskCount: number;
  delayedMaterialCount: number;
  overduePaymentCount: number;
}) {
  const actions: string[] = [];

  if (input.project.canh_bao_chinh) {
    actions.push(`Xử lý cảnh báo chính: ${String(input.project.canh_bao_chinh)}`);
  }
  if (String(input.project.hang_muc_dang_tac ?? "") && String(input.project.hang_muc_dang_tac ?? "") !== "Không có") {
    actions.push(`Gỡ hạng mục đang tắc: ${String(input.project.hang_muc_dang_tac)}`);
  }
  if (input.delayedMaterialCount > 0) {
    actions.push(`Rà ${input.delayedMaterialCount} vật tư có nguy cơ giao chậm`);
  }
  if (input.overdueTaskCount > 0) {
    actions.push(`Chốt ${input.overdueTaskCount} công việc quá hạn hoặc chưa hoàn thành`);
  }
  if (input.overduePaymentCount > 0) {
    actions.push(`Bám ${input.overduePaymentCount} đợt thanh toán đang quá hạn`);
  }
  if (Number(input.project.cong_no_khach_hang ?? 0) > 0) {
    actions.push("Theo dõi công nợ khách hàng và xác nhận lịch thanh toán");
  }

  return actions.slice(0, 4);
}

export async function listSheets() {
  const dataset = await readWorkbook();
  return Object.values(dataset).map(({ meta, rows }) => ({
    slug: meta.slug,
    label: meta.label,
    description: meta.description,
    count: rows.length,
  }));
}

export async function getSheetMeta(slug: string) {
  const dataset = await readWorkbook();
  const sheet = dataset[slug];
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet ${slug}`);
  }
  return sheet.meta;
}

export async function querySheet(slug: string, input: QueryInput = {}): Promise<QueryResult> {
  const dataset = await readWorkbook();
  const sheet = dataset[slug];
  if (!sheet) throw new Error(`Không tìm thấy sheet ${slug}`);

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, input.pageSize ?? 20));
  const search = input.search?.trim().toLowerCase() ?? "";
  const filters = input.filters ?? {};

  const decoratedRows = decorateRowsForSheet(dataset, slug, sheet.rows);
  let rows = decoratedRows.filter((row) => matchesFilters(row, filters));

  if (search) {
    rows = rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search)),
    );
  }

  const sortBy = input.sortBy || sheet.meta.primaryField;
  const sortDir = input.sortDir || "asc";

  rows = [...rows].sort((left, right) => {
    const leftValue = parseComparable(left[sortBy] ?? null);
    const rightValue = parseComparable(right[sortBy] ?? null);
    if (leftValue === rightValue) return 0;
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    if (leftValue > rightValue) return sortDir === "asc" ? 1 : -1;
    return sortDir === "asc" ? -1 : 1;
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  return {
    meta: sheet.meta,
    items,
    total,
    page: safePage,
    pageSize,
    pageCount,
    options: buildOptions(decoratedRows, sheet.meta.columns),
  };
}

export async function getSheetRow(slug: string, id: string) {
  const dataset = await readWorkbook();
  const sheet = dataset[slug];
  if (!sheet) throw new Error(`Không tìm thấy sheet ${slug}`);
  return (
    sheet.rows.find((row) => String(row[sheet.meta.idField] ?? "") === id) ?? null
  );
}

function nextGeneratedId(rows: RowRecord[], idField: string) {
  const existing = rows
    .map((row) => String(row[idField] ?? ""))
    .filter(Boolean)
    .map((value) => {
      const match = value.match(/^(.*?)-(\d+)$/);
      if (!match) return null;
      return {
        prefix: match[1],
        number: Number(match[2]),
        pad: match[2].length,
      };
    })
    .filter((item): item is { prefix: string; number: number; pad: number } => item !== null);

  if (existing.length === 0) return `ROW-${Date.now()}`;
  const { prefix, pad } = existing[0];
  const max = Math.max(...existing.map((item) => item.number));
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
}

function normalizeStringValue(value: Primitive) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizePhoneValue(value: Primitive) {
  return normalizeStringValue(value).replace(/\D+/g, "");
}

function normalizeEmailValue(value: Primitive) {
  return normalizeStringValue(value).toLowerCase();
}

function normalizePayloadValue(value: Primitive) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function validateCustomerRow(rows: RowRecord[], record: RowRecord, currentId?: string) {
  const name = normalizeStringValue(record.ten_khach_hang);
  const phone = normalizePhoneValue(record.so_dien_thoai);
  const email = normalizeEmailValue(record.email);

  if (!name) {
    throw new Error("Tên khách hàng là bắt buộc.");
  }

  if (phone && (phone.length < 9 || phone.length > 11)) {
    throw new Error("Số điện thoại không hợp lệ. Hãy nhập 9-11 chữ số.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email không đúng định dạng.");
  }

  const duplicate = rows.find((row) => {
    if (currentId && String(row.client_id ?? "") === currentId) return false;

    const rowName = normalizeStringValue(row.ten_khach_hang);
    const rowPhone = normalizePhoneValue(row.so_dien_thoai);
    const rowEmail = normalizeEmailValue(row.email);

    return (
      (name && rowName && rowName === name) ||
      (phone && rowPhone && rowPhone === phone) ||
      (email && rowEmail && rowEmail === email)
    );
  });

  if (!duplicate) return;

  if (phone && normalizePhoneValue(duplicate.so_dien_thoai) === phone) {
    throw new Error("Số điện thoại này đã tồn tại ở một khách hàng khác.");
  }

  if (email && normalizeEmailValue(duplicate.email) === email) {
    throw new Error("Email này đã tồn tại ở một khách hàng khác.");
  }

  throw new Error("Tên khách hàng này đã tồn tại. Hãy kiểm tra lại để tránh tạo trùng.");
}

function validateRowBeforeWrite(slug: string, rows: RowRecord[], record: RowRecord, currentId?: string) {
  if (slug === "khach-hang") {
    validateCustomerRow(rows, record, currentId);
  }
}

async function writeSheet(slug: string, rows: RowRecord[]) {
  const meta = SHEET_MAP.get(slug);
  if (!meta) throw new Error(`Không tìm thấy sheet ${slug}`);

  writeQueue = writeQueue.then(async () => {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `'${meta.sheetName}'!1:1`,
      majorDimension: "ROWS",
      valueRenderOption: "FORMATTED_VALUE",
    });

    const headers = (response.data.values?.[0] ?? [])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    if (headers.length === 0) {
      throw new Error(`Không tìm thấy header của sheet ${meta.sheetName}`);
    }

    const values = [
      headers,
      ...rows.map((row) =>
        headers.map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          return typeof value === "boolean" || typeof value === "number" ? value : String(value);
        }),
      ),
    ];

    await sheets.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `'${meta.sheetName}'`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `'${meta.sheetName}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        majorDimension: "ROWS",
        values,
      },
    });

    clearWorkbookCache();
  });

  await writeQueue;
}

export async function createRow(slug: string, payload: RowRecord) {
  const dataset = await readWorkbook();
  const sheet = dataset[slug];
  if (!sheet) throw new Error(`Không tìm thấy sheet ${slug}`);
  if (!sheet.meta.allowCreate) throw new Error(`Sheet ${sheet.meta.label} không cho phép thêm mới`);

  const parsed = writeSchema.parse(payload);
  const nextId = nextGeneratedId(sheet.rows, sheet.meta.idField);
  const record: RowRecord = {};

  for (const column of sheet.meta.columns) {
    if (column.key === sheet.meta.idField) {
      record[column.key] = nextId;
      continue;
    }
    record[column.key] = normalizePayloadValue(parsed[column.key] ?? null);
  }

  validateRowBeforeWrite(slug, sheet.rows, record);

  await writeSheet(slug, [...sheet.rows, record]);
  return record;
}

export async function updateRow(slug: string, id: string, payload: RowRecord) {
  const dataset = await readWorkbook();
  const sheet = dataset[slug];
  if (!sheet) throw new Error(`Không tìm thấy sheet ${slug}`);

  const parsed = writeSchema.parse(payload);
  let updated: RowRecord | null = null;

  const rows = sheet.rows.map((row) => {
    if (String(row[sheet.meta.idField] ?? "") !== id) return row;
    updated = {
      ...row,
      ...Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizePayloadValue(value)])),
      [sheet.meta.idField]: row[sheet.meta.idField],
    };
    return updated;
  });

  if (!updated) throw new Error(`Không tìm thấy bản ghi ${id}`);
  validateRowBeforeWrite(slug, sheet.rows, updated, id);
  await writeSheet(slug, rows);
  return updated;
}

export async function deleteRow(slug: string, id: string) {
  const dataset = await readWorkbook();
  const sheet = dataset[slug];
  if (!sheet) throw new Error(`Không tìm thấy sheet ${slug}`);
  if (!sheet.meta.allowDelete) throw new Error(`Sheet ${sheet.meta.label} không cho phép xóa`);

  const rows = sheet.rows.filter((row) => String(row[sheet.meta.idField] ?? "") !== id);
  if (rows.length === sheet.rows.length) throw new Error(`Không tìm thấy bản ghi ${id}`);
  await writeSheet(slug, rows);
}

export async function getDashboardData() {
  const dataset = await readWorkbook();
  const projects = dataset["du-an"]?.rows ?? [];
  const payments = dataset["thanh-toan-hoa-don"]?.rows ?? [];
  const tasks = dataset["cong-viec"]?.rows ?? [];
  const materials = dataset["vat-tu-mua-hang"]?.rows ?? [];
  const notes = dataset["ghi-chu-dieu-hanh"]?.rows ?? [];
  const users = dataset["nhan-su"]?.rows ?? [];
  const clients = dataset["khach-hang"]?.rows ?? [];
  const services = dataset["goi-dich-vu"]?.rows ?? [];

  const lookups = {
    users: buildLookup(users, "user_id", "ho_ten"),
    clients: buildLookup(clients, "client_id", "ten_khach_hang"),
    services: buildLookup(services, "service_id", "ten_goi_dich_vu"),
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter((project) =>
    ["construction", "handover"].includes(String(project.trang_thai ?? "")),
  ).length;
  const pendingDesign = projects.filter((project) =>
    ["Chờ khách duyệt vật liệu", "Chờ chốt thiết bị bếp", "Chậm duyệt vật liệu"].includes(
      String(project.ly_do_tac ?? project.canh_bao_chinh ?? ""),
    ),
  ).length;
  const receivable = projects.reduce((sum, row) => sum + Number(row.cong_no_khach_hang ?? 0), 0);
  const payable = projects.reduce((sum, row) => sum + Number(row.cong_no_nha_cung_cap ?? 0), 0);
  const waitingMaterials = materials.filter((row) => String(row.hang_ve_cham ?? "") === "Có").length;
  const overduePayments = payments.filter((row) => String(row.trang_thai ?? "") === "Quá hạn").length;

  const urgentProjects = [...projects]
    .filter((project) => project.canh_bao_chinh || project.ly_do_tac)
    .sort((a, b) => Number(b.tien_do_tong_phan_tram ?? 0) - Number(a.tien_do_tong_phan_tram ?? 0))
    .slice(0, 5)
    .map((row) => decorateProjectRow(row, lookups));

  const overdueTasks = [...tasks]
    .filter((task) => String(task.trang_thai ?? "") !== "Hoàn thành")
    .sort((a, b) => String(a.han_xu_ly ?? "").localeCompare(String(b.han_xu_ly ?? "")))
    .slice(0, 6)
    .map((task) => decorateTaskRow(task, lookups));

  const recentNotes = [...notes]
    .sort((a, b) => String(b.ngay_cap_nhat ?? "").localeCompare(String(a.ngay_cap_nhat ?? "")))
    .slice(0, 5);

  const delayedMaterials = [...materials]
    .filter((row) => String(row.hang_ve_cham ?? "") === "Có")
    .sort((a, b) => String(a.ngay_can_hang ?? "").localeCompare(String(b.ngay_can_hang ?? "")))
    .slice(0, 5);

  const overduePaymentList = [...payments]
    .filter((row) => String(row.trang_thai ?? "") === "Quá hạn")
    .sort((a, b) => Number(b.so_tien ?? 0) - Number(a.so_tien ?? 0))
    .slice(0, 5)
    .map((row) => decoratePaymentRow(row, lookups));

  const taskByOwner = Array.from(
    overdueTasks.reduce((map, task) => {
      const key = String(task.nguoi_phu_trach_name ?? task.nguoi_phu_trach_id ?? "Chưa phân công");
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const noteSignalChart = [
    {
      label: "Tín hiệu đỏ",
      value: notes.filter((row) => String(row.den_tin_hieu ?? "").toLowerCase().includes("đỏ")).length,
    },
    {
      label: "Tín hiệu vàng",
      value: notes.filter((row) => String(row.den_tin_hieu ?? "").toLowerCase().includes("vàng")).length,
    },
    {
      label: "Tín hiệu xanh",
      value: notes.filter((row) => String(row.den_tin_hieu ?? "").toLowerCase().includes("xanh")).length,
    },
  ];

  const blockedProjects = projects.filter((project) => String(project.hang_muc_dang_tac ?? "") !== "Không có");
  const highDebtProjects = [...projects]
    .sort((a, b) => Number(b.cong_no_khach_hang ?? 0) - Number(a.cong_no_khach_hang ?? 0))
    .slice(0, 5)
    .map((row) => decorateProjectRow(row, lookups));

  const todayPlan = [
    {
      label: "Gỡ dự án đang tắc",
      value: blockedProjects.length,
      href: "/du-an",
      note: "Ưu tiên dự án có hạng mục đang tắc hoặc chờ duyệt vật tư.",
    },
    {
      label: "Chốt task quá hạn",
      value: overdueTasks.length,
      href: "/cong-viec",
      note: "Xem người phụ trách và đẩy việc ngay trong workbench công việc.",
    },
    {
      label: "Bám thu công nợ",
      value: overduePayments,
      href: "/thanh-toan",
      note: "Tập trung phiếu đến hạn, quá hạn và các khoản phải nhắc khách.",
    },
  ];

  return {
    stats: [
      { label: "Tổng dự án", value: totalProjects, tone: "neutral" },
      { label: "Đang thi công", value: activeProjects, tone: "primary" },
      { label: "Chờ chốt thiết kế/vật tư", value: pendingDesign, tone: "warning" },
      { label: "Công nợ khách", value: receivable, tone: "neutral", type: "currency" },
      { label: "Công nợ NCC", value: payable, tone: "neutral", type: "currency" },
      { label: "Chờ vật tư", value: waitingMaterials, tone: "warning" },
      { label: "Phiếu quá hạn", value: overduePayments, tone: "danger" },
    ],
    urgentProjects,
    overdueTasks,
    recentNotes,
    delayedMaterials,
    overduePaymentList,
    focusLanes: [
      {
        label: "Dự án đang tắc",
        value: blockedProjects.length,
        href: "/du-an",
        note: "Ưu tiên các dự án có hạng mục đang tắc hoặc cảnh báo đỏ.",
      },
      {
        label: "Task chưa xong",
        value: tasks.filter((task) => String(task.trang_thai ?? "") !== "Hoàn thành").length,
        href: "/cong-viec",
        note: "Mở workbench công việc để giao việc và xử lý vướng mắc.",
      },
      {
        label: "Vật tư giao chậm",
        value: waitingMaterials,
        href: "/vat-tu",
        note: "Rà lead time và nhà cung cấp có hàng về chậm.",
      },
      {
        label: "Phiếu thu quá hạn",
        value: overduePayments,
        href: "/thanh-toan",
        note: "Tập trung bám công nợ và đợt thanh toán bị trễ.",
      },
    ],
    highDebtProjects,
    todayPlan,
    charts: {
      design: projects.filter((item) => Number(item.tien_do_tong_phan_tram ?? 0) >= 80).length,
      construction: activeProjects,
      completed: projects.filter((item) => String(item.trang_thai ?? "") === "completed").length,
      projectStatus: [
        { label: "Đang thi công", value: activeProjects, tone: "primary" },
        { label: "Chờ chốt", value: pendingDesign, tone: "warning" },
        {
          label: "Có cảnh báo",
          value: projects.filter((row) => Boolean(row.canh_bao_chinh)).length,
          tone: "danger",
        },
        {
          label: "Hoàn thành",
          value: projects.filter((item) => String(item.trang_thai ?? "") === "completed").length,
          tone: "success",
        },
      ],
      cashflow: [
        { label: "Phải thu khách hàng", value: receivable, tone: "primary" },
        { label: "Phải trả nhà cung cấp", value: payable, tone: "warning" },
        {
          label: "Quá hạn cần bám",
          value: overduePaymentList.reduce((sum, row) => sum + Number(row.so_tien ?? 0), 0),
          tone: "danger",
        },
      ],
      taskByOwner,
      noteSignalChart,
    },
  };
}

export async function getProjectsWorkbenchData() {
  const dataset = await readWorkbook();
  const projectsSheet = dataset["du-an"];
  if (!projectsSheet) throw new Error("Không tìm thấy sheet dự án");
  const users = dataset["nhan-su"]?.rows ?? [];
  const clients = dataset["khach-hang"]?.rows ?? [];
  const services = dataset["goi-dich-vu"]?.rows ?? [];

  const rows = projectsSheet.rows;
  const initial = await querySheet("du-an", {
    pageSize: 20,
    sortBy: "cap_nhat_gan_nhat",
    sortDir: "desc",
  });

  const lookups = {
    users: buildLookup(users, "user_id", "ho_ten"),
    clients: buildLookup(clients, "client_id", "ten_khach_hang"),
    services: buildLookup(services, "service_id", "ten_goi_dich_vu"),
  };

  return {
    initial: {
      ...initial,
      items: initial.items.map((row) => decorateProjectRow(row, lookups)),
    },
    summary: {
      total: rows.length,
      construction: rows.filter((row) => String(row.trang_thai ?? "") === "construction").length,
      blocked: rows.filter((row) => String(row.hang_muc_dang_tac ?? "") !== "Không có").length,
      highDebt: rows.filter((row) => Number(row.cong_no_khach_hang ?? 0) >= 150_000_000).length,
      handoverSoon: rows.filter((row) => {
        const date = Date.parse(String(row.ngay_ban_giao_du_kien ?? ""));
        if (Number.isNaN(date)) return false;
        const diff = (date - Date.now()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 21;
      }).length,
      warning: rows.filter((row) => Boolean(row.canh_bao_chinh)).length,
      topProjects: [...rows]
        .sort((a, b) => Number(b.cong_no_khach_hang ?? 0) - Number(a.cong_no_khach_hang ?? 0))
        .slice(0, 4)
        .map((row) => decorateProjectRow(row, lookups)),
    },
    lookups,
  };
}

export async function getTasksWorkbenchData() {
  const dataset = await readWorkbook();
  const tasksSheet = dataset["cong-viec"];
  if (!tasksSheet) throw new Error("Không tìm thấy sheet công việc");

  const users = dataset["nhan-su"]?.rows ?? [];
  const projects = dataset["du-an"]?.rows ?? [];
  const lookups = {
    users: buildLookup(users, "user_id", "ho_ten"),
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  const initial = await querySheet("cong-viec", {
    pageSize: 20,
    sortBy: "han_xu_ly",
    sortDir: "asc",
  });

  const rows = tasksSheet.rows.map((row) => decorateTaskRow(row, lookups));
  const unfinishedRows = rows.filter((row) => String(row.trang_thai ?? "") !== "Hoàn thành");
  const today = new Date();

  return {
    initial,
    summary: {
      total: rows.length,
      unfinished: unfinishedRows.length,
      overdue: unfinishedRows.filter((row) => {
        const date = Date.parse(String(row.han_xu_ly ?? ""));
        return !Number.isNaN(date) && date < today.getTime();
      }).length,
      blocked: unfinishedRows.filter((row) => Boolean(row.vuong_mac)).length,
      unassigned: unfinishedRows.filter((row) => !row.nguoi_phu_trach_id).length,
      external: unfinishedRows.filter((row) => String(row.phat_sinh_ngoai_hop_dong ?? "") === "Có").length,
      topOwners: users
        .map((user) => {
          const count = unfinishedRows.filter((row) => row.nguoi_phu_trach_id === user.user_id).length;
          return { user_id: user.user_id, ho_ten: user.ho_ten, count };
        })
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    },
    lookups,
  };
}

export async function getMaterialsWorkbenchData() {
  const dataset = await readWorkbook();
  const materialsSheet = dataset["vat-tu-mua-hang"];
  if (!materialsSheet) throw new Error("Không tìm thấy sheet vật tư");

  const projects = dataset["du-an"]?.rows ?? [];
  const lookups = {
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  const initial = await querySheet("vat-tu-mua-hang", {
    pageSize: 20,
    sortBy: "ngay_can_hang",
    sortDir: "asc",
  });

  const rows = materialsSheet.rows.map((row) => decorateMaterialRow(row, lookups));
  const today = new Date();

  return {
    initial,
    summary: {
      total: rows.length,
      delayed: rows.filter((row) => String(row.hang_ve_cham ?? "") === "Có").length,
      waitingOrder: rows.filter((row) =>
        ["Chờ duyệt", "Chờ đặt hàng", "Chưa đặt"].includes(String(row.trang_thai_mua_hang ?? "")),
      ).length,
      needSoon: rows.filter((row) => {
        const date = Date.parse(String(row.ngay_can_hang ?? ""));
        if (Number.isNaN(date)) return false;
        const diff = (date - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }).length,
      riskSuppliers: Array.from(
        rows.reduce((map, row) => {
          if (String(row.hang_ve_cham ?? "") !== "Có") return map;
          const key = String(row.nha_cung_cap ?? "Chưa có NCC");
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    },
    lookups,
  };
}

export async function getPaymentsWorkbenchData() {
  const dataset = await readWorkbook();
  const paymentsSheet = dataset["thanh-toan-hoa-don"];
  if (!paymentsSheet) throw new Error("Không tìm thấy sheet thanh toán");

  const projects = dataset["du-an"]?.rows ?? [];
  const lookups = {
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  const initial = await querySheet("thanh-toan-hoa-don", {
    pageSize: 20,
    sortBy: "ngay_den_han",
    sortDir: "asc",
  });

  const rows = paymentsSheet.rows.map((row) => decoratePaymentRow(row, lookups));
  const today = new Date();

  return {
    initial,
    summary: {
      total: rows.length,
      overdue: rows.filter((row) => String(row.trang_thai ?? "") === "Quá hạn").length,
      dueSoon: rows.filter((row) => {
        const date = Date.parse(String(row.ngay_den_han ?? ""));
        if (Number.isNaN(date)) return false;
        const diff = (date - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }).length,
      receivable: rows
        .filter((row) => String(row.loai ?? "") === "Thu khách hàng")
        .reduce((sum, row) => sum + Number(row.so_tien ?? 0), 0),
      payable: rows
        .filter((row) => String(row.loai ?? "") !== "Thu khách hàng")
        .reduce((sum, row) => sum + Number(row.so_tien ?? 0), 0),
      topRiskProjects: Array.from(
        rows.reduce((map, row) => {
          if (String(row.trang_thai ?? "") !== "Quá hạn") return map;
          const key = String(row.ten_du_an ?? row.project_id ?? "Chưa rõ dự án");
          map.set(key, (map.get(key) ?? 0) + Number(row.so_tien ?? 0));
          return map;
        }, new Map<string, number>()),
      )
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4),
    },
    lookups,
  };
}

export async function getNotesWorkbenchData() {
  const dataset = await readWorkbook();
  const notesSheet = dataset["ghi-chu-dieu-hanh"];
  if (!notesSheet) throw new Error("Không tìm thấy sheet ghi chú điều hành");

  const users = dataset["nhan-su"]?.rows ?? [];
  const projects = dataset["du-an"]?.rows ?? [];
  const lookups = {
    users: buildLookup(users, "user_id", "ho_ten"),
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  const initial = await querySheet("ghi-chu-dieu-hanh", {
    pageSize: 20,
    sortBy: "ngay_cap_nhat",
    sortDir: "desc",
  });

  const rows = notesSheet.rows.map((row) => decorateNoteRow(row, lookups));

  return {
    initial,
    summary: {
      total: rows.length,
      red: rows.filter((row) => String(row.den_tin_hieu ?? "").toLowerCase().includes("đỏ")).length,
      yellow: rows.filter((row) => String(row.den_tin_hieu ?? "").toLowerCase().includes("vàng")).length,
      latest: rows
        .slice()
        .sort((a, b) => String(b.ngay_cap_nhat ?? "").localeCompare(String(a.ngay_cap_nhat ?? "")))
        .slice(0, 4),
      topUpdaters: users
        .map((user) => {
          const count = rows.filter((row) => row.nguoi_cap_nhat_id === user.user_id).length;
          return { user_id: user.user_id, ho_ten: user.ho_ten, count };
        })
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    },
    lookups,
  };
}

export async function getCostsWorkbenchData() {
  const initial = await querySheet("chi-phi", {
    pageSize: 20,
    sortBy: "ngay_chi",
    sortDir: "desc",
  });
  const dataset = await readWorkbook();
  const rows = decorateRowsForSheet(dataset, "chi-phi", dataset["chi-phi"]?.rows ?? []);

  return {
    initial,
    summary: {
      total: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + Number(row.so_tien ?? 0), 0),
      generated: rows.filter((row) => String(row.lien_quan_phat_sinh ?? "") === "Có").length,
      topCategories: Array.from(
        rows.reduce((map, row) => {
          const key = String(row.nhom_chi_phi ?? "Khác");
          map.set(key, (map.get(key) ?? 0) + Number(row.so_tien ?? 0));
          return map;
        }, new Map<string, number>()),
      )
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4),
    },
  };
}

export async function getSpacesWorkbenchData() {
  const initial = await querySheet("hang-muc-khong-gian", {
    pageSize: 20,
    sortBy: "ngay_can_chot_vat_tu",
    sortDir: "asc",
  });
  const dataset = await readWorkbook();
  const rows = decorateRowsForSheet(dataset, "hang-muc-khong-gian", dataset["hang-muc-khong-gian"]?.rows ?? []);

  return {
    initial,
    summary: {
      total: rows.length,
      designPending: rows.filter((row) => String(row.trang_thai_thiet_ke ?? "").includes("Chờ")).length,
      constructionPending: rows.filter((row) => String(row.trang_thai_thi_cong ?? "").includes("Chờ")).length,
      hasDefect: rows.filter((row) => String(row.ton_sau_nghiem_thu ?? "") && String(row.ton_sau_nghiem_thu ?? "") !== "Không").length,
      topProjects: Array.from(
        rows.reduce((map, row) => {
          const key = String(row.ten_du_an ?? row.project_id ?? "Chưa rõ dự án");
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    },
  };
}

export async function getStagesWorkbenchData() {
  const initial = await querySheet("tien-do-giai-doan", {
    pageSize: 20,
    sortBy: "ngay_ket_thuc_ke_hoach",
    sortDir: "asc",
  });
  const dataset = await readWorkbook();
  const rows = decorateRowsForSheet(dataset, "tien-do-giai-doan", dataset["tien-do-giai-doan"]?.rows ?? []);

  return {
    initial,
    summary: {
      total: rows.length,
      delayed: rows.filter((row) => String(row.cham_tien_do ?? "") === "Có").length,
      completed: rows.filter((row) => String(row.trang_thai ?? "") === "Hoàn thành").length,
      inProgress: rows.filter((row) => String(row.trang_thai ?? "").includes("Đang")).length,
      topOwners: Array.from(
        rows.reduce((map, row) => {
          const key = String(row.nguoi_phu_trach_name ?? row.nguoi_phu_trach_id ?? "Chưa phân công");
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    },
  };
}

export async function getProjectDetail(projectId: string) {
  const dataset = await readWorkbook();
  const project = dataset["du-an"]?.rows.find((row) => row.project_id === projectId);
  if (!project) return null;

  const users = dataset["nhan-su"]?.rows ?? [];
  const clients = dataset["khach-hang"]?.rows ?? [];
  const services = dataset["goi-dich-vu"]?.rows ?? [];
  const projects = dataset["du-an"]?.rows ?? [];
  const lookups = {
    users: buildLookup(users, "user_id", "ho_ten"),
    clients: buildLookup(clients, "client_id", "ten_khach_hang"),
    services: buildLookup(services, "service_id", "ten_goi_dich_vu"),
    projects: buildLookup(projects, "project_id", "ten_du_an"),
  };

  const rooms = dataset["hang-muc-khong-gian"]?.rows.filter((row) => row.project_id === projectId) ?? [];
  const stages =
    dataset["tien-do-giai-doan"]?.rows.filter((row) => row.project_id === projectId) ?? [];
  const tasks =
    dataset["cong-viec"]?.rows
      .filter((row) => row.project_id === projectId)
      .map((row) => decorateTaskRow(row, lookups)) ?? [];
  const materials =
    dataset["vat-tu-mua-hang"]?.rows.filter((row) => row.project_id === projectId) ?? [];
  const costs = dataset["chi-phi"]?.rows.filter((row) => row.project_id === projectId) ?? [];
  const payments =
    dataset["thanh-toan-hoa-don"]?.rows.filter((row) => row.project_id === projectId) ?? [];
  const notes =
    dataset["ghi-chu-dieu-hanh"]?.rows
      .filter((row) => row.project_id === projectId)
      .map((row) => decorateNoteRow(row, lookups)) ?? [];
  const acceptance =
    dataset["nghiem-thu-ban-giao"]?.rows.filter((row) => row.project_id === projectId) ?? [];

  const delayedMaterialCount = materials.filter((row) => String(row.hang_ve_cham ?? "") === "Có").length;
  const overdueTaskCount = tasks.filter((row) => String(row.trang_thai ?? "") !== "Hoàn thành").length;
  const overduePaymentCount = payments.filter((row) => String(row.trang_thai ?? "") === "Quá hạn").length;

  const decoratedProject = decorateProjectRow(project, lookups);

  return {
    project: decoratedProject,
    rooms,
    stages,
    tasks,
    materials,
    costs,
    payments,
    notes,
    acceptance,
    summary: {
      overdueTaskCount,
      delayedMaterialCount,
      overduePaymentCount,
      roomCount: rooms.length,
      stageCount: stages.length,
      noteCount: notes.length,
      nextActions: buildProjectActions({
        project: decoratedProject,
        overdueTaskCount,
        delayedMaterialCount,
        overduePaymentCount,
      }),
    },
  };
}
