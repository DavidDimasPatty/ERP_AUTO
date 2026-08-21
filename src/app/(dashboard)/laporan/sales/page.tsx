"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { exportToCSV } from '@/lib/exportExcel';
import DataTableClient from '@/components/DataTableClient';

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

  .card { border: none !important; box-shadow: none !important; padding: 0 !important; background: #fff !important; }
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

  .table {
    width: 100% !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
  }
  .table th, .table td { border: 1px solid #000 !important; padding: 0.4rem 0.5rem !important; color: #000 !important; font-size: 0.8rem !important; }
  .table th { background-color: #f0f0f0 !important; font-weight: 700; }
  .table tfoot tr td { background-color: #e8e8e8 !important; font-weight: 700; }
}

.print-section { display: none; }
.print-header { display: none; }
`;

export default function SalesReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printDate, setPrintDate] = useState('');

  // Selected Transaction Detail State
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const getField = (item: any, key: string) => {
    switch (key) {
      case 'sales_number': return item.sales_number || item.salesNumber || '';
      case 'date': return item.date || item.sales_datetime || '';
      case 'type': return item.type || item.sales_type || '';
      case 'customer': return item.customer || item.customer_name || item.customer_name_snapshot || '';
      case 'cashier': return item.cashier || item.cashier_name || item.cashier_name_snapshot || '';
      case 'subtotal': return Number(item.subtotal || item.subtotal_amount || item.total_amount || 0);
      case 'discount': return Number(item.discount || item.discount_amount || 0);
      case 'total': return Number(item.total || item.total_amount || 0);
      case 'status': return item.status || item.payment_status || item.transaction_status || '';
      default: return item[key] || '';
    }
  };

  const dataForTable = data.map((item) => ({
    ...item,
    _sales_number: getField(item, 'sales_number'),
    _date: getField(item, 'date'),
    _type: getField(item, 'type'),
    _customer: getField(item, 'customer'),
    _cashier: getField(item, 'cashier'),
    _subtotal: getField(item, 'subtotal'),
    _discount: getField(item, 'discount'),
    _total: getField(item, 'total'),
    _status: getField(item, 'status'),
  }));

  const grandTotal = data.reduce((s, i) => s + Number(getField(i, 'total')), 0);
  const totalSubtotal = data.reduce((s, i) => s + Number(getField(i, 'subtotal')), 0);
  const totalDiscount = data.reduce((s, i) => s + Number(getField(i, 'discount')), 0);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      const res = await fetch(`/api/laporan/sales${params.toString() ? `?${params}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchReport(); }, []);

  const handleSelectSale = async (row: any) => {
    setDetailLoading(true);
    setSelectedSaleDetail(null);
    try {
      let salesObj = null;
      if (row.sales_id) {
        const res = await fetch(`/api/sales/${row.sales_id}`);
        if (res.ok) salesObj = await res.json();
      }
      
      if (!salesObj && row._sales_number) {
        const res = await fetch(`/api/returns/check-sales/${encodeURIComponent(row._sales_number)}`);
        if (res.ok) salesObj = await res.json();
      }

      if (salesObj) {
        setSelectedSaleDetail(salesObj);
      } else {
        // Fallback to row data
        setSelectedSaleDetail(row);
      }
    } catch (e) {
      console.error('Error fetching sales detail:', e);
      setSelectedSaleDetail(row);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['No. Penjualan', 'Tanggal & Waktu', 'Jenis', 'Customer', 'Kasir', 'Subtotal (Rp)', 'Diskon (Rp)', 'Total (Rp)', 'Status'];
    const rows = data.map(r => [
      getField(r, 'sales_number'), getField(r, 'date'), getField(r, 'type'),
      getField(r, 'customer'), getField(r, 'cashier'),
      getField(r, 'subtotal'), getField(r, 'discount'), getField(r, 'total'), getField(r, 'status'),
    ]);
    exportToCSV(`Laporan_Penjualan_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const handlePrint = () => window.print();

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
      })
    );
  }, []);

  return (
    <>
      <style jsx global>{PRINT_STYLE}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Laporan Penjualan</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laporan &gt; Laporan Penjualan</span>
          </div>
        </div>

        {/* Filter */}
        <div className="card no-print" style={{ padding: '1.25rem', display: 'flex', gap: '3rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, width: "20%" }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Dari Tanggal</label>
            <input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: "20%" }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Sampai Tanggal</label>
            <input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? 'Memuat...' : '🔍 Tampilkan'}
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ color: '#16a34a', borderColor: '#16a34a' }}>
              📊 Export CSV
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Cetak / PDF
            </button>
          </div>
        </div>

        {/* Detail Transaksi View (If selected) */}
        {detailLoading && (
          <div className="card no-print" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Memuat detail transaksi...
          </div>
        )}

        {selectedSaleDetail && !detailLoading && (
          <div className="card no-print" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>
                Rincian Transaksi: {selectedSaleDetail.sales_number}
              </h3>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedSaleDetail(null)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                ✖ Tutup Detail
              </button>
            </div>

            {/* Info Summary Grid */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Nomor Transaksi</div>
                <div style={{ fontWeight: 600 }}>: {selectedSaleDetail.sales_number}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Tanggal Transaksi</div>
                <div style={{ fontWeight: 500 }}>: {selectedSaleDetail.sales_datetime ? new Date(selectedSaleDetail.sales_datetime).toLocaleString('id-ID') : '-'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Jenis Penjualan</div>
                <div style={{ fontWeight: 500 }}>: {selectedSaleDetail.sales_type || 'BENGKEL'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Customer</div>
                <div style={{ fontWeight: 500 }}>: {selectedSaleDetail.customer_name_snapshot || selectedSaleDetail.customer?.customer_name || 'Pelanggan Umum'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Kasir</div>
                <div style={{ fontWeight: 500 }}>: {selectedSaleDetail.cashier_name_snapshot || selectedSaleDetail.cashier?.full_name || '-'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Subtotal</div>
                <div style={{ fontWeight: 500 }}>: Rp {Number(selectedSaleDetail.subtotal || 0).toLocaleString('id-ID')}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Diskon</div>
                <div style={{ fontWeight: 500 }}>: Rp {Number(selectedSaleDetail.discount_amount || 0).toLocaleString('id-ID')}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Total</div>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>: Rp {Number(selectedSaleDetail.total_amount || 0).toLocaleString('id-ID')}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Status Pembayaran</div>
                <div style={{ fontWeight: 500 }}>: {selectedSaleDetail.payment_status || 'PAID'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Status Transaksi</div>
                <div style={{ fontWeight: 500 }}>: {selectedSaleDetail.transaction_status || 'COMPLETED'}</div>
              </div>
            </div>

            {/* Product Details Table */}
            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Detail Produk yang Dibeli
              </h4>
              <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                      <th style={{ textAlign: 'center' }}>Kode Produk</th>
                      <th>Nama Produk</th>
                      <th style={{ textAlign: 'center' }}>Satuan</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Harga Jual</th>
                      <th style={{ textAlign: 'right' }}>Total Produk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSaleDetail.details || []).map((det: any, idx: number) => {
                      const qty = det.quantity || det.sold_quantity || 0;
                      const price = Number(det.unit_price || 0);
                      const lineTotal = Number(det.line_total || qty * price);
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{det.product_code_snapshot || det.product?.product_code || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{det.product_name_snapshot || det.product?.product_name || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{det.unit_name_snapshot || det.product?.unit?.unit_name || 'PCS'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{qty}</td>
                          <td style={{ textAlign: 'right' }}>Rp {price.toLocaleString('id-ID')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>Rp {lineTotal.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DataTable view (screen only) */}
        <div className="card report-view" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Transaksi Penjualan</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {loading ? 'Memuat...' : `${data.length} transaksi`}
            </span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuat data...</div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <DataTableClient
                data={dataForTable}
                columns={[
                  { title: 'No. Penjualan', data: '_sales_number', className: 'text-center' },
                  { title: 'Tanggal & Waktu', data: '_date', className: 'text-center' },
                  { title: 'Jenis', data: '_type', className: 'text-center' },
                  { title: 'Customer', data: '_customer', className: 'text-center' },
                  { title: 'Kasir', data: '_cashier', className: 'text-center' },
                  { title: 'Subtotal (Rp)', data: '_subtotal', className: 'text-center' },
                  { title: 'Diskon (Rp)', data: '_discount', className: 'text-center' },
                  { title: 'Total (Rp)', data: '_total', className: 'text-center' },
                  { title: 'Status', data: '_status', className: 'text-center' },
                  { title: 'Aksi', data: null, orderable: false, searchable: false, className: 'text-center' },
                ]}
                slots={{
                  2: (_c, r) => <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>{r._type || 'BENGKEL'}</span>,
                  5: (_c, r) => Number(r._subtotal).toLocaleString('id-ID'),
                  6: (_c, r) => Number(r._discount).toLocaleString('id-ID'),
                  7: (_c, r) => <span style={{ fontWeight: 600 }}>{Number(r._total).toLocaleString('id-ID')}</span>,
                  8: (_c, r) => <span className="badge badge-success">{r._status || 'PAID'}</span>,
                  9: (_c, r) => (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => handleSelectSale(r)}
                    >
                      Pilih
                    </button>
                  ),
                }}
                className="display table"
              >
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={5} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL (semua data):</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>Rp {totalSubtotal.toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>Rp {totalDiscount.toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right', padding: '1rem', color: 'var(--primary)', fontSize: '1.05rem' }}>Rp {grandTotal.toLocaleString('id-ID')}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </DataTableClient>
            </div>
          )}
        </div>

        {/* Print-only section — plain table, no pagination */}
        <div className="print-section">
          <div className="print-header">
            <h1>MITRA MOTOR</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>LAPORAN TRANSAKSI PENJUALAN</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
              Periode: {start || 'Semua'} s/d {end || 'Semua'}
              &nbsp;|&nbsp;
              Dicetak: {printDate}
            </p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th style={{ textAlign: 'center' }}>No. Penjualan</th>
                <th style={{ textAlign: 'center' }}>Tanggal &amp; Waktu</th>
                <th style={{ textAlign: 'center' }}>Jenis</th>
                <th style={{ textAlign: 'center' }}>Customer</th>
                <th style={{ textAlign: 'center' }}>Kasir</th>
                <th style={{ textAlign: 'center' }}>Subtotal (Rp)</th>
                <th style={{ textAlign: 'center' }}>Diskon (Rp)</th>
                <th style={{ textAlign: 'center' }}>Total (Rp)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600, textAlign: 'center' }}>{getField(row, 'sales_number') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'date') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'type') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'customer') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'cashier') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{Number(getField(row, 'subtotal')).toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'center' }}>{Number(getField(row, 'discount')).toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(getField(row, 'total')).toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'status') || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: 'right' }}>TOTAL PENJUALAN:</td>
                <td style={{ textAlign: 'center' }}>Rp {totalSubtotal.toLocaleString('id-ID')}</td>
                <td style={{ textAlign: 'center' }}>Rp {totalDiscount.toLocaleString('id-ID')}</td>
                <td style={{ textAlign: 'center' }}>Rp {grandTotal.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#555' }}>
            Total {data.length} transaksi
          </p>
        </div>

      </div>
    </>
  );
}
