import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { MenuItem, Order, OrderStatus, Restaurant } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBanner, LiveDot, Loading, StatusBadge, useToast } from '../../components/ui';
import { money, NEXT_STEP, shortId, timeAgo, toMinor } from '../../lib/format';
import { useOrderUpdates } from '../../lib/realtime';

type Tab = 'orders' | 'menu' | 'sales';

export function RestaurantAdminPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'orders';
  const qc = useQueryClient();

  // Owners load their own list; an admin opening this page loads the full list.
  const restaurants = useQuery({
    queryKey: user?.role === 'admin' ? ['admin-restaurants'] : ['my-restaurants'],
    queryFn: user?.role === 'admin' ? api.adminRestaurants : api.myRestaurants,
  });
  const restaurant = restaurants.data?.find((r) => r.id === id);

  const toggleOpen = useMutation({
    mutationFn: (isOpen: boolean) => api.updateRestaurant(id, { isOpen }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-restaurants'] }),
  });

  if (restaurants.isLoading) return <Loading />;
  if (!restaurant) return <main className="page empty">Restaurant not found.</main>;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="muted small"><Link to={user?.role === 'admin' ? '/admin' : '/dashboard'}>← Back</Link></p>
          <h1 style={{ marginTop: 6 }}>{restaurant.name}</h1>
          <p className="muted small">{restaurant.address}</p>
        </div>
        <div className="row">
          {!restaurant.isActive && <span className="badge s-cancelled">Suspended by admin</span>}
          <label className="switch">
            <input
              type="checkbox"
              checked={restaurant.isOpen}
              disabled={toggleOpen.isPending}
              onChange={(e) => toggleOpen.mutate(e.target.checked)}
            />
            {restaurant.isOpen ? 'Open for orders' : 'Closed'}
          </label>
        </div>
      </div>

      <div className="tabs">
        {(['orders', 'menu', 'sales'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setParams({ tab: t })}>
            {t === 'orders' ? 'Live orders' : t === 'menu' ? 'Menu' : 'Sales'}
          </button>
        ))}
      </div>

      {tab === 'orders' && <OrdersBoard restaurant={restaurant} />}
      {tab === 'menu' && <MenuEditor restaurantId={id} />}
      {tab === 'sales' && <Sales restaurantId={id} />}
    </main>
  );
}

// ------------------------------------------------------------------ live orders

const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'New', statuses: ['placed'] },
  { title: 'In the kitchen', statuses: ['confirmed', 'preparing'] },
  { title: 'On the way', statuses: ['ready_for_pickup', 'out_for_delivery'] },
];

