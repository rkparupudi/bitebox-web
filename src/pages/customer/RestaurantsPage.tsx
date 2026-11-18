import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorBanner, Loading, TileArt } from '../../components/ui';

export function RestaurantsPage() {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');

  // Debounce typing so we don't send a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isLoading, error } = useQuery({ queryKey: ['restaurants', q], queryFn: () => api.restaurants(q) });

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Order from restaurants near you</h1>
          <p className="muted">Fresh food, tracked live from the kitchen to your door.</p>
        </div>
        <input
          placeholder="Search restaurants"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ minWidth: 260 }}
          aria-label="Search restaurants"
        />
      </div>
      <ErrorBanner error={error} />
      {isLoading ? (
        <Loading />
      ) : data?.length ? (
        <div className="grid">
          {data.map((r) => (
            <Link key={r.id} to={`/r/${r.id}`} className="card card-link">
              <TileArt name={r.name} />
              <h2>{r.name}</h2>
              <p className="muted small" style={{ marginTop: 4 }}>
                {r.description || 'Freshly cooked, delivered hot.'}
              </p>
              <div className="tile-meta">
                <span className="muted small">{r.address}</span>
                <span className={`badge ${r.isOpen ? 'open' : 'closed'}`}>{r.isOpen ? 'Open' : 'Closed'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card empty">
          {q ? `No restaurants match “${q}”.` : 'No restaurants yet. Sign up as a restaurant owner to add one.'}
        </div>
      )}
    </main>
  );
}
