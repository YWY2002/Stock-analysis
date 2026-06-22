async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.detail || res.statusText);
  }
  return res.json();
}

export async function fetchExpirations(underlying) {
  const body = await getJSON(`/api/options/expirations/${encodeURIComponent(underlying)}`);
  return body.expirations ?? [];
}

export async function fetchOptionChain(underlying, expiration) {
  const params = new URLSearchParams({ expiration });
  const body = await getJSON(
    `/api/options/chain/${encodeURIComponent(underlying)}?${params}`
  );
  return body.chain ?? [];
}
