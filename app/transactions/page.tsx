'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Space,
  DatePicker,
  Select,
  Tag,
  Typography,
  message,
  Row,
  Col,
  Button,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ---- Types ----
interface Transaction {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  type: 'IN' | 'OUT';
  quantity: number;
  unit_price: number;
  total_price: number;
  note: string;
  created_at: string;
}

interface ProductOption {
  id: number;
  code: string;
  name: string;
}

// ---- Helpers ----
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

function formatDateTime(dateStr: string): string {
  return dayjs(dateStr).format('DD/MM/YYYY HH:mm');
}

// ---- Component ----
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'IN' | 'OUT' | null>(null);

  // === Fetch Transactions ===
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set('startDate', dateRange[0]);
        params.set('endDate', dateRange[1]);
      }
      if (selectedProduct) {
        params.set('productId', String(selectedProduct));
      }
      if (selectedType) {
        params.set('type', selectedType);
      }

      const query = params.toString();
      const res = await fetch(`/api/transactions${query ? `?${query}` : ''}`);
      const data = await res.json();

      if (res.ok) {
        setTransactions(data.transactions);
      } else {
        message.error(data.error || 'Lỗi tải dữ liệu');
      }
    } catch {
      message.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedProduct, selectedType]);

  // === Fetch Products (for filter dropdown) ===
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // === Handlers ===
  const handleDateRangeChange = (_: any, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange(dateStrings);
    } else {
      setDateRange(null);
    }
  };

  const clearFilters = () => {
    setDateRange(null);
    setSelectedProduct(null);
    setSelectedType(null);
  };

  // === Table Columns ===
  const columns: ColumnsType<Transaction> = [
    {
      title: 'Mã GD',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      align: 'center',
    },
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      align: 'center',
      render: (val: 'IN' | 'OUT') =>
        val === 'IN' ? (
          <Tag icon={<ImportOutlined />} color="success" style={{ fontSize: 12 }}>
            Nhập
          </Tag>
        ) : (
          <Tag icon={<ExportOutlined />} color="error" style={{ fontSize: 12 }}>
            Xuất
          </Tag>
        ),
    },
    {
      title: 'Mã hàng',
      dataIndex: 'product_code',
      key: 'product_code',
      width: 100,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Tên hàng hóa',
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (val: number, record: Transaction) => (
        <span
          style={{
            color: record.type === 'IN' ? '#52c41a' : '#ff4d4f',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {record.type === 'IN' ? '+' : '-'}
          {val}
        </span>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 130,
      align: 'right',
      render: (val: number) =>
        val > 0 ? formatCurrency(val) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.total_price - b.total_price,
      render: (val: number) =>
        val > 0 ? (
          <Text strong>{formatCurrency(val)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      responsive: ['lg' as const],
      render: (val: string) => val || <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div>
      <Title level={4}>📋 Lịch sử Giao dịch</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Khoảng thời gian
              </Text>
              <RangePicker
                onChange={handleDateRangeChange}
                value={
                  dateRange
                    ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
                    : null
                }
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hàng hóa
              </Text>
              <Select
                placeholder="Tất cả hàng hóa"
                allowClear
                showSearch
                optionFilterProp="label"
                value={selectedProduct}
                onChange={setSelectedProduct}
                style={{ width: '100%' }}
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.code} - ${p.name}`,
                }))}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Loại giao dịch
              </Text>
              <Select
                placeholder="Tất cả"
                allowClear
                value={selectedType}
                onChange={setSelectedType}
                style={{ width: '100%' }}
                options={[
                  { value: 'IN', label: 'Nhập kho' },
                  { value: 'OUT', label: 'Xuất kho' },
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Space style={{ marginTop: 20 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchTransactions}
                type="default"
              >
                Lọc
              </Button>
              <Button onClick={clearFilters}>Xóa lọc</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `Tổng: ${total} giao dịch`,
          }}
          locale={{ emptyText: 'Chưa có giao dịch nào' }}
        />
      </Card>
    </div>
  );
}
