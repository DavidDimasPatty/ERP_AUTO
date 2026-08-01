// Fetch purchases from API
export async function fetchPurchases(): Promise<any[]> {
  const res = await fetch('/api/purchase');
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to fetch purchases');
  }
  const json = await res.json();
  return json.data || [];
}
