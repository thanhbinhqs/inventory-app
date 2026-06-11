'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Radio,
  Space,
  Spin,
  Typography,
  Alert,
  Tag,
  Progress,
  Divider,
} from 'antd';
import {
  InboxOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  AlertOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// ---- Types ----
interface Overview {
  total_products: number;
  total_stock: number;
  total_transactions: number;
  total_in: number;
  total_out: number;
  total_in_value: number;
  total_out_value: number;
  inventory_value: number;
  inventory_sale_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface ReportRow {
  period_label: string;
  total_in_qty: number;
  total_out_qty: number;
  in_count: number;
  out_count: number;
  total_in_value: number;
  total_out_value: number;
  gross_profit: number;
}

interface TopProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  total_in_qty: number;
  total_out_qty: number;
  total_movement: number;
  total_revenue: number;
}

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  stock_value_cost: number;
  stock_value_sale: number;
  unit_profit: number;
  total_profit: number;
}

interface LowStockItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
}

interface UnitStat {
  unit: string;
  product_count: number;
  total_quantity: number;
  total_value: number;
}

interface ReportData {
  period: string;
  label: string;
  summary: ReportRow[];
  overview: Overview;
  inventoryValue: InventoryItem[];
  lowStock: LowStockItem[];
  topProducts: TopProduct[];
  unitStats: UnitStat[];
}

// ---- Helpers ----
function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

