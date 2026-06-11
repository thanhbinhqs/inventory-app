# 📦 Inventory App - Hệ Thống Quản Lý Xuất/Nhập Hàng Hóa

Ứng dụng web quản lý kho hàng với giao diện hiện đại, hỗ trợ nhập/xuất hàng hóa và báo cáo tổng hợp theo thời gian.

## 🚀 Công Nghệ

| Layer | Công nghệ |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Ngôn ngữ** | TypeScript |
| **Database** | Turso (libsql) — SQLite tương thích |
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
├── data/                # SQLite database (auto-generated)
├── proxy.ts             # Next.js 16 middleware (auth guard)
└── next.config.ts       # Next.js configuration
```

## 🐳 Docker

Image được build sẵn và push lên registry:

```bash
docker pull registry.binh.name.vn/inventory-app:latest

docker run -d --name inventory-app -p 3000:3000 \
  -v inventory-data:/app/data \
  registry.binh.name.vn/inventory-app:latest
```

> **Lưu ý:** Mount volume `inventory-data:/app/data` để dữ liệu SQLite được lưu persistent khi restart container.

## 🔧 Cài Đặt & Chạy Local

```bash
# Clone và cài dependencies
git clone https://github.com/thanhbinhqs/inventory-app.git
cd inventory-app
npm install

# Build production
npm run build

# Chạy development server
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

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
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Products
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Transactions
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('IN','OUT')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## 🗺 Roadmap

- [x] Xác thực người dùng (session-based)
- [x] CRUD sản phẩm
- [x] Nhập/xuất kho với SQL transaction
- [x] Báo cáo tổng hợp (ngày/tuần/tháng/năm)
- [x] Dashboard với biểu đồ
- [x] Docker image
- [ ] Phân quyền người dùng
- [ ] Xuất báo cáo PDF/Excel
- [ ] Quản lý nhà cung cấp
- [ ] Kiểm kê kho định kỳ
- [ ] Mobile app (React Native)
- [ ] Kết nối Turso Cloud (distributed SQLite)

## 📝 Giấy Phép

MIT License
