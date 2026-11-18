import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { OrderStatus } from '../../api/types';
import { ErrorBanner, LiveDot, Loading, StatusBadge } from '../../components/ui';
import { money, shortId, STATUS_LABEL, timeAgo } from '../../lib/format';
import { useOrderUpdates } from '../../lib/realtime';

export function AdminPage() {
  const [tab, setTab] = useState<'orders' | 'restaurants'>('orders');
  const live = useOrderUpdates();
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Platform admin</h1>
          <p className="muted">Every order across the platform, live, and restaurant moderation.</p>
        </div>
        <LiveDot on={live} />
      </div>
      <div className="tabs">
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
        <button className={tab === 'restaurants' ? 'active' : ''} onClick={() => setTab('restaurants')}>Restaurants</button>
      </div>
      {tab === 'orders' ? <AllOrders /> : <AllRestaurants />}
    </main>
  );
}

function AllOrders() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const orders = useQuery({ queryKey: ['admin-orders', status], queryFn: () => api.adminOrders(status || undefined) });
  const restaurants = useQuery({ queryKey: ['admin-restaurants'], queryFn: api.adminRestaurants });
  const nameOf = (id: string) => restaurants.data?.find((r) => r.id === id)?.name ?? '—';

  return (
    <div className="card stack">
      <div className="row between wrap">
        <h2>Orders</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <ErrorBanner error={orders.error} />
      {orders.isLoading ? (
        <Loading />
      ) : orders.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Restaurant</th><th>Placed</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/orders/${o.id}`} style={{ color: 'var(--brand)' }}>{shortId(o.id)}</Link></td>
                  <td>{nameOf(o.restaurantId)}</td>
                  <td className="muted">{timeAgo(o.createdAt)}</td>
                  <td className="num">{money(o.totalMinor, o.currency)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">No orders{status ? ' with this status' : ''}.</div>
      )}
    </div>
  );
}

function AllRestaurants() {
  const qc = useQueryClient();
  const restaurants = useQuery({ queryKey: ['admin-restaurants'], queryFn: api.adminRestaurants });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.setRestaurantActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-restaurants'] }),
  });

  return (
    <div className="card stack">
      <h2>Restaurants</h2>
      <ErrorBanner error={restaurants.error || setActive.error} />
      {restaurants.isLoading ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Restaurant</th><th>Owner</th><th>Open</th><th>Status</th><th /></tr></thead>
            <tbody>
              {restaurants.data?.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/dashboard/${r.id}`}><strong>{r.name}</strong></Link><div className="muted small">{r.address}</div></td>
                  <td className="muted">{r.owner?.email}</td>
                  <td><span className={`badge ${r.isOpen ? 'open' : 'closed'}`}>{r.isOpen ? 'Open' : 'Closed'}</span></td>
                  <td>{r.isActive ? <span className="badge open">Active</span> : <span className="badge s-cancelled">Suspended</span>}</td>
                  <td className="num">
                    <button
                      className={`btn small ${r.isActive ? 'danger' : ''}`}
                      disabled={setActive.isPending}
                      onClick={() => {
                        if (!r.isActive || window.confirm(`Suspend ${r.name}? It will disappear from the app and stop taking orders.`)) {
                          setActive.mutate({ id: r.id, isActive: !r.isActive });
                        }
                      }}
                    >
                      {r.isActive ? 'Suspend' : 'Reinstate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
