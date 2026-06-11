'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  Popconfirm,
  Tag,
  Typography,
  message,
  Tooltip,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
  ExportOutlined,
  DollarOutlined,
  ShoppingOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

// ---- Types ----
interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  inventory_value: number;
  created_at: string;
  updated_at: string;
}

// Helpers
function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

function fmt(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

// ---- Component ----
export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Product modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalTitle, setProductModalTitle] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm] = Form.useForm();

  // Transaction modal
  const [transModalOpen, setTransModalOpen] = useState(false);
  const [transType, setTransType] = useState<'IN' | 'OUT'>('IN');
  const [transProduct, setTransProduct] = useState<Product | null>(null);
  const [transForm] = Form.useForm();

  // === Fetch Products ===
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/products${params}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products);
      } else {
        message.error(data.error || 'Lỗi tải danh sách');
      }
    } catch {
      message.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => fetchProducts(), 400));
  };

  // === Create / Edit ===
  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductModalTitle('Thêm hàng hóa mới');
    productForm.resetFields();
    setProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductModalTitle('Sửa thông tin hàng hóa');
    productForm.setFieldsValue({
      name: product.name,
      description: product.description,
      unit: product.unit,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
    });
    setProductModalOpen(true);
  };

  const handleProductSave = async () => {
    try {
      const values = await productForm.validateFields();
      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      }
      const data = await res.json();
      if (res.ok) {
        message.success(editingProduct ? 'Cập nhật thành công!' : 'Thêm hàng hóa thành công!');
        setProductModalOpen(false);
        fetchProducts();
      } else {
        message.error(data.error || 'Lỗi khi lưu');
      }
    } catch { /* validation error */ }
  };

  // === Delete ===
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        message.success('Xóa thành công!');
        fetchProducts();
      } else {
        message.error(data.error || 'Lỗi khi xóa');
      }
    } catch {
      message.error('Lỗi kết nối server');
    }
  };

  // === Transaction ===
  const openTransaction = (product: Product, type: 'IN' | 'OUT') => {
    setTransProduct(product);
    setTransType(type);
    transForm.resetFields();
    // Gợi ý đơn giá mặc định
    transForm.setFieldsValue({
      unit_price: type === 'IN' ? product.purchase_price : product.selling_price,
    });
    setTransModalOpen(true);
  };

  const handleTransactionSave = async () => {
    try {
      const values = await transForm.validateFields();
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: transProduct!.id,
          type: transType,
          quantity: values.quantity,
          unit_price: values.unit_price || 0,
          note: values.note || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(
          `${transType === 'IN' ? 'Nhập' : 'Xuất'} kho thành công! Tồn kho mới: ${data.newQuantity}`
        );
        setTransModalOpen(false);
        fetchProducts();
      } else {
        message.error(data.error || 'Lỗi giao dịch');
      }
    } catch { /* validation error */ }
  };

  // === Table Columns ===
  const columns: ColumnsType<Product> = [
    {
      title: 'Mã hàng',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      fixed: 'left',
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Tên hàng hóa',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 70,
      align: 'center',
    },
    {
      title: 'Tồn kho',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (val: number) => {
        let color = 'green';
        if (val <= 0) color = 'red';
        else if (val <= 10) color = 'orange';
        return (
          <Tag color={color} style={{ fontSize: 14, fontWeight: 600 }}>
            {val}
          </Tag>
        );
      },
    },
    {
      title: 'Giá nhập',
      dataIndex: 'purchase_price',
      key: 'purchase_price',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.purchase_price - b.purchase_price,
      render: (val: number) => (
        <span style={{ color: '#722ed1' }}>{fmtCurrency(val)}</span>
      ),
    },
    {
      title: 'Giá bán',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.selling_price - b.selling_price,
      render: (val: number) => (
        <span style={{ color: '#1890ff' }}>{fmtCurrency(val)}</span>
      ),
    },
    {
      title: 'Giá trị tồn',
      dataIndex: 'inventory_value',
      key: 'inventory_value',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.inventory_value - b.inventory_value,
      render: (val: number) => (
        <span style={{ fontWeight: 600 }}>{fmtCurrency(val)}</span>
      ),
      // Hiển thị thanh progress theo tỷ lệ giá trị
      responsive: ['xl' as const],
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_: any, record: Product) => (
        <Space size="small">
          <Tooltip title="Nhập kho">
            <Button
              type="primary"
              size="small"
              icon={<ImportOutlined />}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => openTransaction(record, 'IN')}
            >
              Nhập
            </Button>
          </Tooltip>
          <Tooltip title="Xuất kho">
            <Button
              type="primary"
              size="small"
              icon={<ExportOutlined />}
              danger
              onClick={() => openTransaction(record, 'OUT')}
            >
              Xuất
            </Button>
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditProduct(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa hàng hóa này?"
            description="Không thể hoàn tác nếu đã có giao dịch."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Tổng giá trị tồn kho
  const totalInventoryValue = products.reduce((s, p) => s + (p.inventory_value || 0), 0);

  return (
    <div>
      <Title level={4}>📦 Quản lý Hàng hóa</Title>

      {/* Thông tin tổng quan kho */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="large">
          <span>
            <ShoppingOutlined style={{ color: '#1890ff', marginRight: 6 }} />
            <strong>Tổng sản phẩm:</strong> {products.length}
          </span>
          <span>
            <InboxOutlined style={{ color: '#722ed1', marginRight: 6 }} />
            <strong>Tổng tồn kho:</strong> {fmt(products.reduce((s, p) => s + p.quantity, 0))}
          </span>
          <span>
            <DollarOutlined style={{ color: '#52c41a', marginRight: 6 }} />
            <strong>Giá trị tồn kho (theo giá nhập):</strong>{' '}
            {fmtCurrency(totalInventoryValue)}
          </span>
        </Space>
      </Card>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Tìm theo tên hoặc mã hàng..."
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: 350 }}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={(val) => onSearchChange(val)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProduct}>
            Thêm hàng hóa
          </Button>
        </Space>
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng: ${total} sản phẩm`,
          }}
          locale={{ emptyText: 'Chưa có hàng hóa nào. Hãy thêm mới!' }}
        />
      </Card>

      {/* === Product Modal === */}
      <Modal
        title={productModalTitle}
        open={productModalOpen}
        onOk={handleProductSave}
        onCancel={() => setProductModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
        width={520}
      >
        <Form form={productForm} layout="vertical">
          {!editingProduct && (
            <>
              <Form.Item
                name="code"
                label="Mã hàng"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã hàng' },
                  { pattern: /^[A-Za-z0-9_-]+$/, message: 'Chỉ chấp nhận chữ, số, dấu gạch' },
                ]}
              >
                <Input placeholder="VD: SP001, PHANBON-01" />
              </Form.Item>
              <Form.Item name="quantity" label="Tồn kho ban đầu" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="name"
            label="Tên hàng hóa"
            rules={[{ required: true, message: 'Vui lòng nhập tên hàng' }]}
          >
            <Input placeholder="Tên sản phẩm" />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính" initialValue="cái">
            <Select
              options={[
                { value: 'cái', label: 'Cái' },
                { value: 'kg', label: 'Kg' },
                { value: 'hộp', label: 'Hộp' },
                { value: 'thùng', label: 'Thùng' },
                { value: 'bao', label: 'Bao' },
                { value: 'chai', label: 'Chai' },
                { value: 'tấn', label: 'Tấn' },
                { value: 'mét', label: 'Mét' },
                { value: 'lít', label: 'Lít' },
              ]}
            />
          </Form.Item>
          {/* Price fields */}
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="purchase_price"
              label="Giá nhập (VNĐ)"
              initialValue={0}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: '100%' }}
                placeholder="VD: 50000"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value?.replace(/,/g, '')) as any}
                prefix={<span style={{ opacity: 0.5 }}>₫</span>}
              />
            </Form.Item>
            <Form.Item
              name="selling_price"
              label="Giá bán (VNĐ)"
              initialValue={0}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: '100%' }}
                placeholder="VD: 75000"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value?.replace(/,/g, '')) as any}
                prefix={<span style={{ opacity: 0.5 }}>₫</span>}
              />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về hàng hóa" />
          </Form.Item>
        </Form>
      </Modal>

      {/* === Transaction Modal === */}
      <Modal
        title={
          <span>
            {transType === 'IN' ? (
              <ImportOutlined style={{ color: '#52c41a' }} />
            ) : (
              <ExportOutlined style={{ color: '#ff4d4f' }} />
            )}{' '}
            {transType === 'IN' ? 'Nhập kho' : 'Xuất kho'}: {transProduct?.name}
          </span>
        }
        open={transModalOpen}
        onOk={handleTransactionSave}
        onCancel={() => setTransModalOpen(false)}
        okText={transType === 'IN' ? 'Nhập kho' : 'Xuất kho'}
        cancelText="Hủy"
        destroyOnHidden
        width={480}
      >
        <Form form={transForm} layout="vertical">
          <Form.Item label="Sản phẩm">
            <Input value={transProduct?.code + ' - ' + transProduct?.name} disabled />
          </Form.Item>
          <Form.Item label="Tồn kho hiện tại">
            <Input value={String(transProduct?.quantity ?? 0)} disabled />
          </Form.Item>
          {transProduct && (
            <Tag color="purple" style={{ marginBottom: 12 }}>
              Giá nhập: {fmtCurrency(transProduct.purchase_price)} | Giá bán: {fmtCurrency(transProduct.selling_price)}
            </Tag>
          )}
          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng' },
              { type: 'number', min: 1, message: 'Số lượng phải > 0' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số lượng" />
          </Form.Item>
          <Form.Item name="unit_price" label="Đơn giá giao dịch">
            <InputNumber
              min={0}
              step={1000}
              style={{ width: '100%' }}
              placeholder="Nhập đơn giá (VNĐ)"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value?.replace(/,/g, '')) as any}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú giao dịch (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
