"use client";

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function SalesTransactionPage() {
  const [activeTab, setActiveTab] = useState('BENGKEL');

  // Master Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [notes, setNotes] = useState('');

  // Cart & Product Search State
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState('1');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Loading & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const resCust = await fetch('/api/master/customer?limit=100');
        const dataCust = await resCust.json();
        if (dataCust.data) setCustomers(dataCust.data);

        const resProd = await fetch('/api/master/product?limit=100');
        const dataProd = await resProd.json();
        if (dataProd.data) setProducts(dataProd.data);
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Handle Product Search/Selection
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) {
      setSelectedProduct(null);
      return;
    }
    const prod = products.find(p => p.product_id.toString() === pId);
    if (prod) {
      // transform prices array to object map for easy access
      const priceMap: Record<number, number> = {};
      if (prod.prices) {
        prod.prices.forEach((p: any) => {
          priceMap[p.price_level_id] = parseFloat(p.price_amount);
        });
      }
      setSelectedProduct({
        ...prod,
        priceMap,
        currentStock: prod.stock?.stock_quantity || 0,
        unitName: prod.unit?.unit_name || 'PCS'
      });
    }
  };

  const currentProductPrice = selectedProduct ? (selectedProduct.priceMap[parseInt(selectedPriceLevel)] || 0) : 0;

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    const confirmAdd = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Tambahkan produk ini ke keranjang?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, tambahkan',
      cancelButtonText: 'Batal',
    });

    if (!confirmAdd.isConfirmed) return;

    // Check if already in cart
    const existingIndex = cart.findIndex(c => c.product_id === selectedProduct.product_id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].line_total = newCart[existingIndex].quantity * newCart[existingIndex].unit_price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product_id: selectedProduct.product_id,
        product_code: selectedProduct.product_code,
        product_name: selectedProduct.product_name,
        unit: selectedProduct.unitName,
        price_level_id: parseInt(selectedPriceLevel),
        price_level_name: `Harga ${selectedPriceLevel}`,
        unit_price: currentProductPrice,
        quantity: 1,
        line_total: currentProductPrice
      }]);
    }

    setSelectedProduct(null);
    setSearchQuery('');
  };

  const updateCartQty = (index: number, val: string) => {
    const qty = parseInt(val) || 0;
    const newCart = [...cart];
    newCart[index].quantity = qty;
    newCart[index].line_total = qty * newCart[index].unit_price;
    setCart(newCart);
  };

  const removeCartItem = async (index: number) => {
    const confirmRemove = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Hapus item ini dari keranjang?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });

    if (!confirmRemove.isConfirmed) return;

    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.line_total, 0);
  const totalAmount = subtotal - discountAmount;
  const returnAmount = (parseInt(tenderedAmount || '0')) - totalAmount;

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setErrorMsg('Keranjang kosong, tambahkan minimal 1 produk.');
      return;
    }

    const confirmSubmit = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menyimpan transaksi penjualan ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, simpan',
      cancelButtonText: 'Batal',
    });

    if (!confirmSubmit.isConfirmed) return;

    if (totalAmount < 0) {
      setErrorMsg('Total tagihan tidak boleh negatif.');
      return;
    }

    const tAmount = parseInt(tenderedAmount || '0');
    if (paymentMethod === 'CASH' && tAmount < totalAmount) {
      setErrorMsg(`Uang diterima (Rp ${tAmount.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`);
      return;
    }
    if (paymentMethod !== 'CASH' && tAmount !== totalAmount) {
      setErrorMsg(`Untuk non-tunai, jumlah uang diterima harus pas Rp ${totalAmount.toLocaleString('id-ID')}.`);
      return;
    }

    setIsLoading(true);

    const payload = {
      sales_type: activeTab,
      customer_id: selectedCustomer || null,
      discount_amount: discountAmount,
      payment: {
        payment_method: paymentMethod,
        tendered_amount: tAmount,
        reference_number: '' // can add input for this if needed
      },
      details: cart.map(c => ({
        product_id: c.product_id,
        price_level_id: c.price_level_id,
        quantity: c.quantity,
        unit_price: c.unit_price
      }))
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan transaksi');
      }

      setSuccessMsg(`Transaksi berhasil disimpan dengan No: ${data.sales_number}`);
      // Reset form
      setCart([]);
      setSelectedCustomer('');
      setTenderedAmount('');
      setDiscountAmount(0);
      setNotes('');

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>

      {/* Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Transaksi Penjualan</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Penjualan &gt; Transaksi Penjualan</span>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Tabs */}
      {/* <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex' }}>
          <button 
            style={{ 
              padding: '1rem 1.5rem', background: 'none', border: 'none', 
              borderBottom: activeTab === 'BENGKEL' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'BENGKEL' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.85rem'
            }}
            onClick={() => setActiveTab('BENGKEL')}
          >
            Penjualan Bengkel
          </button>
          <button 
            style={{ 
              padding: '1rem 1.5rem', background: 'none', border: 'none', 
              borderBottom: activeTab === 'ECERAN' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'ECERAN' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.85rem'
            }}
            onClick={() => setActiveTab('ECERAN')}
          >
            Penjualan Eceran
          </button>
        </div>
      </div> */}

      {/* Informasi Transaksi Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Informasi Transaksi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">No. Transaksi</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                <input type="text" value="Dibuat Otomatis" readOnly style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', width: '100%', outline: 'none' }} />
                <span style={{ color: 'var(--text-muted)' }}>🔒</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Customer (Opsional)</label>
              <select className="form-select form-input" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">Pelanggan Umum</option>
                {customers.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>{c.customer_name} ({c.customer_code})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Catatan (Opsional)</label>
              <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Masukkan catatan..." />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Jenis Penjualan</label>
              {/* <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '0.4rem 0.8rem' }}>{activeTab}</span> */}
              <input type='radio' className='jenis' name='jenis' /> <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>Penjualan Bengkel</span>
              <input type='radio' style={{ marginLeft: '1rem' }} name='jenis' /> <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>Penjualan Eceran</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Left (Products & List) / Right (Summary & Payment) */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Pilih Produk Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Pilih Produk</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <select className="form-select form-input" onChange={handleProductSelect} value={selectedProduct?.product_id || ''}>
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>{p.product_code} - {p.product_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Level Harga</label>
                <select className="form-select form-input" style={{ padding: '0.5rem' }} value={selectedPriceLevel} onChange={e => setSelectedPriceLevel(e.target.value)}>
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <option key={lvl} value={lvl}>Harga {lvl}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Harga</label>
                <input type="text" className="form-input" value={selectedProduct ? currentProductPrice.toLocaleString('id-ID') : '0'} readOnly style={{ background: 'var(--bg-primary)', padding: '0.5rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Satuan</label>
                <input type="text" className="form-input" value={selectedProduct?.unitName || '-'} readOnly style={{ background: 'var(--bg-primary)', padding: '0.5rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Stok</label>
                <div style={{ padding: '0.5rem', color: selectedProduct && selectedProduct.currentStock > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {selectedProduct?.currentStock || 0}
                </div>
              </div>
              <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={handleAddToCart} disabled={!selectedProduct || selectedProduct.currentStock <= 0}>
                + Tambah
              </button>
            </div>
          </div>

          {/* Daftar Produk Card */}
          <div className="card" style={{ padding: '1.5rem', paddingBottom: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Keranjang Belanja</h3>
            <div className="table-container" style={{ border: 'none', borderRadius: 0, borderBottom: '1px solid var(--border-color)' }}>
              <table className="table" style={{ borderBottom: 'none' }}>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem' }}>No</th>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem' }}>Produk</th>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem' }}>Level</th>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem', textAlign: 'right' }}>Harga</th>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem', textAlign: 'center' }}>Jumlah</th>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem', textAlign: 'right' }}>Total</th>
                    <th style={{ background: 'transparent', padding: '0.75rem 0.5rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Keranjang masih kosong</td>
                    </tr>
                  )}
                  {cart.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{index + 1}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_code}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.product_name}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>{item.price_level_name}</span></td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{item.unit_price.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <input type="number" className="form-input" value={item.quantity} onChange={(e) => updateCartQty(index, e.target.value)} style={{ width: '60px', padding: '0.4rem', textAlign: 'center' }} min="1" />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{item.line_total.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => removeCartItem(index)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setCart([])}>Hapus Semua</button>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div>Total Item: <strong>{cart.reduce((a, b) => a + b.quantity, 0)}</strong></div>
                <div style={{ fontSize: '1.2rem' }}>Subtotal: <strong>Rp {subtotal.toLocaleString('id-ID')}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Payment Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Ringkasan Pembayaran</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Diskon (Rp)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" className="form-input" value={discountAmount || ''} onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)} style={{ width: '100px', padding: '0.4rem', textAlign: 'right' }} min="0" />
              </div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>Rp {totalAmount.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Pembayaran</h3>
            <div className="form-group">
              <label className="form-label">Metode Pembayaran</label>
              <select className="form-select form-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="CASH">Tunai (CASH)</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Uang Diterima (Rp)</label>
              <input
                type="number"
                className="form-input"
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(e.target.value)}
                style={{ fontSize: '1.2rem', fontWeight: 600 }}
              />
            </div>
            {paymentMethod === 'CASH' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Kembalian</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>
                  Rp {returnAmount > 0 ? returnAmount.toLocaleString('id-ID') : '0'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }} onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : '💾 Simpan Transaksi'}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
