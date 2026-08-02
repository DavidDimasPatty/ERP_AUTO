'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface Supplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  city_name?: string;
  address?: string;
  payment_term_days?: number;
  old_code?: string;
  notes?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export default function SupplierPage() {
  const [data, setData] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Fields based on image:
  // Kode Supplier *, Nama Supplier *
  // No. Telepon, Email
  // Contact Person, Kota
  // Alamat
  // Termin Pembayaran (Hari), Kode Lama
  // Catatan, Status *
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState('30');
  const [oldCode, setOldCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/supplier?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
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
    fetchSuppliers();
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditId(null);
    setSupplierCode('');
    setSupplierName('');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setCityName('');
    setAddress('');
    setPaymentTermDays('30');
    setOldCode('');
    setNotes('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Supplier) => {
    setEditId(item.supplier_id);
    setSupplierCode(item.supplier_code || '');
    setSupplierName(item.supplier_name || '');
    setPhone(item.phone || '');
    setEmail(item.email || '');
    setContactPerson(item.contact_person || '');
    setCityName(item.city_name || '');
    setAddress(item.address || '');
    setPaymentTermDays(item.payment_term_days?.toString() || '30');
    setOldCode(item.old_code || '');
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
        ? 'Apakah Anda yakin ingin memperbarui data supplier ini?'
        : 'Apakah Anda yakin ingin menyimpan supplier baru ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setFormLoading(true);
    const url = editId ? `/api/master/supplier/${editId}` : '/api/master/supplier';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_code: supplierCode,
          supplier_name: supplierName,
          phone,
          email,
          contact_person: contactPerson,
          city_name: cityName,
          address,
          payment_term_days: parseInt(paymentTermDays) || 0,
          old_code: oldCode,
          notes,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleHardDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menghapus supplier ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/supplier?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSuppliers();
      } else {
        const err = await res.json();
        await Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: err.message || 'Gagal menghapus',
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

  const handleSoftDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menonaktifkan supplier ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, nonaktifkan',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/supplier/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSuppliers();
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
          <h1 style={{ fontSize: '2rem' }}>Master Supplier</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data supplier sparepart
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah Supplier
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <input
          type="text"
          className="form-input"
          style={{ flexGrow: 1 }}
          placeholder="Cari berdasarkan kode atau nama supplier..."
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
                <th>Kode Supplier</th>
                <th>Nama Supplier</th>
                <th>Alamat</th>
                <th>Kota</th>
                <th>No. Telp</th>
                <th>Contact Person</th>
                <th>Termin Hari</th>
                <th>Notes</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Tidak ada data supplier
                  </td>
                </tr>
              ) : (
                data.map((b) => (
                  <tr key={b.supplier_id}>
                    <td style={{ fontWeight: 700 }}>{b.supplier_code}</td>
                    <td>{b.supplier_name}</td>
                    <td>{b.address}</td>
                    <td>{b.city_name}</td>
                    <td>{b.phone}</td>
                    <td>{b.contact_person}</td>
                    <td>{b.payment_term_days}</td>
                    <td>{b.notes}</td>
                    <td>
                      <span className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {b.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        ✏️
                      </button>

                      {b.is_active && (
                        <button
                          onClick={() => handleSoftDelete(b.supplier_id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          DEACTIVE
                        </button>
                      )}

                      {!b.is_active && (
                        <button
                          onClick={() => handleSoftDelete(b.supplier_id)}
                          className="btn btn-success"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          ACTIVE
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleHardDelete(b.supplier_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        🗑️
                      </button>
                      {/* 
                      <button
                        onClick={() => handleSoftDelete(b.supplier_id)}
                        className="btn btn-warning"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={!b.is_active}
                      >
                        ❌
                      </button>
                       */}
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

      {/* Create / Edit Modal (Matching Screenshot 2) */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Tambah / Edit Supplier
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

                    {editId && (
                      <div className="form-group">
                        <label className="form-label">Kode Supplier <span style={{ color: 'red' }}>*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Isi kosong untuk generate otomatis"
                          value={supplierCode}
                          onChange={(e) => setSupplierCode(e.target.value)}
                          required={!!editId}
                          readOnly={!!editId}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">No. Telepon</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="021555123"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Person</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Budi Santoso"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nama Supplier <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="PT Sumber Motor"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="supplier@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kota</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Jakarta"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Full Width Alamat */}
                <div className="form-group">
                  <label className="form-label">Alamat</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Jl. Industri Raya No. 10, Jakarta Pusat"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* 2 Column Bottom Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                    <label className="form-label">Kode Lama</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="00001"
                      value={oldCode}
                      onChange={(e) => setOldCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Full Width Catatan */}
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Supplier utama sparepart motor"
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
                        name="supplier_status"
                        checked={isActive === true}
                        onChange={() => setIsActive(true)}
                      />
                      Aktif
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="supplier_status"
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
