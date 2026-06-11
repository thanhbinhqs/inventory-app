'use client';

import React, { useState, Suspense } from 'react';
import { Card, Form, Input, Button, Typography, Alert, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AppLayout';

const { Title, Text } = Typography;

// Inner component sử dụng useSearchParams cần Suspense boundary
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const expired = searchParams.get('expired');

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        await refreshUser();
        message.success('Đăng nhập thành công!');
        router.push('/');
      } else {
        setError(data.error || 'Đăng nhập thất bại');
      }
    } catch {
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            📦
          </Title>
          <Title level={4} style={{ margin: '8px 0 4px' }}>
            Quản Lý Xuất/Nhập Hàng Hóa
          </Title>
          <Text type="secondary">Đăng nhập để tiếp tục</Text>
        </div>

        {expired && (
          <Alert
            message="Phiên đăng nhập đã hết hạn"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Tên đăng nhập"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tài khoản mặc định: admin / admin123
          </Text>
        </div>
      </Card>
    </div>
  );
}

// Wrap LoginForm trong Suspense cho useSearchParams
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
