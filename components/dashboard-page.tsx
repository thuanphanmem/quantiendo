import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FolderKanban,
  Package,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { BarChart, ChartPanel, DonutChart, MiniTrend } from "@/components/charts";
import { cn, compactCurrency, shortCurrency, toneForStatus } from "@/lib/utils";
import { displayText, formatValue, type Primitive } from "@/lib/workbook-client";

type DashboardData = Awaited<ReturnType<typeof import("@/lib/workbook").getDashboardData>>;

function StatCard({
  label,
  value,
  type,
  tone,
  className,
  styleDelay = 0,
}: {
  label: string;
  value: Primitive;
  type?: string;
  tone: string;
  className?: string;
  styleDelay?: number;
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "primary"
          ? "text-primary"
          : "text-text";

  const displayValue = type === "currency" ? shortCurrency(value) : formatValue(value, "number");

  return (
    <div className={cn("panel min-w-0 p-4", className)} style={{ animationDelay: `${styleDelay}ms` }}>
      <div className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div
        className={cn(
          "mt-2 min-w-0 break-words font-headline text-2xl font-extrabold leading-tight tracking-tight xl:text-[1.7rem]",
          toneClass,
        )}
        title={String(displayValue)}
      >
        {displayValue}
      </div>
    </div>
  );
}

function badgeClass(value: Primitive) {
  const tone = toneForStatus(value);
  if (tone === "success") return "bg-success-soft text-success";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "danger") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-text";
}

