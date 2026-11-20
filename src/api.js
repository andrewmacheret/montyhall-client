const API_URL = import.meta.env.VITE_API_URL ?? 'https://montyhall.andrewmacheret.com';

export async function callApi(path, method = 'GET', body) {
  const response = await fetch(API_URL + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || `Request failed with status ${response.status}`);
  }
  return json;
}
