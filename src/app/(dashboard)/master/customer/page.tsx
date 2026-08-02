'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface Customer {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  customer_type?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  city_name?: string;
  address?: string;
  payment_term_days?: number;
  credit_limit?: number;
  is_credit_blocked?: boolean;
  notes?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export default function CustomerPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Fields based on image:
  // Kode Customer *, Nama Customer *
  // Jenis Customer *, No. Telepon
  // Email, Contact Person
  // Kota, Alamat
  // Termin Pembayaran (Hari), Batas Kredit, Blokir Kredit
  // Keterangan, Status *
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState('Bengkel');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState('30');
  const [creditLimit, setCreditLimit] = useState('5000000');
  const [isCreditBlocked, setIsCreditBlocked] = useState('Tidak');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/customer?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      const json = res.ok ? await res.json() : null;
      if (json) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditId(null);
    setCustomerCode('');
    setCustomerName('');
    setCustomerType('Bengkel');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setCityName('');
    setAddress('');
    setPaymentTermDays('30');
    setCreditLimit('5000000');
    setIsCreditBlocked('Tidak');
    setNotes('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Customer) => {
    setEditId(item.customer_id);
    setCustomerCode(item.customer_code || '');
    setCustomerName(item.customer_name || '');
    setCustomerType(item.customer_type || 'Bengkel');
    setPhone(item.phone || '');
    setEmail(item.email || '');
    setContactPerson(item.contact_person || '');
    setCityName(item.city_name || '');
    setAddress(item.address || '');
    setPaymentTermDays(item.payment_term_days?.toString() || '30');
    setCreditLimit(item.credit_limit?.toString() || '5000000');
    setIsCreditBlocked(item.is_credit_blocked ? 'Ya' : 'Tidak');
    setNotes(item.notes || '');
    setIsActive(item.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: editId
        ? 'Apakah Anda yakin ingin memperbarui data customer ini?'
        : 'Apakah Anda yakin ingin menyimpan customer baru ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setFormLoading(true);
    const url = editId ? `/api/master/customer/${editId}` : '/api/master/customer';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_code: customerCode,
          customer_name: customerName,
          customer_type: customerType,
          phone,
          email,
          contact_person: contactPerson,
          city_name: cityName,
          address,
          payment_term_days: parseInt(paymentTermDays) || 0,
          credit_limit: parseFloat(creditLimit) || 0,
          is_credit_blocked: isCreditBlocked === 'Ya',
          notes,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSoftDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menonaktifkan customer ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, nonaktifkan',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/customer/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      } else {
        const err = await res.json();
        await Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: err.message || 'Gagal menonaktifkan',
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal menghapus',
      });
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '2rem' }}>Master Customer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data Pelanggan (misal: TOKO SUMBER JAYA, UD ANDRE)
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah Customer
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <input
          type="text"
          className="form-input"
          style={{ flexGrow: 1 }}
          placeholder="Cari berdasarkan kode atau nama customer..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Kode Customer</th>
                <th>Nama Customer</th>
                <th>Alamat</th>
                <th>Kota</th>
                <th>No. Telp</th>
                <th>Catatan</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Tidak ada data customer
                  </td>
                </tr>
              ) : (
                data.map((c) => (
                  <tr key={c.customer_id}>
                    <td style={{ fontWeight: 700 }}>{c.customer_code}</td>
                    <td>{c.customer_name}</td>
                    <td>{c.address}</td>
                    <td>{c.city_name}</td>
                    <td>{c.phone}</td>
                    <td>{c.notes}</td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {c.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleSoftDelete(c.customer_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={!c.is_active}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Halaman {page} dari {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal (Matching Screenshot 3) */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Tambah / Edit Customer
              </h3>
              <button onClick={() => setModalOpen(false)} className="close-btn">
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formError && (
                  <div className="alert alert-danger">
                    {formError}
                  </div>
                )}
                
                {/* 2 Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Kode Customer <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="CUS001"
                        value={customerCode}
                        onChange={(e) => setCustomerCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Jenis Customer <span style={{ color: 'red' }}>*</span></label>
                      <select
                        className="form-select form-input"
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                      >
                        <option value="Bengkel">Bengkel</option>
                        <option value="Eceran">Eceran</option>
                        <option value="Grosir">Grosir</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="majumotor@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kota</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Bekasi"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Termin Pembayaran (Hari)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="30"
                        value={paymentTermDays}
                        onChange={(e) => setPaymentTermDays(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batas Kredit</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="5000000"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nama Customer <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Bengkel Maju Motor"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. Telepon</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="08123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Person</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Andi Wijaya"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alamat</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Jl. Raya Industri No. 88, Bekasi..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Blokir Kredit</label>
                      <select
                        className="form-select form-input"
                        value={isCreditBlocked}
                        onChange={(e) => setIsCreditBlocked(e.target.value)}
                      >
                        <option value="Tidak">Tidak</option>
                        <option value="Ya">Ya</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Full Width Keterangan */}
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Customer tetap bengkel"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Status Radio Buttons */}
                <div className="form-group">
                  <label className="form-label">Status <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="customer_status"
                        checked={isActive === true}
                        onChange={() => setIsActive(true)}
                      />
                      Aktif
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="customer_status"
                        checked={isActive === false}
                        onChange={() => setIsActive(false)}
                      />
                      Tidak Aktif
                    </label>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
