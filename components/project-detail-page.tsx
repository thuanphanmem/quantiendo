import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Package,
  ReceiptText,
  Users,
} from "lucide-react";

import { BarChart, ChartPanel, DonutChart } from "@/components/charts";
import { compactCurrency, toneForStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { displayText, formatValue, type Primitive } from "@/lib/workbook-client";

type ProjectDetail = NonNullable<Awaited<ReturnType<typeof import("@/lib/workbook").getProjectDetail>>>;

function badgeClass(value: Primitive) {
  const tone = toneForStatus(value);
  if (tone === "success") return "bg-success-soft text-success";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "danger") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-text";
}

export function ProjectDetailPage({ data }: { data: ProjectDetail }) {
  const { project, rooms, stages, tasks, materials, payments, notes, summary } = data;
  const overdueTasks = tasks.filter((task) => String(task.trang_thai ?? "") !== "Hoàn thành").slice(0, 5);
  const delayedMaterials = materials.filter((item) => String(item.hang_ve_cham ?? "") === "Có").slice(0, 5);
  const upcomingPayments = payments.slice(0, 5);

  return (
    <div className="space-y-6">
      <Link href="/du-an" className="btn-secondary w-fit">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách dự án
      </Link>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="panel p-7">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="badge bg-primary-soft text-primary">{project.ma_du_an}</span>
            <span className={cn("badge", badgeClass(project.trang_thai))}>{displayText(project.trang_thai)}</span>
            <span className={cn("badge", badgeClass(project.muc_uu_tien))}>{displayText(project.muc_uu_tien)}</span>
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">
            {project.ten_du_an}
          </h1>
          <div className="mt-3 text-base text-text-muted">
            {displayText(project.phong_cach)} · {displayText(project.loai_du_an)} · {project.dien_tich_m2} m2
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="panel-muted p-4">
              <div className="text-sm text-text-muted">PM</div>
              <div className="mt-1 font-semibold text-text">{project.pm_name}</div>
            </div>
            <div className="panel-muted p-4">
              <div className="text-sm text-text-muted">Thiết kế chính</div>
              <div className="mt-1 font-semibold text-text">{project.thiet_ke_chinh_name}</div>
            </div>
            <div className="panel-muted p-4">
              <div className="text-sm text-text-muted">Chỉ huy công trình</div>
              <div className="mt-1 font-semibold text-text">{project.chi_huy_name}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-primary-soft p-5">
              <div className="text-sm text-primary">Tiến độ tổng</div>
              <div className="mt-1 font-headline text-4xl font-extrabold text-primary">
                {project.tien_do_tong_phan_tram}%
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/80">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${project.tien_do_tong_phan_tram}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-surface-subtle p-5">
              <div className="text-sm text-text-muted">Cảnh báo chính</div>
              <div className="mt-1 text-lg font-semibold text-text">
                {displayText(project.canh_bao_chinh ?? "Đang kiểm soát ổn định")}
              </div>
              <div className="mt-2 text-sm text-text-muted">
                {displayText(project.ly_do_tac ?? "Chưa ghi nhận điểm nghẽn mới")}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Việc nên làm tiếp theo
              </div>
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3">
              {summary.nextActions.length > 0 ? (
                summary.nextActions.map((action) => (
                  <div key={action} className="rounded-2xl bg-surface-subtle p-4 text-sm text-text">
                    {action}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-surface-subtle p-4 text-sm text-text-muted">
                  Chưa có hành động khẩn. Có thể tiếp tục bám tiến độ chung của dự án.
                </div>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Tài chính
              </div>
              <CircleDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-text-muted">Giá trị hợp đồng</div>
                <div className="font-headline text-2xl font-extrabold">
                  {compactCurrency(project.gia_tri_hop_dong)}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Công nợ khách hàng</div>
                <div className="text-lg font-semibold text-danger">
                  {compactCurrency(project.cong_no_khach_hang)}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Công nợ nhà cung cấp</div>
                <div className="text-lg font-semibold text-text">{compactCurrency(project.cong_no_nha_cung_cap)}</div>
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Snapshot
              </div>
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Khởi công</span>
                <span className="font-medium text-text">{formatValue(project.ngay_khoi_cong, "date")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Bàn giao dự kiến</span>
                <span className="font-medium text-text">{formatValue(project.ngay_ban_giao_du_kien, "date")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Hạng mục đang tắc</span>
                <span className="font-medium text-danger">{displayText(project.hang_muc_dang_tac ?? "Không")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Khách hàng</span>
                <span className="font-medium text-text">{project.client_name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Gói dịch vụ</span>
                <span className="font-medium text-text">{project.service_name}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Công việc chưa xong", value: summary.overdueTaskCount, icon: ClipboardList },
          { label: "Vật tư rủi ro", value: summary.delayedMaterialCount, icon: Package },
          { label: "Phiếu quá hạn", value: summary.overduePaymentCount, icon: ReceiptText },
          { label: "Không gian theo dõi", value: summary.roomCount, icon: Users },
          { label: "Ghi chú điều hành", value: summary.noteCount, icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-text-muted">{item.label}</div>
                <div className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-text">
                  {item.value}
                </div>
              </div>
              <item.icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartPanel
          title="Cơ cấu điểm nghẽn"
          subtitle="Nhìn nhanh dự án đang tắc ở lớp nào để ưu tiên người xử lý."
        >
          <DonutChart
            centerLabel="Điểm nghẽn"
            centerValue={String(summary.overdueTaskCount + summary.delayedMaterialCount + summary.overduePaymentCount)}
            data={[
              { label: "Công việc mở", value: summary.overdueTaskCount, tone: "primary" },
              { label: "Vật tư rủi ro", value: summary.delayedMaterialCount, tone: "warning" },
              { label: "Phiếu quá hạn", value: summary.overduePaymentCount, tone: "danger" },
            ]}
          />
        </ChartPanel>

        <ChartPanel
          title="Mức độ theo dõi theo hạng mục"
          subtitle="So sánh nhanh các nhóm việc chính để biết trọng tâm điều hành của dự án."
        >
          <BarChart
            data={[
              { label: "Không gian", value: summary.roomCount, tone: "primary" },
              { label: "Giai đoạn", value: summary.stageCount, tone: "success" },
              { label: "Task mở", value: summary.overdueTaskCount, tone: "warning" },
              { label: "Ghi chú", value: summary.noteCount, tone: "neutral" },
            ]}
          />
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold tracking-tight">Timeline giai đoạn</h2>
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-4">
              {stages.map((stage) => (
                <div key={String(stage.stage_id)} className="rounded-2xl bg-surface-subtle p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-text">{stage.ten_giai_doan}</div>
                      <div className="text-sm text-text-muted">
                        {formatValue(stage.ngay_bat_dau_ke_hoach, "date")} →{" "}
                        {formatValue(stage.ngay_ket_thuc_ke_hoach, "date")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("badge", badgeClass(stage.trang_thai))}>{stage.trang_thai}</span>
                      <span className="badge bg-primary-soft text-primary">{stage.tien_do_phan_tram}%</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${stage.tien_do_phan_tram}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold tracking-tight">Không gian & hạng mục</h2>
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-subtle">
                  <tr>
                    <th className="table-head">Không gian</th>
                    <th className="table-head">Thiết kế</th>
                    <th className="table-head">Thi công</th>
                    <th className="table-head">Ngày cần chốt</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={String(room.room_id)} className="border-t border-border/70">
                      <td className="table-cell font-medium">{room.ten_khong_gian}</td>
                      <td className="table-cell">
                        <span className={cn("badge", badgeClass(room.trang_thai_thiet_ke))}>
                          {displayText(room.trang_thai_thiet_ke)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={cn("badge", badgeClass(room.trang_thai_thi_cong))}>
                          {displayText(room.trang_thai_thi_cong)}
                        </span>
                      </td>
                      <td className="table-cell">{formatValue(room.ngay_can_chot_vat_tu, "date")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold tracking-tight">Điểm nghẽn cần gỡ</h2>
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div className="space-y-3">
              {overdueTasks.map((task) => (
                <div key={String(task.task_id)} className="rounded-2xl bg-surface-subtle p-4">
                  <div className="font-medium text-text">{task.ten_cong_viec}</div>
                  <div className="mt-1 text-sm text-text-muted">{task.vuong_mac || "Chưa có ghi chú vướng mắc"}</div>
                  <div className="mt-2 text-sm text-text-muted">
                    Phụ trách: {displayText(task.nguoi_phu_trach_name ?? task.nguoi_phu_trach_id)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                    <span>{formatValue(task.han_xu_ly, "date")}</span>
                    <span className={cn("badge", badgeClass(task.trang_thai))}>{displayText(task.trang_thai)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold tracking-tight">Vật tư rủi ro</h2>
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-3">
              {delayedMaterials.map((item) => (
                <div key={String(item.item_id)} className="rounded-2xl bg-surface-subtle p-4">
                  <div className="font-medium text-text">{item.ten_vat_tu}</div>
                  <div className="mt-1 text-sm text-text-muted">
                    {item.nha_cung_cap} · cần {formatValue(item.ngay_can_hang, "date")}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                    <span>{displayText(item.trang_thai_mua_hang)}</span>
                    <span className="badge bg-warning-soft text-warning">{item.hang_ve_cham}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 font-headline text-2xl font-bold tracking-tight">Ghi chú điều hành</div>
            <div className="space-y-3">
              {notes.slice(0, 5).map((note) => (
                <div key={String(note.note_id)} className="rounded-2xl bg-surface-subtle p-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("badge", badgeClass(note.den_tin_hieu))}>{displayText(note.den_tin_hieu)}</span>
                    <span className="text-xs text-text-muted">{formatValue(note.ngay_cap_nhat, "date")}</span>
                  </div>
                  <div className="mt-2 font-medium text-text">{note.noi_dung_tom_tat}</div>
                  <div className="mt-1 text-sm text-text-muted">{note.hanh_dong_tiep_theo}</div>
                  <div className="mt-2 text-xs text-text-muted">
                    Cập nhật bởi: {displayText(note.nguoi_cap_nhat_name ?? note.nguoi_cap_nhat_id)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 font-headline text-2xl font-bold tracking-tight">Thanh toán</div>
            <div className="space-y-3">
              {upcomingPayments.map((payment) => (
                <div key={String(payment.payment_id)} className="flex items-center justify-between rounded-2xl bg-surface-subtle p-4">
                  <div>
                    <div className="font-medium text-text">{payment.dot_thanh_toan}</div>
                    <div className="text-sm text-text-muted">{formatValue(payment.ngay_den_han, "date")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-text">{compactCurrency(payment.so_tien)}</div>
                    <span className={cn("badge", badgeClass(payment.trang_thai))}>{displayText(payment.trang_thai)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
