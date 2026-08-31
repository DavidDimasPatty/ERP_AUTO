"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import AsyncSearchableSelect, { AsyncSelectOption } from '@/components/AsyncSearchableSelect';
import SearchableSelect from '@/components/SearchableSelect';
import * as ThermalPrint from '@/lib/thermalPrint';


export default function SalesTransactionPage() {
  const [activeTab, setActiveTab] = useState('ECERAN');

  // Master data hanya disimpan untuk item yang sedang dipilih (produk di cart)
  const [productsCache, setProductsCache] = useState<Record<string, any>>({});

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('0');
  const [notes, setNotes] = useState('');

  // Cart & Product Search State
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState('2');
  const [customPrice, setCustomPrice] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Loading & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [qzStatus, setQzStatus] = useState<'idle' | 'printing' | 'done' | 'error'>('idle');

  // Async fetch untuk customer dropdown
  const fetchCustomerOptions = useCallback(async (search: string): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams({ is_active: 'true', limit: '20' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/master/customer?${params}`);
    const data = await res.json();
    const defaultOpt: AsyncSelectOption = { value: '0', label: 'Pelanggan Umum (UMUM)' };
    const opts: AsyncSelectOption[] = (data.data || []).map((c: any) => ({
      value: c.customer_id.toString(),
      label: `${c.customer_name} (${c.customer_code})`,
    }));
    return [defaultOpt, ...opts];
  }, []);

  const resolveCustomer = useCallback(async (value: string): Promise<AsyncSelectOption | null> => {
    if (value === '0') return { value: '0', label: 'Pelanggan Umum (UMUM)' };
    const res = await fetch(`/api/master/customer?search=${value}&limit=5`);
    const data = await res.json();
    const found = (data.data || []).find((c: any) => c.customer_id.toString() === value);
    if (found) return { value: found.customer_id.toString(), label: `${found.customer_name} (${found.customer_code})` };
    return null;
  }, []);

  // Async fetch untuk produk dropdown
  const fetchProductOptions = useCallback(async (search: string): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams({ is_active: 'true', limit: '20' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/master/product?${params}`);
    const data = await res.json();
    const opts: AsyncSelectOption[] = (data.data || []).map((p: any) => {
      setProductsCache(prev => ({ ...prev, [p.product_id.toString()]: p }));
      return { value: p.product_id.toString(), label: `${p.product_code} - ${p.product_name} - ${p.brand?.brand_name}` };
    });
    return opts;
  }, []);

  const resolveProduct = useCallback(async (value: string): Promise<AsyncSelectOption | null> => {
    if (productsCache[value]) {
      const p = productsCache[value];
      return { value: p.product_id.toString(), label: `${p.product_code} - ${p.product_name}` };
    }
    return null;
  }, [productsCache]);

  // Fungsi print via server-side ESC/P dengan fallback ke window.print()
  const printWithQZ = useCallback(async (data: any) => {
    setQzStatus('printing');
    try {
      await ThermalPrint.printReceipt(data);
      setQzStatus('done');
      // Setelah print selesai, reset receipt
      setIsPrintReady(false);
      setReceiptData(null);
    } catch (err) {
      console.warn('[Thermal Print] Gagal, fallback ke window.print():', err);
      setQzStatus('error');
      // Fallback: tampilkan receipt area lalu print via browser
      setIsPrintReady(true);
      const printTimeout = window.setTimeout(() => {
        window.print();
      }, 500);
      return () => window.clearTimeout(printTimeout);
    }
  }, []);

  useEffect(() => {
    if (receiptData && !isPrintReady) {
      printWithQZ(receiptData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptData]);

  useEffect(() => {
    const afterPrint = () => {
      setIsPrintReady(false);
      setReceiptData(null);
      setQzStatus('idle');
    };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  // Handle Product Search/Selection
  const handleProductSelect = useCallback(async (productId: string) => {
    if (!productId) {
      setSelectedProduct(null);
      return;
    }
    // Ambil dari cache dulu, jika tidak ada fetch individual
    let prod = productsCache[productId];
    if (!prod) {
      try {
        const res = await fetch(`/api/master/product?search=${productId}&limit=1`);
        const data = await res.json();
        prod = (data.data || []).find((p: any) => p.product_id.toString() === productId);
        if (prod) setProductsCache(prev => ({ ...prev, [productId]: prod }));
      } catch { /* ignore */ }
    }
    if (prod) {
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
  }, [productsCache]);

  const currentProductPrice = selectedProduct ? (selectedProduct.priceMap[parseInt(selectedPriceLevel)] || 0) : 0;

  useEffect(() => {
    setCustomPrice(currentProductPrice.toString());
  }, [currentProductPrice]);

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    const finalPrice = parseInt(customPrice || '0');
    const level1Price = selectedProduct.cost_price || 0;

    if (finalPrice < level1Price) {
      await Swal.fire({
        icon: 'error',
        title: 'Harga Terlalu Rendah',
        text: `Harga tidak boleh kurang dari harga Pokok (Rp ${level1Price.toLocaleString('id-ID')}).`,
      });
      return;
    }

    // const confirmAdd = await Swal.fire({
    //   title: 'Konfirmasi',
    //   text: 'Tambahkan produk ini ke keranjang?',
    //   icon: 'question',
    //   showCancelButton: true,
    //   confirmButtonText: 'Ya, tambahkan',
    //   cancelButtonText: 'Batal',
    // });

    // if (!confirmAdd.isConfirmed) return;

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
        unit_price: finalPrice,
        min_price: level1Price,
        quantity: 1,
        line_total: finalPrice,
        // is_loose: false
      }]);
    }

    setSelectedProduct(null);
    setSearchQuery('');
  };

  const updateCartQty = (productId: number, val: string) => {
    const qty = parseInt(val) || 0;
    const newCart = [...cart];
    const index = newCart.findIndex(c => c.product_id === productId);
    if (index === -1) return;
    newCart[index].quantity = qty;
    newCart[index].line_total = qty * newCart[index].unit_price;
    setCart(newCart);
  };

  const updateCartPrice = (productId: number, val: string) => {
    const raw = val.replace(/\D/g, "");
    const price = parseInt(raw) || 0;
    const newCart = [...cart];
    const index = newCart.findIndex(c => c.product_id === productId);
    if (index === -1) return;
    newCart[index].unit_price = price;
    newCart[index].line_total = price * newCart[index].quantity;
    setCart(newCart);
  };

  const validateCartPrice = async (productId: number) => {
    const newCart = [...cart];
    const index = newCart.findIndex(c => c.product_id === productId);
    if (index === -1) return;
    const item = newCart[index];
    if (item.unit_price < item.min_price) {
      await Swal.fire({
        icon: 'warning',
        title: 'Batas Minimum',
        text: `Harga ${item.product_name} tidak boleh di bawah batas minimum (Rp ${item.min_price.toLocaleString('id-ID')}). Harga dikembalikan ke harga produk.`,
      });
      item.unit_price = item.min_price;
      item.line_total = item.unit_price * item.quantity;
      setCart(newCart);
    }
  };

  const toggleLooseItem = (productId: number) => {
    const newCart = [...cart];
    const index = newCart.findIndex(c => c.product_id === productId);
    if (index === -1) return;
    newCart[index].is_loose = !newCart[index].is_loose;
    setCart(newCart);
  };

  const removeCartItem = async (productId: number) => {
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
    const index = newCart.findIndex(c => c.product_id === productId);
    if (index === -1) return;
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.line_total, 0);
  const totalAmount = subtotal - discountAmount;
  const returnAmount = (parseInt(tenderedAmount || '0')) - totalAmount;

  const handleSubmit = async (cetak: boolean) => {
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
    // if (paymentMethod === 'CASH' && tAmount < totalAmount) {
    //   setErrorMsg(`Uang diterima (Rp ${tAmount.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`);
    //   return;
    // }
    // if (paymentMethod !== 'CASH' && tAmount !== totalAmount) {
    //   setErrorMsg(`Untuk non-tunai, jumlah uang diterima harus pas Rp ${totalAmount.toLocaleString('id-ID')}.`);
    //   return;
    // }

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
        unit_price: c.unit_price,
        // is_loose: c.is_loose || false
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
      if (cetak) {
        // Set receiptData saja; useEffect akan trigger printWithQZ
        setReceiptData(data);
      }
      // Reset form
      setCart([]);
      setSelectedCustomer('0');
      setTenderedAmount('');
      setDiscountAmount(0);
      setNotes('');
      setActiveTab("ECERAN");
      setSelectedPriceLevel("2");
      setPaymentMethod("CASH");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="sales-main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>

        {/* Header & Breadcrumb */}
        <style jsx global>{`
  @media print {

    @page {
       size: 75mm auto !important;
       margin: 0 !important;
    }

    html,
    body {
      display: block !important;
      width: 75mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body * {
      visibility: hidden !important;
      font-family: sans-serif;
      
    }

    .sales-main-content {
      display: none !important;
    }

    .receipt-print-area,
    .receipt-print-area * {
      visibility: visible !important;
    }

    .receipt-print-area {
      display: block !important;

     position: fixed !important;
      left: 0 !important;
      top: 0 !important;

      width: 90mm !important;
      max-width: 90mm !important;
      box-sizing: border-box !important;

      margin: 0 !important;
      padding: 0 !important;

      overflow: visible !important;

      background: #fff !important;
      color: #000 !important;

      font-size: 11pt !important;
      line-height: 1.25 !important;

    }

    .receipt-print-area > div {
      width: 100% !important;
      margin: 0 !important;
      padding: 4mm 3mm !important;

      box-sizing: border-box !important;
    }

    /* HEADER */
    .receipt-print-area h2 {
      margin: 0 0 3px 0 !important;
      padding: 0 !important;

      font-size: 16pt !important;
      font-weight: bold !important;

      text-align: left !important;
      line-height: 1.2 !important;
    }

    .receipt-print-area p {
      margin: 2px 0 !important;
      padding: 0 !important;
      font-size: 10pt !important;
      line-height: 1.25 !important;
    }

    .receipt-print-area hr {
      border: 0 !important;
      border-top: 1px dashed #000 !important;

      margin: 5px 0 !important;
      padding: 0 !important;
    }

    /* TABLE */
   .receipt-print-area table {
      width: 100% !important;
      margin: 7px 0 !important;
      padding: 0 !important;

      border-collapse: collapse !important;
      table-layout: fixed !important;
    }

    .receipt-print-area th,
    .receipt-print-area td {
      border: 1px solid #000 !important;
      padding: 4px 5px !important;

      font-size: 10pt !important;
      line-height: 1.2 !important;

      vertical-align: middle !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }

 .receipt-print-area th:first-child,
  .receipt-print-area td:first-child {
    width: 44% !important;
    text-align: left !important;
  }

  .receipt-print-area th:nth-child(2),
  .receipt-print-area td:nth-child(2) {
    width: 12% !important;
    text-align: center !important;
  }

  .receipt-print-area th:nth-child(3),
  .receipt-print-area td:nth-child(3) {
    width: 22% !important;
    text-align: right !important;
  }

  .receipt-print-area th:nth-child(4),
  .receipt-print-area td:nth-child(4) {
    width: 22% !important;
    text-align: right !important;
  }

    /* TOTAL SECTION */
    .receipt-print-area .receipt-summary {
      margin-top: 7px !important;

      display: flex !important;
      flex-direction: column !important;
      gap: 3px !important;
    }

    .receipt-print-area .receipt-row {
      display: flex !important;

      justify-content: space-between !important;

      width: 100% !important;

      font-size: 10pt !important;
      line-height: 1.3 !important;
    }

    .receipt-print-area .receipt-total {
      font-size: 12pt !important;
      font-weight: bold !important;

      margin-top: 3px !important;
      padding-top: 3px !important;

      border-top: 1px dashed #000 !important;
    }

    .receipt-print-area .receipt-footer {
      margin-top: 10px !important;

      text-align: center !important;

      font-size: 9pt !important;
    }
  }
`}</style>


        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Transaksi Penjualan</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Penjualan &gt; Transaksi Penjualan</span>
          </div>
          {/* Badge status Printer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.8rem', padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: qzStatus === 'done' ? 'var(--success-light, #d1fae5)'
              : qzStatus === 'printing' ? 'var(--warning-light, #fef9c3)'
                : qzStatus === 'error' ? 'var(--danger-light, #fee2e2)'
                  : 'var(--bg-secondary, #f3f4f6)',
            color: qzStatus === 'done' ? 'var(--success, #16a34a)'
              : qzStatus === 'printing' ? 'var(--warning, #ca8a04)'
                : qzStatus === 'error' ? 'var(--danger, #dc2626)'
                  : 'var(--text-muted)',
            border: '1px solid currentColor',
            fontWeight: 600,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: 'currentColor',
              animation: qzStatus === 'printing' ? 'pulse 1s infinite' : 'none',
            }} />
            {qzStatus === 'done' && 'Printer: Tercetak'}
            {qzStatus === 'printing' && 'Printer: Mencetak...'}
            {qzStatus === 'error' && 'Printer: Gagal (fallback browser)'}
            {qzStatus === 'idle' && 'Printer: Siap'}
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

        {/* ECERAN ATAU BENGKEL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex' }}>
            <button
              style={{
                padding: '1rem 1.5rem', background: 'none', border: 'none',
                borderBottom: activeTab === 'BENGKEL' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'BENGKEL' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.85rem'
              }}
              onClick={
                async (e) => {
                  const nextTab = 'BENGKEL';
                  const isGeneralCustomer = !selectedCustomer || selectedCustomer === '0';
                  if (nextTab === 'BENGKEL' && isGeneralCustomer) {
                    await Swal.fire({
                      title: "Peringatan",
                      text: "Penjualan Bengkel membutuhkan customer yang terdaftar.",
                      icon: "warning",
                      confirmButtonText: "Close",
                    });
                    return;
                  }
                  setActiveTab(nextTab);
                  setSelectedPriceLevel('4'); // BENGKEL default harga 3
                }}
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
              onClick={() => { setActiveTab('ECERAN'); setSelectedPriceLevel('2'); }}
            >
              Penjualan Eceran
            </button>
          </div>
        </div>

        {/* Informasi Transaksi Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Informasi Transaksi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.4fr 1fr 1fr', gap: '1.5rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">No. Transaksi</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                  <input type="text" value="Dibuat Otomatis" readOnly style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', width: '100%', outline: 'none' }} />
                  <span style={{ color: 'var(--text-muted)' }}>🔒</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: "center", alignItems: "center" }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Jenis Penjualan</label>
                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '0.4rem 0.8rem' }}>{activeTab}</span>
                {/* <input onChange={
                  async (e) => {
                    const nextTab = e.target.value;
                    const isGeneralCustomer = !selectedCustomer || selectedCustomer === '0';
                    if (nextTab === 'BENGKEL' && isGeneralCustomer) {
                      await Swal.fire({
                        title: "Peringatan",
                        text: "Penjualan Bengkel membutuhkan customer yang terdaftar.",
                        icon: "warning",
                        confirmButtonText: "Close",
                      });
                      return;
                    }
                    setActiveTab(nextTab);
                  }
                } value="BENGKEL" type='radio' className='jenis' name='jenis' checked={activeTab === "BENGKEL"} /> <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>Penjualan Bengkel</span>
                <input onChange={(e) => setActiveTab(e.target.value)} value="ECERAN" checked={activeTab === "ECERAN"} type='radio' style={{ marginLeft: '1rem' }} name='jenis' /> <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>Penjualan Eceran</span> */}
              </div>
            </div>


            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Catatan (Opsional)</label>
                <input type="text" className="form-input" value={notes}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9\s.,()\-_/]/g, "");
                    setNotes(value);
                  }}
                  placeholder="Masukkan catatan..." />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Customer (Opsional)</label>
                <AsyncSearchableSelect
                  value={selectedCustomer}
                  fetchOptions={fetchCustomerOptions}
                  resolveSelected={resolveCustomer}
                  onChange={(value) => setSelectedCustomer(value)}
                  placeholder="Ketik nama atau kode customer..."
                  className="form-select form-input"
                />
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
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <AsyncSearchableSelect
                  value={selectedProduct?.product_id?.toString() || ''}
                  fetchOptions={fetchProductOptions}
                  resolveSelected={resolveProduct}
                  onChange={(value) => handleProductSelect(value)}
                  placeholder="Ketik kode atau nama produk..."
                  className="form-select form-input"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Level Harga</label>
                  <select
                    value={selectedPriceLevel}
                    onChange={(e) => setSelectedPriceLevel(e.target.value)}
                    className="form-select form-input"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    {activeTab === 'BENGKEL' ? (
                      [1, 2, 3, 4, 5].map((lvl) => {
                        if (lvl == 4) {
                          return <option key={lvl} value={lvl.toString()} defaultValue={lvl}>{`Harga ${lvl}`}</option>
                        }
                        else {
                          return <option key={lvl} value={lvl.toString()}>{`Harga ${lvl}`}</option>
                        }
                      })

                    ) : (
                      [1, 2, 3, 4, 5].map((lvl) => {
                        if (lvl == 2) {
                          return <option key={lvl} value={lvl.toString()} defaultValue={lvl}>{`Harga ${lvl}`}</option>

                        }
                        else {
                          return <option key={lvl} value={lvl.toString()}>{`Harga ${lvl}`}</option>
                        }
                      })
                    )}

                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Harga</label>
                  <input
                    type="text"
                    className="form-input"
                    inputMode="numeric"
                    value={customPrice === "" ? "" : Number(customPrice).toLocaleString('id-ID')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setCustomPrice(raw);
                    }}
                    disabled={!selectedProduct}
                    style={{ background: 'var(--bg-primary)', padding: '0.5rem' }}
                  />
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
                {/* <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={handleAddToCart} disabled={!selectedProduct || selectedProduct.currentStock <= 0}>
                + Tambah
              </button> */}
                <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={handleAddToCart} disabled={!selectedProduct}>
                  + Tambah
                </button>
              </div>
            </div>

            {/* Daftar Produk Card */}
            <div className="card" style={{ padding: '1.5rem', paddingBottom: 0 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Keranjang Belanja</h3>
              <div className="table-container" style={{ border: 'none', borderRadius: 0, borderBottom: '1px solid var(--border-color)', minHeight: '200px' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Keranjang masih kosong</div>
                ) : (
                  <table className="table display">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Level</th>
                        <th style={{ textAlign: 'right' }}>Harga</th>
                        <th style={{ textAlign: 'center' }}>Jumlah</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((rowData) => (
                        <tr key={rowData.product_id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{rowData.product_code}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rowData.product_name}</div>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>{rowData.price_level_name}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={rowData.unit_price === 0 ? '' : Number(rowData.unit_price).toLocaleString('id-ID')}
                              onChange={(e) => updateCartPrice(rowData.product_id, e.target.value)}
                              onBlur={(e) => {
                                validateCartPrice(rowData.product_id)
                                e.target.value = Number(rowData.unit_price).toLocaleString('id-ID')
                              }}
                              style={{ width: '100px', padding: '0.4rem', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={rowData.quantity}
                              onChange={(e) => updateCartQty(rowData.product_id, e.target.value)}
                              style={{ width: '60px', padding: '0.4rem', textAlign: 'center' }}
                              min="1"
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {rowData.line_total.toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {/* <button
                              className={`btn ${rowData.is_loose ? 'btn-success' : 'btn-secondary'}`}
                              style={{ padding: '0.25rem 0.5rem', marginRight: '0.35rem' }}
                              onClick={() => toggleLooseItem(rowData.product_id)}
                            >
                              {rowData.is_loose ? 'Lepas' : 'Stok'}
                            </button> */}
                            <button
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                              onClick={() => removeCartItem(rowData.product_id)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                  <input
                    // type="number"
                    //   className="form-input"
                    //   value={discountAmount || ''}
                    //   onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)}
                    type="text"
                    className="form-input"
                    inputMode="numeric"
                    value={
                      discountAmount == 0
                        ? 0
                        : Number(discountAmount).toLocaleString("id-ID")
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setDiscountAmount(Number(raw || 0));
                    }}
                    style={{ width: '200px', padding: '0.4rem', textAlign: 'right' }} min="0" />
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
                <SearchableSelect
                  value={paymentMethod}
                  options={[
                    { value: 'CASH', label: 'Tunai (CASH)' },
                    { value: 'TRANSFER', label: 'Transfer Bank' },
                    { value: 'QRIS', label: 'QRIS' },
                  ]}
                  onChange={(val: string) => setPaymentMethod(val)}
                  placeholder="Pilih metode pembayaran..."
                  className="form-select form-input"
                  noSearch
                />
              </div>
              <div className="form-group">
                <label className="form-label">Uang Diterima (Rp)</label>
                <input
                  type="text"
                  className="form-input"
                  // value={tenderedAmount}
                  // onChange={(e) => setTenderedAmount(e.target.value)}
                  // value={Number(tenderedAmount || 0).toLocaleString('id-ID')}
                  // onChange={(e) => {
                  //   const value = e.target.value.replace(/\./g, '');
                  //   setTenderedAmount(value);
                  // }}
                  inputMode="numeric"
                  value={
                    tenderedAmount === ""
                      ? ""
                      : Number(tenderedAmount).toLocaleString("id-ID")
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setTenderedAmount(raw);
                  }}
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

              <div style={{ justifyContent: 'space-between', display: 'flex', flexDirection: 'row', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }} onClick={() => handleSubmit(true)} disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : '🖨️ Simpan  dan Cetak'}
                </button>
                <button className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }} onClick={() => handleSubmit(false)} disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : '💾 Simpan '}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>{/* closes .sales-main-content */}

      {receiptData && (
        <div
          className="receipt-print-area"
          style={{
            display: isPrintReady ? 'block' : 'none',
            position: 'absolute',
            left: '-9999px',
            top: "40px",
            width: '75mm',
            overflow: 'hidden'
          }}
        >
          <div style={{ width: '100%', padding: '1rem', background: '#fff', color: '#000', marginTop: "30px" }}>
            <h2 style={{ margin: '0 0 0.5rem', textAlign: "left" }}>MITRA MOTOR </h2>
            <p style={{ margin: '0 0 0.5rem' }}>Alamat : PONDOK UNGGU PERMAI NO. 7C, KOTA BEKASI, JAWA BARAT, INDONESIA</p>
            <p style={{ margin: '0 0 0.5rem' }}>No.HP : +(62)813-1026-5040</p>
            <hr />
            <hr />
            <p style={{ margin: '0.25rem 0', marginTop: '25px' }}>No. Transaksi: <strong>{receiptData.sales_number}</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Tanggal: <strong>{new Date(receiptData.sales_datetime).toLocaleString('id-ID')}</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Kasir: <strong>{receiptData.cashier_name_snapshot || '-'}</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Customer: <strong>{receiptData.customer_name_snapshot || 'Pelanggan Umum'}</strong></p>
            {/* <p style={{ margin: '0.25rem 0 1rem' }}>Jenis: <strong>{receiptData.sales_type}</strong></p> */}

            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Produk</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Harga</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.details?.map((item: any, index: number) => (
                  <tr key={index}>
                    <td>{item.product_name_snapshot || item.product_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{Number(item.unit_price).toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right' }}>{Number(item.line_total).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <strong>Rp {Number(receiptData.subtotal).toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Diskon</span>
                <strong>Rp {Number(receiptData.discount_amount || 0).toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total</span>
                <strong>Rp {Number(receiptData.total_amount).toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Bayar ({receiptData.payments?.[0]?.payment_method || '-'})</span>
                <strong>Rp {Number(receiptData.payments?.[0]?.tendered_amount || receiptData.total_amount).toLocaleString('id-ID')}</strong>
              </div>
              {receiptData.payments?.[0] && receiptData.payments[0].change_amount !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kembalian</span>
                  <strong>Rp {Number(receiptData.payments[0].change_amount).toLocaleString('id-ID')}</strong>
                </div>
              )}
            </div>
            <hr />
            <hr />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <strong style={{ textAlign: 'center' }}>Terima kasih sudah berbelanja di Mitra Motor</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
