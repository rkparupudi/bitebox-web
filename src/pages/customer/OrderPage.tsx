import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBanner, LiveDot, Loading, OrderProgress, StatusBadge, useToast } from '../../components/ui';
import { money, shortId, STATUS_LABEL } from '../../lib/format';
import { useOrderUpdates } from '../../lib/realtime';
import { PaymentPanel } from './PaymentPanel';

export function OrderPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id) });

  const live = useOrderUpdates((u) => {
    if (u.orderId === id) toast(`Order ${shortId(id)}: ${STATUS_LABEL[u.status]}`);
  });

  const cancel = useMutation({
    mutationFn: () => api.cancelOrder(id),
    onSuccess: (o) => qc.setQueryData(['order', id], o),
  });

  if (order.isLoading) return <Loading />;
  if (order.error) return <main className="page"><ErrorBanner error={order.error} /></main>;
  const o = order.data!;
  const isCustomer = user?.id === o.customerId;
  const customerCanCancel = isCustomer && (o.status === 'pending_payment' || o.status === 'placed');

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="muted small">
            {isCustomer ? <Link to="/orders">← My orders</Link> : <Link to={`/dashboard/${o.restaurantId}`}>← Restaurant</Link>}
          </p>
          <h1 style={{ marginTop: 6 }}>Order {shortId(o.id)}</h1>
        </div>
        <div className="row">
          <LiveDot on={live} />
          <StatusBadge status={o.status} />
        </div>
      </div>

      <div className="two-col">
        <div className="stack">
          {o.status === 'pending_payment' && isCustomer && (
            <div className="card stack">
              <h2>Complete payment</h2>
              <PaymentPanel order={o} />
            </div>
          )}

          {o.status !== 'pending_payment' && o.status !== 'cancelled' && (
            <div className="card stack">
              <h2>{o.status === 'delivered' ? 'Delivered. Enjoy your meal!' : STATUS_LABEL[o.status]}</h2>
              <OrderProgress status={o.status} />
              <p className="muted small">This page updates by itself as the restaurant works on your order.</p>
            </div>
          )}

          {o.status === 'cancelled' && (
            <div className="card stack">
              <h2>Order cancelled</h2>
              <p className="muted">
                Reason: {(o.cancelReason ?? 'cancelled').replace(/_/g, ' ')}.
                {o.payment?.refunded && ' Your payment has been refunded.'}
              </p>
            </div>
          )}

          <div className="card stack">
            <h2>Items</h2>
            {o.items.map((i) => (
              <div key={i.id} className="row between small">
                <span>{i.quantity} × {i.name}</span>
                <span className="price">{money(i.unitPriceMinor * i.quantity, o.currency)}</span>
              </div>
            ))}
            <hr className="sep" />
            <div className="row between small"><span>Item total</span><span className="price">{money(o.subtotalMinor, o.currency)}</span></div>
            <div className="row between small"><span>Delivery fee</span><span className="price">{money(o.deliveryFeeMinor, o.currency)}</span></div>
            <div className="row between"><strong>Total</strong><strong className="price">{money(o.totalMinor, o.currency)}</strong></div>
          </div>
        </div>

        <aside className="stack">
          <div className="card stack">
            <h3>Deliver to</h3>
            <p className="small">{o.deliveryAddress}</p>
            {o.notes && <p className="muted small">Note: {o.notes}</p>}
            {o.payment && <p className="muted small">Payment: {o.payment.status.replace(/_/g, ' ')}</p>}
          </div>
          {o.history && o.history.length > 0 && (
            <div className="card stack">
              <h3>History</h3>
              <ul className="timeline">
                {o.history.map((h) => (
                  <li key={h.id}>
                    <span>{STATUS_LABEL[h.toStatus]} <span className="muted">· {h.actor}</span></span>
                    <span className="muted">{new Date(h.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {customerCanCancel && (
            <div className="card stack">
              <ErrorBanner error={cancel.error} />
              <button
                className="btn danger block"
                disabled={cancel.isPending}
                onClick={() => window.confirm('Cancel this order?') && cancel.mutate()}
              >
                Cancel order
              </button>
              <p className="muted small">You can cancel until the restaurant accepts. Paid orders are refunded.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
