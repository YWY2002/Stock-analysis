export async function fetchIndicators(symbol, { interval = '1day', indicators = ['ad', 'obv', 'vwap'] } = {}) {
  const params = new URLSearchParams({ interval, outputsize: '5000', indicators: indicators.join(',') });

  const res = await fetch(`/api/indicators/${encodeURIComponent(symbol)}?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.detail || res.statusText);
  }
  return res.json();
}
