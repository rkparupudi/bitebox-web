import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from './api/types';
import { homeFor, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { AdminPage } from './pages/admin/AdminPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CartPage } from './pages/customer/CartPage';
import { MenuPage } from './pages/customer/MenuPage';
import { OrderPage } from './pages/customer/OrderPage';
import { OrdersPage } from './pages/customer/OrdersPage';
import { RestaurantsPage } from './pages/customer/RestaurantsPage';
import { DashboardPage } from './pages/owner/DashboardPage';
import { RestaurantAdminPage } from './pages/owner/RestaurantAdminPage';

/**
 * Client-side route guard. This is only for a nicer experience (redirect instead of an
 * error screen). The real protection is on the API: every endpoint checks the JWT and role.
 */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

/** Owners and admins land on their own home instead of the customer storefront. */
function Storefront() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user && user.role !== 'customer') return <Navigate to={homeFor(user.role)} replace />;
  return <RestaurantsPage />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/r/:id" element={<MenuPage />} />
        <Route path="/cart" element={<RequireRole roles={['customer']}><CartPage /></RequireRole>} />
        <Route path="/orders" element={<RequireRole roles={['customer']}><OrdersPage /></RequireRole>} />
        <Route path="/orders/:id" element={<RequireRole roles={['customer', 'restaurant_owner', 'admin']}><OrderPage /></RequireRole>} />
        <Route path="/dashboard" element={<RequireRole roles={['restaurant_owner']}><DashboardPage /></RequireRole>} />
        <Route path="/dashboard/:id" element={<RequireRole roles={['restaurant_owner', 'admin']}><RestaurantAdminPage /></RequireRole>} />
        <Route path="/admin" element={<RequireRole roles={['admin']}><AdminPage /></RequireRole>} />
        <Route path="*" element={<div className="page empty">Page not found.</div>} />
      </Route>
    </Routes>
  );
}
