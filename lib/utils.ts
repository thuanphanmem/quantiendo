import { formatValue, type Primitive } from "@/lib/workbook-client";

type ClassInput =
  | string
  | false
  | null
  | undefined
  | Record<string, boolean>;

export function cn(...classes: ClassInput[]) {
  return classes
    .flatMap((item) => {
      if (!item) return [];
      if (typeof item === "string") return [item];
      return Object.entries(item)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
    })
    .join(" ");
}

export function toneForStatus(value: Primitive) {
  const text = String(value ?? "").toLowerCase();
  if (
    text.includes("quá hạn") ||
    text.includes("trễ") ||
    text.includes("đỏ") ||
    text.includes("tắc")
  ) {
    return "danger";
  }
  if (
    text.includes("chờ") ||
    text.includes("vàng") ||
    text.includes("đang") ||
    text.includes("cảnh báo")
  ) {
    return "warning";
  }
  if (
    text.includes("đã") ||
    text.includes("xanh") ||
    text.includes("hoàn thành") ||
    text.includes("nghiệm thu")
  ) {
    return "success";
  }
  return "neutral";
}

export function compactCurrency(value: Primitive) {
  return formatValue(value, "currency");
}

export function shortCurrency(value: Primitive) {
  if (value === null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);

  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 1_000_000_000)} tỷ`;
  }

  if (absolute >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount / 1_000_000)} triệu`;
  }

  return formatValue(value, "currency");
}
