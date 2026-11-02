const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export function getToken(): string {
  return localStorage.getItem("wearify_token") || "";
}

export function setToken(token: string): void {
  localStorage.setItem("wearify_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("wearify_token");
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { ...options, headers },
  );

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Request gagal (${response.status})`,
    );
  }

  return data as T;
}

// Token pelanggan disimpan terpisah dari token admin.
export function getCustomerToken(): string {
  return localStorage.getItem("wearify_customer_token") || "";
}

export function setCustomerToken(token: string): void {
  localStorage.setItem("wearify_customer_token", token);
}

export function clearCustomerToken(): void {
  localStorage.removeItem("wearify_customer_token");
}


// Request khusus pelanggan agar token admin tidak ikut terkirim.
export async function apiCustomer<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getCustomerToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { ...options, headers },
  );

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Request gagal (${response.status})`,
    );
  }

  return data as T;
}

export const money = (value: unknown): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
