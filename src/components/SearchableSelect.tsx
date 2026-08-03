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
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption?.label ?? '');
    }
  }, [open, selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (noSearch || query.trim() === '') {
      return options;
    }
    const lowerQuery = query.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(lowerQuery));
  }, [noSearch, options, query]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={`${className}`}
        value={open ? query : selectedOption?.label ?? query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
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
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
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
