// Shapes returned by the BiteBox API. Kept in one place so a backend change
// shows up as a type error here rather than a runtime surprise.

export type Role = 'customer' | 'restaurant_owner' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: Role;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  isOpen: boolean;
  isActive: boolean;
  createdAt: string;
  owner?: User;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  priceMinor: number;
  isAvailable: boolean;
}

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  isAvailable: boolean;
}

export interface Cart {
  restaurantId: string | null;
  restaurant: Pick<Restaurant, 'id' | 'name' | 'isOpen' | 'isActive'> | null;
  lines: CartLine[];
  subtotalMinor: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
}

export interface OrderEvent {
  id: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actor: string;
  at: string;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;
  deliveryAddress: string;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  items: OrderItem[];
  history?: OrderEvent[];
  payment?: { status: string; refunded: boolean } | null;
}

export interface PaymentInfo {
  provider: 'stripe';
  paymentIntentId: string;
  clientSecret: string;
}

export interface PublicConfig {
  paymentsProvider: 'stripe' | 'fake';
  stripePublishableKey: string;
  currency: string;
  deliveryFeeMinor: number;
}

export interface SalesReport {
  totalOrders: number;
  totalRevenueMinor: number;
  currency: string;
  days: { day: string; orders: number; revenueMinor: number }[];
}

export interface OrderUpdate {
  orderId: string;
  restaurantId: string;
  from: OrderStatus | null;
  status: OrderStatus;
  at: string;
}
