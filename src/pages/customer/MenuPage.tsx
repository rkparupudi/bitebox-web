import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Cart, MenuItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBanner, Loading, Qty, TileArt, useToast } from '../../components/ui';
import { money } from '../../lib/format';

export function MenuPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const isCustomer = user?.role === 'customer';

  const menu = useQuery({ queryKey: ['menu', id], queryFn: () => api.menu(id) });
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: isCustomer });

  const setItem = useMutation({
    mutationFn: ({ item, qty, replace }: { item: MenuItem; qty: number; replace?: boolean }) =>
      api.setCartItem(item.id, qty, replace),
    onSuccess: (c: Cart) => qc.setQueryData(['cart'], c),
    onError: (err, vars) => {
      // 409 = the cart holds another restaurant's food. Ask, then retry with replace=true.
      if (err instanceof ApiError && err.status === 409) {
        const other = cart.data?.restaurant?.name ?? 'another restaurant';
        if (window.confirm(`Your cart has items from ${other}. Start a new cart with this item?`)) {
          setItem.mutate({ ...vars, replace: true });
        }
      } else {
        toast(err instanceof Error ? err.message : 'Could not update cart');
      }
    },
  });

  if (menu.isLoading) return <Loading />;
  if (menu.error) return <main className="page"><ErrorBanner error={menu.error} /></main>;
  const { restaurant, items } = menu.data!;

  const qtyOf = (itemId: string) =>
    cart.data?.restaurantId === id ? (cart.data.lines.find((l) => l.menuItemId === itemId)?.quantity ?? 0) : 0;

  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  const cartHere = cart.data?.restaurantId === id ? cart.data : null;

  return (
    <main className="page">
      <div className="two-col">
        <div className="stack">
          <div className="card">
            <TileArt name={restaurant.name} />
            <div className="row between wrap">
              <div>
                <h1>{restaurant.name}</h1>
                <p className="muted" style={{ marginTop: 4 }}>{restaurant.description}</p>
                <p className="muted small" style={{ marginTop: 6 }}>{restaurant.address}</p>
              </div>
              <span className={`badge ${restaurant.isOpen ? 'open' : 'closed'}`}>
                {restaurant.isOpen ? 'Open now' : 'Closed — browse only'}
              </span>
            </div>
          </div>

          <div className="card">
            {items.length === 0 && <div className="empty">This restaurant hasn't added any dishes yet.</div>}
            {Object.entries(byCategory).map(([cat, list]) => (
              <div key={cat} className="menu-cat">
                <h3>{cat}</h3>
                {list.map((item) => {
                  const qty = qtyOf(item.id);
                  return (
                    <div key={item.id} className="menu-item">
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        {item.description && <div className="muted small">{item.description}</div>}
                        <div className="price small" style={{ marginTop: 4 }}>{money(item.priceMinor)}</div>
                      </div>
                      {!user ? (
                        <Link to="/login" state={{ from: `/r/${id}` }} className="btn small">
                          Sign in to add
                        </Link>
                      ) : !isCustomer ? null : qty > 0 ? (
                        <Qty value={qty} disabled={setItem.isPending} onChange={(n) => setItem.mutate({ item, qty: Math.max(0, n) })} />
                      ) : (
                        <button className="btn small" disabled={!restaurant.isOpen || setItem.isPending} onClick={() => setItem.mutate({ item, qty: 1 })}>
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {isCustomer && (
          <aside className="card sticky stack">
            <h2>Your order</h2>
            {cartHere && cartHere.lines.length ? (
              <>
                {cartHere.lines.map((l) => (
                  <div key={l.menuItemId} className="row between small">
                    <span>{l.quantity} × {l.name}</span>
                    <span className="price">{money(l.lineTotalMinor)}</span>
                  </div>
                ))}
                <hr className="sep" />
                <div className="row between">
                  <strong>Subtotal</strong>
                  <strong className="price">{money(cartHere.subtotalMinor)}</strong>
                </div>
                <button className="btn primary block" onClick={() => navigate('/cart')}>
                  Go to checkout
                </button>
              </>
            ) : (
              <p className="muted small">Add dishes to start your order.</p>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
