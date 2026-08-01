/**
 * Utility to export JSON data table to Excel (.csv format with UTF-8 BOM for Microsoft Excel)
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row.map(val => {
      const str = val === null || val === undefined ? '' : String(val);
      // Escape double quotes
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(';'); // Use semicolon for seamless opening in Excel (ID/EU locale)
  };

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(processRow)].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
