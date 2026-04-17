export type ModuleConfig = {
  href: string;
  sheetSlug?: string;
  title: string;
  description: string;
  detailPathField?: string;
  detailPathPrefix?: string;
  navLabel: string;
  group: "primary" | "secondary";
};

export const MODULES: ModuleConfig[] = [
  {
    href: "/",
    title: "Tổng quan điều hành",
    description: "Bảng điều hành trung tâm cho toàn bộ hoạt động dự án, công nợ, vật tư và vận hành.",
    navLabel: "Tổng quan",
    group: "primary",
  },
  {
    href: "/du-an",
    sheetSlug: "du-an",
    title: "Danh sách dự án",
    description: "Quản lý tiến độ, công nợ, cảnh báo và điều phối toàn bộ dự án. CRUD, lọc và sắp xếp ghi trực tiếp vào file Excel.",
    detailPathField: "project_id",
    detailPathPrefix: "/du-an",
    navLabel: "Dự án",
    group: "primary",
  },
  {
    href: "/giai-doan",
    sheetSlug: "tien-do-giai-doan",
    title: "Tiến độ giai đoạn",
    description: "Theo dõi phase, timeline, phần trăm hoàn thành, người phụ trách và cảnh báo chậm tiến độ.",
    navLabel: "Giai đoạn",
    group: "primary",
  },
  {
    href: "/cong-viec",
    sheetSlug: "cong-viec",
    title: "Điều phối công việc",
    description: "Theo dõi task, deadline, người phụ trách, vướng mắc và phát sinh ngoài hợp đồng.",
    navLabel: "Công việc",
    group: "primary",
  },
  {
    href: "/khong-gian",
    sheetSlug: "hang-muc-khong-gian",
    title: "Không gian và hạng mục",
    description: "Theo dõi từng phòng/khu vực, trạng thái thiết kế, thi công, ngày chốt vật tư và tồn sau nghiệm thu.",
    navLabel: "Không gian",
    group: "primary",
  },
  {
    href: "/vat-tu",
    sheetSlug: "vat-tu-mua-hang",
    title: "Vật tư và mua hàng",
    description: "Theo dõi lead time, trạng thái mua hàng, hàng về chậm và rủi ro nhà cung cấp.",
    navLabel: "Vật tư",
    group: "primary",
  },
  {
    href: "/chi-phi",
    sheetSlug: "chi-phi",
    title: "Chi phí",
    description: "Theo dõi chi phí thực tế, trạng thái duyệt chi, nhà cung cấp và các khoản phát sinh.",
    navLabel: "Chi phí",
    group: "primary",
  },
  {
    href: "/thanh-toan",
    sheetSlug: "thanh-toan-hoa-don",
    title: "Thanh toán và công nợ",
    description: "Rà soát các phiếu thu/chi, công nợ còn lại, quá hạn và nhắc xử lý.",
    navLabel: "Thanh toán",
    group: "primary",
  },
  {
    href: "/nghiem-thu",
    sheetSlug: "nghiem-thu-ban-giao",
    title: "Nghiệm thu và bàn giao",
    description: "Theo dõi các lần nghiệm thu, kết quả, tồn sau nghiệm thu và tiến độ xử lý tồn.",
    navLabel: "Nghiệm thu",
    group: "primary",
  },
  {
    href: "/ghi-chu",
    sheetSlug: "ghi-chu-dieu-hanh",
    title: "Ghi chú điều hành",
    description: "Nhật ký điều hành theo tín hiệu, vướng mắc chính và hành động tiếp theo.",
    navLabel: "Ghi chú",
    group: "primary",
  },
  {
    href: "/khach-hang",
    sheetSlug: "khach-hang",
    title: "Khách hàng",
    description: "Danh sách khách hàng, đầu mối liên hệ, địa chỉ, nguồn khách và trạng thái hợp tác.",
    navLabel: "Khách hàng",
    group: "secondary",
  },
  {
    href: "/nhan-su",
    sheetSlug: "nhan-su",
    title: "Nhân sự",
    description: "Danh sách nhân sự, bộ phận, vai trò, chi phí ngày và trạng thái làm việc.",
    navLabel: "Nhân sự",
    group: "secondary",
  },
  {
    href: "/goi-dich-vu",
    sheetSlug: "goi-dich-vu",
    title: "Gói dịch vụ",
    description: "Danh mục gói dịch vụ, đơn vị tính, đơn giá mặc định và trạng thái áp dụng.",
    navLabel: "Gói dịch vụ",
    group: "secondary",
  },
  {
    href: "/tong-quan-du-lieu",
    sheetSlug: "tong-quan",
    title: "Tổng quan dữ liệu",
    description: "Các chỉ số tổng hợp lấy trực tiếp từ sheet tổng quan trong workbook.",
    navLabel: "Tổng quan dữ liệu",
    group: "secondary",
  },
  {
    href: "/mo-ta-du-lieu",
    sheetSlug: "mo-ta",
    title: "Mô tả dữ liệu",
    description: "Bảng mô tả ý nghĩa các sheet và cách dùng dữ liệu trong hệ thống.",
    navLabel: "Mô tả dữ liệu",
    group: "secondary",
  },
];

export function getModuleByHref(href: string) {
  return MODULES.find((item) => item.href === href);
}

export function getModuleBySheet(slug: string) {
  return MODULES.find((item) => item.sheetSlug === slug);
}