function OrdersBoard({ restaurant }: { restaurant: Restaurant }) {
  const toast = useToast();
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const orders = useQuery({
    queryKey: ['restaurant-orders', restaurant.id],
    queryFn: () => api.restaurantOrders(restaurant.id),
  });

  const live = useOrderUpdates((u) => {
    if (u.restaurantId !== restaurant.id) return;
    if (u.status === 'placed') {
      toast(`New order ${shortId(u.orderId)}!`);
      setFresh((s) => new Set(s).add(u.orderId));
    }
    if (u.status === 'cancelled') toast(`Order ${shortId(u.orderId)} was cancelled`);
  });

  if (orders.isLoading) return <Loading />;
  const all = orders.data ?? [];
  const done = all.filter((o) => o.status === 'delivered' || o.status === 'cancelled').slice(0, 10);

  return (
    <div className="stack">
      <div className="row between">
        <p className="muted small">New orders appear here instantly. Keep this tab open while you're open.</p>
        <LiveDot on={live} />
      </div>
      {!restaurant.isOpen && <div className="banner warn">You're closed, so customers can't order. Switch to Open above.</div>}
      <ErrorBanner error={orders.error} />
      <div className="board">
        {COLUMNS.map((col) => {
          const list = all.filter((o) => col.statuses.includes(o.status));
          return (
            <div key={col.title} className="col">
              <div className="col-head">
                {col.title} <span className="col-count">{list.length}</span>
              </div>
              {list.map((o) => (
                <Ticket key={o.id} order={o} fresh={fresh.has(o.id)} />
              ))}
              {list.length === 0 && <p className="muted small" style={{ padding: '6px' }}>Nothing here.</p>}
            </div>
          );
        })}
      </div>
      {done.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Recently completed</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {done.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.id}`}>{shortId(o.id)}</Link></td>
                    <td className="muted">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td>
                    <td className="num">{money(o.subtotalMinor, o.currency)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Ticket({ order, fresh }: { order: Order; fresh: boolean }) {
  const qc = useQueryClient();
  const next = NEXT_STEP[order.status];
  const refresh = () => qc.invalidateQueries({ queryKey: ['restaurant-orders', order.restaurantId] });
  const advance = useMutation({ mutationFn: (to: OrderStatus) => api.setOrderStatus(order.id, to), onSuccess: refresh });
  const reject = useMutation({ mutationFn: () => api.cancelOrder(order.id, 'rejected_by_restaurant'), onSuccess: refresh });
  const canReject = order.status === 'placed' || order.status === 'confirmed';

  return (
    <div className={`ticket ${fresh ? 'fresh' : ''}`}>
      <div className="row between">
        <Link to={`/orders/${order.id}`}><strong>{shortId(order.id)}</strong></Link>
        <span className="muted small">{timeAgo(order.createdAt)}</span>
      </div>
      <ul>
        {order.items.map((i) => <li key={i.id}>{i.quantity} × {i.name}</li>)}
      </ul>
      {order.notes && <div className="small" style={{ color: 'var(--warn)' }}>Note: {order.notes}</div>}
      <div className="row between">
        <StatusBadge status={order.status} />
        <span className="price small">{money(order.subtotalMinor, order.currency)}</span>
      </div>
      <ErrorBanner error={advance.error || reject.error} />
      <div className="row">
        {next && (
          <button className="btn primary small block" disabled={advance.isPending} onClick={() => advance.mutate(next.to)}>
            {next.label}
          </button>
        )}
        {canReject && (
          <button
            className="btn danger small"
            disabled={reject.isPending}
            onClick={() => window.confirm('Reject this order? The customer will be refunded.') && reject.mutate()}
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ menu editor

function MenuEditor({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ['owner-menu', restaurantId], queryFn: () => api.ownerMenu(restaurantId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['owner-menu', restaurantId] });
  const [form, setForm] = useState({ name: '', price: '', category: '', description: '' });

  const add = useMutation({
    mutationFn: () =>
      api.addMenuItem(restaurantId, {
        name: form.name,
        priceMinor: toMinor(form.price),
        category: form.category || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      setForm({ name: '', price: '', category: form.category, description: '' });
      refresh();
    },
  });
  const update = useMutation({
    mutationFn: ({ item, patch }: { item: MenuItem; patch: Partial<MenuItem> }) => api.updateMenuItem(restaurantId, item.id, patch),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (item: MenuItem) => api.deleteMenuItem(restaurantId, item.id), onSuccess: refresh });

  const priceOk = toMinor(form.price) > 0;

  return (
    <div className="two-col">
      <div className="card">
        <ErrorBanner error={update.error || remove.error} />
        {items.isLoading ? (
          <Loading />
        ) : items.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Dish</th><th>Category</th><th className="num">Price</th><th>Available</th><th /></tr>
              </thead>
              <tbody>
                {items.data.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong>{item.description && <div className="muted small">{item.description}</div>}</td>
                    <td className="muted">{item.category}</td>
                    <td className="num">
                      <button
                        className="btn ghost small"
                        title="Change price"
                        onClick={() => {
                          const v = window.prompt(`New price for ${item.name} (₹)`, (item.priceMinor / 100).toFixed(2));
                          if (v && toMinor(v) > 0) update.mutate({ item, patch: { priceMinor: toMinor(v) } });
                        }}
                      >
                        {money(item.priceMinor)}
                      </button>
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={item.isAvailable} onChange={(e) => update.mutate({ item, patch: { isAvailable: e.target.checked } })} />
                      </label>
                    </td>
                    <td className="num">
                      <button className="btn danger small" onClick={() => window.confirm(`Delete ${item.name}?`) && remove.mutate(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No dishes yet. Add your first one.</div>
        )}
      </div>

      <form
        className="card sticky stack"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <h2>Add a dish</h2>
        <ErrorBanner error={add.error} />
        <label className="field">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label className="field">Price (₹)<input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="250" required /></label>
        <label className="field">Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Mains" /></label>
        <label className="field">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn primary" disabled={add.isPending || !priceOk || !form.name}>Add dish</button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ sales

function Sales({ restaurantId }: { restaurantId: string }) {
  const sales = useQuery({ queryKey: ['sales', restaurantId], queryFn: () => api.sales(restaurantId) });
  if (sales.isLoading) return <Loading />;
  if (sales.error) return <ErrorBanner error={sales.error} />;
  const s = sales.data!;
  // Show every day of the last 30, including days with no sales, so the chart has a real time axis.
  const byDay = new Map(s.days.map((d) => [d.day, d]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    return byDay.get(day) ?? { day, orders: 0, revenueMinor: 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.revenueMinor));
  const avg = s.totalOrders ? Math.round(s.totalRevenueMinor / s.totalOrders) : 0;

  return (
    <div className="stack">
      <div className="stats">
        <div className="card"><div className="stat-label">Revenue, last 30 days</div><div className="stat-value">{money(s.totalRevenueMinor, s.currency)}</div></div>
        <div className="card"><div className="stat-label">Delivered orders</div><div className="stat-value">{s.totalOrders}</div></div>
        <div className="card"><div className="stat-label">Average order</div><div className="stat-value">{money(avg, s.currency)}</div></div>
      </div>
      <div className="card">
        <h3>Daily revenue</h3>
        {s.days.length === 0 ? (
          <div className="empty">No delivered orders in this period yet.</div>
        ) : (
          <>
            <div className="bars">
              {days.map((d) => (
                <div key={d.day} className="bar" style={{ height: `${(d.revenueMinor / max) * 100}%` }} title={`${d.day}: ${money(d.revenueMinor, s.currency)} from ${d.orders} orders`} />
              ))}
            </div>
            <div className="row between muted small" style={{ marginTop: 6 }}>
              <span>{days[0].day}</span>
              <span>{days[days.length - 1].day}</span>
            </div>
          </>
        )}
        <p className="muted small" style={{ marginTop: 10 }}>Food revenue from delivered orders; delivery fees are excluded.</p>
      </div>
    </div>
  );
}
