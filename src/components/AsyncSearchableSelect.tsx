'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncSelectOption {
  value: string;
  label: string;
}

interface AsyncSearchableSelectProps {
  /** Nilai yang sedang terpilih (value-nya, bukan label) */
  value: string;
  /** Fungsi untuk fetch opsi berdasarkan teks pencarian. Harus return array AsyncSelectOption. */
  fetchOptions: (search: string) => Promise<AsyncSelectOption[]>;
  /** Fungsi untuk resolve label dari sebuah value yang sudah dipilih sebelumnya. */
  resolveSelected?: (value: string) => Promise<AsyncSelectOption | null>;
  onChange: (value: string) => void;
  /** Opsional: callback yang juga menerima label dari opsi terpilih */
  onChangeWithLabel?: (value: string, label: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Jumlah ms delay sebelum fetch dipanggil setelah user berhenti mengetik */
  debounceMs?: number;
}

export default function AsyncSearchableSelect({
  value,
  fetchOptions,
  resolveSelected,
  onChange,
  onChangeWithLabel,
  placeholder = 'Ketik untuk mencari...',
  disabled = false,
  className = '',
  debounceMs = 300,
}: AsyncSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<AsyncSelectOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve label dari value yang sudah terpilih
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }

    // Cek apakah sudah ada di options saat ini
    const found = options.find(o => o.value === value);
    if (found) {
      setSelectedLabel(found.label);
      return;
    }

    // Jika ada fungsi resolveSelected, gunakan itu
    if (resolveSelected) {
      resolveSelected(value).then(opt => {
        if (opt) setSelectedLabel(opt.label);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Fetch berdasarkan query
  const doFetch = useCallback(
    async (search: string) => {
      setIsLoading(true);
      try {
        const results = await fetchOptions(search);
        setOptions(results);
      } catch (e) {
        console.error('AsyncSearchableSelect fetch error:', e);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchOptions],
  );

  const handleFocus = () => {
    setInputValue('');
    setOpen(true);
    doFetch('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!open) setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doFetch(val);
    }, debounceMs);
  };

  const handleSelect = (option: AsyncSelectOption) => {
    setSelectedLabel(option.label);
    onChange(option.value);
    onChangeWithLabel?.(option.value, option.label);
    setOpen(false);
  };

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={className}
        value={open ? inputValue : selectedLabel}
        placeholder={open ? (selectedLabel || placeholder) : placeholder}
        onFocus={handleFocus}
        onChange={handleChange}
        readOnly={disabled}
        disabled={disabled}
        style={{ width: '100%' }}
      />

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            width: '100%',
            marginTop: '0.25rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            maxHeight: '260px',
            overflowY: 'auto',
            boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
              Memuat...
            </div>
          ) : options.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
              Tidak ada hasil
            </div>
          ) : (
            options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                style={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: option.value === value ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer',
                  color: option.value === value ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: option.value === value ? 600 : 400,
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
