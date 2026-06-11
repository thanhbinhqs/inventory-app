# 📦 Inventory App - Hệ Thống Quản Lý Xuất/Nhập Hàng Hóa

Ứng dụng web quản lý kho hàng với giao diện hiện đại, hỗ trợ nhập/xuất hàng hóa và báo cáo tổng hợp theo thời gian.

## 🚀 Công Nghệ

| Layer | Công nghệ |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Ngôn ngữ** | TypeScript |
| **Database** | Turso (libsql) — SQLite tương thích, hỗ trợ local file & Turso Cloud |
| **UI** | Ant Design 5 + Tailwind CSS |
| **Auth** | Session-based (SHA256 hash) |
| **Deploy** | Docker (image ~64MB, node:20-alpine) |

## ✨ Tính Năng

- **🔐 Xác thực** — Đăng nhập với session cookie
- **📦 Quản lý hàng hóa** — Thêm, sửa, xóa, tìm kiếm sản phẩm (mã, tên, giá nhập, giá bán, tồn kho)
- **📥 Nhập/Xuất kho** — Giao dịch IN/OUT với atomic SQL transaction
- **📊 Dashboard** — Thống kê tổng quan, biểu đồ, sản phẩm sắp hết hàng
- **📈 Báo cáo** — Tổng hợp theo ngày/tuần/tháng/năm, giá trị tồn kho, lợi nhuận
- **🔍 Lọc giao dịch** — Theo thời gian, loại giao dịch, sản phẩm

## 🏗 Cấu Trúc Dự Án

```
inventory-app/
├── app/
│   ├── api/
│   │   ├── auth/        # API xác thực (login/logout/me)
│   │   ├── products/    # API quản lý sản phẩm
│   │   ├── transactions/ # API giao dịch IN/OUT
│   │   └── reports/     # API báo cáo tổng hợp
│   ├── login/           # Trang đăng nhập
│   ├── inventory/       # Trang quản lý hàng hóa
│   ├── transactions/    # Trang lịch sử giao dịch
│   ├── page.tsx         # Dashboard chính
│   └── layout.tsx       # Root layout
├── components/
│   └── AppLayout.tsx    # Layout chính (Sidebar + Header)
├── lib/
│   ├── db.ts            # Database connection + schema
│   └── auth.ts          # Auth utilities
├── data/                # SQLite database (auto-generated, local mode)
├── proxy.ts             # Next.js 16 middleware (auth guard)
└── next.config.ts       # Next.js configuration
```

## ☁️ Kết Nối Turso Cloud

App hỗ trợ cả local SQLite và Turso Cloud. Mặc định dùng local file (`data/inventory.db`). Để kết nối Turso Cloud:

### 1. Tạo Database trên turso.tech

```bash
# Đăng nhập Turso CLI
turso auth login

# Tạo database mới
turso db create inventory-app

# Lấy database URL
turso db show inventory-app --url
# → libs://inventory-app-<org>.turso.io

# Tạo auth token
turso db tokens create inventory-app
```

### 2. Cấu hình biến môi trường

Tạo file `.env.local`:

```env
TURSO_DATABASE_URL=libs://inventory-app-<org>.turso.io
TURSO_AUTH_TOKEN=<token-từ-turso>
```

Hoặc chạy Docker:

```bash
docker run -d --name inventory-app -p 3000:3000 \
  -e TURSO_DATABASE_URL=libs://inventory-app-<org>.turso.io \
  -e TURSO_AUTH_TOKEN=<token> \
  registry.binh.name.vn/inventory-app:latest
```

### 3. Chạy local

```bash
npm run dev
# App tự động phát hiện biến môi trường và kết nối Turso Cloud
```

> **Lưu ý:** Schema (`CREATE TABLE IF NOT EXISTS`) và seed admin user sẽ được tạo tự động khi app khởi động lần đầu trên Turso Cloud.

## 🐳 Docker (Local SQLite)

```bash
docker pull registry.binh.name.vn/inventory-app:latest

docker run -d --name inventory-app -p 3000:3000 \
  -v inventory-data:/app/data \
  registry.binh.name.vn/inventory-app:latest
```

> Mount volume `inventory-data:/app/data` để dữ liệu SQLite persistent khi restart container.

## 🔧 Cài Đặt & Chạy Local (không Turso)

```bash
git clone https://github.com/thanhbinhqs/inventory-app.git
cd inventory-app
npm install

npm run build
npm run dev
# → http://localhost:3000
```

### Tài khoản mặc định

| Username | Password |
|---|---|
| `admin` | `admin123` |

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập |
| `POST` | `/api/auth/logout` | Đăng xuất |
| `GET` | `/api/auth/me` | Thông tin user hiện tại |
| `GET` | `/api/products` | Danh sách sản phẩm (query: `?search=`) |
| `POST` | `/api/products` | Tạo sản phẩm mới |
| `GET` | `/api/products/[id]` | Chi tiết sản phẩm |
| `PUT` | `/api/products/[id]` | Cập nhật sản phẩm |
| `DELETE` | `/api/products/[id]` | Xóa sản phẩm |
| `GET` | `/api/transactions` | Lịch sử giao dịch (query: `?startDate=&endDate=&type=&productId=`) |
| `POST` | `/api/transactions` | Tạo giao dịch IN/OUT |
| `GET` | `/api/reports` | Báo cáo (query: `?period=daily|weekly|monthly|yearly`) |

## 📊 Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'cái',
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
```

## 🗺 Roadmap

- [x] Xác thực người dùng (session-based)
- [x] CRUD sản phẩm
- [x] Nhập/xuất kho với SQL transaction
- [x] Báo cáo tổng hợp (ngày/tuần/tháng/năm)
- [x] Dashboard với biểu đồ
- [x] Docker image
- [x] Kết nối Turso Cloud
- [ ] Phân quyền người dùng
- [ ] Xuất báo cáo PDF/Excel
- [ ] Quản lý nhà cung cấp
- [ ] Kiểm kê kho định kỳ
- [ ] Mobile app (React Native)

## 📝 Giấy Phép

MIT License
