const API_URL = import.meta.env.VITE_API_URL ?? 'https://montyhall.andrewmacheret.com';

export async function callApi(path, method = 'GET', body) {
  // no Content-Type header, so the body goes as text/plain and GET and POST skip the CORS preflight.
  // the server reads it as JSON anyway
  const response = await fetch(API_URL + path, {
    method,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || `Request failed with status ${response.status}`);
  }
  return json;
}
