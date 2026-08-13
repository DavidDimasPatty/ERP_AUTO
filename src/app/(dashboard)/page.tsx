import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SalesLineChart from '@/components/SalesLineChart';
import SimpleDataTable from '@/components/SimpleDataTable';

export const revalidate = 0; // Disable cache for live stats


export default async function DashboardPage() {
  // 1. Fetch Stats
  const activeProducts = await prisma.m_product.findMany({
    where: { is_active: true },
    include: { stock: true },
  });

  const totalProducts = activeProducts.length;
  const lowStockCount = activeProducts.filter(
    (p) => (p.stock?.stock_quantity ?? 0) <= p.minimum_stock
  ).length;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const salesToday = await prisma.t_sales.findMany({
    where: {
      sales_datetime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      transaction_status: 'COMPLETED',
    },
  });

  const dailyRevenue = salesToday.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const dailySalesCount = salesToday.length;

  const salesChartRangeStart = new Date();
  salesChartRangeStart.setMonth(salesChartRangeStart.getMonth() - 5);
  salesChartRangeStart.setDate(1);
  salesChartRangeStart.setHours(0, 0, 0, 0);

  const salesChartData = await prisma.t_sales.findMany({
    where: {
      transaction_status: 'COMPLETED',
      sales_datetime: {
        gte: salesChartRangeStart,
      },
    },
    select: {
      sales_datetime: true,
      total_amount: true,
    },
    orderBy: { sales_datetime: 'asc' },
  });

  const weeklySales = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    day.setHours(0, 0, 0, 0);

    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const value = salesChartData.reduce((sum, sale) => {
      const saleDate = new Date(sale.sales_datetime);
      if (saleDate >= day && saleDate < nextDay) {
        return sum + Number(sale.total_amount);
      }
      return sum;
    }, 0);

    return {
      label: day.toLocaleDateString('id-ID', { weekday: 'short' }),
      value,
    };
  });

  const monthlySales = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - (5 - index), 1);
    monthDate.setHours(0, 0, 0, 0);

    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const value = salesChartData.reduce((sum, sale) => {
      const saleDate = new Date(sale.sales_datetime);
      if (saleDate >= monthDate && saleDate < nextMonth) {
        return sum + Number(sale.total_amount);
      }
      return sum;
    }, 0);

    return {
      label: monthDate.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      value,
    };
  });



  // Recent Sales
  const recentSales = await prisma.t_sales.findMany({
    take: 5,
    orderBy: { sales_datetime: 'desc' },
  });

  // Recent Purchases
  const recentPurchases = await prisma.t_purchase.findMany({
    take: 5,
    orderBy: { purchase_datetime: 'desc' },
  });

  // Low stock products details
  const lowStockProducts = activeProducts
    .filter((p) => (p.stock?.stock_quantity ?? 0) <= p.minimum_stock)
    .slice(0, 5);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Ringkasan Bisnis</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Pantau stok produk dan performa penjualan harian Anda
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Card 1 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Produk
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800 }}>{totalProducts}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Produk aktif terdaftar</span>
        </div>

        {/* Card 2 */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: lowStockCount > 0 ? '4px solid var(--warning)' : '1px solid var(--card-border)',
          }}
        >
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Stok Menipis
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
            {lowStockCount}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Di bawah stok minimum</span>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Penjualan Hari Ini
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800 }}>{dailySalesCount}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Transaksi ter-checkout</span>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Pendapatan Hari Ini
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            {formatRupiah(dailyRevenue)}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total omzet bersih</span>
        </div>
      </div>

      {/* Middle Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
      }}>
        {/* Low Stock Alerts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Peringatan Stok Rendah
          </h3>
          {lowStockProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
              ✓ Semua stok produk dalam batas aman.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lowStockProducts.map((p) => {
                const stockQty = p.stock?.stock_quantity ?? 0;
                return (
                  <div
                    key={p.product_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.product_code}</span>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.product_name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{stockQty} Pcs</span>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Min: {p.minimum_stock}</p>
                    </div>
                  </div>
                );
              })}
              <Link href="/master/product" style={{ fontSize: '0.85rem', color: 'var(--primary)', textAlign: 'right', fontWeight: 600 }}>
                Lihat Semua Produk →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Shortcuts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Aksi Cepat
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '100%' }}>
            <Link href="/sales" className="btn btn-primary" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100px', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🛒</span>
              <span>Kasir Penjualan</span>
            </Link>
            <Link href="/purchase" className="btn btn-success" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100px', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>📦</span>
              <span>Input Pembelian</span>
            </Link>
            <Link href="/returns" className="btn btn-warning" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100px', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🔄</span>
              <span>Retur Penjualan</span>
            </Link>
            <Link href="/master/product" className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100px', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🛠</span>
              <span>Kelola Produk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sales Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
      }}>
        <SalesLineChart
          title="Penjualan Mingguan"
          subtitle="Ringkasan omzet 7 hari terakhir"
          data={weeklySales}
        />
        <SalesLineChart
          title="Penjualan Bulanan"
          subtitle="Ringkasan omzet 6 bulan terakhir"
          data={monthlySales}
        />
      </div>

      {/* Recent Activity Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
      }}>
        {/* Recent Sales List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Penjualan Terakhir
          </h3>
          <div className="table-container">
            {recentSales.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Belum ada data penjualan</div>
            ) : (
              <SimpleDataTable
                data={recentSales.map(s => ({
                  sales_number: s.sales_number,
                  customer: s.customer_name_snapshot || 'Pelanggan Umum',
                  total: formatRupiah(Number(s.total_amount))
                }))}
                columns={[
                  { title: 'No Invoice', data: 'sales_number' },
                  { title: 'Pelanggan', data: 'customer' },
                  { title: 'Total', data: 'total' }
                ]}
              />
            )}
          </div>
        </div>

        {/* Recent Purchases List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Pembelian Terakhir
          </h3>
          <div className="table-container">
            {recentPurchases.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Belum ada data pembelian</div>
            ) : (
              <SimpleDataTable
                data={recentPurchases.map(p => ({
                  purchase_number: p.purchase_number,
                  supplier: p.supplier_name_snapshot || '-',
                  total: formatRupiah(Number(p.total_amount))
                }))}
                columns={[
                  { title: 'No Transaksi', data: 'purchase_number' },
                  { title: 'Supplier', data: 'supplier' },
                  { title: 'Total', data: 'total' }
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
