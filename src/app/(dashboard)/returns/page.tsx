"use client";

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import SearchableSelect from '@/components/SearchableSelect';
import DataTableClient from '@/components/DataTableClient';

export default function SalesReturnPage() {
  // Search State
  const [salesNumberQuery, setSalesNumberQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundSales, setFoundSales] = useState<any>(null);

  // Return Form State
  const [returnReason, setReturnReason] = useState('Produk tidak sesuai');
  const [notes, setNotes] = useState('');
  const [returnItems, setReturnItems] = useState<any[]>([]);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const initializeReturnItems = (data: any) => {
    if (!data?.details) return [];
    return data.details.map((d: any) => {
      const prevRet = d.previous_return_quantity || 0;
      const maxRet = d.returnable_quantity ?? (d.sold_quantity - prevRet);
      return {
        sales_detail_id: d.sales_detail_id,
        product_id: d.product_id,
        product_code: d.product_code_snapshot,
        name: d.product_name_snapshot,
        bought: d.sold_quantity,
        returned: prevRet,
        maxReturn: maxRet,
        currentStock: d.current_stock ?? 0,
        returnQty: '',
        reason: '',
      };
    });
  };

  const searchSalesNumber = async (salesNumber: string) => {
    if (!salesNumber) return;
    setIsSearching(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFoundSales(null);
    setReturnItems([]);
    try {
      const res = await fetch(`/api/returns/check-sales/${encodeURIComponent(salesNumber)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transaksi tidak ditemukan atau tidak dapat diretur');
      setFoundSales(data);
      setReturnItems(initializeReturnItems(data));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => { await searchSalesNumber(salesNumberQuery); };

  const handleSelectSales = async (sale: any) => {
    const salesNumber = sale.sales_number || sale.salesNumber || '';
    setSalesNumberQuery(salesNumber);
    await searchSalesNumber(salesNumber);
  };

  const handleReturnQtyChange = (salesDetailId: number, val: string) => {
    setReturnItems((prev) =>
      prev.map((i) => i.sales_detail_id === salesDetailId ? { ...i, returnQty: val } : i)
    );
  };

  const handleItemReasonChange = (salesDetailId: number, val: string) => {
    setReturnItems((prev) =>
      prev.map((i) => i.sales_detail_id === salesDetailId ? { ...i, reason: val } : i)
    );
  };

  const handleRemoveItem = (salesDetailId: number) => {
    setReturnItems((prev) =>
      prev.map((i) => i.sales_detail_id === salesDetailId ? { ...i, returnQty: '' } : i)
    );
  };

  const activeReturnItems = returnItems.filter((item) => (parseInt(item.returnQty) || 0) > 0);
  const totalTypes = activeReturnItems.length;
  const totalReturnQty = activeReturnItems.reduce((acc, item) => acc + (parseInt(item.returnQty) || 0), 0);

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!foundSales) { setErrorMsg('Cari dan pilih transaksi penjualan terlebih dahulu.'); return; }
    if (activeReturnItems.length === 0) { setErrorMsg('Tentukan jumlah retur untuk minimal 1 produk.'); return; }

    const confirmSubmit = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menyimpan retur ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, simpan',
      cancelButtonText: 'Batal',
    });
    if (!confirmSubmit.isConfirmed) return;

    for (const item of activeReturnItems) {
      const q = parseInt(item.returnQty);
      if (q > item.maxReturn) {
        setErrorMsg(`Jumlah retur produk ${item.name} melebihi maksimal yang diizinkan (${item.maxReturn}).`);
        return;
      }
    }

    setIsLoading(true);
    const payload = {
      sales_id: foundSales.sales_id,
      return_reason: returnReason,
      notes,
      details: activeReturnItems.map((item) => ({
        sales_detail_id: item.sales_detail_id,
        product_id: item.product_id,
        return_quantity: parseInt(item.returnQty),
        return_reason: item.reason || returnReason,
      })),
    };

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memproses retur penjualan');
      setSuccessMsg(`Retur berhasil disimpan dengan No: ${data.sales_return_number}`);
      setFoundSales(null);
      setSalesNumberQuery('');
      setReturnItems([]);
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sales list for selection ──────────────────────────────────
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const dataForTable = salesData.map((item) => ({
    ...item,
    // Serialize any Decimal/Date to plain values
    _sales_number: item.sales_number || '',
    _date: item.date,
    _customer: item.customer || '',
    _cashier: item.cashier || '',
    _total: Number(item.total || 0),
  }));

  const fetchReport = async () => {
    setSalesLoading(true);
    try {
      let url = '/api/laporan/sales';
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setSalesData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [start, end]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Penjualan / Retur Penjualan / <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tambah Retur</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>🧾</div>
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', fontWeight: 700 }}>Retur Penjualan</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Mencatat barang yang dikembalikan customer berdasarkan transaksi penjualan</p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '1rem', background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)' }}>
          {successMsg}
        </div>
      )}

      {/* 1. Pilih Transaksi Penjualan */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>1. Pilih Transaksi Penjualan</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* KIRI - Nomor transaksi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0 }}>
              Nomor Transaksi Penjualan
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                value={salesNumberQuery}
                onChange={(e) => setSalesNumberQuery(e.target.value)}
                placeholder="Contoh: PJ-20260730-000150"
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />

              <button
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.25rem',
                  whiteSpace: 'nowrap',
                }}
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? 'Mencari...' : '🔍 Cari'}
              </button>
            </div>
          </div>

          {/* KANAN */}
          {!foundSales ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                alignItems: "start",
                gap: '1rem',
              }}
            >
              <div>
                <label
                  className="form-label"
                  style={{
                    marginBottom: '0.5rem',
                    display: 'block',
                  }}
                >
                  Dari Tanggal
                </label>

                <input
                  type="date"
                  className="form-input"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    marginBottom: '0.5rem',
                    display: 'block',
                  }}
                >
                  Sampai Tanggal
                </label>

                <input
                  type="date"
                  className="form-input"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--success-light)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center',
                color: 'var(--success)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>✓</span>
                Transaksi ditemukan
              </div>

              <div
                style={{
                  fontSize: '0.85rem',
                  marginTop: '0.25rem',
                }}
              >
                {foundSales.sales_number} -{' '}
                {new Date(foundSales.sales_datetime).toLocaleString('id-ID')}
              </div>
            </div>
          )}
        </div>
        {!foundSales && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* <div style={{ display: 'flex', flexDirection: "row", gap: "3rem", marginBottom: '1rem', alignItems: 'start' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Dari Tanggal</label>
                <input type="date" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Sampai Tanggal</label>
                <input type="date" className="form-input" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div> */}

            <div style={{ overflowX: 'auto' }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 'var(--radius-md)' }}>
                {salesLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuat data...</div>
                ) : (
                  <DataTableClient
                    data={dataForTable}
                    columns={[
                      { title: 'No Transaksi', data: '_sales_number' },
                      { title: 'Tanggal', data: '_date' },
                      { title: 'Customer', data: '_customer' },
                      { title: 'Kasir', data: '_cashier' },
                      { title: 'Total', data: null, className: 'text-right' },
                      { title: 'Aksi', data: null, orderable: false, searchable: false },
                    ]}
                    slots={{
                      4: (_c: any, rowData: any) => `Rp ${Number(rowData._total).toLocaleString('id-ID')}`,
                      5: (_c: any, rowData: any) => (
                        <button className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }} onClick={() => handleSelectSales(rowData)}>
                          Pilih
                        </button>
                      ),
                    }}
                    className="display table"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {foundSales && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Nomor Transaksi</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.sales_number}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Tanggal Transaksi</div>
              <div style={{ fontWeight: 500 }}>: {new Date(foundSales.sales_datetime).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Jenis Penjualan</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.sales_type}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Customer</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.customer_name_snapshot || 'Pelanggan Umum'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Kasir</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.cashier_name_snapshot}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Subtotal</div>
              <div style={{ fontWeight: 500 }}>: Rp {parseFloat(foundSales.subtotal ?? 0).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Diskon</div>
              <div style={{ fontWeight: 500 }}>: Rp {parseFloat(foundSales.discount_amount ?? 0).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Total</div>
              <div style={{ fontWeight: 500 }}>: Rp {parseFloat(foundSales.total_amount ?? 0).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Status Pembayaran</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.payment_status}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Status Transaksi</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.transaction_status}</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Informasi Retur */}
      {foundSales && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>2. Informasi Retur</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Nomor Retur</label>
                <input type="text" className="form-input" value="Dibuat Otomatis" readOnly style={{ background: 'var(--bg-tertiary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Tanggal Retur</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-input" value={new Date().toLocaleString('id-ID')} readOnly style={{ width: '100%', background: 'var(--bg-tertiary)' }} />
                  <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>📅</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Alasan Retur (Umum) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <SearchableSelect
                  value={returnReason}
                  options={[
                    { value: 'Produk tidak sesuai', label: 'Produk tidak sesuai' },
                    { value: 'Produk cacat/rusak', label: 'Produk cacat/rusak' },
                    { value: 'Salah input', label: 'Salah input' },
                    { value: 'Lainnya', label: 'Lainnya' },
                  ]}
                  onChange={(value) => setReturnReason(value)}
                  placeholder="Pilih alasan retur..."
                  className="form-select form-input"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'flex-start' }}>
                <label className="form-label" style={{ margin: 0, marginTop: '0.75rem' }}>Catatan</label>
                <textarea
                  className="form-input"
                  placeholder="Catatan tambahan (opsional)"
                  value={notes}
                  onChange={(e) => { const value = e.target.value.replace(/[^a-zA-Z0-9\s.,()\-_/]/g, ''); setNotes(value); }}
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detail Produk yang Diretur — plain table (has controlled inputs) */}
      {foundSales && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>3. Detail Produk yang Diretur</h3>
          </div>

          <div className="table-container" style={{ border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: 0, padding: '1rem', overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th style={{ textAlign: 'center' }}>Dibeli (PCS)</th>
                  <th style={{ textAlign: 'center' }}>Sdh Retur</th>
                  <th style={{ textAlign: 'center' }}>Maks Retur</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Jml Retur *</th>
                  <th style={{ textAlign: 'center' }}>Stok +</th>
                  <th style={{ width: '180px' }}>Alasan per Produk</th>
                  <th style={{ textAlign: 'center', width: '60px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map((item) => {
                  const qtyVal = parseInt(item.returnQty) || 0;
                  return (
                    <tr key={item.sales_detail_id}>
                      <td style={{ fontWeight: 600 }}>{item.product_code} — {item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.bought}</td>
                      <td style={{ textAlign: 'center' }}>{item.returned}</td>
                      <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{item.maxReturn}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={item.returnQty}
                          onChange={(e) => handleReturnQtyChange(item.sales_detail_id, e.target.value)}
                          max={item.maxReturn}
                          min="0"
                          style={{ width: '80px', padding: '0.4rem', textAlign: 'center', margin: '0 auto', display: 'block' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                        {qtyVal > 0 ? `+${qtyVal}` : '—'}
                      </td>
                      <td>
                        <SearchableSelect
                          value={item.reason}
                          options={[
                            { value: '', label: 'Ikut Alasan Umum' },
                            { value: 'Produk tidak sesuai', label: 'Produk tidak sesuai' },
                            { value: 'Produk cacat', label: 'Produk cacat' },
                          ]}
                          onChange={(value) => handleItemReasonChange(item.sales_detail_id, value)}
                          placeholder="Alasan per produk..."
                          className="form-select form-input"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.6rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                          onClick={() => handleRemoveItem(item.sales_detail_id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '1.5rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '150px auto', gap: '0.75rem', minWidth: '350px' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Jenis Produk</div>
              <div style={{ fontWeight: 700 }}>: {totalTypes}</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Quantity Retur</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>: {totalReturnQty} PCS</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {foundSales && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.75rem 2.5rem' }}
            onClick={() => { setFoundSales(null); setSalesNumberQuery(''); setReturnItems([]); }}
          >
            Batal
          </button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2.5rem' }} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : '💾 Simpan Retur'}
          </button>
        </div>
      )}
    </div>
  );
}
