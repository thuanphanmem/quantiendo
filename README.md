# Quản lý tiến độ nội thất

Next.js app quản lý tiến độ nội thất, đọc/ghi trực tiếp với Google Sheets.

## Biến môi trường

Tạo các biến môi trường sau trên Vercel:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

Hoặc dùng cặp:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

File `KeyAPICaNhan.json` chỉ dùng local, không commit lên GitHub.

## Chạy local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
