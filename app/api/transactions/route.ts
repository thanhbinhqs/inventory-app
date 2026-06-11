import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, queryRun, getDb } from '@/lib/db';

/**
 * GET /api/transactions - Lấy lịch sử giao dịch (có lọc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');

    let sql = `
      SELECT
        t.id,
        t.product_id,
        p.code AS product_code,
        p.name AS product_name,
        t.type,
        t.quantity,
        t.unit_price,
        t.total_price,
        t.note,
        t.created_at
      FROM transactions t
      JOIN products p ON p.id = t.product_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (startDate) {
      sql += ` AND t.created_at >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND t.created_at <= ?`;
      params.push(endDate + ' 23:59:59');
    }
    if (productId) {
      sql += ` AND t.product_id = ?`;
      params.push(Number(productId));
    }
    if (type && (type === 'IN' || type === 'OUT')) {
      sql += ` AND t.type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY t.created_at DESC LIMIT 500`;

    const transactions = await queryAll(sql, ...params);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy lịch sử giao dịch' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions - Tạo giao dịch IN/OUT
 *
 * Sử dụng interactive transaction của @libsql/client
 * để đảm bảo atomicity: ghi giao dịch + cập nhật tồn kho
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, type, quantity, unit_price, note } = body;

    if (!product_id || !type || !quantity) {
      return NextResponse.json(
        { error: 'Sản phẩm, loại giao dịch và số lượng là bắt buộc' },
        { status: 400 }
      );
    }
    if (!['IN', 'OUT'].includes(type)) {
      return NextResponse.json(
        { error: 'Loại giao dịch phải là IN (Nhập) hoặc OUT (Xuất)' },
        { status: 400 }
      );
    }
    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Số lượng phải lớn hơn 0' },
        { status: 400 }
      );
    }

    // Kiểm tra sản phẩm tồn tại
    const product = await queryOne(
      'SELECT id, name, quantity FROM products WHERE id = ?',
      product_id
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    const currentQty = product.quantity as number;

    // Kiểm tra tồn kho khi xuất hàng
    if (type === 'OUT' && currentQty < quantity) {
      return NextResponse.json(
        {
          error: `Không đủ hàng trong kho. Tồn kho hiện tại: ${currentQty}, yêu cầu xuất: ${quantity}`,
        },
        { status: 400 }
      );
    }

    // --- INTERACTIVE TRANSACTION (@libsql/client) ---
    const db = getDb();
    const tx = await db.transaction('write');

    try {
      // 1. Ghi nhận giao dịch
      const insertResult = await tx.execute({
        sql: `INSERT INTO transactions (product_id, type, quantity, unit_price, note)
              VALUES (?, ?, ?, ?, ?)`,
        args: [product_id, type, quantity, unit_price || 0, note || ''],
      });

      // 2. Cập nhật tồn kho
      if (type === 'IN') {
        await tx.execute({
          sql: `UPDATE products
                SET quantity = quantity + ?,
                    updated_at = datetime('now', 'localtime')
                WHERE id = ?`,
          args: [quantity, product_id],
        });
      } else {
        // OUT
        await tx.execute({
          sql: `UPDATE products
                SET quantity = quantity - ?,
                    updated_at = datetime('now', 'localtime')
                WHERE id = ?`,
          args: [quantity, product_id],
        });
      }

      await tx.commit();

      // Lấy thông tin giao dịch vừa tạo
      const newTransaction = await queryOne(
        `SELECT t.*, p.code AS product_code, p.name AS product_name
         FROM transactions t
         JOIN products p ON p.id = t.product_id
         WHERE t.id = ?`,
        Number(insertResult.lastInsertRowid ?? 0)
      );

      // Lấy tồn kho mới
      const updatedProduct = await queryOne(
        'SELECT quantity FROM products WHERE id = ?',
        product_id
      );

      return NextResponse.json(
        {
          transaction: newTransaction,
          newQuantity: updatedProduct?.quantity ?? currentQty,
        },
        { status: 201 }
      );
    } catch (txError) {
      await tx.rollback();
      throw txError;
    } finally {
      tx.close();
    }
  } catch (error) {
    console.error('POST /api/transactions error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo giao dịch' },
      { status: 500 }
    );
  }
}
