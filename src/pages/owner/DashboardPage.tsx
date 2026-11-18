import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorBanner, Loading, TileArt } from '../../components/ui';

export function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mine = useQuery({ queryKey: ['my-restaurants'], queryFn: api.myRestaurants });
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  const [showForm, setShowForm] = useState(false);

  const create = useMutation({
    mutationFn: () => api.createRestaurant(form),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['my-restaurants'] });
      navigate(`/dashboard/${r.id}?tab=menu`);
    },
  });

  if (mine.isLoading) return <Loading />;
  const list = mine.data ?? [];
  const formOpen = showForm || list.length === 0;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>My restaurants</h1>
          <p className="muted">Manage menus, take orders live and see your sales.</p>
        </div>
        {list.length > 0 && !showForm && (
          <button className="btn primary" onClick={() => setShowForm(true)}>Add a restaurant</button>
        )}
      </div>

      {formOpen && (
        <form
          className="card stack"
          style={{ marginBottom: 20, maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h2>{list.length ? 'Add a restaurant' : 'List your first restaurant'}</h2>
          <ErrorBanner error={create.error} />
          <label className="field">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="field">Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
          <label className="field">Short description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Biryani, kebabs, desserts" /></label>
          <div className="row">
            <button className="btn primary" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create restaurant'}</button>
            {list.length > 0 && <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>}
          </div>
          <p className="muted small">New restaurants start closed. Add your menu, then switch to Open.</p>
        </form>
      )}

      <div className="grid">
        {list.map((r) => (
          <Link key={r.id} to={`/dashboard/${r.id}`} className="card card-link">
            <TileArt name={r.name} />
            <h2>{r.name}</h2>
            <p className="muted small" style={{ marginTop: 4 }}>{r.address}</p>
            <div className="tile-meta">
              <span className={`badge ${r.isOpen ? 'open' : 'closed'}`}>{r.isOpen ? 'Open' : 'Closed'}</span>
              {!r.isActive && <span className="badge s-cancelled">Suspended by admin</span>}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
