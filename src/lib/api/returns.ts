// Fetch returns from API
export async function fetchReturns(): Promise<any[]> {
  const res = await fetch('/api/returns');
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to fetch returns');
  }
  const json = await res.json();
  return json.data || [];
}
