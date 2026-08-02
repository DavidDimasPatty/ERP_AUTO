"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/exportExcel';

export default function PurchaseReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const reportData = data;

  const getFieldValue = (item: any, key: string) => {
    switch (key) {
      case 'purchase_number':
        return item.purchase_number || item.purchaseNumber || '';
      case 'date':
        return item.date || item.purchase_datetime || '';
      case 'supplier':
        return item.supplier || item.supplier_name || '';
      case 'invoice_no':
        return item.invoice_no || item.supplier_invoice_number || '';
      case 'total':
        return Number(item.total || item.total_amount || 0);
      case 'user':
        return item.user || item.created_by_name || '';
      default:
        return item[key] || '';
    }
  };

  const filteredData = reportData.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      getFieldValue(item, 'purchase_number').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'date').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'supplier').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'invoice_no').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'user').toString().toLowerCase().includes(term)
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

  const totalAmount = filteredData.reduce((sum, item) => sum + Number(getFieldValue(item, 'total')), 0);

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
      let url = '/api/laporan/purchase';
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

  const handleExportExcel = () => {
    const headers = ['No. Pembelian', 'Tanggal & Waktu', 'Supplier', 'No. Faktur Supplier', 'Total (Rp)', 'Pembuat'];
    const rows = reportData.map(row => [
      row.purchase_number || '-',
      row.date || '-',
      row.supplier || row.supplier_name || '-',
      row.invoice_no || row.supplier_invoice_number || '-',
      row.total || 0,
      row.user || row.created_by_name || '-'
    ]);

    exportToCSV(`Laporan_Pembelian_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <>
      {/* Printable CSS Styling */}
      <style jsx global>{`
        @media print {
          aside, header, nav, .no-print, .btn, input, label {
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
        .print-header {
          display: none;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Top Header & Navigation */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Laporan Pembelian</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laporan &gt; Laporan Pembelian</span>
          </div>
          <Link href="/laporan" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            ← Kembali ke Menu Laporan
          </Link>
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
            <input type="text" className="form-input" placeholder="Cari nomor, supplier, faktur, pembuat..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} style={{ height: '38px' }}>
            🔍 Tampilkan
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', borderColor: '#16a34a' }}>
              📊 Export Excel
            </button>
            <button className="btn btn-primary" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🖨️ Export PDF / Cetak
            </button>
          </div>
        </div>

        {/* PDF Header for Printing */}
        <div className="print-header">
          <h1>SIMPLE ERP TOKO SPAREPART MOTOR</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>LAPORAN TRANSAKSI PEMBELIAN</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
            Periode: {start ? start : 'Semua'} s/d {end ? end : 'Semua'} | Dicetak: {new Date().toLocaleString('id-ID')}
          </p>
        </div>

        {/* Report Document Table Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }} className="no-print">
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Transaksi Pembelian</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {reportData.length} transaksi</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No</th>
                  <th onClick={() => handleSort('purchase_number')} style={{ cursor: 'pointer' }}>No. Pembelian {sortIndicator('purchase_number')}</th>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Tanggal & Waktu {sortIndicator('date')}</th>
                  <th onClick={() => handleSort('supplier')} style={{ cursor: 'pointer' }}>Supplier {sortIndicator('supplier')}</th>
                  <th onClick={() => handleSort('invoice_no')} style={{ cursor: 'pointer' }}>No. Faktur Supplier {sortIndicator('invoice_no')}</th>
                  <th onClick={() => handleSort('total')} style={{ cursor: 'pointer', textAlign: 'right' }}>Total (Rp) {sortIndicator('total')}</th>
                  <th onClick={() => handleSort('user')} style={{ cursor: 'pointer' }}>Pembuat {sortIndicator('user')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data laporan...</td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada data pembelian pada periode ini</td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.purchase_number || '-'}</td>
                      <td>{row.date || '-'}</td>
                      <td>{row.supplier || row.supplier_name || '-'}</td>
                      <td>{row.invoice_no || row.supplier_invoice_number || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{(Number(row.total) || 0).toLocaleString('id-ID')}</td>
                      <td>{row.user || row.created_by_name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL PEMBELIAN:</td>
                  <td style={{ textAlign: 'right', padding: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                    Rp {totalAmount.toLocaleString('id-ID')}
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
