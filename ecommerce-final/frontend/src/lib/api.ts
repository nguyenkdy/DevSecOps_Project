'use client';

/**
 * API Client — luôn gọi qua api-gateway.
 * - Server-side (SSR/SSG): dùng API_URL (nội bộ Docker hoặc localhost khi dev)
 * - Client-side (browser): dùng NEXT_PUBLIC_API_URL
 */

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side render
    return process.env.API_URL ?? 'http://localhost:3000';
  }
  // Client-side
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

interface FetchOptions extends RequestInit {
  auth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = true, headers = {}, ...rest } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${getBaseUrl()}${path}`, {
    headers: reqHeaders,
    ...rest,
  });

  // Auto-refresh khi token hết hạn
  if (res.status === 401 && auth && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${getBaseUrl()}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const tokens = await refreshRes.json();
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          reqHeaders['Authorization'] = `Bearer ${tokens.accessToken}`;
          res = await fetch(`${getBaseUrl()}${path}`, { headers: reqHeaders, ...rest });
        }
      } catch { /* fall through to error handler */ }
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
    throw { statusCode: res.status, message: error.message ?? 'Lỗi không xác định' };
  }

  const json = await res.json();
  // API trả về { data: ... } hoặc trực tiếp
  return (json.data !== undefined ? json.data : json) as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { email: string; password: string; fullName: string }) =>
    apiFetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body), auth: false }),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ accessToken: string; refreshToken: string }>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify(body), auth: false },
    ),

  refresh: (refreshToken: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>(
      '/api/v1/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }), auth: false },
    ),

  logout: (refreshToken: string) =>
    apiFetch('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: () => apiFetch<{ id: string; email: string; fullName: string; role: string; phone?: string }>('/api/v1/users/me'),

  updateMe: (body: { fullName?: string; phone?: string }) =>
    apiFetch<any>('/api/v1/users/me', { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.minPrice) qs.set('minPrice', String(params.minPrice));
    if (params?.maxPrice) qs.set('maxPrice', String(params.maxPrice));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<any>(`/api/v1/products${query}`, { auth: false });
  },

  getBySlug: (slug: string) =>
    apiFetch<any>(`/api/v1/products/${slug}`, { auth: false }),

  listCategories: () =>
    apiFetch<any[]>('/api/v1/categories', { auth: false }),
};

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const cartApi = {
  get: () => apiFetch<any>('/api/v1/cart'),

  add: (body: { productId: string; quantity: number }) =>
    apiFetch('/api/v1/cart', { method: 'POST', body: JSON.stringify(body) }),

  remove: (productId: string) =>
    apiFetch(`/api/v1/cart/${productId}`, { method: 'DELETE' }),

  clear: () => apiFetch('/api/v1/cart', { method: 'DELETE' }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  checkout: (body: {
    items: Array<{ productId: string; quantity: number }>;
    shippingAddress: object;
    paymentMethod: string;
  }) => apiFetch<any>('/api/v1/orders/checkout', { method: 'POST', body: JSON.stringify(body) }),

  list: (page = 1, limit = 10) =>
    apiFetch<any>(`/api/v1/orders?page=${page}&limit=${limit}`),

  getById: (id: string) => apiFetch<any>(`/api/v1/orders/${id}`),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: () => apiFetch<{ balance: number }>('/api/v1/users/me/wallet'),
  topUp: () => apiFetch<{ balance: number }>('/api/v1/users/me/wallet/topup', { method: 'POST' }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsApi = {
  initPayment: (body: { orderId: string; amount: number; paymentMethod: string }) =>
    apiFetch<any>('/api/v1/payments/init', { method: 'POST', body: JSON.stringify(body) }),

  getByOrder: (orderId: string) =>
    apiFetch<any>(`/api/v1/payments/order/${orderId}`),

  autoApprove: (paymentRef: string) =>
    apiFetch<any>(`/api/v1/payments/auto-approve/${paymentRef}`, { method: 'POST', auth: false }),
};