function fmt(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

const periodOptions = [
  { label: 'Hàng ngày', value: 'daily' },
  { label: 'Hàng tuần', value: 'weekly' },
  { label: 'Hàng tháng', value: 'monthly' },
  { label: 'Hàng năm', value: 'yearly' },
];

// ---- Component ----
export default function DashboardPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('monthly');

  const fetchReport = async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?period=${p}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi tải báo cáo');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  // === Bảng báo cáo theo kỳ ===
  const reportColumns: ColumnsType<ReportRow> = [
    {
      title: 'Kỳ',
      dataIndex: 'period_label',
      key: 'period_label',
      width: 120,
    },
    {
      title: 'Nhập (SL)',
      dataIndex: 'total_in_qty',
      key: 'total_in_qty',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#52c41a' }}>+{fmt(val)}</span>
      ),
      sorter: (a, b) => a.total_in_qty - b.total_in_qty,
    },
    {
      title: 'Xuất (SL)',
      dataIndex: 'total_out_qty',
      key: 'total_out_qty',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#ff4d4f' }}>-{fmt(val)}</span>
      ),
      sorter: (a, b) => a.total_out_qty - b.total_out_qty,
    },
    {
      title: 'Giá trị Nhập',
      dataIndex: 'total_in_value',
      key: 'total_in_value',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#52c41a' }}>{fmtCurrency(val)}</span>
      ),
    },
    {
      title: 'Giá trị Xuất',
      dataIndex: 'total_out_value',
      key: 'total_out_value',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#ff4d4f' }}>{fmtCurrency(val)}</span>
      ),
    },
    {
      title: 'Lợi nhuận',
      dataIndex: 'gross_profit',
      key: 'gross_profit',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: val >= 0 ? '#1890ff' : '#ff4d4f', fontWeight: 600 }}>
          {val >= 0 ? '+' : ''}{fmtCurrency(val)}
        </span>
      ),
      sorter: (a, b) => a.gross_profit - b.gross_profit,
    },
  ];

  // === Bảng giá trị tồn kho ===
  const inventoryColumns: ColumnsType<InventoryItem> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 80,
    },
    {
      title: 'Tên hàng hóa',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
      align: 'right',
    },
    {
      title: 'Giá nhập',
      dataIndex: 'purchase_price',
      key: 'purchase_price',
      width: 110,
      align: 'right',
      render: (val: number) => fmtCurrency(val),
    },
    {
      title: 'Giá bán',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 110,
      align: 'right',
      render: (val: number) => fmtCurrency(val),
    },
    {
      title: 'Giá trị (giá nhập)',
      dataIndex: 'stock_value_cost',
      key: 'stock_value_cost',
      width: 140,
      align: 'right',
      render: (val: number) => <strong>{fmtCurrency(val)}</strong>,
    },
    {
      title: 'Giá trị (giá bán)',
      dataIndex: 'stock_value_sale',
      key: 'stock_value_sale',
      width: 140,
      align: 'right',
      render: (val: number) => fmtCurrency(val),
    },
  ];

  // === Bảng sản phẩm sắp hết ===
  const lowStockColumns: ColumnsType<LowStockItem> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 80,
    },
    {
      title: 'Tên hàng',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Tồn kho',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (val: number) => (
        <Tag color={val <= 0 ? 'red' : 'orange'} style={{ fontSize: 13, fontWeight: 600 }}>
          {val}
        </Tag>
      ),
    },
  ];

  // === Bảng top sản phẩm ===
  const topProductColumns: ColumnsType<TopProduct> = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Tên hàng hóa', dataIndex: 'name', key: 'name' },
    {
      title: 'Tổng Nhập',
      dataIndex: 'total_in_qty',
      key: 'total_in_qty',
      align: 'right',
      render: (val: number) => <Tag color="green">+{fmt(val)}</Tag>,
    },
    {
      title: 'Tổng Xuất',
      dataIndex: 'total_out_qty',
      key: 'total_out_qty',
      align: 'right',
      render: (val: number) => <Tag color="red">-{fmt(val)}</Tag>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      align: 'right',
      render: (val: number) => fmtCurrency(val),
    },
    {
      title: 'Tổng lưu chuyển',
      dataIndex: 'total_movement',
      key: 'total_movement',
      align: 'right',
      render: (val: number) => <strong>{fmt(val)}</strong>,
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.total_movement - b.total_movement,
    },
  ];

  // === Biểu đồ cột dạng đơn giản (CSS-based bar chart) ===
  function BarChart({ data, maxValue, color }: { data: { label: string; value: number }[]; maxValue: number; color: string }) {
    if (data.length === 0) return <Text type="secondary">Chưa có dữ liệu</Text>;
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 150, padding: '10px 0' }}>
        {data.map((item, i) => {
          const pct = Math.max((item.value / maxValue) * 100, 3);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <Text style={{ fontSize: 10, marginBottom: 2 }}>{fmt(item.value)}</Text>
              <div
                style={{
                  width: '100%',
                  height: `${pct}%`,
                  background: color,
                  borderRadius: '4px 4px 0 0',
                  minWidth: 20,
                  transition: 'height 0.3s',
                }}
              />
              <Text style={{ fontSize: 10, marginTop: 4, textAlign: 'center', lineHeight: 1.2 }}>
                {item.label.length > 8 ? item.label.slice(0, 8) + '…' : item.label}
              </Text>
            </div>
          );
        })}
      </div>
    );
  }

  const maxInventoryValue = data?.inventoryValue?.length
    ? Math.max(...data.inventoryValue.map((i) => i.stock_value_cost))
    : 1;
  const barChartData = (data?.inventoryValue || []).map((i) => ({
    label: i.code,
    value: i.stock_value_cost,
  }));

  return (
    <div>
      <Title level={4}>📊 Dashboard - Báo cáo tổng hợp</Title>

      {error && (
        <Alert message="Lỗi tải báo cáo" description={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {/* Period Selector */}
      <Card style={{ marginBottom: 16 }}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Text strong>Chọn kỳ báo cáo:</Text>
          <Radio.Group
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            {periodOptions.map((opt) => (
              <Radio.Button key={opt.value} value={opt.value}>
                {opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Space>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" description="Đang tải dữ liệu..." />
        </div>
      ) : (
        data && (
          <>
            {/* === KPI Cards === */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Tổng sản phẩm"
                    value={data.overview.total_products}
                    prefix={<ShoppingCartOutlined />}
                    styles={{ content: { color: '#1890ff' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Tổng tồn kho"
                    value={data.overview.total_stock}
                    prefix={<InboxOutlined />}
                    styles={{ content: { color: '#722ed1' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Giá trị tồn kho"
                    value={data.overview.inventory_value}
                    prefix={<DollarOutlined />}
                    precision={0}
                    formatter={(val) => fmtCurrency(Number(val))}
                    styles={{ content: { color: '#52c41a' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Sản phẩm sắp hết"
                    value={data.overview.low_stock_count}
                    prefix={<AlertOutlined />}
                    styles={{ content: { color: data.overview.low_stock_count > 0 ? '#faad14' : '#52c41a' } }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Giao dịch Nhập"
                    value={data.overview.total_in}
                    prefix={<RiseOutlined />}
                    suffix={`/ ${fmtCurrency(data.overview.total_in_value)}`}
                    styles={{ content: { color: '#52c41a' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Giao dịch Xuất"
                    value={data.overview.total_out}
                    prefix={<FallOutlined />}
                    suffix={`/ ${fmtCurrency(data.overview.total_out_value)}`}
                    styles={{ content: { color: '#ff4d4f' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Doanh thu dự kiến"
                    value={data.overview.inventory_sale_value}
                    prefix={<BarChartOutlined />}
                    precision={0}
                    formatter={(val) => fmtCurrency(Number(val))}
                    styles={{ content: { color: '#13c2c2' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable size="small">
                  <Statistic
                    title="Tổng giao dịch"
                    value={data.overview.total_transactions}
                    prefix={<PieChartOutlined />}
                    styles={{ content: { color: '#eb2f96' } }}
                  />
                </Card>
              </Col>
            </Row>

            {/* === Biểu đồ giá trị tồn kho === */}
            {barChartData.length > 0 && (
              <Card
                title={
                  <span>
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    Biểu đồ giá trị tồn kho theo sản phẩm
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                <BarChart data={barChartData} maxValue={maxInventoryValue} color="#1890ff" />
              </Card>
            )}

            {/* === Báo cáo tổng hợp theo kỳ === */}
            <Card
              title={`Báo cáo ${periodOptions.find((o) => o.value === period)?.label.toLowerCase()}`}
              style={{ marginBottom: 16 }}
            >
              <Table
                dataSource={data.summary}
                columns={reportColumns}
                rowKey="period_label"
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'Chưa có dữ liệu giao dịch' }}
                summary={() => {
                  if (data.summary.length === 0) return null;
                  const totals = data.summary.reduce(
                    (acc, r) => ({
                      in_qty: acc.in_qty + r.total_in_qty,
                      out_qty: acc.out_qty + r.total_out_qty,
                      in_val: acc.in_val + r.total_in_value,
                      out_val: acc.out_val + r.total_out_value,
                      profit: acc.profit + r.gross_profit,
                    }),
                    { in_qty: 0, out_qty: 0, in_val: 0, out_val: 0, profit: 0 }
                  );
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}><strong>Tổng cộng</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1}><strong style={{ color: '#52c41a' }}>+{fmt(totals.in_qty)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}><strong style={{ color: '#ff4d4f' }}>-{fmt(totals.out_qty)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}><strong>{fmtCurrency(totals.in_val)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}><strong>{fmtCurrency(totals.out_val)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <strong style={{ color: totals.profit >= 0 ? '#1890ff' : '#ff4d4f' }}>
                          {totals.profit >= 0 ? '+' : ''}{fmtCurrency(totals.profit)}
                        </strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>

            {/* === Bảng giá trị tồn kho === */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} lg={12}>
                <Card title="💎 Giá trị tồn kho theo sản phẩm" size="small">
                  <Table
                    dataSource={data.inventoryValue}
                    columns={inventoryColumns}
                    rowKey="id"
                    pagination={{ pageSize: 5, size: 'small' }}
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: 'Không có sản phẩm nào trong kho' }}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="⚠️ Sản phẩm sắp hết hàng" size="small">
                  {data.lowStock.length > 0 ? (
                    <Table
                      dataSource={data.lowStock}
                      columns={lowStockColumns}
                      rowKey="id"
                      pagination={false}
                      locale={{ emptyText: 'Không có' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Text type="success" style={{ fontSize: 16 }}>
                        ✅ Tất cả sản phẩm đều có tồn kho đầy đủ
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* === Top sản phẩm === */}
            <Card title="🏆 Top sản phẩm lưu chuyển nhiều nhất" style={{ marginBottom: 16 }}>
              <Table
                dataSource={data.topProducts}
                columns={topProductColumns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                locale={{ emptyText: 'Chưa có dữ liệu' }}
              />
            </Card>

            {/* === Thống kê theo đơn vị === */}
            {data.unitStats && data.unitStats.length > 0 && (
              <Card title="📊 Thống kê theo đơn vị tính" size="small">
                <Row gutter={[16, 16]}>
                  {data.unitStats.map((stat) => (
                    <Col xs={12} sm={6} key={stat.unit}>
                      <Card size="small" hoverable>
                        <Statistic
                          title={`Đơn vị: ${stat.unit}`}
                          value={stat.total_quantity}
                          suffix={`SP: ${stat.product_count}`}
                        />
                        <Progress
                          percent={Math.round(
                            (stat.total_value / data.overview.inventory_value) * 100
                          )}
                          size="small"
                          format={() => ''}
                        />
                        <Text style={{ fontSize: 12 }}>{fmtCurrency(stat.total_value)}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}
