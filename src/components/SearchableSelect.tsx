'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  noSearch?: boolean;
  className?: string;
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Pilih salah satu...',
  disabled = false,
  noSearch = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  // query untuk filter, inputValue untuk display saat open
  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  // Saat dropdown ditutup, reset ke default
  useEffect(() => {
    if (!open) {
      setQuery('');
      setInputValue('');
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter: jika query kosong, tampilkan semua opsi
  const filteredOptions = useMemo(() => {
    if (noSearch || query.trim() === '') {
      return options;
    }
    const lowerQuery = query.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(lowerQuery));
  }, [noSearch, options, query]);

  const handleFocus = () => {
    // Reset query & inputValue saat dibuka agar semua opsi tampil
    setQuery('');
    setInputValue('');
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setQuery(val);
    if (!open) setOpen(true);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={`${className}`}
        // Saat open: tampilkan apa yang diketik user (inputValue)
        // Saat tutup: tampilkan label dari opsi yang dipilih
        value={open ? inputValue : (selectedOption?.label ?? '')}
        // Placeholder saat open menampilkan label yang sudah dipilih sebagai hint
        placeholder={open ? (selectedOption?.label ?? placeholder) : placeholder}
        onFocus={handleFocus}
        onChange={handleChange}
        readOnly={disabled && !open}
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
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
              Tidak ada opsi yang cocok
            </div>
          ) : (
            filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
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
