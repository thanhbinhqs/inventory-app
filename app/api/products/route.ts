import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, queryRun } from '@/lib/db';

/**
 * GET /api/products - Lấy danh sách sản phẩm (có tìm kiếm)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const selectFields = `
      SELECT id, code, name, description, unit, quantity,
             purchase_price, selling_price,
             (quantity * purchase_price) AS inventory_value,
             created_at, updated_at
    `;

    let products;
    if (search) {
      const pattern = `%${search}%`;
      products = await queryAll(
        `${selectFields}
         FROM products
         WHERE name LIKE ? OR code LIKE ?
         ORDER BY code ASC`,
        pattern,
        pattern
      );
    } else {
      products = await queryAll(
        `${selectFields}
         FROM products
         ORDER BY code ASC`
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách sản phẩm' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products - Tạo sản phẩm mới
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description, unit, quantity, purchase_price, selling_price } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Mã hàng và tên hàng là bắt buộc' },
        { status: 400 }
      );
    }

    const existing = await queryOne('SELECT id FROM products WHERE code = ?', code);
    if (existing) {
      return NextResponse.json(
        { error: `Mã hàng "${code}" đã tồn tại` },
        { status: 409 }
      );
    }

    const result = await queryRun(
      `INSERT INTO products (code, name, description, unit, quantity, purchase_price, selling_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      code,
      name,
      description || '',
      unit || 'cái',
      Math.max(0, quantity || 0),
      Math.max(0, purchase_price || 0),
      Math.max(0, selling_price || 0)
    );

    const newProduct = await queryOne('SELECT * FROM products WHERE id = ?', result.lastInsertRowid);

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo sản phẩm' },
      { status: 500 }
    );
  }
}
