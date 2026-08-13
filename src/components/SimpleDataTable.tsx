"use client";

import dynamic from 'next/dynamic';
import 'datatables.net-dt/css/dataTables.dataTables.css';

// datatables.net-dt accesses window.location at module level,
// so it must NEVER run during SSR.
const DataTableNoSSR = dynamic(
  async () => {
    const DataTable = (await import('datatables.net-react')).default;
    const DT = (await import('datatables.net-dt')).default;
    DataTable.use(DT);

    return function SimpleDataTableInner({ data, columns, options }: {
      data: any[];
      columns: any[];
      options?: any;
    }) {
      return (
        <DataTable
          data={data}
          columns={columns}
          className="display table"
          options={{
            paging: false,
            searching: false,
            info: false,
            ordering: false,
            ...options
          }}
        />
      );
    };
  },
  { ssr: false }
);

interface SimpleDataTableProps {
  data: any[];
  columns: any[];
  options?: any;
}

export default function SimpleDataTable(props: SimpleDataTableProps) {
  return <DataTableNoSSR {...props} />;
}
