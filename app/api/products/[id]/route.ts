import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, queryRun } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/products/[id] - Lấy chi tiết 1 sản phẩm
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const product = await queryOne(
      `SELECT id, code, name, description, unit, quantity,
              purchase_price, selling_price,
              (quantity * purchase_price) AS inventory_value,
              created_at, updated_at
       FROM products WHERE id = ?`,
      Number(id)
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin sản phẩm' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id] - Cập nhật sản phẩm
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, unit, purchase_price, selling_price } = body;

    const existing = await queryOne('SELECT id FROM products WHERE id = ?', Number(id));
    if (!existing) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    await queryRun(
      `UPDATE products
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           unit = COALESCE(?, unit),
           purchase_price = COALESCE(?, purchase_price),
           selling_price = COALESCE(?, selling_price),
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      name || null,
      description !== undefined ? description : null,
      unit || null,
      purchase_price !== undefined ? Math.max(0, purchase_price) : null,
      selling_price !== undefined ? Math.max(0, selling_price) : null,
      Number(id)
    );

    const updated = await queryOne('SELECT * FROM products WHERE id = ?', Number(id));

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật sản phẩm' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id] - Xóa sản phẩm
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const existing = await queryOne('SELECT id FROM products WHERE id = ?', Number(id));
    if (!existing) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    const hasTransactions = await queryOne(
      'SELECT id FROM transactions WHERE product_id = ? LIMIT 1',
      Number(id)
    );
    if (hasTransactions) {
      return NextResponse.json(
        { error: 'Không thể xóa sản phẩm này vì đã có giao dịch liên quan.' },
        { status: 409 }
      );
    }

    await queryRun('DELETE FROM products WHERE id = ?', Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa sản phẩm' },
      { status: 500 }
    );
  }
}
