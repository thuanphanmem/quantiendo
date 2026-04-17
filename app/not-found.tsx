import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-xl p-10 text-center">
      <div className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">404</div>
      <h1 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-text">
        Không tìm thấy dữ liệu
      </h1>
      <p className="mt-3 text-sm text-text-muted">
        Bản ghi hoặc tuyến bạn mở không tồn tại trong workbook hiện tại.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Quay về tổng quan
      </Link>
    </div>
  );
}
