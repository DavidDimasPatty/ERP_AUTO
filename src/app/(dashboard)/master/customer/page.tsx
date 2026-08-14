'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import DataTableClient from '@/components/DataTableClient';

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
}

const PAGE_SIZE = 50;

export default function CustomerPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  // const [contactPerson, setContactPerson] = useState('');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
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

  const fetchCustomers = useCallback(async (search: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(pg), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/master/customer?${params}`);
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
    fetchCustomers(debouncedSearch, page);
  }, [fetchCustomers, debouncedSearch, page]);

  // ── Modal handlers ────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditId(null);
    setCustomerCode('');
    setCustomerName('');
    setPhone('');
    // setContactPerson('');
    setCityName('');
    setAddress('');
    setNotes('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Customer) => {
    setEditId(item.customer_id);
    setCustomerCode(item.customer_code || '');
    setCustomerName(item.customer_name || '');
    setPhone(item.phone || '');
    // setContactPerson(item.contact_person || '');
    setCityName(item.city_name || '');
    setAddress(item.address || '');
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
      text: editId ? 'Apakah Anda yakin ingin memperbarui data customer ini?' : 'Apakah Anda yakin ingin menyimpan customer baru ini?',
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
          phone,
          // contact_person: contactPerson,
          city_name: cityName,
          address,
          notes,
          is_active: isActive,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || 'Terjadi kesalahan');
      setModalOpen(false);
      fetchCustomers(debouncedSearch, page);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleHardDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menghapus customer ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/master/customer?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers(debouncedSearch, page);
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
      text: 'Apakah Anda yakin ingin mengubah status customer ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/master/customer/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers(debouncedSearch, page);
      } else {
        const err = await res.json();
        await Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Gagal mengubah status' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengubah status' });
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

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '1rem', marginTop: '1rem', width: "50%" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Cari kode, nama, atau kota customer..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: "75%" }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {loading ? 'Memuat...' : `${total.toLocaleString('id-ID')} customer`}
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
                { title: 'Kode Customer', data: 'customer_code' },
                { title: 'Nama Customer', data: 'customer_name' },
                { title: 'Alamat', data: 'address' },
                { title: 'Kota', data: 'city_name' },
                { title: 'No. Telp', data: 'phone' },
                { title: 'Catatan', data: 'notes' },
                { title: 'Status', data: null, orderable: false, searchable: false },
                { title: 'Aksi', data: null, orderable: false, searchable: false, className: 'text-center' },
              ]}
              slots={{
                6: (_c: any, rowData: Customer) => (
                  <span className={`badge ${rowData.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {rowData.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                ),
                7: (_c: any, rowData: Customer) => (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEdit(rowData)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleSoftDelete(rowData.customer_id)}
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
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Halaman {page} / {totalPages}</span>
            <button className="btn btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: '0.3rem 0.7rem', fontSize: '0.82rem' }}>‹ Prev</button>
            <button className="btn btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ padding: '0.3rem 0.7rem', fontSize: '0.82rem' }}>Next ›</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tambah / Edit Customer</h3>
              <button onClick={() => setModalOpen(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formError && <div className="alert alert-danger">{formError}</div>}

                {editId && (
                  <div className="form-group">
                    <label className="form-label">Kode Customer <span style={{ color: 'red' }}>*</span></label>
                    <input type="text" className="form-input" value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} required={!!editId} readOnly={!!editId} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nama Customer <span style={{ color: 'red' }}>*</span></label>
                      <input type="text" className="form-input" placeholder="Bengkel Maju Motor" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                    </div>

                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">No. Telepon</label>
                      <input type="text" className="form-input" placeholder="08123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    {/* <div className="form-group">
                      <label className="form-label">Contact Person</label>
                      <input type="text" className="form-input" placeholder="Andi Wijaya" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                    </div>  */}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Kota</label>
                  <input type="text" className="form-input" placeholder="Bekasi" value={cityName} onChange={(e) => setCityName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Alamat</label>
                  <textarea className="form-input" rows={3} placeholder="Jl. Raya Industri No. 88, Bekasi..." value={address} onChange={(e) => setAddress(e.target.value)} style={{ resize: 'vertical' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <textarea className="form-input" rows={2} placeholder="Customer tetap bengkel" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Status <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name="customer_status" checked={isActive === true} onChange={() => setIsActive(true)} /> Aktif
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name="customer_status" checked={isActive === false} onChange={() => setIsActive(false)} /> Tidak Aktif
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" disabled={formLoading}>Batal</button>
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
