"use client";

import dynamic from 'next/dynamic';
import React from 'react';
import 'datatables.net-dt/css/dataTables.dataTables.css';

// datatables.net-dt accesses window.location at module level,
// so it must NEVER run during SSR.
const DataTableNoSSR = dynamic(
  async () => {
    const DataTable = (await import('datatables.net-react')).default;
    const DT = (await import('datatables.net-dt')).default;
    DataTable.use(DT);

    return function DataTableInner({
      data, columns, slots, className, children, isSearchable
    }: {
      data: any[];
      columns: any[];
      slots?: Record<number, (cellData: any, rowData: any) => React.ReactNode>;
      className?: string;
      children?: React.ReactNode;
      isSearchable?: boolean;
    }) {
      return (
        <DataTable
          data={data}
          columns={columns}
          slots={slots}
          className={className ?? 'display table'}
          options={{
            searching: isSearchable ?? false,
          }}
        >
          {children}
        </DataTable>
      );
    };
  },
  { ssr: false }
);

interface DataTableClientProps {
  data: any[];
  columns: any[];
  slots?: Record<number, (cellData: any, rowData: any) => React.ReactNode>;
  className?: string;
  children?: React.ReactNode;
  isSearchable?: boolean;
}

export default function DataTableClient(props: DataTableClientProps) {
  return <DataTableNoSSR {...props} />;
}
