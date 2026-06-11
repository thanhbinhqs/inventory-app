'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Layout,
  Menu,
  Button,
  Typography,
  Spin,
  Avatar,
  Dropdown,
  Space,
} from 'antd';
import {
  AppstoreOutlined,
  InboxOutlined,
  TransactionOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ---- Auth Context ----
interface User {
  id: number;
  username: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ---- Auth Provider ----
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---- Menu Items ----
const menuItems = [
  {
    key: '/',
    icon: <BarChartOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/inventory',
    icon: <InboxOutlined />,
    label: 'Hàng hóa',
  },
  {
    key: '/transactions',
    icon: <TransactionOutlined />,
    label: 'Giao dịch',
  },
];

// ---- Inner Layout Component (sử dụng AuthContext) ----
function AppLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Chuyển hướng nếu chưa đăng nhập (middleware đã xử lý, nhưng đề phòng)
  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" description="Đang tải..." />
      </div>
    );
  }

  // Trang login không cần layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const userMenu = {
    items: [
      {
        key: 'userinfo',
        label: (
          <Text>
            {user?.displayName || user?.username || 'Người dùng'}
          </Text>
        ),
        disabled: true,
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: logout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Text
            strong
            style={{
              color: '#fff',
              fontSize: collapsed ? 16 : 18,
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? '📦' : '📦 Quản Lý Kho'}
          </Text>
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>

      {/* Main Content Area */}
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Text>{user?.displayName || user?.username}</Text>
            </Space>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{ margin: 16, minHeight: 'calc(100vh - 64px - 32px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

// ---- AppLayout Component (wraps AuthProvider) ----
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthProvider>
  );
}
