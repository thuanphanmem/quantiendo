"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Bell,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FolderOpenDot,
  LayoutGrid,
  Layers3,
  Package,
  ReceiptText,
  RotateCw,
  Settings,
  StickyNote,
  Users,
  WalletCards,
} from "lucide-react";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

type SheetLink = {
  slug: string;
  label: string;
  description: string;
  count: number;
};

type WorkbookStatus = {
  source: "fresh" | "stale" | "empty";
  lastSuccessfulSyncAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage: string | null;
};

const ICONS = {
  "/": LayoutGrid,
  "/du-an": BriefcaseBusiness,
  "/giai-doan": Layers3,
  "/cong-viec": ClipboardList,
  "/khong-gian": FolderOpenDot,
  "/vat-tu": Package,
  "/chi-phi": WalletCards,
  "/thanh-toan": ReceiptText,
  "/nghiem-thu": ClipboardCheck,
  "/ghi-chu": StickyNote,
  "/khach-hang": Users,
  "/nhan-su": Users,
  "/goi-dich-vu": BadgeDollarSign,
  "/tong-quan-du-lieu": LayoutGrid,
  "/mo-ta-du-lieu": Layers3,
} as const;

export function AppShell({
  children,
  sheets,
  workbookStatus,
}: {
  children: React.ReactNode;
  sheets: SheetLink[];
  workbookStatus: WorkbookStatus;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentModule = MODULES.find((item) => item.href === pathname) ?? MODULES[0];
  const [collapsed, setCollapsed] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();

  useEffect(() => {
    const saved = window.localStorage.getItem("sidebar-collapsed");
    setCollapsed(saved === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  function formatStatusTime(timestamp: number | null) {
    if (!timestamp) return "chưa có mốc đồng bộ";
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(timestamp));
  }

  function refreshWorkbookData() {
    startRefreshTransition(async () => {
      await fetch("/api/system/refresh-cache", { method: "POST" });
      router.refresh();
    });
  }

  return (
    <div className="page-shell min-h-screen">
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns] duration-300 ease-out",
          collapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "border-r border-border/80 bg-white/90 px-4 py-6 backdrop-blur transition-[padding] duration-300",
            collapsed ? "lg:px-3" : "lg:px-5",
          )}
        >
          <div className={cn("mb-8 flex items-start", collapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white">
              A
            </div>
            {!collapsed ? (
              <div>
                <div className="font-headline text-2xl font-extrabold tracking-tight text-primary">
                  Xưởng Chế Tác
                </div>
                <div className="text-sm text-text-muted">Quản lý nội thất chuẩn production</div>
              </div>
            ) : null}
          </div>

          <nav className="space-y-4">
            {(["primary", "secondary"] as const).map((group) => (
              <div key={group}>
                {!collapsed ? (
                  <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
                    {group === "primary" ? "Vận hành chính" : "Danh mục & dữ liệu"}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  {MODULES.filter((item) => item.group === group).map((item) => {
                    const Icon = ICONS[item.href as keyof typeof ICONS] ?? LayoutGrid;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.navLabel}
                        className={cn(
                          "group flex rounded-2xl py-3 text-sm font-medium transition",
                          collapsed ? "justify-center px-3" : "items-center gap-3 px-4",
                          pathname === item.href
                            ? "bg-primary-soft text-primary"
                            : "text-text-muted hover:bg-primary-soft hover:text-primary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {!collapsed ? <span>{item.navLabel}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {!collapsed ? (
            <div className="mt-8 rounded-2xl bg-surface-subtle p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
                Nguồn dữ liệu
              </div>
              <div className="space-y-2">
                {sheets.slice(0, 5).map((sheet) => (
                  <div key={sheet.slug} className="flex items-center justify-between text-sm">
                    <span className="text-text">{sheet.label}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-text-muted">
                      {sheet.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={cn("mt-auto hidden pt-8 lg:block", collapsed && "flex items-center justify-center")}>
            <button className={cn("btn-secondary", collapsed ? "w-12 justify-center px-0" : "w-full justify-start")}>
              <Settings className="h-4 w-4" />
              {!collapsed ? "Cài đặt" : null}
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-white/80 px-6 py-4 backdrop-blur">
            <div className="flex min-w-0 items-start gap-3">
              <button
                className="btn-secondary hidden h-11 w-11 shrink-0 justify-center px-0 lg:inline-flex"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Mở sidebar" : "Thu gọn sidebar"}
                title={collapsed ? "Mở sidebar" : "Thu gọn sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <div className="min-w-0">
                <div className="truncate font-headline text-2xl font-bold tracking-tight text-text">
                  {currentModule.title}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {currentModule.description}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-secondary gap-2 px-3" onClick={refreshWorkbookData} disabled={isRefreshing}>
                <RotateCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Đang làm mới" : "Làm mới dữ liệu"}
              </button>
              <div className="hidden min-w-[260px] rounded-2xl bg-surface-subtle px-4 py-2.5 text-sm text-text-muted md:block">
                Tìm kiếm nhanh dự án, khách hàng, mã công việc...
              </div>
              <button className="btn-secondary px-3">
                <Bell className="h-4 w-4" />
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">
                BT
              </div>
            </div>
          </header>

          {workbookStatus.source === "stale" ? (
            <div className="border-b border-warning/20 bg-warning-soft/50 px-6 py-3 text-sm text-warning">
              Đang hiển thị dữ liệu cache gần nhất do Google Sheets phản hồi chậm hoặc vượt quota.
              Đồng bộ thành công gần nhất: {formatStatusTime(workbookStatus.lastSuccessfulSyncAt)}.
            </div>
          ) : null}

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
