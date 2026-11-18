import type { OrderStatus } from '../api/types';

const formatters = new Map<string, Intl.NumberFormat>();

/** 32000 paise -> "₹320.00". Amounts are always integers in the smallest unit. */
export function money(minor: number, currency = 'inr') {
  const code = currency.toUpperCase();
  let f = formatters.get(code);
  if (!f) {
    f = new Intl.NumberFormat('en-IN', { style: 'currency', currency: code });
    formatters.set(code, f);
  }
  return f.format(minor / 100);
}

/** "₹320.50" typed by an owner -> 32050. Returns NaN for bad input. */
export function toMinor(major: string) {
  const n = Number(major);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** The customer-facing progress steps, in order. */
export const PROGRESS: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
];

/** What the restaurant's main button does at each stage. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  placed: { to: 'confirmed', label: 'Accept order' },
  confirmed: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready_for_pickup', label: 'Mark ready' },
  ready_for_pickup: { to: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { to: 'delivered', label: 'Mark delivered' },
};

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const shortId = (id: string) => `#${id.slice(0, 6).toUpperCase()}`;
