import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorBanner, Loading, Qty } from '../../components/ui';
import { money } from '../../lib/format';

export function CartPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const config = useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: Infinity });
  const [address, setAddress] = useState(() => localStorage.getItem('bitebridge.address') ?? '');
  const [notes, setNotes] = useState('');

  const setQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => api.setCartItem(id, qty),
    onSuccess: (c) => qc.setQueryData(['cart'], c),
  });

  const checkout = useMutation({
    mutationFn: () => api.checkout(address, notes),
    onSuccess: ({ order }) => {
      localStorage.setItem('bitebridge.address', address);
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`);
    },
  });

  if (cart.isLoading) return <Loading />;
  const c = cart.data!;
  if (!c.lines.length) {
    return (
      <main className="page">
        <div className="card empty stack" style={{ alignItems: 'center' }}>
          <h2>Your cart is empty</h2>
          <Link to="/" className="btn primary">Browse restaurants</Link>
        </div>
      </main>
    );
  }

  const fee = config.data?.deliveryFeeMinor ?? 0;
  const unavailable = c.lines.some((l) => !l.isAvailable);
  const closed = !c.restaurant?.isOpen || !c.restaurant?.isActive;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Checkout</h1>
          <p className="muted">
            From <Link to={`/r/${c.restaurantId}`} style={{ color: 'var(--brand)' }}>{c.restaurant?.name}</Link>
          </p>
        </div>
      </div>
      <div className="two-col">
        <div className="stack">
          <div className="card">
            {c.lines.map((l) => (
              <div key={l.menuItemId} className="menu-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div className="muted small">{money(l.unitPriceMinor)} each</div>
                  {!l.isAvailable && <div className="small" style={{ color: 'var(--bad)' }}>No longer available — remove to continue</div>}
                </div>
                <div className="row">
                  <span className="price">{money(l.lineTotalMinor)}</span>
                  <Qty value={l.quantity} disabled={setQty.isPending} onChange={(n) => setQty.mutate({ id: l.menuItemId, qty: Math.max(0, n) })} />
                </div>
              </div>
            ))}
          </div>
          <div className="card stack">
            <h2>Delivery details</h2>
            <label className="field">
              Delivery address
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, building, street, area" />
            </label>
            <label className="field">
              Notes for the restaurant <span className="muted small">(optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy, no onions…" />
            </label>
          </div>
        </div>

        <aside className="card sticky stack">
          <h2>Bill</h2>
          <div className="row between small"><span>Item total</span><span className="price">{money(c.subtotalMinor)}</span></div>
          <div className="row between small"><span>Delivery fee</span><span className="price">{money(fee)}</span></div>
          <hr className="sep" />
          <div className="row between"><strong>To pay</strong><strong className="price">{money(c.subtotalMinor + fee)}</strong></div>
          <ErrorBanner error={checkout.error} />
          {closed && <div className="banner warn">This restaurant isn't taking orders right now.</div>}
          <button
            className="btn primary block"
            disabled={checkout.isPending || address.trim().length < 5 || unavailable || closed}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? 'Placing order…' : 'Place order and pay'}
          </button>
          {address.trim().length < 5 && <p className="muted small">Enter a delivery address to continue.</p>}
        </aside>
      </div>
    </main>
  );
}
