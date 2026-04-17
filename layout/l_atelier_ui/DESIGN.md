# Tài liệu Hệ thống Thiết kế: Xưởng Chế Tác Kỹ Thuật Số (The Curated Atelier)

## 1. Tầm nhìn Sáng tạo (Creative North Star)
Hệ thống này được định hướng theo triết lý **"Xưởng Chế Tác Kỹ Thuật Số"**. Thay vì tạo ra một phần mềm quản lý khô khan, chúng ta tạo ra một không gian làm việc giống như một tạp chí nội thất cao cấp: tinh tế, có chiều sâu và đầy tính ý đồ.

Sự sang trọng không đến từ các hiệu ứng cầu kỳ, mà đến từ **sự chính xác trong khoảng trắng (white space)**, **phân tầng bằng tông màu (tonal layering)** thay vì đường kẻ, và **typography mang tính biên tập (editorial typography)**. Chúng ta phá bỏ cấu trúc lưới cứng nhắc để hướng tới một giao diện mềm mại, có nhịp điệu nhưng vẫn cực kỳ thực dụng cho dữ liệu dày đặc.

---

## 2. Hệ thống Màu sắc & Nguyên tắc "Không Đường Kẻ"
Chúng ta sử dụng bảng màu để định nghĩa không gian thay vì dùng các đường kẻ 1px truyền thống.

### Bảng màu chủ đạo (Primary & Neutrals)
- **Primary (`#a63500`):** Màu Cam Đất cao cấp. Đây là điểm chạm của năng lượng và sự chuyên nghiệp. Sử dụng cho các hành động quan trọng nhất (CTA) và các điểm nhấn nhận diện.
- **Surface Hierarchy (Phân tầng bề mặt):**
    - `surface-container-lowest` (`#ffffff`): Dùng cho các thẻ (cards) nổi bật nhất trên nền.
    - `surface` (`#f6fafe`): Nền tảng chính của ứng dụng.
    - `surface-container-low` (`#f0f4f8`): Dùng để phân chia các phân đoạn lớn mà không cần kẻ khung.
    - `surface-container-highest` (`#dfe3e7`): Dùng cho các thanh điều hướng hoặc vùng chứa dữ liệu phụ.

### Quy tắc "No-Line" (Không đường kẻ)
Tuyệt đối không sử dụng viền (border) 1px đặc để chia cắt các thành phần.
- **Thay thế:** Sử dụng sự chuyển dịch tông màu giữa các tầng `surface-container` để tạo ranh giới tự nhiên. Một khối `surface-container-lowest` đặt trên nền `surface-container-low` sẽ tự tạo ra chiều sâu mà không cần viền.

### Quy tắc "Kính & Chuyển sắc" (Glass & Gradient)
- **Glassmorphism:** Đối với các thành phần nổi như Modal, Drawer hoặc Popover, sử dụng màu nền bán trong suốt kết hợp với `backdrop-blur (20px)` để tạo cảm giác hiện đại và cao cấp.
- **Signature Gradient:** Sử dụng dải chuyển sắc nhẹ từ `primary` (`#a63500`) sang `primary_container` (`#c94b18`) cho các nút chính hoặc các thẻ KPI quan trọng để tăng độ "sâu" và cảm giác thủ công.

---

## 3. Hệ thống Typography
Chúng ta kết hợp hai phông chữ để cân bằng giữa tính thẩm mỹ và công năng.

- **Headline (Manrope):** Mang tính kiến trúc, hiện đại và rộng mở. Dùng cho các tiêu đề lớn, chỉ số KPI.
- **Body & Label (Inter):** Đảm bảo sự rõ ràng tuyệt đối cho tiếng Việt, đặc biệt là trong các bảng dữ liệu mật độ cao.

**Phân cấp thực thi:**
- **Display/Headline:** Viết hoa chữ cái đầu, khoảng cách dòng (leading) chặt chẽ (1.2) để tạo vẻ quyền uy.
- **Title/Body:** Ưu tiên hiển thị tiếng Việt tự nhiên. Khoảng cách dòng rộng hơn (1.5) để dữ liệu dày đặc không gây mỏi mắt.
- **Label:** Sử dụng `label-sm` (`11px`) cho các chú thích nhỏ, Badge, đảm bảo sự tinh gọn tối đa.

