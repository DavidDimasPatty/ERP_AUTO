export async function fetch(url: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const fullUrl = `${baseUrl}${url}`;
  const response = await window.fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return response;
}
