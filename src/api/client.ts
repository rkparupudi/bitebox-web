import type {
  Cart,
  MenuItem,
  Order,
  OrderStatus,
  PaymentInfo,
  PublicConfig,
  Restaurant,
  SalesReport,
  User,
} from './types';

/** Empty in development (Vite proxies /api). The API's public URL in production. */
export const API_URL: string = import.meta.env.VITE_API_URL || '';
const BASE = API_URL || '/api';

const TOKEN_KEY = 'bitebridge.token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Fired when the API says our token is no longer valid, so the app can sign out. */
export const UNAUTHORIZED_EVENT = 'bitebridge:unauthorized';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
    throw new ApiError(res.status, message || res.statusText || 'Request failed');
  }
  return data as T;
}

const get = <T>(p: string) => request<T>('GET', p);
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const patch = <T>(p: string, b: unknown) => request<T>('PATCH', p, b);
const put = <T>(p: string, b: unknown) => request<T>('PUT', p, b);
const del = <T>(p: string) => request<T>('DELETE', p);

type AuthResponse = { accessToken: string; user: User };

export const api = {
  config: () => get<PublicConfig>('/config'),

  // auth
  login: (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password }),
  register: (b: { email: string; password: string; fullName: string; role: 'customer' | 'restaurant_owner' }) =>
    post<AuthResponse>('/auth/register', b),
  me: () => get<User>('/auth/me'),

  // browsing
  restaurants: (q?: string) => get<Restaurant[]>(`/restaurants${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  menu: (id: string) => get<{ restaurant: Restaurant; items: MenuItem[] }>(`/restaurants/${id}/menu`),

  // cart
  cart: () => get<Cart>('/cart'),
  setCartItem: (menuItemId: string, quantity: number, replace = false) =>
    put<Cart>(`/cart/items${replace ? '?replace=true' : ''}`, { menuItemId, quantity }),
  clearCart: () => del<void>('/cart'),

  // orders
  checkout: (deliveryAddress: string, notes?: string) =>
    post<{ order: Order; payment: PaymentInfo }>('/orders', { deliveryAddress, notes: notes || undefined }),
  myOrders: () => get<Order[]>('/orders'),
  order: (id: string) => get<Order>(`/orders/${id}`),
  paymentSecret: (id: string) => get<PaymentInfo>(`/orders/${id}/payment`),
  cancelOrder: (id: string, reason?: string) => post<Order>(`/orders/${id}/cancel`, { reason }),
  simulatePayment: (id: string, outcome: 'succeeded' | 'failed') =>
    post<Order>(`/dev/payments/${id}/simulate`, { outcome }),

  // restaurant owner
  myRestaurants: () => get<Restaurant[]>('/restaurants/mine'),
  createRestaurant: (b: { name: string; address: string; description?: string }) =>
    post<Restaurant>('/restaurants', b),
  updateRestaurant: (id: string, b: Partial<Pick<Restaurant, 'name' | 'address' | 'description' | 'isOpen'>>) =>
    patch<Restaurant>(`/restaurants/${id}`, b),
  ownerMenu: (id: string) => get<MenuItem[]>(`/restaurants/${id}/menu-items`),
  addMenuItem: (id: string, b: { name: string; priceMinor: number; category?: string; description?: string }) =>
    post<MenuItem>(`/restaurants/${id}/menu-items`, b),
  updateMenuItem: (id: string, itemId: string, b: Partial<MenuItem>) =>
    patch<MenuItem>(`/restaurants/${id}/menu-items/${itemId}`, b),
  deleteMenuItem: (id: string, itemId: string) => del<void>(`/restaurants/${id}/menu-items/${itemId}`),
  restaurantOrders: (id: string, status?: OrderStatus) =>
    get<Order[]>(`/restaurants/${id}/orders?limit=50${status ? `&status=${status}` : ''}`),
  setOrderStatus: (orderId: string, status: OrderStatus) => patch<Order>(`/orders/${orderId}/status`, { status }),
  sales: (id: string) => get<SalesReport>(`/restaurants/${id}/sales`),

  // admin
  adminOrders: (status?: OrderStatus) => get<Order[]>(`/admin/orders?limit=100${status ? `&status=${status}` : ''}`),
  adminRestaurants: () => get<Restaurant[]>('/admin/restaurants'),
  setRestaurantActive: (id: string, isActive: boolean) =>
    patch<Restaurant>(`/admin/restaurants/${id}/active`, { isActive }),
};
