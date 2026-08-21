import React from 'react';
import Link from 'next/link';

export default function LaporanMenu() {
  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Laporan</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
        <li>
          <Link href="/dashboard/laporan/purchase" className="btn btn-primary" style={{ width: '100%' }}>
            Laporan Pembelian
          </Link>
        </li>
        <li>
          <Link href="/laporan/sales" className="btn btn-primary" style={{ width: '100%' }}>
            Laporan Penjualan
          </Link>
        </li>
        <li>
          <Link href="/laporan/sales-product" className="btn btn-primary" style={{ width: '100%' }}>
            Laporan Penjualan per Produk
          </Link>
        </li>
        <li>
          <Link href="/laporan/retur" className="btn btn-primary" style={{ width: '100%' }}>
            Laporan Retur Penjualan
          </Link>
        </li>
        <li>
          <Link href="/laporan/purchase" className="btn btn-primary" style={{ width: '100%' }}>
            Laporan Pembelian
          </Link>
        </li>
      </ul>
    </div>
  );
}