export function DashboardPage({ data }: { data: DashboardData }) {
  const compactStats = [
    data.stats.find((item) => item.label === "Tổng dự án"),
    data.stats.find((item) => item.label === "Đang thi công"),
    data.stats.find((item) => item.label === "Chờ chốt thiết kế/vật tư"),
    data.stats.find((item) => item.label === "Chờ vật tư"),
    data.stats.find((item) => item.label === "Công nợ khách"),
    data.stats.find((item) => item.label === "Công nợ NCC"),
    data.stats.find((item) => item.label === "Phiếu quá hạn"),
  ].filter(Boolean) as DashboardData["stats"];

  const primaryStats = compactStats.slice(0, 4);
  const secondaryStats = compactStats.slice(4);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
              Điều hành hôm nay
            </div>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-headline text-4xl font-extrabold tracking-tight text-text">
                  Tổng quan điều hành
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-text-muted">
                  Màn hình này ưu tiên việc cần làm trước, sau đó mới đến số liệu. Người dùng chỉ cần quét 10-15
                  giây để biết nên vào đâu tiếp theo.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/du-an" className="btn-primary">
                  Mở workbench dự án
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/cong-viec" className="btn-secondary">
                  Xử lý công việc
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {data.focusLanes.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-2xl bg-surface-subtle p-4 transition hover:bg-primary-soft"
              >
                <div className="text-sm font-medium text-text-muted">{item.label}</div>
                <div className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-text">
                  {item.value}
                </div>
                <div className="mt-2 text-sm text-text-muted">{item.note}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Ưu tiên tài chính
              </div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">Dự án công nợ cao</h2>
            </div>
            <WalletCards className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {data.highDebtProjects.map((project) => (
              <Link
                key={String(project.project_id)}
                href={`/du-an/${project.project_id}`}
                className="block rounded-2xl bg-surface-subtle p-4 transition hover:bg-primary-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-text">{project.ten_du_an}</div>
                    <div className="mt-1 text-sm text-text-muted">
                      {displayText(project.canh_bao_chinh || project.hang_muc_dang_tac || "Đang theo dõi")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-text-muted">Công nợ khách</div>
                    <div className="font-semibold text-danger">{compactCurrency(project.cong_no_khach_hang)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                  <span>PM: {displayText(project.pm_name ?? project.pm_id)}</span>
                  <span>{formatValue(project.ngay_ban_giao_du_kien, "date")}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryStats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} className="motion-fade-up" styleDelay={index * 60} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,0.8fr)]">
          {secondaryStats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} className="motion-fade-up" styleDelay={220 + index * 70} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartPanel
          title="Phân bổ trạng thái dự án"
          subtitle="Nhìn nhanh cơ cấu vận hành hiện tại để biết công ty đang dồn lực vào đâu."
        >
          <DonutChart
            centerLabel="Tổng dự án"
            centerValue={String(data.stats[0]?.value ?? 0)}
            data={data.charts.projectStatus}
          />
        </ChartPanel>

        <ChartPanel
          title="Dòng tiền cần bám"
          subtitle="So sánh khoản phải thu, phải trả và phần quá hạn cần xử lý ngay."
        >
          <BarChart data={data.charts.cashflow} valueType="currency" />
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ChartPanel
          title="Áp lực công việc theo người phụ trách"
          subtitle="Ai đang giữ nhiều việc mở hoặc quá hạn để điều phối lại kịp thời."
        >
          <BarChart data={data.charts.taskByOwner.map((item) => ({ ...item, tone: "primary" }))} />
        </ChartPanel>

        <ChartPanel
          title="Xu hướng tín hiệu điều hành"
          subtitle="Từ nhật ký điều hành để nhận ra mức độ căng của vận hành hiện tại."
        >
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <DonutChart
                centerLabel="Tín hiệu"
                centerValue={String(data.recentNotes.length)}
                data={data.charts.noteSignalChart.map((item) => ({
                  ...item,
                  tone:
                    item.label === "Tín hiệu đỏ"
                      ? "danger"
                      : item.label === "Tín hiệu vàng"
                        ? "warning"
                        : "success",
                }))}
              />
            </div>
            <div className="space-y-4">
              <MiniTrend data={data.charts.noteSignalChart.map((item) => item.value)} />
              <div className="space-y-3">
                {data.charts.noteSignalChart.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3">
                    <span className="text-sm text-text">{item.label}</span>
                    <span className="text-sm font-semibold text-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Bắt đầu từ đây
              </div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">3 việc nên xử lý trước</h2>
            </div>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {data.todayPlan.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-start justify-between gap-4 rounded-2xl bg-surface-subtle p-4 transition hover:bg-primary-soft"
              >
                <div>
                  <div className="font-semibold text-text">{item.label}</div>
                  <div className="mt-1 text-sm text-text-muted">{item.note}</div>
                </div>
                <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-primary">
                  {item.value}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Công nợ quá hạn
              </div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">Phiếu cần nhắc ngay</h2>
            </div>
            <ReceiptText className="h-5 w-5 text-danger" />
          </div>
          <div className="space-y-3">
            {data.overduePaymentList.map((payment) => (
              <Link
                key={String(payment.payment_id)}
                href="/thanh-toan"
                className="flex items-center justify-between gap-4 rounded-2xl bg-surface-subtle p-4 transition hover:bg-primary-soft"
              >
                <div>
                  <div className="font-medium text-text">{payment.dot_thanh_toan}</div>
                  <div className="mt-1 text-sm text-text-muted">
                    {displayText(payment.ghi_chu_hanh_dong ?? payment.project_id)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-danger">{compactCurrency(payment.so_tien)}</div>
                  <div className="text-xs text-text-muted">{formatValue(payment.ngay_den_han, "date")}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Cảnh báo ưu tiên
              </div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">Dự án cần xử lý ngay</h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div className="space-y-3">
            {data.urgentProjects.map((project) => (
              <Link
                key={String(project.project_id)}
                href={`/du-an/${project.project_id}`}
                className="block rounded-2xl bg-surface-subtle p-4 transition hover:bg-primary-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-text">{project.ten_du_an}</div>
                      <span className={cn("badge", badgeClass(project.trang_thai))}>
                        {displayText(project.trang_thai)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-text-muted">
                      {displayText(project.canh_bao_chinh || project.ly_do_tac || "Đang theo dõi sát")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                      <span>Hạng mục tắc: {displayText(project.hang_muc_dang_tac ?? "Không")}</span>
                      <span>Công nợ: {compactCurrency(project.cong_no_khach_hang)}</span>
                      <span>PM: {displayText(project.pm_name ?? project.pm_id)}</span>
                    </div>
                  </div>
                  <div className="badge bg-danger-soft text-danger">{project.tien_do_tong_phan_tram}%</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Trạng thái tổng
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight">Phân bổ dự án</h2>
              </div>
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-4">
              {[
                { label: "Tiến độ cao", value: data.charts.design },
                { label: "Đang thi công", value: data.charts.construction },
                { label: "Đã hoàn thành", value: data.charts.completed },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-text">{item.label}</span>
                    <span className="font-semibold text-primary">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, item.value * 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Nhật ký mới
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight">Ghi chú điều hành</h2>
              </div>
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3">
              {data.recentNotes.map((note) => (
                <div key={String(note.note_id)} className="rounded-2xl bg-surface-subtle p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("badge", badgeClass(note.den_tin_hieu))}>
                      {displayText(note.den_tin_hieu)}
                    </span>
                    <span className="text-xs text-text-muted">{formatValue(note.ngay_cap_nhat, "date")}</span>
                  </div>
                  <div className="font-medium text-text">{note.noi_dung_tom_tat}</div>
                  <div className="mt-1 text-sm text-text-muted">{note.hanh_dong_tiep_theo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Công việc cần chú ý
              </div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">Task quá hạn hoặc sát hạn</h2>
            </div>
            <Link href="/cong-viec" className="btn-secondary">
              Mở workbench
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className="table-head">Công việc</th>
                  <th className="table-head">Phụ trách</th>
                  <th className="table-head">Hạn xử lý</th>
                  <th className="table-head">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.overdueTasks.map((task) => (
                  <tr key={String(task.task_id)} className="border-t border-border/70">
                    <td className="table-cell">
                      <div className="font-medium">{task.ten_cong_viec}</div>
                      <div className="text-xs text-text-muted">{task.project_id}</div>
                    </td>
                    <td className="table-cell">{displayText(task.nguoi_phu_trach_name ?? task.nguoi_phu_trach_id)}</td>
                    <td className="table-cell">{formatValue(task.han_xu_ly, "date")}</td>
                    <td className="table-cell">
                      <span className={cn("badge", badgeClass(task.trang_thai))}>
                        {displayText(task.trang_thai)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Vật tư rủi ro
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight">Hàng về chậm</h2>
              </div>
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-3">
              {data.delayedMaterials.map((item) => (
                <div key={String(item.item_id)} className="rounded-2xl bg-surface-subtle p-4">
                  <div className="font-medium text-text">{item.ten_vat_tu}</div>
                  <div className="mt-1 text-sm text-text-muted">
                    {item.project_id} · {item.nha_cung_cap}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                    <span>Cần hàng: {formatValue(item.ngay_can_hang, "date")}</span>
                    <span className="badge bg-warning-soft text-warning">{displayText(item.hang_ve_cham)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Phím tắt
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight">Điều hành nhanh</h2>
              </div>
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>

            <div className="grid gap-3">
              {[
                { href: "/du-an", label: "Quản lý dự án", desc: "Dùng preset, mở preview và xử lý nhanh" },
                { href: "/vat-tu", label: "Theo dõi vật tư", desc: "Rà lead time, hàng chậm và nhà cung cấp rủi ro" },
                { href: "/thanh-toan", label: "Kiểm soát công nợ", desc: "Bám phiếu quá hạn và đợt thanh toán lớn" },
                { href: "/ghi-chu", label: "Nhật ký điều hành", desc: "Cập nhật tín hiệu và hành động tiếp theo" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl bg-surface-subtle p-4 transition hover:bg-primary-soft"
                >
                  <div className="font-semibold text-text">{item.label}</div>
                  <div className="mt-1 text-sm text-text-muted">{item.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
