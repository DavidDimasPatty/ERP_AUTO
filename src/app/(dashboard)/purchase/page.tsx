"use client";

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function PurchaseTransactionPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<any[]>([]);

  // Master Data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const resSup = await fetch('/api/master/supplier?is_active=true');
        const dataSup = await resSup.json();
        if (dataSup.data) setSuppliers(dataSup.data);

        const resProd = await fetch('/api/master/product?is_active=true');
        const dataProd = await resProd.json();
        if (dataProd.data) setProducts(dataProd.data);
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  const handleAddProduct = async () => {
    if (!selectedProduct) return;
    const prodInfo = products.find(p => p.product_id.toString() === selectedProduct);
    if (!prodInfo) return;

    const itemQty = parseInt(qty || '0');
    const itemPrice = parseInt(price || '0');

    if (itemQty <= 0 || itemPrice <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Kuantitas dan Harga harus lebih dari 0',
      });
      return;
    }

    const confirmAdd = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Tambahkan produk ini ke keranjang?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, tambahkan',
      cancelButtonText: 'Batal',
    });

    if (!confirmAdd.isConfirmed) return;

    if (itemQty <= 0 || itemPrice <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Kuantitas dan Harga harus lebih dari 0',
      });
      return;
    }

    const item = {
      product_id: prodInfo.product_id,
      product_code: prodInfo.product_code,
      name: prodInfo.product_name,
      unit: prodInfo.unit?.unit_name || 'PCS',
      quantity: itemQty,
      purchase_unit_price: itemPrice,
      line_total: itemQty * itemPrice
    };
    setCart([...cart, item]);
    setModalOpen(false);
    setSelectedProduct('');
    setQty('');
    setPrice('');
  };

  const totalPurchase = cart.reduce((acc, item) => acc + item.line_total, 0);
  const activeSupplier = suppliers.find(s => s.supplier_id.toString() === selectedSupplier);

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedSupplier) {
      setErrorMsg('Pilih supplier terlebih dahulu.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Keranjang kosong, tambahkan minimal 1 produk.');
      return;
    }

    const confirmSubmit = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menyimpan transaksi pembelian ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, simpan',
      cancelButtonText: 'Batal',
    });

    if (!confirmSubmit.isConfirmed) return;

    setIsLoading(true);

    const payload = {
      supplier_id: parseInt(selectedSupplier),
      supplier_invoice_number: invoiceNumber,
      notes: notes,
      details: cart.map(c => ({
        product_id: c.product_id,
        quantity: c.quantity,
        purchase_unit_price: c.purchase_unit_price,
        line_total: c.line_total
      }))
    };

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan transaksi pembelian');
      }

      setSuccessMsg(`Transaksi berhasil disimpan dengan No: ${data.purchase_number}`);
      // Reset form
      setCart([]);
      setSelectedSupplier('');
      setInvoiceNumber('');
      setNotes('');

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCart([]);
    setSelectedSupplier('');
    setInvoiceNumber('');
    setNotes('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Tambah Transaksi Pembelian</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pembelian &gt; Transaksi Pembelian &gt; <span style={{ color: 'var(--primary)' }}>Tambah</span></span>
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

      {/* Informasi Pembelian Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Informasi Pembelian</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>

          {/* Column 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nomor Pembelian</label>
              <input type="text" className="form-input" value="Dibuat Otomatis" readOnly style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Nomor dibuat otomatis oleh sistem</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Supplier <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-select form-input" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="">Pilih supplier</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">No. Faktur Supplier</label>
              <input type="text" className="form-input" placeholder="Masukkan nomor faktur (jika ada)" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          {/* Column 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nama Supplier</label>
              <input type="text" className="form-input" value={activeSupplier ? activeSupplier.supplier_name : '-'} readOnly style={{ background: 'var(--bg-tertiary)' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Catatan</label>
              <textarea className="form-input" placeholder="Masukkan catatan (opsional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }}></textarea>
            </div>
          </div>

          {/* Column 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0, height: '100%' }}>
              <label className="form-label">Total Pembelian</label>
              <div style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid var(--primary-light)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 'calc(100% - 1.5rem)',
                padding: '2rem'
              }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  Rp {totalPurchase.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Detail Pembelian Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Detail Pembelian</h3>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Tambah Produk
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: 0 }}>
          <table className="table" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '1rem 1.5rem', width: '50px' }}>No</th>
                <th style={{ padding: '1rem 1.5rem' }}>Produk</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Satuan</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Jumlah (PCS)</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Harga Beli / PCS</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Harga</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', width: '80px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '64px', height: '64px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--text-muted)' }}>
                        📇
                      </div>
                      <div>
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Belum ada produk ditambahkan</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Klik tombol "+ Tambah Produk" untuk menambahkan produk</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                cart.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '1rem 1.5rem' }}>{index + 1}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{item.product_code} - {item.name}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>{item.unit}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>{item.purchase_unit_price.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600 }}>{item.line_total.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <button className="btn btn-danger" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                        const newCart = [...cart];
                        newCart.splice(index, 1);
                        setCart(newCart);
                      }}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '1.5rem', gap: '2rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: '1.5rem' }}>Rp {totalPurchase.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        {/* Catatan Info */}
        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid var(--primary-light)', padding: '1.25rem', borderRadius: 'var(--radius-md)', width: '400px' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span>ℹ️</span> Catatan
          </h4>
          <ul style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>Jumlah pembelian harus dalam satuan PCS.</li>
            <li>Harga beli adalah harga per PCS.</li>
            <li>Total harga per produk harus sesuai dengan faktur supplier.</li>
            <li>Setelah disimpan, stok akan bertambah otomatis.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }} onClick={handleClear}>
            ↺ Bersihkan
          </button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : '💾 Simpan Transaksi'}
          </button>
        </div>

      </div>

      {/* Tambah Produk Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Tambah Produk</h3>
              <button onClick={() => setModalOpen(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Produk <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-select form-input" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                  <option value="">Cari produk berdasarkan kode atau nama...</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>{p.product_code} - {p.product_name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Satuan</label>
                  <input type="text" className="form-input" value="PCS" readOnly style={{ background: 'var(--bg-tertiary)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (PCS) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" className="form-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" min="1" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Harga Beli / PCS <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Rp</span>
                    <input
                      type="text"
                      className="form-input"
                      value={Number(price || 0).toLocaleString('id-ID')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\./g, '');
                        setPrice(value);
                      }}
                      style={{ border: 'none', background: 'transparent', width: '100%', color: 'var(--text-primary)', outline: 'none' }} placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Harga <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Rp</span>
                    <input type="text" value={(parseInt(qty || '0') * parseInt(price || '0')).toLocaleString('id-ID')} readOnly style={{ border: 'none', background: 'transparent', width: '100%', color: 'var(--text-secondary)', outline: 'none' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Batal</button>
              <button type="button" onClick={handleAddProduct} className="btn btn-primary" disabled={!selectedProduct || !qty || !price}>Simpan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
