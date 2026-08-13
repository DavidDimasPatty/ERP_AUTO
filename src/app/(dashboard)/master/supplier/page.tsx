'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import DataTableClient from '@/components/DataTableClient';

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

const PAGE_SIZE = 50;

export default function SupplierPage() {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(val);
    }, 400);
  };

  const fetchSuppliers = useCallback(async (search: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(pg), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/master/supplier?${params}`);
      const json = res.ok ? await res.json() : null;
      if (json) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotal(json.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers(debouncedSearch, page);
  }, [fetchSuppliers, debouncedSearch, page]);

  // ── Modal handlers ────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditId(null);
    setSupplierCode('');
    setSupplierName('');
    setPhone('');
    setContactPerson('');
    setCityName('');
    setAddress('');
    setPaymentTermDays('30');
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
    setContactPerson(item.contact_person || '');
    setCityName(item.city_name || '');
    setAddress(item.address || '');
    setPaymentTermDays(item.payment_term_days?.toString() || '30');
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
      text: editId ? 'Apakah Anda yakin ingin memperbarui data supplier ini?' : 'Apakah Anda yakin ingin menyimpan supplier baru ini?',
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
          contact_person: contactPerson,
          city_name: cityName,
          address,
          payment_term_days: parseInt(paymentTermDays) || 0,
          notes,
          is_active: isActive,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || 'Terjadi kesalahan');
      setModalOpen(false);
      fetchSuppliers(debouncedSearch, page);
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
        fetchSuppliers(debouncedSearch, page);
      } else {
        const err = await res.json();
        await Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Gagal menghapus' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus' });
    }
  };

  const handleSoftDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin mengubah status supplier ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/master/supplier/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSuppliers(debouncedSearch, page);
      } else {
        const err = await res.json();
        await Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Gagal mengubah status' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengubah status' });
    }
  };

  // ── Render ────────────────────────────────────────────────────

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

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '1rem', marginTop: '1rem', width: "50%" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Cari kode, nama, atau kota supplier..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: "75%" }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {loading ? 'Memuat...' : `${total.toLocaleString('id-ID')} supplier`}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '1rem' }}>
        <div className="table-container" style={{ padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuat data...</div>
          ) : (
            <DataTableClient
              data={data}
              columns={[
                { title: 'Kode Supplier', data: 'supplier_code' },
                { title: 'Nama Supplier', data: 'supplier_name' },
                { title: 'Alamat', data: 'address' },
                { title: 'Kota', data: 'city_name' },
                { title: 'No. Telp', data: 'phone' },
                { title: 'Contact Person', data: 'contact_person' },
                { title: 'Termin Hari', data: 'payment_term_days' },
                { title: 'Notes', data: 'notes' },
                { title: 'Status', data: null, orderable: false, searchable: false },
                { title: 'Aksi', data: null, orderable: false, searchable: false, className: 'text-center' },
              ]}
              slots={{
                8: (_c: any, rowData: Supplier) => (
                  <span className={`badge ${rowData.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {rowData.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                ),
                9: (_c: any, rowData: Supplier) => (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEdit(rowData)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleSoftDelete(rowData.supplier_id)}
                      className={rowData.is_active ? 'btn btn-primary' : 'btn btn-success'}
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      {rowData.is_active ? 'DEACTIVE' : 'ACTIVE'}
                    </button>
                  </div>
                ),
              }}
              className="display table"
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Halaman {page} / {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.82rem' }}
            >
              ‹ Prev
            </button>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.82rem' }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
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
                {formError && <div className="alert alert-danger">{formError}</div>}

                {editId && (
                  <div className="form-group">
                    <label className="form-label">Kode Supplier <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={supplierCode}
                      onChange={(e) => setSupplierCode(e.target.value)}
                      required={!!editId}
                      readOnly={!!editId}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Left Column */}
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
                      <label className="form-label">Termin Pembayaran (Hari)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="30"
                        value={paymentTermDays}
                        onChange={(e) => setPaymentTermDays(e.target.value)}
                      />
                    </div>
                  </div>
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

                <div className="form-group">
                  <label className="form-label">Status <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name="supplier_status" checked={isActive === true} onChange={() => setIsActive(true)} />
                      Aktif
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name="supplier_status" checked={isActive === false} onChange={() => setIsActive(false)} />
                      Tidak Aktif
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" disabled={formLoading}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
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
