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

export default function PurchaseReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printDate, setPrintDate] = useState('');
  useEffect(() => {
    setPrintDate(
      new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
      })
    );
  }, []);
  const getField = (item: any, key: string) => {
    switch (key) {
      case 'purchase_number': return item.purchase_number || item.purchaseNumber || '';
      case 'date': return item.date || item.purchase_datetime || '';
      case 'supplier': return item.supplier || item.supplier_name || '';
      case 'invoice_no': return item.invoice_no || item.supplier_invoice_number || '';
      case 'total': return Number(item.total || item.total_amount || 0);
      case 'user': return item.user || item.created_by_name || '';
      default: return item[key] || '';
    }
  };

  const dataForTable = data.map((item) => ({
    ...item,
    _purchase_number: getField(item, 'purchase_number'),
    _date: getField(item, 'date'),
    _supplier: getField(item, 'supplier'),
    _invoice_no: getField(item, 'invoice_no'),
    _total: getField(item, 'total'),
    _user: getField(item, 'user'),
  }));

  const totalAmount = data.reduce((s, i) => s + Number(getField(i, 'total')), 0);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      const res = await fetch(`/api/laporan/purchase${params.toString() ? `?${params}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setData(json);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [start, end]);

  useEffect(() => { fetchReport(); }, []);

  const handleExportCSV = () => {
    const headers = ['No. Pembelian', 'Tanggal & Waktu', 'Supplier', 'No. Faktur Supplier', 'Total (Rp)', 'Pembuat'];
    const rows = data.map(r => [
      getField(r, 'purchase_number'), getField(r, 'date'), getField(r, 'supplier'),
      getField(r, 'invoice_no'), getField(r, 'total'), getField(r, 'user'),
    ]);
    exportToCSV(`Laporan_Pembelian_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style jsx global>{PRINT_STYLE}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Laporan Pembelian</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laporan &gt; Laporan Pembelian</span>
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
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading} >
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

        {/* DataTable view (screen only) */}
        <div className="card report-view" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Transaksi Pembelian</h3>
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
                  { title: 'No. Pembelian', data: '_purchase_number', className: 'text-center' },
                  { title: 'Tanggal & Waktu', data: '_date', className: 'text-center' },
                  { title: 'Supplier', data: '_supplier', className: 'text-center' },
                  { title: 'No. Faktur Supplier', data: '_invoice_no', className: 'text-center' },
                  { title: 'Total (Rp)', data: '_total', className: 'text-center' },
                  { title: 'Pembuat', data: '_user', className: 'text-center' },
                ]}
                slots={{
                  0: (_c, r) => <span style={{ fontWeight: 600 }}>{r._purchase_number || '-'}</span>,
                  4: (_c, r) => <span style={{ fontWeight: 600 }}>{Number(r._total).toLocaleString('id-ID')}</span>,
                }}
                className="display table"
              >
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL PEMBELIAN:</td>
                    <td style={{ textAlign: 'right', padding: '1rem', color: 'var(--primary)', fontSize: '1.05rem' }}>
                      Rp {totalAmount.toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </DataTableClient>
            </div>
          )}
        </div>

        {/* Print-only section */}
        <div className="print-section">
          <div className="print-header">
            <h1>MITRA MOTOR</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>LAPORAN TRANSAKSI PEMBELIAN</p>
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
                <th style={{ textAlign: 'center' }}>No. Pembelian</th>
                <th style={{ textAlign: 'center' }}>Tanggal &amp; Waktu</th>
                <th style={{ textAlign: 'center' }}>Supplier</th>
                <th style={{ textAlign: 'center' }}>No. Faktur Supplier</th>
                <th style={{ textAlign: 'center' }}>Total (Rp)</th>
                <th style={{ textAlign: 'center' }}>Pembuat</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{getField(row, 'purchase_number') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'date') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'supplier') || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'invoice_no') || '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(getField(row, 'total')).toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'center' }}>{getField(row, 'user') || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL PEMBELIAN:</td>
                <td style={{ textAlign: 'right' }}>Rp {totalAmount.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#555' }}>Total {data.length} transaksi</p>
        </div>

      </div>
    </>
  );
}
