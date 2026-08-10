"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/exportExcel';

export default function SalesReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [printData, setPrintData] = useState<any[]>([]);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const [isPrintReady, setIsPrintReady] = useState(false);

  const reportData = data;

  const getFieldValue = (item: any, key: string) => {
    switch (key) {
      case 'sales_number':
        return item.sales_number || item.salesNumber || '';
      case 'date':
        return item.date || item.sales_datetime || '';
      case 'type':
        return item.type || item.sales_type || '';
      case 'customer':
        return item.customer || item.customer_name || item.customer_name_snapshot || '';
      case 'cashier':
        return item.cashier || item.cashier_name || item.cashier_name_snapshot || '';
      case 'subtotal':
        return Number(item.subtotal || item.subtotal_amount || item.total_amount || 0);
      case 'discount':
        return Number(item.discount || item.discount_amount || 0);
      case 'total':
        return Number(item.total || item.total_amount || 0);
      case 'status':
        return item.status || item.payment_status || item.transaction_status || '';
      default:
        return item[key] || '';
    }
  };

  const filteredData = reportData.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      getFieldValue(item, 'sales_number').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'date').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'type').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'customer').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'cashier').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'status').toString().toLowerCase().includes(term)
    );
  });

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aValue = getFieldValue(a, sortKey);
        const bValue = getFieldValue(b, sortKey);

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return sortOrder === 'asc'
          ? String(aValue).localeCompare(String(bValue), 'id', { numeric: true })
          : String(bValue).localeCompare(String(aValue), 'id', { numeric: true });
      })
    : filteredData;

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const paginatedData = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const grandTotal = filteredData.reduce((sum, item) => sum + (Number(getFieldValue(item, 'total')) || 0), 0);
  const totalSubtotal = filteredData.reduce((sum, item) => sum + (Number(getFieldValue(item, 'subtotal')) || 0), 0);
  const totalDiscount = filteredData.reduce((sum, item) => sum + (Number(getFieldValue(item, 'discount')) || 0), 0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortIndicator = (key: string) => (sortKey === key ? (sortOrder === 'asc' ? '▲' : '▼') : '');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/api/laporan/sales';
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setData(json);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, start, end]);

  useEffect(() => {
    if (isPrintReady) {
      window.print();
    }
  }, [isPrintReady]);

  useEffect(() => {
    const afterPrint = () => setIsPrintReady(false);
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  const handleExportExcel = () => {
    const headers = ['No. Penjualan', 'Tanggal & Waktu', 'Jenis', 'Customer', 'Kasir', 'Subtotal (Rp)', 'Diskon (Rp)', 'Total (Rp)', 'Status'];
    const rows = reportData.map(row => [
      row.sales_number || '-',
      row.date || '-',
      row.type || row.sales_type || '-',
      row.customer || row.customer_name || '-',
      row.cashier || row.cashier_name || '-',
      row.subtotal || 0,
      row.discount || row.discount_amount || 0,
      row.total || row.total_amount || 0,
      row.status || row.payment_status || '-'
    ]);

    exportToCSV(`Laporan_Penjualan_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const loadPrintData = async () => {
    setIsPrintLoading(true);
    setIsPrintReady(false);

    try {
      let url = '/api/laporan/sales';
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setPrintData(json);
          setIsPrintReady(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPrintLoading(false);
    }
  };

  const handlePrintPDF = () => {
    loadPrintData();
  };

  return (
    <>
      {/* Printable CSS Styling */}
      <style jsx global>{`
        @media print {
          aside, header, nav, .no-print, .report-view, .btn, input, label {
            display: none !important;
          }
          body, main, .app-container, .main-content {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            width: 100% !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .print-preview {
            display: block !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid #000;
            padding-bottom: 0.5rem;
          }
          .print-header h1 {
            font-size: 1.5rem !important;
            margin: 0 !important;
            color: #000 !important;
          }
          .table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .table th, .table td {
            border: 1px solid #000 !important;
            padding: 0.5rem !important;
            color: #000 !important;
            font-size: 0.85rem !important;
          }
          .table th {
            background-color: #f0f0f0 !important;
          }
        }
        .print-preview {
          display: none;
        }
        .print-header {
          display: none;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Top Header & Navigation */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Laporan Penjualan</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laporan &gt; Laporan Penjualan</span>
          </div>

        </div>

        {/* Filter Card */}
        <div className="card no-print" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Dari Tanggal</label>
            <input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Sampai Tanggal</label>
            <input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Cari</label>
            <input type="text" className="form-input" placeholder="Cari nomor, customer, kasir, status..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} style={{ height: '38px' }}>
            🔍 Tampilkan
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', borderColor: '#16a34a' }}>
              📊 Export CSV
            </button>
            <button className="btn btn-primary" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🖨️ Export PDF / Cetak
            </button>
          </div>
        </div>

        {/* PDF Header for Printing */}
        <div className="print-preview" style={{ display: isPrintReady ? 'block' : 'none' }}>
          <div className="print-header">
            <h1>MITRA MOTOR</h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>LAPORAN TRANSAKSI PENJUALAN</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
              Periode: {start ? start : 'Semua'} s/d {end ? end : 'Semua'} | Dicetak: {new Date().toLocaleString('id-ID')}
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Transaksi Penjualan</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {printData.length} transaksi</span>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>No. Penjualan</th>
                    <th>Tanggal & Waktu</th>
                    <th>Jenis</th>
                    <th>Customer</th>
                    <th>Kasir</th>
                    <th style={{ textAlign: 'right' }}>Subtotal (Rp)</th>
                    <th style={{ textAlign: 'right' }}>Diskon (Rp)</th>
                    <th style={{ textAlign: 'right' }}>Total Omset (Rp)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isPrintLoading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data cetak...</td>
                    </tr>
                  ) : printData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada data penjualan untuk dicetak</td>
                    </tr>
                  ) : (
                    printData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.sales_number || '-'}</td>
                        <td>{row.date || '-'}</td>
                        <td>{row.type || row.sales_type || '-'}</td>
                        <td>{row.customer || '-'}</td>
                        <td>{row.cashier || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{(Number(row.subtotal) || 0).toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'right' }}>{(Number(row.discount) || 0).toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{(Number(row.total) || 0).toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'center' }}>{row.status || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={6} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL PENJUALAN:</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>Rp {printData.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0).toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>Rp {printData.reduce((sum, item) => sum + (Number(item.discount) || 0), 0).toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right', padding: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Rp {printData.reduce((sum, item) => sum + (Number(item.total) || 0), 0).toLocaleString('id-ID')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Report Document Table Card */}
        <div className="card report-view" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }} className="no-print">
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Transaksi Penjualan</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {reportData.length} transaksi</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No</th>
                  <th onClick={() => handleSort('sales_number')} style={{ cursor: 'pointer' }}>No. Penjualan {sortIndicator('sales_number')}</th>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Tanggal & Waktu {sortIndicator('date')}</th>
                  <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>Jenis {sortIndicator('type')}</th>
                  <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortIndicator('customer')}</th>
                  <th onClick={() => handleSort('cashier')} style={{ cursor: 'pointer' }}>Kasir {sortIndicator('cashier')}</th>
                  <th onClick={() => handleSort('subtotal')} style={{ cursor: 'pointer', textAlign: 'right' }}>Subtotal (Rp) {sortIndicator('subtotal')}</th>
                  <th onClick={() => handleSort('discount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Diskon (Rp) {sortIndicator('discount')}</th>
                  <th onClick={() => handleSort('total')} style={{ cursor: 'pointer', textAlign: 'right' }}>Total Omset (Rp) {sortIndicator('total')}</th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', textAlign: 'center' }}>Status {sortIndicator('status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data laporan...</td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada data penjualan pada periode ini</td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.sales_number || '-'}</td>
                      <td>{row.date || '-'}</td>
                      <td><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>{row.type || 'BENGKEL'}</span></td>
                      <td>{row.customer || '-'}</td>
                      <td>{row.cashier || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{(Number(row.subtotal) || 0).toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'right' }}>{(Number(row.discount) || 0).toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{(Number(row.total) || 0).toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success">{row.status || 'PAID'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                  <td colSpan={6} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL PENJUALAN:</td>
                  <td style={{ textAlign: 'right', padding: '1rem' }}>Rp {totalSubtotal.toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'right', padding: '1rem' }}>Rp {totalDiscount.toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'right', padding: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="no-print" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              Menampilkan {paginatedData.length} dari {filteredData.length} data
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                Sebelumnya
              </button>
              <span style={{ alignSelf: 'center' }}>Halaman {currentPage} dari {totalPages}</span>
              <button className="btn btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                Berikutnya
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
