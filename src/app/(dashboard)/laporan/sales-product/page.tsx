"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AsyncSearchableSelect, { AsyncSelectOption } from '@/components/AsyncSearchableSelect';
import { exportToCSV } from '@/lib/exportExcel';

const PRINT_STYLE = `
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  * {
    box-sizing: border-box !important;
  }

  aside, header, nav, .no-print { display: none !important; }

  html, body, #root, .app-container, .main-content, main {
    all: unset !important;
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
    transform: none !important;
  }

  .card { border: none !important; box-shadow: none !important; padding: 0 !important; background: #fff !important; margin-bottom: 1.5rem !important; }
  .report-view { display: none !important; }

  .print-section {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .print-header { display: block !important; margin-bottom: 1.2rem; border-bottom: 2px solid #000; padding-bottom: 0.5rem; }
  .print-header h1 { font-size: 1.4rem !important; margin: 0 !important; color: #000 !important; }

  .product-print-group {
    page-break-inside: avoid;
    margin-bottom: 1.5rem;
    border-bottom: 1px dashed #ccc;
    padding-bottom: 1rem;
  }

  .product-print-info {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    background-color: #f8f9fa;
    padding: 0.5rem;
    border: 1px solid #ddd;
  }

  .table {
    width: 100% !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
  }
  .table th, .table td { border: 1px solid #000 !important; padding: 0.4rem 0.5rem !important; color: #000 !important; font-size: 0.78rem !important; }
  .table th { background-color: #f0f0f0 !important; font-weight: 700; }
  .table tfoot tr td { background-color: #e8e8e8 !important; font-weight: 700; }
}

.print-section { display: none; }
.print-header { display: none; }
`;

interface TransactionDetail {
  sales_id: number;
  sales_number: string;
  sales_datetime: string;
  sales_type: string;
  customer_name: string;
  cashier_name: string;
  quantity: number;
  unit_price: number;
  product_total: number;
  payment_status: string;
}

interface ProductReportGroup {
  product_id: number;
  product_code: string;
  product_name: string;
  unit_name: string;
  total_transaction: number;
  total_quantity: number;
  total_product_sales: number;
  transactions: TransactionDetail[];
}

