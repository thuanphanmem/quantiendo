"use client";

import { useEffect, useState } from "react";

import { cn, shortCurrency } from "@/lib/utils";

type ChartDatum = {
  label: string;
  value: number;
  tone?: "primary" | "warning" | "danger" | "success" | "neutral" | string;
};

const TONE_MAP: Record<NonNullable<ChartDatum["tone"]>, string> = {
  primary: "#c94b18",
  warning: "#d97706",
  danger: "#dc2626",
  success: "#15803d",
  neutral: "#64748b",
};

function toneColor(tone: ChartDatum["tone"]) {
  return TONE_MAP[(tone as keyof typeof TONE_MAP) ?? "primary"] ?? TONE_MAP.primary;
}

function useMotionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setReady(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return ready;
}

function useAnimatedNumber(value: number, duration = 700) {
  const motionReady = useMotionReady();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!motionReady) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, motionReady, value]);

  return display;
}

function formatChartValue(value: number, valueType: "number" | "currency") {
  if (valueType === "currency") {
    return shortCurrency(value);
  }
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  valueType = "number",
}: {
  data: ChartDatum[];
  centerLabel: string;
  centerValue: string;
  valueType?: "number" | "currency";
}) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  const motionReady = useMotionReady();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const parsedCenterValue = Number(centerValue);
  const animatedCenterValue = useAnimatedNumber(Number.isNaN(parsedCenterValue) ? 0 : parsedCenterValue);
  let current = -90;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
          <circle cx="60" cy="60" r="38" fill="none" stroke="#e8edf2" strokeWidth="14" />
          {data.map((item, index) => {
            const angle = (item.value / total) * 360;
            const path = describeArc(60, 60, 38, current, current + angle);
            current += angle;
            return (
              <path
                key={item.label}
                d={path}
                fill="none"
                stroke={toneColor(item.tone)}
                strokeWidth={activeIndex === index ? "16" : "14"}
                strokeLinecap="round"
                pathLength={1}
                className={cn("cursor-pointer transition-all duration-200", motionReady ? "motion-chart-arc" : undefined)}
                style={{
                  animationDelay: `${120 + index * 90}ms`,
                  filter: activeIndex === index ? "drop-shadow(0 0 8px rgba(201,75,24,0.18))" : "none",
                  opacity: activeIndex === null || activeIndex === index ? 1 : 0.5,
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{centerLabel}</div>
          <div className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-text">
            {Number.isNaN(parsedCenterValue) ? centerValue : formatChartValue(animatedCenterValue, valueType)}
          </div>
        </div>
        {activeIndex !== null ? (
          <div className="pointer-events-none absolute -right-16 top-3 z-10 w-36 rounded-2xl border border-border bg-white/95 p-3 shadow-card backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
              {data[activeIndex]?.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-text">
              {formatChartValue(data[activeIndex]?.value ?? 0, valueType)}
            </div>
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {data.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl px-2 py-1.5 transition-colors duration-200",
              activeIndex === index ? "bg-primary-soft/70" : "hover:bg-surface-subtle",
              motionReady ? "motion-fade-up" : undefined,
            )}
            style={{ animationDelay: `${140 + index * 70}ms` }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: toneColor(item.tone) }} />
              <span className="text-sm text-text">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-text">{formatChartValue(item.value, valueType)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  valueType = "number",
}: {
  data: ChartDatum[];
  valueType?: "number" | "currency";
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const motionReady = useMotionReady();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "rounded-2xl px-3 py-2 transition-colors duration-200",
            activeIndex === index ? "bg-surface-subtle" : "",
            motionReady ? "motion-fade-up" : undefined,
          )}
          style={{ animationDelay: `${120 + index * 80}ms` }}
          onMouseEnter={() => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm text-text">{item.label}</span>
            <span className="text-sm font-semibold text-text">{formatChartValue(item.value, valueType)}</span>
          </div>
          <div className="group relative h-2.5 rounded-full bg-surface-muted">
            <div
              className={cn("h-2.5 rounded-full", motionReady ? "motion-chart-bar" : undefined)}
              style={{
                width: `${Math.max(6, (item.value / max) * 100)}%`,
                backgroundColor: toneColor(item.tone),
                animationDelay: `${160 + index * 90}ms`,
                filter: activeIndex === index ? "brightness(1.05)" : "none",
              }}
            />
            <div
              className={cn(
                "pointer-events-none absolute -top-11 rounded-xl border border-border bg-white/95 px-2.5 py-1.5 text-xs font-medium text-text shadow-card backdrop-blur transition-all duration-150",
                activeIndex === index ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
              style={{ left: `min(calc(${Math.max(6, (item.value / max) * 100)}% - 40px), calc(100% - 76px))` }}
            >
              {formatChartValue(item.value, valueType)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MiniTrend({
  data,
}: {
  data: number[];
}) {
  const motionReady = useMotionReady();
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const width = 180;
  const height = 56;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <polyline
        fill="none"
        stroke="#c94b18"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className={motionReady ? "motion-chart-line" : undefined}
        style={{ animationDelay: "220ms" }}
      />
      {data.map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * (height - 8) - 4;
        return (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="2.75"
            fill="#c94b18"
            className={motionReady ? "motion-fade-up" : undefined}
            style={{ animationDelay: `${280 + index * 60}ms` }}
          />
        );
      })}
    </svg>
  );
}

export function ChartPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel motion-fade-up p-6", className)}>
      <div className="mb-5">
        <div className="font-headline text-2xl font-bold tracking-tight text-text">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-text-muted">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}
