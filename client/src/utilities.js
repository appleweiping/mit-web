// Small fetch helpers, mirroring the weblab starter's client utilities.

export function formatParams(params) {
  return Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
}

function convertToJSON(res) {
  if (!res.ok) {
    return res.json().then((body) => {
      throw new Error(`${res.status}: ${body.error || res.statusText}`);
    });
  }
  return res.json();
}

export function get(endpoint, params = {}) {
  const query = formatParams(params);
  const url = query ? `${endpoint}?${query}` : endpoint;
  return fetch(url, { credentials: "include" }).then(convertToJSON);
}

export function post(endpoint, params = {}) {
  return fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).then(convertToJSON);
}