---

## 4. Chiều sâu & Sự phân tầng (Elevation)
Thay vì dùng hiệu ứng đổ bóng đen truyền thống, chúng ta sử dụng **Tonal Layering** (Lớp nền chồng lớp).

- **Nguyên tắc xếp chồng:** 
  - Nền ứng dụng: `surface`
  - Khu vực nội dung: `surface-container-low`
  - Thẻ chi tiết/Card: `surface-container-lowest` (Trắng tinh khiết)
- **Ambient Shadows:** Chỉ sử dụng bóng đổ cho các thành phần "bay" (Floating). Bóng đổ phải cực đại về độ nhòe (blur > 30px) và cực thấp về độ đậm (opacity 4-8%), sử dụng màu pha từ `on-surface` thay vì màu đen thuần.
- **Ghost Border:** Trong trường hợp bắt buộc phải có viền (như input field), sử dụng `outline-variant` với độ trong suốt 20%. Không bao giờ dùng viền đen hay xám đậm 100%.

---

## 5. Các thành phần (Components) Đặc thù

### Card KPI (Thẻ chỉ số)
- Không viền. Sử dụng nền `surface-container-lowest`.
- Tiêu đề dùng `label-md` màu `on-surface-variant`.
- Chỉ số chính dùng `display-sm` với phông Manrope, màu `primary`.

### Bảng dữ liệu mật độ cao (High-density Table)
- **Cấm tuyệt đối kẻ line ngang/dọc giữa các ô.**
- Phân tách hàng bằng cách thay đổi màu nền khi `hover` hoặc sử dụng dải màu xen kẽ cực nhẹ (`surface-container-low`).
- Header bảng dùng nền `surface-container-high` với chữ viết hoa nhẹ (Letter spacing +5%).

### Badge Trạng thái (Status Badges)
Thiết kế nhỏ gọn, bo góc `full` (pill shape).
- **Hoàn thành:** Chữ Xanh lá trên nền Xanh lá nhạt (Low opacity).
- **Quá hạn:** Chữ Đỏ trên nền Đỏ nhạt.
- **Chú ý:** Chữ Vàng/Hổ phách trên nền Vàng nhạt.
- **Chưa bắt đầu:** Chữ Xám trên nền `surface-container-highest`.

### Timeline & Drawer
- **Timeline:** Một đường kẻ mảnh 1px màu `outline-variant` (opacity 30%), các nút thắt sự kiện sử dụng màu `primary`.
- **Drawer:** Sử dụng hiệu ứng Glassmorphism. Trượt ra từ cạnh phải với độ mờ nền để người dùng vẫn thấy được bối cảnh dự án bên dưới.

---

## 6. Do's and Don'ts (Nên và Không nên)

### Nên (Do):
- **Ưu tiên khoảng trắng:** Để dữ liệu "thở". Khoảng cách giữa các khối nên là bội số của 8px.
- **Căn lề chuẩn xác:** Trong các bảng dữ liệu nội thất, căn lề số học bên phải, căn lề văn bản bên trái.
- **Tương tác mượt mà:** Sử dụng hiệu ứng chuyển cảnh (transition) nhẹ nhàng (200ms, ease-out) khi mở Drawer hoặc hover vào Card.

### Không nên (Don't):
- **Lạm dụng màu Cam:** Chỉ dùng `primary` cho những gì thực sự quan trọng. Quá nhiều màu cam sẽ làm mất đi sự sang trọng của "Enterprise UI".
- **Sử dụng Shadow cứng:** Các bóng đổ quá đậm sẽ làm giao diện trông rẻ tiền và lỗi thời.
- **Dùng icon đa sắc:** Chỉ sử dụng icon đơn sắc (Line icons) với độ mảnh đồng nhất để giữ tính tinh gọn.

---
*Ghi chú của Giám đốc Thiết kế: "Mục tiêu của chúng ta không phải là xây dựng một công cụ, mà là xây dựng một di sản số cho các nhà thiết kế nội thất. Hãy để giao diện lùi lại phía sau để tôn vinh dữ liệu và công trình của khách hàng."*