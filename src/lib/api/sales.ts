import { fetch } from '@/lib/api/fetch';


export async function fetchSales(): Promise<any[]> {
  const res = await fetch('/api/sales');
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to fetch sales');
  }
  const json = await res.json();
  return json.data || [];
}

export async function createSale(payload: any): Promise<any> {
  const res = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create sale');
  }
  return res.json();
}
