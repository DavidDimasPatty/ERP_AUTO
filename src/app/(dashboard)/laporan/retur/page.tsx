"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/exportExcel';

export default function ReturReport() {
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

  const getFieldValue = (item: any, key: string) => {
    switch (key) {
      case 'sales_return_number':
        return item.sales_return_number || item.salesReturnNumber || '';
      case 'date':
        return item.date || item.return_datetime || '';
      case 'sales_number':
        return item.sales_number || item.salesNumber || '';
      case 'customer':
        return item.customer || item.customer_name || item.customer_name_snapshot || '';
      case 'operator':
        return item.operator || item.created_by_name_snapshot || '';
      case 'total_items':
        return Number(item.total_items || 0);
      case 'total_quantity':
        return Number(item.total_quantity || 0);
      case 'status':
        return item.status || item.return_status || '';
      case 'reason':
        return item.reason || item.return_reason || '';
      default:
        return item[key] || '';
    }
  };

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      getFieldValue(item, 'sales_return_number').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'date').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'sales_number').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'customer').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'operator').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'status').toString().toLowerCase().includes(term) ||
      getFieldValue(item, 'reason').toString().toLowerCase().includes(term)
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

  const totalReturns = filteredData.length;
  const totalItems = filteredData.reduce((sum, item) => sum + (Number(getFieldValue(item, 'total_items')) || 0), 0);
  const totalQuantity = filteredData.reduce((sum, item) => sum + (Number(getFieldValue(item, 'total_quantity')) || 0), 0);

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
      let url = '/api/laporan/retur';
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
    const headers = ['No. Retur', 'Tanggal & Waktu', 'No. Penjualan', 'Customer', 'Total Item', 'Jumlah Qty', 'Operator', 'Status', 'Alasan Retur'];
    const rows = data.map(row => [
      row.sales_return_number || '-',
      row.date || '-',
      row.sales_number || '-',
      row.customer || '-',
      row.total_items || 0,
      row.total_quantity || 0,
      row.operator || '-',
      row.status || '-',
      row.reason || '-',
    ]);

    exportToCSV(`Laporan_Retur_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const loadPrintData = async () => {
    setIsPrintLoading(true);
    setIsPrintReady(false);

    try {
      let url = '/api/laporan/retur';
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
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Laporan Retur Penjualan</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laporan &gt; Laporan Retur</span>
          </div>
        </div>

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
            <input type="text" className="form-input" placeholder="Cari nomor retur, nomor penjualan, customer, operator..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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


        {/* print */}
        <div className="print-preview" style={{ display: isPrintReady ? 'block' : 'none' }}>
          <div className="print-header">
            <h1>SIMPLE ERP TOKO SPAREPART MOTOR</h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>LAPORAN RETUR PELANGGAN</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
              Periode: {start ? start : 'Semua'} s/d {end ? end : 'Semua'} | Dicetak: {new Date().toLocaleString('id-ID')}
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Retur Penjualan</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {printData.length} retur</span>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>No. Retur</th>
                    <th>Tanggal & Waktu</th>
                    <th>No. Penjualan</th>
                    <th style={{ width: '110px' }}>Customer</th>
                    <th style={{ textAlign: 'right' }}>Item Retur</th>
                    <th style={{ textAlign: 'right' }}>Qty Retur</th>
                    <th>Operator</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Alasan Retur</th>
                  </tr>
                </thead>
                <tbody>
                  {isPrintLoading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data cetak...</td>
                    </tr>
                  ) : printData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada data retur untuk dicetak</td>
                    </tr>
                  ) : (
                    printData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.sales_return_number || '-'}</td>
                        <td>{row.date || '-'}</td>
                        <td>{row.sales_number || '-'}</td>
                        <td>{row.customer || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{Number(row.total_items || 0).toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'right' }}>{Number(row.total_quantity || 0).toLocaleString('id-ID')}</td>
                        <td>{row.operator || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge" style={{ background: row.status === 'COMPLETED' ? 'rgba(34,197,94,0.14)' : 'rgba(107,114,128,0.16)', color: row.status === 'COMPLETED' ? '#16a34a' : '#374151' }}>
                            {row.status || '-'}
                          </span>
                        </td>
                        <td>{row.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL RETUR:</td>
                    <td style={{ padding: '1rem' }}>{printData.length} transaksi</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>{printData.reduce((sum, item) => sum + Number(getFieldValue(item, 'total_items')), 0).toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>{printData.reduce((sum, item) => sum + Number(getFieldValue(item, 'total_quantity')), 0).toLocaleString('id-ID')}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="card report-view" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }} className="no-print">
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Retur Penjualan</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {filteredData.length} retur</span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No</th>
                  <th onClick={() => handleSort('sales_return_number')} style={{ cursor: 'pointer' }}>No. Retur {sortIndicator('sales_return_number')}</th>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Tanggal & Waktu {sortIndicator('date')}</th>
                  <th onClick={() => handleSort('sales_number')} style={{ cursor: 'pointer' }}>No. Penjualan {sortIndicator('sales_number')}</th>
                  <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortIndicator('customer')}</th>
                  <th onClick={() => handleSort('total_items')} style={{ cursor: 'pointer', textAlign: 'right' }}>Item Retur {sortIndicator('total_items')}</th>
                  <th onClick={() => handleSort('total_quantity')} style={{ cursor: 'pointer', textAlign: 'right' }}>Qty Retur {sortIndicator('total_quantity')}</th>
                  <th onClick={() => handleSort('operator')} style={{ cursor: 'pointer' }}>Operator {sortIndicator('operator')}</th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', textAlign: 'center' }}>Status {sortIndicator('status')}</th>
                  <th onClick={() => handleSort('reason')} style={{ cursor: 'pointer' }}>Alasan Retur {sortIndicator('reason')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data laporan...</td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada data retur pada periode ini</td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.sales_return_number || '-'}</td>
                      <td>{row.date || '-'}</td>
                      <td>{row.sales_number || '-'}</td>
                      <td>{row.customer || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{Number(row.total_items || 0).toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'right' }}>{Number(row.total_quantity || 0).toLocaleString('id-ID')}</td>
                      <td>{row.operator || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: row.status === 'COMPLETED' ? 'rgba(34,197,94,0.14)' : 'rgba(107,114,128,0.16)', color: row.status === 'COMPLETED' ? '#16a34a' : '#374151' }}>
                          {row.status || '-'}
                        </span>
                      </td>
                      <td>{row.reason || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL RETUR:</td>
                  <td style={{ padding: '1rem' }}>{totalReturns} transaksi</td>
                  <td style={{ textAlign: 'right', padding: '1rem' }}>{totalItems.toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'right', padding: '1rem' }}>{totalQuantity.toLocaleString('id-ID')}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="no-print" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              Menampilkan {paginatedData.length} dari {filteredData.length} data retur
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                Sebelumnya
              </button>
              <span>Halaman {currentPage} dari {totalPages}</span>
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
