"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/exportExcel';

export default function PurchaseReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const reportData = data;
  const totalAmount = reportData.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

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
                  <th>No. Pembelian</th>
                  <th>Tanggal & Waktu</th>
                  <th>Supplier</th>
                  <th>No. Faktur Supplier</th>
                  <th style={{ textAlign: 'right' }}>Total (Rp)</th>
                  <th>Pembuat</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data laporan...</td>
                  </tr>
                ) : reportData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada data pembelian pada periode ini</td>
                  </tr>
                ) : (
                  reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
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
        </div>

      </div>
    </>
  );
}
