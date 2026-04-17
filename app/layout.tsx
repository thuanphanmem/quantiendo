import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getWorkbookRuntimeStatus, listSheets } from "@/lib/workbook";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Xưởng Chế Tác",
  description: "Web app điều hành tiến độ nội thất đọc và ghi trực tiếp từ Excel.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sheets = await listSheets();
  const workbookStatus = getWorkbookRuntimeStatus();

  return (
    <html lang="vi">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <AppShell sheets={sheets} workbookStatus={workbookStatus}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
