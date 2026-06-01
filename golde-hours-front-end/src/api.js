const runtimeApiUrl = typeof window !== "undefined" ? window.__ENV__?.VITE_API_URL : "";
const API_URL = runtimeApiUrl || import.meta.env.VITE_API_URL || "https://gopinathv19-golden-hours-backend.hf.space";

export async function request(path, options = {}) {
  const token = localStorage.getItem("golden_hours_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/me"),
  entries: () => request("/api/entries"),
  summary: () => request("/api/summary"),
  createEntry: (payload) => request("/api/entries", { method: "POST", body: JSON.stringify(payload) }),
  deleteEntry: (id) => request(`/api/entries/${id}`, { method: "DELETE" }),
};
