import type { Metadata } from 'next';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppLayoutProvider from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'Quản Lý Xuất/Nhập Hàng Hóa',
  description: 'Hệ thống quản lý kho hàng - Inventory Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <AppLayoutProvider>{children}</AppLayoutProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
