import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';

/**
 * GET /api/reports?period=...&startDate=...&endDate=...
 *
 * Báo cáo tổng hợp với 4 mốc thời gian (daily/weekly/monthly/yearly)
 * Sử dụng raw SQL: strftime, GROUP BY, SUM(CASE WHEN...)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const periodConfig: Record<string, { groupFormat: string; label: string }> = {
      daily:   { groupFormat: `strftime('%Y-%m-%d', t.created_at)`, label: 'Ngày' },
      weekly:  { groupFormat: `strftime('%Y-%W', t.created_at)`,   label: 'Tuần' },
      monthly: { groupFormat: `strftime('%Y-%m', t.created_at)`,   label: 'Tháng' },
      yearly:  { groupFormat: `strftime('%Y', t.created_at)`,      label: 'Năm' },
    };

    const config = periodConfig[period];
    if (!config) {
      return NextResponse.json(
        { error: 'Period không hợp lệ. Chọn: daily, weekly, monthly, yearly' },
        { status: 400 }
      );
    }

    // Build WHERE clause
    const whereClauses: string[] = [];
    const params: string[] = [];
    if (startDate) { whereClauses.push('t.created_at >= ?'); params.push(startDate); }
    if (endDate)   { whereClauses.push('t.created_at <= ?'); params.push(endDate + ' 23:59:59'); }
    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // ========== 1. BÁO CÁO TỔNG HỢP THEO KỲ ==========
    const summarySQL = `
      SELECT
        ${config.groupFormat} AS period_label,
        COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END), 0) AS total_in_qty,
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS total_out_qty,
        COUNT(CASE WHEN t.type = 'IN' THEN 1 END) AS in_count,
        COUNT(CASE WHEN t.type = 'OUT' THEN 1 END) AS out_count,
        COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.total_price ELSE 0 END), 0) AS total_in_value,
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.total_price ELSE 0 END), 0) AS total_out_value,
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.total_price ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity * p.purchase_price ELSE 0 END), 0) AS gross_profit
      FROM transactions t
      JOIN products p ON p.id = t.product_id
      ${whereSQL}
      GROUP BY period_label
      ORDER BY period_label ASC
    `;
    const summary = await queryAll(summarySQL, ...params);

    // ========== 2. TỔNG QUAN TOÀN HỆ THỐNG ==========
    const overview = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COALESCE(SUM(quantity), 0) FROM products) AS total_stock,
        (SELECT COUNT(*) FROM transactions) AS total_transactions,
        (SELECT COUNT(*) FROM transactions WHERE type = 'IN') AS total_in,
        (SELECT COUNT(*) FROM transactions WHERE type = 'OUT') AS total_out,
        (SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN total_price ELSE 0 END), 0)
         FROM transactions) AS total_in_value,
        (SELECT COALESCE(SUM(CASE WHEN type = 'OUT' THEN total_price ELSE 0 END), 0)
         FROM transactions) AS total_out_value,
        (SELECT COALESCE(SUM(quantity * purchase_price), 0) FROM products) AS inventory_value,
        (SELECT COALESCE(SUM(quantity * selling_price), 0) FROM products) AS inventory_sale_value,
        (SELECT COUNT(*) FROM products WHERE quantity > 0 AND quantity <= 10) AS low_stock_count,
        (SELECT COUNT(*) FROM products WHERE quantity = 0) AS out_of_stock_count
    `);

    // ========== 3. GIÁ TRỊ TỒN KHO THEO SẢN PHẨM ==========
    const inventoryValue = await queryAll(`
      SELECT
        p.id, p.code, p.name, p.unit, p.quantity,
        p.purchase_price, p.selling_price,
        (p.quantity * p.purchase_price) AS stock_value_cost,
        (p.quantity * p.selling_price) AS stock_value_sale,
        (p.selling_price - p.purchase_price) AS unit_profit,
        (p.quantity * (p.selling_price - p.purchase_price)) AS total_profit
      FROM products p
      WHERE p.quantity > 0
      ORDER BY stock_value_cost DESC
    `);

    // ========== 4. SẢN PHẨM SẮP HẾT HÀNG ==========
    const lowStock = await queryAll(`
      SELECT id, code, name, unit, quantity, purchase_price, selling_price
      FROM products
      WHERE quantity <= 10
      ORDER BY quantity ASC
    `);

    // ========== 5. TOP SẢN PHẨM NHẬP/XUẤT NHIỀU NHẤT ==========
    const topProducts = await queryAll(`
      SELECT
        p.id, p.code, p.name, p.unit,
        COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END), 0) AS total_in_qty,
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS total_out_qty,
        COALESCE(SUM(t.quantity), 0) AS total_movement,
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.total_price ELSE 0 END), 0) AS total_revenue
      FROM products p
      LEFT JOIN transactions t ON t.product_id = p.id
      ${whereSQL.replace(/t\./g, 't.')}
      GROUP BY p.id
      ORDER BY total_movement DESC
      LIMIT 10
    `, ...params);

    // ========== 6. THỐNG KÊ THEO LOẠI SẢN PHẨM ==========
    const unitStats = await queryAll(`
      SELECT
        unit,
        COUNT(*) AS product_count,
        SUM(quantity) AS total_quantity,
        COALESCE(SUM(quantity * purchase_price), 0) AS total_value
      FROM products
      GROUP BY unit
      ORDER BY total_value DESC
    `);

    return NextResponse.json({
      period,
      label: config.label,
      summary,
      overview,
      inventoryValue,
      lowStock,
      topProducts,
      unitStats,
    });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy báo cáo' },
      { status: 500 }
    );
  }
}