export default function SalesByProductReportPage() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSalesType, setSelectedSalesType] = useState('ALL');

  // View Limit state (Default 5) & Pagination state
  const [limit, setLimit] = useState('5');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [grandTotals, setGrandTotals] = useState({ totalProducts: 0, totalQuantity: 0, totalSales: 0, totalTransactions: 0 });
  const [allExportData, setAllExportData] = useState<ProductReportGroup[] | null>(null);

  // Full data state for printing all pages
  const [fullPrintData, setFullPrintData] = useState<ProductReportGroup[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const [data, setData] = useState<ProductReportGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [printDate, setPrintDate] = useState('');

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
      })
    );
  }, []);

  // Fetch product options for AsyncSearchableSelect
  const fetchProductOptions = useCallback(async (search: string): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams({ is_active: 'true', limit: '20' });
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/master/product?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      const opts: AsyncSelectOption[] = (json.data || []).map((p: any) => ({
        value: p.product_id.toString(),
        label: `${p.product_code} - ${p.product_name} ${p.brand?.brand_name ? `(${p.brand.brand_name})` : ''}`,
      }));
      return [{ value: '', label: '-- Semua Produk --' }, ...opts];
    } catch {
      return [{ value: '', label: '-- Semua Produk --' }];
    }
  }, []);

  const resolveProduct = useCallback(async (val: string): Promise<AsyncSelectOption | null> => {
    if (!val) return { value: '', label: '-- Semua Produk --' };
    try {
      const res = await fetch(`/api/master/product?search=${val}&limit=5`);
      if (!res.ok) return null;
      const json = await res.json();
      const found = (json.data || []).find((p: any) => p.product_id.toString() === val);
      if (found) {
        return {
          value: found.product_id.toString(),
          label: `${found.product_code} - ${found.product_name} ${found.brand?.brand_name ? `(${found.brand.brand_name})` : ''}`,
        };
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  const fetchReport = useCallback(async (pageTarget = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (selectedProductId) params.append('product_id', selectedProductId);
      if (selectedSalesType && selectedSalesType !== 'ALL') params.append('sales_type', selectedSalesType);

      params.append('page', pageTarget.toString());
      params.append('limit', limit);

      const res = await fetch(`/api/laporan/sales-product?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          setData(json.data);
          if (json.pagination) setPagination(json.pagination);
          if (json.grandTotals) setGrandTotals(json.grandTotals);
          if (json.allDataForExport) setAllExportData(json.allDataForExport);
          else setAllExportData(null);
        } else if (Array.isArray(json)) {
          setData(json);
          setPagination({ total: json.length, page: 1, limit: json.length, totalPages: 1 });
          setGrandTotals({
            totalProducts: json.length,
            totalQuantity: json.reduce((a: number, b: any) => a + b.total_quantity, 0),
            totalSales: json.reduce((a: number, b: any) => a + b.total_product_sales, 0),
            totalTransactions: json.reduce((a: number, b: any) => a + b.total_transaction, 0),
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [start, end, selectedProductId, selectedSalesType, limit]);

  useEffect(() => {
    setPage(1);
    fetchReport(1);
  }, [start, end, selectedProductId, selectedSalesType, limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      fetchReport(newPage);
    }
  };

  const handleReset = () => {
    setStart('');
    setEnd('');
    setSelectedProductId('');
    setSelectedSalesType('ALL');
    setLimit('5');
    setPage(1);
    setTimeout(() => {
      fetchReport(1);
    }, 0);
  };

  const handleExportCSV = async () => {
    let sourceData = allExportData || data;

    // If currently paginated, fetch all records for CSV export
    if (limit !== 'ALL' && limit !== 'SEMUA' && (!allExportData || allExportData.length === 0)) {
      try {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        if (selectedProductId) params.append('product_id', selectedProductId);
        if (selectedSalesType && selectedSalesType !== 'ALL') params.append('sales_type', selectedSalesType);
        params.append('limit', 'ALL');

        const res = await fetch(`/api/laporan/sales-product?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          sourceData = json.data || json;
        }
      } catch (e) {
        console.error('Error fetching export data:', e);
      }
    }

    const headers = [
      'Kode Produk',
      'Nama Produk',
      'Satuan',
      'No. Penjualan',
      'Tanggal & Waktu',
      'Jenis',
      'Customer',
      'Kasir',
      'Qty',
      'Harga Jual (Rp)',
      'Total Produk (Rp)',
      'Status',
    ];

    const rows: (string | number)[][] = [];

    sourceData.forEach((group) => {
      group.transactions.forEach((trx) => {
        rows.push([
          group.product_code,
          group.product_name,
          group.unit_name,
          trx.sales_number,
          trx.sales_datetime,
          trx.sales_type,
          trx.customer_name,
          trx.cashier_name,
          trx.quantity,
          trx.unit_price,
          trx.product_total,
          trx.payment_status,
        ]);
      });
    });

    exportToCSV(`Laporan_Penjualan_Per_Produk_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    let printList = allExportData || (limit === 'ALL' || limit === 'SEMUA' ? data : null);

    // If currently paginated, fetch ALL products so the entire report is printed
    if (!printList || printList.length === 0) {
      try {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        if (selectedProductId) params.append('product_id', selectedProductId);
        if (selectedSalesType && selectedSalesType !== 'ALL') params.append('sales_type', selectedSalesType);
        params.append('limit', 'ALL');

        const res = await fetch(`/api/laporan/sales-product?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          printList = json.data || json;
        }
      } catch (e) {
        console.error('Error fetching print data:', e);
        printList = data;
      }
    }

    if (printList) {
      setFullPrintData(printList);
    }
    setIsPrinting(false);

    // Trigger browser print dialog after DOM updates
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const printItems = fullPrintData.length > 0 ? fullPrintData : (allExportData || data);

  return (
    <>
      <style jsx global>{PRINT_STYLE}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>Laporan Penjualan per Produk</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Laporan &gt; Laporan Penjualan per Produk
            </span>
          </div>
        </div>

        {/* Filter Card */}
        <div
          className="card no-print"
          style={{
            padding: '1.25rem',
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {/* Dari Tanggal */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Dari Tanggal
            </label>
            <input
              type="date"
              className="form-input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Sampai Tanggal
            </label>
            <input
              type="date"
              className="form-input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          {/* Produk (Search / Autocomplete) */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: '220px', flex: 2 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Produk
            </label>
            <AsyncSearchableSelect
              value={selectedProductId}
              fetchOptions={fetchProductOptions}
              resolveSelected={resolveProduct}
              onChange={(val) => setSelectedProductId(val)}
              placeholder="Cari kode, nama, brand, deskripsi..."
              className="form-input"
            />
          </div>

          {/* Jenis Penjualan */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: '130px', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Jenis Penjualan
            </label>
            <select
              className="form-input"
              value={selectedSalesType}
              onChange={(e) => setSelectedSalesType(e.target.value)}
            >
              <option value="ALL">Semua</option>
              <option value="ECERAN">ECERAN</option>
              <option value="BENGKEL">BENGKEL</option>
            </select>
          </div>

          {/* Limit / Tampilkan per Halaman (Default 5) */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: '120px', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Batas Tampil
            </label>
            <select
              className="form-input"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              <option value="5">5 produk (Default)</option>
              <option value="10">10 produk</option>
              <option value="20">20 produk</option>
              <option value="50">50 produk</option>
              <option value="ALL">Semua produk</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => fetchReport(1)} disabled={loading}>
              {loading ? 'Memuat...' : '🔍 Tampilkan'}
            </button>
            <button className="btn btn-secondary" onClick={handleReset} disabled={loading}>
              🔄 Reset
            </button>
          </div>

          {/* Export & Print */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ color: '#16a34a', borderColor: '#16a34a' }}
            >
              📊 Export CSV
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? 'Menyiapkan...' : '🖨️ Cetak / PDF'}
            </button>
          </div>
        </div>

        {/* Summary Stats Cards (Accurate across all matching records) */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Produk Terjual
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {grandTotals.totalProducts} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>produk</span>
            </div>
          </div>

          {/* <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Jumlah Transaksi
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {grandTotals.totalTransactions} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>trx</span>
            </div>
          </div> */}

          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Qty Terjual
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {grandTotals.totalQuantity.toLocaleString('id-ID')}
            </div>
          </div>

          {/* <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Omset Penjualan
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
              Rp {grandTotals.totalSales.toLocaleString('id-ID')}
            </div>
          </div> */}
        </div>

        {/* Top Info Bar for Pagination / Record count */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>
            Menampilkan <strong>{data.length}</strong> dari <strong>{pagination.total}</strong> produk terjual
            {limit !== 'ALL' && limit !== 'SEMUA' && (
              <span> (Dibatasi default {limit} produk per halaman untuk optimasi server)</span>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                « Sebelumnya
              </button>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Halaman {page} dari {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => handlePageChange(page + 1)}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                Selanjutnya »
              </button>
            </div>
          )}
        </div>

        {/* Screen View (Report grouped per product) */}
        <div className="report-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Memuat data laporan...
            </div>
          ) : data.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Tidak ada data penjualan per produk yang sesuai dengan filter.
            </div>
          ) : (
            data.map((group) => (
              <div key={group.product_id} className="card" style={{ padding: '1.25rem' }}>

                {/* Product Header Block */}
                <div
                  style={{
                    paddingBottom: '0.75rem',
                    marginBottom: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {group.product_name}
                  </h3>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.75rem',
                      marginTop: '0.75rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Kode Produk: </span>
                      <strong>{group.product_code}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Satuan: </span>
                      <strong>{group.unit_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Jumlah Transaksi: </span>
                      <strong>{group.total_transaction}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Qty Terjual: </span>
                      <strong>{group.total_quantity.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Total Penjualan: </span>
                      <strong style={{ color: '#16a34a' }}>
                        Rp {group.total_product_sales.toLocaleString('id-ID')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Detail Transactions Table */}
                <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)' }}>
                        <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                        <th style={{ textAlign: 'center' }}>No. Penjualan</th>
                        <th style={{ textAlign: 'center' }}>Tanggal &amp; Waktu</th>
                        <th style={{ textAlign: 'center' }}>Jenis</th>
                        <th>Customer</th>
                        <th>Kasir</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Harga Jual</th>
                        <th style={{ textAlign: 'right' }}>Total Produk</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.transactions.map((trx, idx) => (
                        <tr key={trx.sales_id + '-' + idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, textAlign: 'center' }}>{trx.sales_number}</td>
                          <td style={{ textAlign: 'center' }}>{trx.sales_datetime}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(99,102,241,0.1)',
                                color: 'var(--primary)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              {trx.sales_type}
                            </span>
                          </td>
                          <td>{trx.customer_name}</td>
                          <td>{trx.cashier_name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{trx.quantity}</td>
                          <td style={{ textAlign: 'right' }}>
                            Rp {trx.unit_price.toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            Rp {trx.product_total.toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              {trx.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={6} style={{ textAlign: 'right', padding: '0.6rem' }}>
                          SUBTOTAL ({group.product_name}):
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.6rem' }}>
                          {group.total_quantity.toLocaleString('id-ID')}
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'right', padding: '0.6rem', color: '#16a34a' }}>
                          Rp {group.total_product_sales.toLocaleString('id-ID')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Bottom Pagination controls */}
        {pagination.totalPages > 1 && !loading && (
          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              « Halaman Sebelumnya
            </button>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Halaman {page} dari {pagination.totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Halaman Selanjutnya »
            </button>
          </div>
        )}

        {/* Print-only section */}
        <div className="print-section">
          <div className="print-header">
            <h1>MITRA MOTOR</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', fontWeight: 700 }}>
              LAPORAN PENJUALAN PER PRODUK
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
              Periode: {start || 'Semua'} s/d {end || 'Semua'}
              &nbsp;|&nbsp;
              Jenis: {selectedSalesType === 'ALL' ? 'Semua' : selectedSalesType}
              &nbsp;|&nbsp;
              Dicetak: {printDate}
            </p>
          </div>

          {printItems.map((group) => (
            <div key={group.product_id} className="product-print-group">
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                {group.product_name}
              </div>

              <div className="product-print-info">
                <div>Kode Produk: <strong>{group.product_code}</strong></div>
                <div>Satuan: <strong>{group.unit_name}</strong></div>
                <div>Jumlah Transaksi: <strong>{group.total_transaction}</strong></div>
                <div>Qty Terjual: <strong>{group.total_quantity}</strong></div>
                <div>Total Penjualan: <strong>Rp {group.total_product_sales.toLocaleString('id-ID')}</strong></div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>No</th>
                    <th style={{ textAlign: 'center' }}>No. Penjualan</th>
                    <th style={{ textAlign: 'center' }}>Tanggal &amp; Waktu</th>
                    <th style={{ textAlign: 'center' }}>Jenis</th>
                    <th>Customer</th>
                    <th>Kasir</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Harga Jual</th>
                    <th style={{ textAlign: 'right' }}>Total Produk</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.transactions.map((trx, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{trx.sales_number}</td>
                      <td style={{ textAlign: 'center' }}>{trx.sales_datetime}</td>
                      <td style={{ textAlign: 'center' }}>{trx.sales_type}</td>
                      <td>{trx.customer_name}</td>
                      <td>{trx.cashier_name}</td>
                      <td style={{ textAlign: 'right' }}>{trx.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{trx.unit_price.toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{trx.product_total.toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'center' }}>{trx.payment_status}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'right' }}>SUBTOTAL:</td>
                    <td style={{ textAlign: 'right' }}>{group.total_quantity}</td>
                    <td></td>
                    <td style={{ textAlign: 'right' }}>Rp {group.total_product_sales.toLocaleString('id-ID')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {/* Grand total summary at end of printout */}
          <div style={{ marginTop: '1.5rem', borderTop: '2px solid #000', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>GRAND TOTAL ({grandTotals.totalProducts} Produk / {grandTotals.totalTransactions} Transaksi):</span>
              <span>Total Qty: {grandTotals.totalQuantity.toLocaleString('id-ID')} &nbsp;|&nbsp; Total Omset: Rp {grandTotals.totalSales.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
