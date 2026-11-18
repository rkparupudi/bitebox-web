import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { money } from '../lib/format';

const ROLE_LABEL = { customer: 'Customer', restaurant_owner: 'Restaurant', admin: 'Admin' } as const;

function CartPill() {
  const { data } = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const count = data?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;
  if (!count) return null;
  return (
    <Link to="/cart" className="cart-pill">
      Cart <span className="count">{count}</span> {money(data!.subtotalMinor)}
    </Link>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role === 'admin'
      ? [{ to: '/admin', label: 'Admin' }]
      : user?.role === 'restaurant_owner'
        ? [{ to: '/dashboard', label: 'My restaurants' }]
        : [
            { to: '/', label: 'Restaurants' },
            ...(user ? [{ to: '/orders', label: 'My orders' }] : []),
          ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">B</span> BiteBox
          </Link>
          <nav className="nav">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="who">
            {user?.role === 'customer' && <CartPill />}
            {user ? (
              <>
                <span className="role-chip">{ROLE_LABEL[user.role]}</span>
                <span className="muted small">{user.email}</span>
                <button
                  className="btn small ghost"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn small ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn small primary">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}
