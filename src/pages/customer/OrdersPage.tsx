import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorBanner, LiveDot, Loading, StatusBadge } from '../../components/ui';
import { money, shortId, timeAgo } from '../../lib/format';
import { useOrderUpdates } from '../../lib/realtime';

export function OrdersPage() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.myOrders });
  const live = useOrderUpdates();

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>My orders</h1>
          <p className="muted">Statuses update live.</p>
        </div>
        <LiveDot on={live} />
      </div>
      <ErrorBanner error={orders.error} />
      {orders.isLoading ? (
        <Loading />
      ) : orders.data?.length ? (
        <div className="stack">
          {orders.data.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card card-link row between wrap">
              <div>
                <strong>{shortId(o.id)}</strong>{' '}
                <span className="muted small">· {timeAgo(o.createdAt)}</span>
                <p className="muted small" style={{ marginTop: 4 }}>
                  {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
                </p>
              </div>
              <div className="row">
                <span className="price">{money(o.totalMinor, o.currency)}</span>
                <StatusBadge status={o.status} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card empty">No orders yet. <Link to="/" style={{ color: 'var(--brand)' }}>Find something tasty</Link>.</div>
      )}
    </main>
  );
}
